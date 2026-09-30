const Coupon = require("../models/Coupon");

class CouponService {
    static async getHomeCoupons({ city = null, limit = 10 }) {
        return Coupon.findActive({ city, limit });
    }
}

module.exports = CouponService;
