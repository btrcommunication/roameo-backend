const fs = require('fs');
let content = fs.readFileSync('routes/listingVendorRoutes.js', 'utf8');

const approveFunctions = `
exports.approveAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.body;
        await pool.query(
            \`UPDATE ads SET approval_status = 'approved', start_date = ?, end_date = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?\`,
            [start_date, end_date, id]
        );
        return res.status(200).json({ status: 'success', message: 'Ad approved' });
    } catch (err) {
        console.error('Approve Ad Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to approve ad' });
    }
};

exports.disapproveAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        await pool.query(
            \`UPDATE ads SET approval_status = 'disapproved', disapproval_reason = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?\`,
            [reason, id]
        );
        return res.status(200).json({ status: 'success', message: 'Ad disapproved' });
    } catch (err) {
        console.error('Disapprove Ad Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to disapprove ad' });
    }
};
`;

content = content.replace(
    'exports.toggleAdStatus = async (req, res) => {',
    approveFunctions + '\nexports.toggleAdStatus = async (req, res) => {'
);

const routes = `
router.put("/ads/:id/approve", exports.approveAd);
router.put("/ads/:id/disapprove", exports.disapproveAd);
router.patch("/ads/:id/toggle", exports.toggleAdStatus);
`;

content = content.replace('router.patch("/ads/:id/toggle", exports.toggleAdStatus);', routes);

fs.writeFileSync('routes/listingVendorRoutes.js', content);
console.log('Added approveAd and disapproveAd to backend.');
