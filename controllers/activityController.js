const ActivityService = require("../services/activityService");

exports.getPopularActivities = async (req, res) => {
    try {
        const city = req.query.city || null;
        const limit = Number(req.query.limit) || 10;

        const activities = await ActivityService.getPopularActivities({ city, limit });

        return res.status(200).json({
            status: "success",
            message: "Popular activities retrieved successfully",
            data: { activities }
        });
    } catch (err) {
        console.error("Get Popular Activities Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch popular activities."
        });
    }
};
