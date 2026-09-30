const ListingService = require("./listingService");

class ActivityService {
    static async getPopularActivities({ city = null, limit = 10 }) {
        return ListingService.getPopularActivities({ city, limit });
    }
}

module.exports = ActivityService;
