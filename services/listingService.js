const Listing = require("../models/Listing");

class ListingService {
    static async getNewListings(options) {
        return Listing.getNewListings(options);
    }

    static async getDealsNearby(options) {
        return Listing.getDealsNearby(options);
    }

    static async getPopularActivities(options) {
        return Listing.getPopularActivities(options);
    }

    static async getRecommendedByCategory(options) {
        return Listing.getRecommendedByCategory(options);
    }

    static async getTrendingByLocation(options) {
        return Listing.getTrendingByLocation(options);
    }

    static async createListing(listingData) {
        return Listing.create(listingData);
    }

    static async getUserWishlistCategoryIds(userId) {
        return Listing.getUserWishlistCategoryIds(userId);
    }

    static async getUserRecentlyViewedCategoryIds(userId) {
        return Listing.getUserRecentlyViewedCategoryIds(userId);
    }
}

module.exports = ListingService;
