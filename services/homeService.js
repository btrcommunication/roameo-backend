const CouponService = require("./couponService");
const CategoryService = require("./categoryService");
const RecommendationService = require("./recommendationService");
const ListingService = require("./listingService");
const ActivityService = require("./activityService");

exports.getAvailableCoupons = async (options) => CouponService.getHomeCoupons(options);
exports.getHomepageCategories = async (limit = 12) => CategoryService.getCategoryTree();
exports.getRecommendedListings = async (options) => RecommendationService.getPersonalizedRecommendations(options);
exports.getDealsNearUser = async (options) => ListingService.getDealsNearby(options);
exports.getNewlyListed = async (options) => ListingService.getNewListings(options);
exports.getPopularActivities = async (options) => ActivityService.getPopularActivities(options);
