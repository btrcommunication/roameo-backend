const pool = require('../config/db');
const Category = require("../models/Category");
const Listing = require("../models/Listing");
const Review = require("../models/Review");
const RewardTier = require("../models/RewardTier");
const Vendor = require("../models/Vendor");

// ─────────────────────────────────────────────
// POST /api/admin/category
// Create a new category
// ─────────────────────────────────────────────
exports.createCategory = async (req, res) => {
    try {
        const { category_name, parent_id, level, image_url } = req.body;

        if (!category_name) {
            return res.status(400).json({
                status: "error",
                message: "Category name is required."
            });
        }

        const categoryData = await Category.create({ 
            category_name, 
            parent_id, 
            level, 
            image_url 
        });

        return res.status(200).json({
            status: "success",
            message: "Category created successfully",
            data: categoryData
        });

    } catch (err) {
        console.error("Create Category Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to create category."
        });
    }
};

exports.getAllListings = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, vendor_id } = req.query;
        const listings = await Listing.findAllAdmin({ page, limit, category, vendor_id });
        return res.status(200).json({
            status: "success",
            message: "All listings retrieved successfully for admin.",
            data: listings
        });
    } catch (err) {
        console.error("Get All Listings Admin Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch listings due to a database error."
        });
    }
};

exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const updated = await Listing.updateAdmin(id, updateData);
        if (!updated) {
            return res.status(404).json({ status: "error", message: "Listing not found." });
        }
        return res.status(200).json({
            status: "success",
            message: "Listing updated successfully by admin.",
            data: updated
        });
    } catch (err) {
        console.error("Update Listing Admin Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update listing details due to a server error."
        });
    }
};

exports.deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        await Listing.deleteAdmin(id);
        return res.status(200).json({
            status: "success",
            message: "Listing has been permanently deleted by admin.",
            data: { deleted_listing_id: Number(id) }
        });
    } catch (err) {
        console.error("Delete Listing Admin Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to delete the listing due to an internal server error."
        });
    }
};

exports.replyToReview = async (req, res) => {
    try {
        const { review_id, reply_comment } = req.body;
        const reply = await Review.addAdminReply(review_id, reply_comment);
        if (!reply) {
            return res.status(404).json({ status: "error", message: "Review not found." });
        }
        return res.status(200).json({
            status: "success",
            message: "Admin reply added successfully",
            data: {
                reply_id: reply.id,
                review_id: reply.id,
                reply_comment: reply.admin_reply,
                replied_at: reply.replied_at
            }
        });
    } catch (err) {
        console.error("Reply to Review Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to add admin reply."
        });
    }
};

exports.getRewardTiers = async (req, res) => {
    try {
        const tiers = await RewardTier.findAll();
        return res.status(200).json({
            status: "success",
            message: "Reward tiers retrieved successfully.",
            data: tiers
        });
    } catch (err) {
        console.error("Get Reward Tiers Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch reward tiers."
        });
    }
};

exports.updateRewardTier = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await RewardTier.update(id, req.body);
        if (!updated) {
            return res.status(404).json({ status: "error", message: "Tier not found." });
        }
        return res.status(200).json({
            status: "success",
            message: "Reward tier criteria and benefits updated successfully.",
            data: updated
        });
    } catch (err) {
        console.error("Update Reward Tier Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update reward tier."
        });
    }
};

exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await Vendor.findAllWithMetrics();
        return res.status(200).json({
            status: "success",
            message: "Vendors list retrieved successfully.",
            data: vendors
        });
    } catch (err) {
        console.error("Get All Vendors Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch vendors."
        });
    }
};

exports.updateVendorProfile = async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const updated = await Vendor.updateProfile(vendor_id, req.body);
        if (!updated) {
            return res.status(404).json({ status: "error", message: "Vendor not found." });
        }
        return res.status(200).json({
            status: "success",
            message: "Vendor profile successfully updated by admin.",
            data: {
                vendor_id: updated.id,
                business_name: updated.name,
                phone: updated.phone,
                address: updated.address,
                business_description: updated.business_description
            }
        });
    } catch (err) {
        console.error("Update Vendor Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update vendor profile."
        });
    }
};

exports.adjustVendorRewards = async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const updated = await Vendor.adjustRewards(vendor_id, req.body);
        if (!updated) {
            return res.status(404).json({ status: "error", message: "Vendor with the specified ID could not be located." });
        }
        return res.status(200).json({
            status: "success",
            message: "Vendor rewards matrix updated successfully.",
            data: {
                vendor_id: updated.id,
                new_tier: updated.tier_status,
                new_reward_points: updated.reward_points
            }
        });
    } catch (err) {
        console.error("Adjust Vendor Rewards Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to adjust vendor rewards."
        });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const query = `
            SELECT o.*, 
                   u.name AS customer_name, 
                   u.email AS customer_email,
                   (SELECT v.name 
                    FROM coupons c 
                    JOIN vendors v ON c.vendor_id = v.id 
                    WHERE c.id = JSON_UNQUOTE(JSON_EXTRACT(o.items, '$[0].coupon_id')) 
                    LIMIT 1) as vendor_name
            FROM coupon_orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `;
        const [orders] = await pool.query(query);
        
        const serializedOrders = orders.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            payment_details: typeof order.payment_details === 'string' ? JSON.parse(order.payment_details) : (order.payment_details || null)
        }));

        return res.status(200).json({
            status: 'success',
            data: { orders: serializedOrders }
        });
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
