const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin.json');

// Initialize Firebase Admin App
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

/**
 * Sends a push notification to a specific device token
 * @param {string} token - The FCM Device Push Token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload (e.g. adId)
 */
const sendPushNotification = async (token, title, body, data = {}) => {
    try {
        console.log(`[Push Notification] Sending single push to token: ${token.substring(0, 15)}...`);
        const message = {
            notification: {
                title,
                body
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    sound: 'default'
                }
            },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            token: token
        };

        const response = await admin.messaging().send(message);
        console.log('[Push Notification] Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('[Push Notification Error] Failed to send message:', error);
        throw error;
    }
};

/**
 * Sends a push notification to multiple device tokens (Multicast)
 * Useful for broad marketing campaigns.
 */
const sendMulticastPushNotification = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) {
        console.log('[Push Notification] No device tokens to send to. Skipping push notification.');
        return { successCount: 0, failureCount: 0, responses: [] };
    }

    console.log(`[Push Notification] Attempting multicast push to ${tokens.length} device(s). Title: "${title}"`);
    
    try {
        const message = {
            notification: {
                title,
                body
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    sound: 'default'
                }
            },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[Push Notification] Multicast result: ${response.successCount} succeeded, ${response.failureCount} failed out of ${tokens.length} total.`);
        
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[Push Notification Token Error] Token index ${idx} failed:`, resp.error?.code, resp.error?.message);
                }
            });
        }
        return response;
    } catch (error) {
        console.error('[Push Notification Error] Error sending multicast message:', error);
        throw error;
    }
};

module.exports = {
    sendPushNotification,
    sendMulticastPushNotification,
    admin
};
