const User = require("../models/User");
const pool = require("../config/db");

// ─────────────────────────────────────────────
// GET /api/profile
// Get logged-in user's full profile
// ─────────────────────────────────────────────
exports.getUserProfile = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                status: "error",
                message: "Unauthorized. Please log in."
            });
        }
        
        const user = await User.findById(req.user.id);

        if (!user || !user.is_active) {
            return res.status(404).json({
                status: "error",
                message: "User not found or deactivated."
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Profile details loaded",
            data: user
        });

    } catch (err) {
        console.error("Get Profile Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to load profile."
        });
    }
};

// ─────────────────────────────────────────────
// PUT /api/profile/edit-info
// Update name, email, phone
// ─────────────────────────────────────────────
exports.editInfo = async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        if (!name && !email && !phone) {
            return res.status(400).json({
                status: "error",
                message: "Provide at least one field to update (name, email, phone)."
            });
        }

        // Check for email conflict if email is being changed
        if (email) {
            const hasConflict = await User.checkEmailConflict(email, req.user.id);
            if (hasConflict) {
                return res.status(400).json({
                    status: "error",
                    message: "This email is already in use by another account."
                });
            }
        }

        await User.updateInfo(req.user.id, { name, email, phone });

        return res.status(200).json({
            status: "success",
            message: "Personal information updated successfully",
            data: { name, email, phone }
        });

    } catch (err) {
        console.error("Edit Info Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update personal information."
        });
    }
};

// ─────────────────────────────────────────────
// PUT /api/profile/edit-address
// Update address fields
// ─────────────────────────────────────────────
exports.editAddress = async (req, res) => {
    try {
        const { address_line1, address_line2, city, district, pincode, country } = req.body;

        if (!address_line1 && !city && !district && !pincode && !country) {
            return res.status(400).json({
                status: "error",
                message: "Missing required address fields."
            });
        }

        await User.updateAddress(req.user.id, { address_line1, address_line2, city, district, pincode, country });

        return res.status(200).json({
            status: "success",
            message: "Address updated successfully",
            data: { address_line1, address_line2, city, district, pincode }
        });

    } catch (err) {
        console.error("Edit Address Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update address."
        });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const [notifications] = await pool.query(
            `SELECT * FROM customer_notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        await pool.query(
            `UPDATE customer_notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
            [notificationId, userId]
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error marking notification read:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
