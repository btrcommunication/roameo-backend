const User = require("../models/User");
const Vendor = require("../models/Vendor");

class VendorService {
    static async resolveVendorForUser(user) {
        if (!user || user.role_name !== "vendor") {
            return null;
        }

        let vendor = await Vendor.findByName(user.name || user.email || "");
        if (vendor) return vendor;

        const fullUser = await User.findById(user.id);
        const vendorName = fullUser?.name || fullUser?.email || `vendor-${user.id}`;

        vendor = await Vendor.create({
            name: vendorName
        });

        return vendor;
    }
}

module.exports = VendorService;
