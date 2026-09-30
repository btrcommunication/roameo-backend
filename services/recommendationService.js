const ListingService = require("./listingService");

class RecommendationService {
    static async getPersonalizedRecommendations({ userId = null, city = null, latitude = null, longitude = null, categoryIds = [], limit = 10 }) {
        let reason = "Popular near your location";
        let listingCards = [];

        const requestedCategoryIds = Array.isArray(categoryIds) ? categoryIds : [];

        if (userId) {
            const wishlistCategories = await ListingService.getUserWishlistCategoryIds(userId);
            const recentlyViewedCategories = await ListingService.getUserRecentlyViewedCategoryIds(userId);
            const preferredCategoryIds = requestedCategoryIds.length
                ? requestedCategoryIds
                : (wishlistCategories.length ? wishlistCategories : recentlyViewedCategories);

            if (preferredCategoryIds.length) {
                listingCards = await ListingService.getRecommendedByCategory({ city, categoryIds: preferredCategoryIds, limit });
                if (listingCards.length > 0) {
                    const topCategory = listingCards[0].category.name || "your favorites";
                    reason = `Recommended because you like ${topCategory}`;
                }
            }
        }

        if (listingCards.length === 0) {
            listingCards = await ListingService.getTrendingByLocation({ city, limit });
            reason = "Popular near your location";
        }

        return listingCards.map((listing) => ({
            ...listing,
            reason
        }));
    }
}

module.exports = RecommendationService;
