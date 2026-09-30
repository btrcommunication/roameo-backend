const { verifyToken } = require("../config/jwt");
const User = require("../models/User");
const CouponService = require("../services/couponService");
const CategoryService = require("../services/categoryService");
const RecommendationService = require("../services/recommendationService");
const ListingService = require("../services/listingService");
const ActivityService = require("../services/activityService");

const parseCsvIds = (value) => {
    if (!value) return [];
    return value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((id) => Number.isFinite(id) && id > 0);
};

const resolveUserFromHeader = async (req) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        const token = authHeader.split(" ")[1];
        const decoded = verifyToken(token);
        if (!decoded || !decoded.id) {
            return null;
        }
        return await User.findById(decoded.id);
    } catch (err) {
        return null;
    }
};

exports.getHomePageDetails = async (req, res) => {
    try {
        const user = await resolveUserFromHeader(req);
        const city = req.query.city || (user && user.city) || null;
        const categoryIds = parseCsvIds(req.query.category_ids);
        const latitude = req.query.latitude ? Number(req.query.latitude) : null;
        const longitude = req.query.longitude ? Number(req.query.longitude) : null;
        const limit = Number(req.query.limit) || 10;

        const [coupons, categories, recommended, deals, newlyListed, popularActivities] = await Promise.all([
            CouponService.getHomeCoupons({ city, limit }),
            CategoryService.getCategoryTree(),
            RecommendationService.getPersonalizedRecommendations({ userId: user && user.id, city, latitude, longitude, categoryIds, limit }),
            ListingService.getDealsNearby({ city, latitude, longitude, limit: 8 }),
            ListingService.getNewListings({ city, limit: 8 }),
            ActivityService.getPopularActivities({ city, limit: 8 })
        ]);

        return res.status(200).json({
            status: "success",
            message: "Home page data retrieved successfully",
            data: {
                coupons,
                categories,
                recommended,
                deals_near_you: deals,
                newly_listed: newlyListed,
                popular_activities: popularActivities
            }
        });
    } catch (err) {
        console.error("Get Home Page Details Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to load home page data."
        });
    }
};

exports.getHomeCoupons = async (req, res) => {
    try {
        const user = await resolveUserFromHeader(req);
        const city = req.query.city || (user && user.city) || null;
        const limit = Number(req.query.limit) || 10;

        const coupons = await CouponService.getHomeCoupons({ city, limit });
        return res.status(200).json({
            status: "success",
            message: "Coupons retrieved successfully",
            data: { coupons }
        });
    } catch (err) {
        console.error("Get Home Coupons Error:", err);
        return res.status(500).json({ status: "error", message: "Failed to fetch coupons." });
    }
};

exports.getHomeCategories = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 12;
        const categories = await CategoryService.getCategoryTree();
        return res.status(200).json({
            status: "success",
            message: "Home categories retrieved successfully",
            data: { categories }
        });
    } catch (err) {
        console.error("Get Home Categories Error:", err);
        return res.status(500).json({ status: "error", message: "Failed to fetch categories." });
    }
};

exports.getRecommendedListings = async (req, res) => {
    try {
        const user = await resolveUserFromHeader(req);
        const city = req.query.city || (user && user.city) || null;
        const categoryIds = parseCsvIds(req.query.category_ids);
        const latitude = req.query.latitude ? Number(req.query.latitude) : null;
        const longitude = req.query.longitude ? Number(req.query.longitude) : null;
        const limit = Number(req.query.limit) || 10;

        const recommended = await RecommendationService.getPersonalizedRecommendations({ userId: user && user.id, city, latitude, longitude, categoryIds, limit });
        return res.status(200).json({
            status: "success",
            message: "Recommended listings retrieved successfully",
            data: { recommended }
        });
    } catch (err) {
        console.error("Get Recommended Listings Error:", err);
        return res.status(500).json({ status: "error", message: "Failed to fetch recommended listings." });
    }
};

exports.getDealsNearYou = async (req, res) => {
    try {
        const user = await resolveUserFromHeader(req);
        const city = req.query.city || (user && user.city) || null;
        const latitude = req.query.latitude ? Number(req.query.latitude) : null;
        const longitude = req.query.longitude ? Number(req.query.longitude) : null;
        const limit = Number(req.query.limit) || 10;

        const deals = await ListingService.getDealsNearby({ city, latitude, longitude, limit });
        return res.status(200).json({
            status: "success",
            message: "Nearby deals retrieved successfully",
            data: { deals }
        });
    } catch (err) {
        console.error("Get Deals Near You Error:", err);
        return res.status(500).json({ status: "error", message: "Failed to fetch nearby deals." });
    }
};

exports.getNewlyListed = async (req, res) => {
    try {
        const user = await resolveUserFromHeader(req);
        const city = req.query.city || (user && user.city) || null;
        const limit = Number(req.query.limit) || 10;

        const newlyListed = await ListingService.getNewListings({ city, limit });
        return res.status(200).json({
            status: "success",
            message: "Newly listed items retrieved successfully",
            data: { newly_listed: newlyListed }
        });
    } catch (err) {
        console.error("Get Newly Listed Error:", err);
        return res.status(500).json({ status: "error", message: "Failed to fetch newly listed items." });
    }
};

exports.getPopularActivities = async (req, res) => {
    try {
        const user = await resolveUserFromHeader(req);
        const city = req.query.city || (user && user.city) || null;
        const limit = Number(req.query.limit) || 10;

        const popularActivities = await ActivityService.getPopularActivities({ city, limit });
        return res.status(200).json({
            status: "success",
            message: "Popular activities retrieved successfully",
            data: { popular_activities: popularActivities }
        });
    } catch (err) {
        console.error("Get Popular Activities Error:", err);
        return res.status(500).json({ status: "error", message: "Failed to fetch popular activities." });
    }
};
