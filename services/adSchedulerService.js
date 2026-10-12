const pool = require("../config/db");
const { sendMulticastPushNotification } = require("./pushNotificationService");

/**
 * Checks for active approved notification ads within their date range
 * and broadcasts them if they haven't been broadcast today.
 */
const runDailyNotificationBroadcast = async () => {
    try {
        console.log('[Daily Notification Scheduler] Running daily ad check...');
        
        // 1. Find all approved active notification ads where today is between start_date and end_date
        const [activeAds] = await pool.query(`
            SELECT * FROM ads 
            WHERE (LOWER(campaign_type) = 'notification' OR LOWER(ad_type) = 'notification')
              AND approval_status = 'approved'
              AND is_active = 1
              AND (start_date IS NULL OR DATE(start_date) <= CURDATE())
              AND (end_date IS NULL OR DATE(end_date) >= CURDATE())
        `);

        if (!activeAds || activeAds.length === 0) {
            console.log('[Daily Notification Scheduler] No active notification ads scheduled for today.');
            return { success: true, count: 0, message: 'No active notification ads for today' };
        }

        console.log(`[Daily Notification Scheduler] Found ${activeAds.length} active notification ad(s) for today.`);

        // 2. Fetch all recipient tokens
        const [deviceRows] = await pool.query(
            `SELECT token FROM device_tokens WHERE token IS NOT NULL AND token != ''`
        ).catch(() => [[]]);
        const [userRows] = await pool.query(
            `SELECT expo_push_token AS token FROM users WHERE expo_push_token IS NOT NULL AND expo_push_token != ''`
        );

        const uniqueTokens = Array.from(new Set([
            ...deviceRows.map(r => r.token),
            ...userRows.map(r => r.token)
        ])).filter(t => t && typeof t === 'string' && t.trim().length > 0);

        if (uniqueTokens.length === 0) {
            console.log('[Daily Notification Scheduler] No device tokens available to send to.');
            return { success: true, count: 0, message: 'No registered device tokens' };
        }

        let sentCount = 0;

        // 3. For each active ad, check if already sent today, and broadcast
        for (const ad of activeAds) {
            // Check if this ad was already recorded today in customer_notifications to prevent spamming
            const [alreadySent] = await pool.query(`
                SELECT id FROM customer_notifications 
                WHERE title = ? AND DATE(created_at) = CURDATE()
                LIMIT 1
            `, [ad.title]);

            if (alreadySent.length > 0) {
                console.log(`[Daily Notification Scheduler] Ad #${ad.id} ("${ad.title}") was already sent today. Skipping.`);
                continue;
            }

            console.log(`[Daily Notification Scheduler] Broadcasting ad #${ad.id} ("${ad.title}") to ${uniqueTokens.length} devices...`);

            // Save to in-app customer notifications
            await pool.query(
                `INSERT INTO customer_notifications (title, message, image_url) VALUES (?, ?, ?)`,
                [ad.title, ad.description || 'Check out our new ad!', ad.image_url]
            );

            // Broadcast FCM push
            for (let i = 0; i < uniqueTokens.length; i += 500) {
                const batch = uniqueTokens.slice(i, i + 500);
                await sendMulticastPushNotification(
                    batch,
                    ad.title,
                    ad.description || 'Check out our new ad!',
                    {
                        type: 'notification_ad',
                        adId: String(ad.id),
                        imageUrl: ad.image_url || '',
                        title: ad.title || '',
                        description: ad.description || '',
                        vendor_id: ad.vendor_id ? String(ad.vendor_id) : '',
                        vendor_name: ad.vendor_name || '',
                        coupon_ids: ad.coupon_ids ? (typeof ad.coupon_ids === 'object' ? JSON.stringify(ad.coupon_ids) : String(ad.coupon_ids)) : '',
                        coupon_id: ad.coupon_id ? String(ad.coupon_id) : '',
                        category_ids: ad.category_ids ? (typeof ad.category_ids === 'object' ? JSON.stringify(ad.category_ids) : String(ad.category_ids)) : '',
                        category_id: ad.category_id ? String(ad.category_id) : '',
                        coupon_code: ad.coupon_code || '',
                        target_type: ad.target_type || ''
                    }
                );
            }
            sentCount++;
        }

        return { success: true, count: sentCount };
    } catch (err) {
        console.error('[Daily Notification Scheduler Error]:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Initializes a lightweight interval (every hour) that checks and runs once per day
 */
const initDailyScheduler = () => {
    // Run an initial check 30 seconds after server startup
    setTimeout(() => {
        runDailyNotificationBroadcast();
    }, 30 * 1000);

    // Then check every hour
    setInterval(() => {
        runDailyNotificationBroadcast();
    }, 60 * 60 * 1000);

    console.log('[Daily Notification Scheduler] Scheduler initialized.');
};

module.exports = {
    runDailyNotificationBroadcast,
    initDailyScheduler
};
