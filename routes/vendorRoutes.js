const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/**
 * @swagger
 * tags:
 *   name: Vendor
 *   description: Vendor authentication and management
 */

// SIGNUP - Uses ONLY vendors table
router.post("/signup", async (req, res) => {
    try {
        const { 
            name, 
            email, 
            password, 
            phone, 
            address, 
            business_description,
            latitude,
            longitude,
            service_radius_meters 
        } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        // Check if vendor with same email exists
        const [existingEmail] = await pool.query(
            "SELECT id FROM vendors WHERE email = ?",
            [email]
        );
        
        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Vendor with this email already exists"
            });
        }

        // Check if vendor with same name exists
        const [existingName] = await pool.query(
            "SELECT id FROM vendors WHERE name = ?",
            [name]
        );
        
        if (existingName.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Vendor with this name already exists"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert into vendors table ONLY
        const [result] = await pool.query(
            `INSERT INTO vendors (
                name, 
                email, 
                password_hash,
                phone, 
                address, 
                business_description, 
                latitude, 
                longitude, 
                service_radius_meters, 
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                name, 
                email, 
                hashedPassword,
                phone || null, 
                address || null, 
                business_description || null,
                latitude || null,
                longitude || null,
                service_radius_meters || 5000
            ]
        );

        const vendorId = result.insertId;

        // Generate JWT token
        const token = jwt.sign(
            { 
                vendor_id: vendorId,
                email: email,
                role: 'vendor'
            },
            process.env.JWT_SECRET || 'roameo_secret_key_2024',
            { expiresIn: "7d" }
        );

        // Get the created vendor
        const [vendors] = await pool.query(
            `SELECT id, name, email, phone, address, latitude, longitude, 
                    service_radius_meters, business_description, is_active, 
                    reward_points, tier_id, created_at 
             FROM vendors WHERE id = ?`,
            [vendorId]
        );
        const vendor = vendors[0];

        res.status(201).json({
            success: true,
            message: "Vendor registered successfully",
            token: token,
            vendor: {
                id: vendor.id,
                name: vendor.name,
                email: vendor.email,
                phone: vendor.phone,
                address: vendor.address,
                latitude: vendor.latitude,
                longitude: vendor.longitude,
                service_radius_meters: vendor.service_radius_meters,
                business_description: vendor.business_description,
                is_active: vendor.is_active,
                reward_points: vendor.reward_points || 0,
                tier_id: vendor.tier_id,
                created_at: vendor.created_at
            }
        });

    } catch (error) {
        console.error("Vendor signup error:", error);
        console.error("Error details:", error.message);
        
        res.status(500).json({
            success: false,
            message: "Server error during vendor registration",
            error: error.message
        });
    }
});

// LOGIN - Uses ONLY vendors table
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find vendor by email
        const [vendors] = await pool.query(
            `SELECT v.id, v.name, v.latitude, v.longitude, v.service_radius_meters, 
                    v.is_active, v.created_at, v.email, v.phone, v.address, 
                    v.business_description, v.reward_points, v.tier_id, v.password_hash,
                    t.tier_name as tier_status
             FROM vendors v
             LEFT JOIN reward_tiers t ON v.tier_id = t.id
             WHERE v.email = ?`,
            [email]
        );
        const vendor = vendors[0];

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        // Check if vendor is active
        if (vendor.is_active === 0) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated. Please contact support."
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, vendor.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                vendor_id: vendor.id,
                email: vendor.email,
                role: 'vendor'
            },
            process.env.JWT_SECRET || 'roameo_secret_key_2024',
            { expiresIn: "7d" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token: token,
            vendor: {
                id: vendor.id,
                name: vendor.name,
                email: vendor.email,
                phone: vendor.phone,
                address: vendor.address,
                latitude: vendor.latitude,
                longitude: vendor.longitude,
                service_radius_meters: vendor.service_radius_meters,
                business_description: vendor.business_description,
                reward_points: vendor.reward_points || 0,
                tier_id: vendor.tier_id,
                tier_status: vendor.tier_status,
                is_active: vendor.is_active,
                created_at: vendor.created_at
            }
        });

    } catch (error) {
        console.error("Vendor login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during vendor login"
        });
    }
});

// GET VENDOR PROFILE
router.get("/profile", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(' ')[1];
        
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'roameo_secret_key_2024');
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const vendorId = decoded.vendor_id;
        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Vendor ID not found"
            });
        }

        const [vendors] = await pool.query(
            `SELECT v.id, v.name, v.latitude, v.longitude, v.service_radius_meters, 
                    v.is_active, v.created_at, v.email, v.phone, v.address, 
                    v.business_description, v.reward_points, v.tier_id,
                    t.tier_name as tier_status
             FROM vendors v
             LEFT JOIN reward_tiers t ON v.tier_id = t.id
             WHERE v.id = ?`,
            [vendorId]
        );
        const vendor = vendors[0];

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        res.status(200).json({
            success: true,
            vendor: vendor
        });

    } catch (error) {
        console.error("Get vendor profile error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching vendor profile"
        });
    }
});
// GET VENDOR ORDERS
router.get("/orders", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'roameo_secret_key_2024');
        } catch (error) {
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }

        const vendorId = decoded.vendor_id || decoded.id;
        if (!vendorId) {
            return res.status(401).json({ success: false, message: "Unauthorized - Vendor ID not found" });
        }

        // Find all orders where items contain a coupon belonging to this vendor
        const query = `
            SELECT DISTINCT o.* 
            FROM coupon_orders o, 
            JSON_TABLE(o.items, '$[*]' COLUMNS(coupon_id INT PATH '$.coupon_id')) AS jt
            JOIN coupons c ON c.id = jt.coupon_id
            WHERE c.vendor_id = ?
            ORDER BY o.created_at DESC
        `;
        const [orders] = await pool.query(query, [vendorId]);

        // Parse items and payment details back from string if needed
        const parsedOrders = orders.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            payment_details: typeof order.payment_details === 'string' ? JSON.parse(order.payment_details) : (order.payment_details || null)
        }));

        res.status(200).json({ success: true, orders: parsedOrders });
    } catch (error) {
        console.error("Get vendor orders error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching orders" });
    }
});
router.get("/orders/:order_id/issues", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'roameo_secret_key_2024');
        const vendorId = decoded.vendor_id || decoded.id;

        const [issues] = await pool.query(
            'SELECT i.*, u.name as customer_name FROM order_issues i JOIN users u ON i.customer_id = u.id WHERE i.order_id = ? AND i.vendor_id = ? ORDER BY i.created_at DESC',
            [req.params.order_id, vendorId]
        );
        res.status(200).json({ success: true, issues });
    } catch (error) {
        console.error("Get order issues error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;