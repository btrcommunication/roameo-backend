const fs = require('fs');

// Patch profileController
let controller = fs.readFileSync('controllers/profileController.js', 'utf8');
const notifyController = `
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const [notifications] = await pool.query(
            \`SELECT * FROM customer_notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50\`,
            [userId]
        );
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
`;
fs.writeFileSync('controllers/profileController.js', controller + notifyController);

// Patch profileRoutes
let routes = fs.readFileSync('routes/profileRoutes.js', 'utf8');
const notifyRoute = `
router.get("/notifications", profileController.getNotifications);
module.exports = router;
`;
routes = routes.replace('module.exports = router;', notifyRoute);
fs.writeFileSync('routes/profileRoutes.js', routes);

console.log('Added notifications endpoint to profile backend.');
