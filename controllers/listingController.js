const ListingService = require("../services/listingService");
const VendorService = require("../services/vendorService");

exports.getFilteredListings = async (req, res) => {
    try {
        const city = req.query.city || null;
        const limit = Number(req.query.limit) || 20;
        const listings = await ListingService.getNewListings({ city, limit });

        return res.status(200).json({
            status: "success",
            message: "Listings retrieved successfully",
            data: { listings }
        });
    } catch (err) {
        console.error("Get Filtered Listings Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch listings."
        });
    }
};

exports.getListingDetails = async (req, res) => {
    res.json({ message: "Get listing details" });
};

exports.getListingReviews = async (req, res) => {
    res.json({ message: "Get listing reviews" });
};

exports.addReview = async (req, res) => {
    res.json({ message: "Add review" });
};

exports.addListing = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: "error", message: "Authentication required." });
        }

        if (user.role_name !== "vendor") {
            return res.status(403).json({
                status: "error",
                message: "Only vendor accounts can create listings."
            });
        }

        const {
            title,
            category_id,
            price,
            description,
            city,
            district,
            discount_percentage,
            offer_label,
            valid_until
        } = req.body;

        if (!title || !category_id || !price || !description) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields: title, category_id, price, description."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                status: "error",
                message: "Listing image is required."
            });
        }

        const vendor = await VendorService.resolveVendorForUser(user);
        if (!vendor || !vendor.id) {
            return res.status(500).json({
                status: "error",
                message: "Unable to resolve vendor account for the authenticated user."
            });
        }

        const listingData = {
            title: title.trim(),
            description: description.trim(),
            category_id: Number(category_id),
            vendor_id: vendor.id,
            city: city ? city.trim() : null,
            district: district ? district.trim() : null,
            thumbnail_url: `/uploads/${req.file.filename}`,
            price: Number(price),
            discount_percentage: Number(discount_percentage || 0),
            offer_label: offer_label ? offer_label.trim() : null,
            valid_until: valid_until ? valid_until : null
        };

        const createdListing = await ListingService.createListing(listingData);

        return res.status(201).json({
            status: "success",
            message: "Listing created successfully",
            data: { listing: createdListing }
        });
    } catch (err) {
        console.error("Create Listing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to create listing."
        });
    }
};

exports.getNewListings = async (req, res) => {
    try {
        const city = req.query.city || null;
        const limit = Number(req.query.limit) || 20;
        const listings = await ListingService.getNewListings({ city, limit });

        return res.status(200).json({
            status: "success",
            message: "New listings retrieved successfully",
            data: { listings }
        });
    } catch (err) {
        console.error("Get New Listings Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch new listings."
        });
    }
};
