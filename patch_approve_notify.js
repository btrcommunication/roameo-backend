const fs = require('fs');
let c = fs.readFileSync('routes/listingVendorRoutes.js', 'utf8');

const newApprove = `exports.approveAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.body;
        
        // get ad
        const [ads] = await pool.query('SELECT * FROM ads WHERE id = ?', [id]);
        if (!ads.length) return res.status(404).json({ status: 'error', message: 'Ad not found' });
        const ad = ads[0];

        await pool.query(
            \`UPDATE ads SET approval_status = 'approved', start_date = ?, end_date = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?\`,
            [start_date, end_date, id]
        );

        // If it's a notification ad, broadcast it to all customers (user_id = NULL)
        if (ad.campaign_type === 'notification') {
            await pool.query(
                \`INSERT INTO customer_notifications (title, message, image_url) VALUES (?, ?, ?)\`,
                [ad.title, ad.description || 'Check out our new ad!', ad.image_url]
            );
        }

        return res.status(200).json({ status: 'success', message: 'Ad approved' });
    } catch (err) {
        console.error('Approve Ad Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to approve ad' });
    }
};`;

const oldApprove = `exports.approveAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.body;
        await pool.query(
            \\\`UPDATE ads SET approval_status = 'approved', start_date = ?, end_date = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?\\\`,
            [start_date, end_date, id]
        );
        return res.status(200).json({ status: 'success', message: 'Ad approved' });
    } catch (err) {
        console.error('Approve Ad Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to approve ad' });
    }
};`;

// Use simple replacement since code is exact string
c = c.replace(/exports\.approveAd = async \(req, res\) => \{[\s\S]*?return res\.status\(500\)\.json\(\{ status: 'error', message: 'Failed to approve ad' \}\);\n    \}\n\};/, newApprove);

fs.writeFileSync('routes/listingVendorRoutes.js', c);
console.log('Updated approveAd with notification broadcast');
