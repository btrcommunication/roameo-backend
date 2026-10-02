const router = require("express").Router();
const pool = require("../config/db");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendVendorAcceptedEmail, sendVendorRejectedEmail } = require("../services/emailService");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// ==================== HELPER FUNCTIONS ====================

const saveImage = async (file) => {
    if (!file) return null;
    
    const uploadDir = path.join(__dirname, "../uploads/listings");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filepath, file.buffer);
    return `/uploads/listings/${filename}`;
};

const deleteImage = async (imageUrl) => {
    if (!imageUrl) return;
    
    const imagePath = path.join(__dirname, "..", imageUrl);
    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }
};

// ==================== VENDOR AUTH FUNCTIONS ====================

// POST /api/vendorcreation/signup
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
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields: name, email, password, phone"
            });
        }

        // Check if vendor already exists
        const [existingVendors] = await pool.query(
            "SELECT id FROM vendors WHERE email = ?",
            [email]
        );

        if (existingVendors.length > 0) {
            return res.status(400).json({
                status: "error",
                message: "Vendor with this email already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert vendor - FIXED: Using password_hash instead of password
        const [result] = await pool.query(
            `INSERT INTO vendors (
                name, email, password_hash, phone, address, 
                business_description, latitude, longitude, 
                service_radius_meters, approval_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
                name, email, hashedPassword, phone, address || null,
                business_description || null, 
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null,
                service_radius_meters ? parseInt(service_radius_meters) : 5000
            ]
        );

        return res.status(201).json({
            status: "success",
            message: "Account created successfully. Waiting for approval.",
            data: {
                id: result.insertId,
                name,
                email,
                phone,
                approval_status: "pending"
            }
        });

    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to create account. Please try again."
        });
    }
});

// POST /api/vendorcreation/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required"
            });
        }

        // Find vendor by email - FIXED: Using password_hash instead of password
        const [vendors] = await pool.query(
            `SELECT id, name, email, password_hash, phone, address, 
                    business_description, approval_status, is_active 
             FROM vendors WHERE email = ?`,
            [email]
        );

        if (vendors.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password"
            });
        }

        const vendor = vendors[0];

        // Check if vendor is deactivated
        if (vendor.is_active === 0) {
            return res.status(403).json({
                status: "error",
                message: "Your account has been deactivated. Please contact support."
            });
        }

        // Check if vendor is approved
        if (vendor.approval_status !== "approved") {
            return res.status(403).json({
                status: "error",
                message: `Your account is ${vendor.approval_status}. Please wait for approval.`
            });
        }

        // Compare passwords - FIXED: Using password_hash
        const isPasswordValid = await bcrypt.compare(password, vendor.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: vendor.id, 
                email: vendor.email,
                name: vendor.name 
            },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        // Remove password_hash from response
        delete vendor.password_hash;

        return res.status(200).json({
            status: "success",
            message: "Login successful",
            data: {
                token,
                vendor
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            status: "error",
            message: "Login failed. Please try again."
        });
    }
});

// ==================== LISTING MODEL FUNCTIONS ====================

// GET /api/vendorcreation
// Return every vendor without exposing password_hash
router.get("/", async (req, res) => {
    try {
        const [vendors] = await pool.query(`
            SELECT
                id,
                name,
                latitude,
                longitude,
                service_radius_meters,
                is_active,
                created_at,
                email,
                phone,
                address,
                business_description,
                reward_points,
                tier_id,
                approval_status,
                disapproval_reason
            FROM vendors
            ORDER BY created_at DESC
        `);

        return res.status(200).json({
            status: "success",
            data: vendors
        });
    } catch (error) {
        console.error("Get Vendors Error:", error);

        return res.status(500).json({
            status: "error",
            message: "Failed to fetch vendors"
        });
    }
});

// PUT /api/vendorcreation/:id
// Approve, disapprove, or reset a vendor to pending
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { approval_status, disapproval_reason } = req.body;

        const allowedStatuses = [
            "pending",
            "approved",
            "disapproved"
        ];

        if (!allowedStatuses.includes(approval_status)) {
            return res.status(400).json({
                status: "error",
                message:
                    "approval_status must be pending, approved, or disapproved"
            });
        }

        if (
            approval_status === "disapproved" &&
            (!disapproval_reason || !disapproval_reason.trim())
        ) {
            return res.status(400).json({
                status: "error",
                message: "Disapproval reason is required"
            });
        }

        const [existingVendors] = await pool.query(
            "SELECT id FROM vendors WHERE id = ?",
            [id]
        );

        if (existingVendors.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Vendor not found"
            });
        }

        const reason =
            approval_status === "disapproved"
                ? disapproval_reason.trim()
                : null;

        await pool.query(
            `UPDATE vendors
             SET approval_status = ?,
                 disapproval_reason = ?
             WHERE id = ?`,
            [approval_status, reason, id]
        );

        const [updatedVendors] = await pool.query(
            `SELECT
                id,
                name,
                latitude,
                longitude,
                service_radius_meters,
                is_active,
                created_at,
                email,
                phone,
                address,
                business_description,
                reward_points,
                tier_id,
                approval_status,
                disapproval_reason
             FROM vendors
             WHERE id = ?`,
            [id]
        );

        const updatedVendor = updatedVendors[0];

        // Trigger Vendor Approval/Rejection Email in background (non-blocking)
        if (updatedVendor && updatedVendor.email) {
            (async () => {
                try {
                    if (approval_status === "approved") {
                        const frontendUrl = process.env.VENDOR_FRONTEND_URL || "https://roameo.co.za";
                        const loginLink = `${frontendUrl.replace(/\/$/, '')}/auth/login`;
                        await sendVendorAcceptedEmail(updatedVendor.email, {
                            vendorName: updatedVendor.name,
                            applicationId: String(updatedVendor.id),
                            vendorId: String(updatedVendor.id),
                            approvalDate: new Date().toLocaleDateString(),
                            loginLink
                        });
                    } else if (approval_status === "disapproved") {
                        await sendVendorRejectedEmail(updatedVendor.email, {
                            vendorName: updatedVendor.name,
                            applicationId: String(updatedVendor.id),
                            applicationDate: updatedVendor.created_at ? new Date(updatedVendor.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                            reason: updatedVendor.disapproval_reason || "Application criteria not met.",
                            supportEmail: process.env.SUPPORT_EMAIL || "roameo@btrcommunication.com"
                        });
                    }
                } catch (mailErr) {
                    console.error(`[EmailService] Failed to send vendor status email to ${updatedVendor.email}:`, mailErr.message);
                }
            })();
        }

        return res.status(200).json({
            status: "success",
            message:
                approval_status === "approved"
                    ? "Vendor approved successfully"
                    : approval_status === "disapproved"
                        ? "Vendor disapproved successfully"
                        : "Vendor status changed to pending",
            data: updatedVendors[0]
        });
    } catch (error) {
        console.error("Update Vendor Status Error:", error);

        return res.status(500).json({
            status: "error",
            message: "Failed to update vendor status"
        });
    }
});

const ListingModel = {
    // Get all listings (supports optional filters like category, search, active state)
    getAllListings: async (filters = {}) => {
        let query = `
            SELECT 
                vl.id, vl.title, vl.category, vl.price, vl.short_description,
                vl.latitude, vl.longitude, vl.location_address,
                vl.is_active, vl.created_at, vl.updated_at,
                vl.image_url,
                v.id as vendor_id, v.name as vendor_name,
                (SELECT AVG(r.rating) FROM reviews r WHERE r.listing_id = vl.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = vl.id) as review_count
            FROM vendor_listings vl
            LEFT JOIN vendors v ON vl.vendor_id = v.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.vendor_id) {
            query += ` AND vl.vendor_id = ?`;
            params.push(filters.vendor_id);
        }

        if (filters.is_active !== undefined && filters.is_active !== null) {
            query += ` AND vl.is_active = ?`;
            params.push(filters.is_active);
        }
        
        if (filters.category) {
            query += ` AND vl.category LIKE ?`;
            params.push(`%${filters.category}%`);
        }
        
        if (filters.search) {
            query += ` AND (vl.title LIKE ? OR vl.short_description LIKE ? OR vl.category LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }
        
        if (filters.city) {
            query += ` AND vl.location_address LIKE ?`;
            params.push(`%${filters.city}%`);
        }
        
        query += ` ORDER BY vl.created_at DESC`;
        
        if (filters.limit) {
            query += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }
        
        const [rows] = await pool.query(query, params);
        return rows;
    },

    // Get single listing by ID
    getListingById: async (id) => {
        const [rows] = await pool.query(
            `SELECT 
                vl.id, vl.title, vl.category, vl.price, vl.short_description,
                vl.latitude, vl.longitude, vl.location_address,
                vl.is_active, vl.created_at, vl.updated_at,
                vl.image_url,
                v.id as vendor_id, v.name as vendor_name,
                (SELECT AVG(r.rating) FROM reviews r WHERE r.listing_id = vl.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = vl.id) as review_count
             FROM vendor_listings vl
             LEFT JOIN vendors v ON vl.vendor_id = v.id
             WHERE vl.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    // Create a new listing
    createListing: async (listingData) => {
        const {
            vendor_id,
            title,
            category,
            price,
            short_description,
            latitude,
            longitude,
            location_address,
            image_url,
            is_active = 1
        } = listingData;

        const finalVendorId = vendor_id || 1; // Default to vendor 1

        const [result] = await pool.query(
            `INSERT INTO vendor_listings (
                vendor_id, title, category, price, short_description,
                latitude, longitude, location_address, image_url, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalVendorId,
                title,
                category,
                price,
                short_description || null,
                latitude || null,
                longitude || null,
                location_address || null,
                image_url || null,
                is_active ? 1 : 0
            ]
        );

        return await ListingModel.getListingById(result.insertId);
    },

    // Update a listing
    updateListing: async (id, listingData) => {
        const {
            title,
            category,
            price,
            short_description,
            latitude,
            longitude,
            location_address,
            image_url,
            is_active
        } = listingData;

        await pool.query(
            `UPDATE vendor_listings 
             SET 
                title = COALESCE(?, title),
                category = COALESCE(?, category),
                price = COALESCE(?, price),
                short_description = COALESCE(?, short_description),
                latitude = COALESCE(?, latitude),
                longitude = COALESCE(?, longitude),
                location_address = COALESCE(?, location_address),
                image_url = COALESCE(?, image_url),
                is_active = COALESCE(?, is_active),
                updated_at = NOW()
             WHERE id = ?`,
            [
                title,
                category,
                price,
                short_description,
                latitude,
                longitude,
                location_address,
                image_url,
                is_active,
                id
            ]
        );

        return await ListingModel.getListingById(id);
    },

    // Delete a listing
    deleteListing: async (id) => {
        const [result] = await pool.query(
            `DELETE FROM vendor_listings WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    },

    // Get global listing statistics
    getGlobalStats: async (vendor_id = null) => {
        let query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
             FROM vendor_listings
        `;
        const params = [];

        if (vendor_id) {
            query += ` WHERE vendor_id = ?`;
            params.push(vendor_id);
        }

        const [rows] = await pool.query(query, params);
        return rows[0] || { total: 0, active: 0, inactive: 0 };
    },

    // Search all listings
    searchListings: async (searchQuery, vendor_id = null) => {
        let query = `
            SELECT 
                vl.id, vl.title, vl.category, vl.price, vl.short_description,
                vl.latitude, vl.longitude, vl.location_address,
                vl.is_active, vl.created_at, vl.updated_at,
                vl.image_url,
                v.id as vendor_id, v.name as vendor_name,
                (SELECT AVG(r.rating) FROM reviews r WHERE r.listing_id = vl.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = vl.id) as review_count
             FROM vendor_listings vl
             LEFT JOIN vendors v ON vl.vendor_id = v.id
             WHERE (vl.title LIKE ? OR vl.short_description LIKE ? OR vl.category LIKE ?)
        `;
        const params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];

        if (vendor_id) {
            query += ` AND vl.vendor_id = ?`;
            params.push(vendor_id);
        }

        query += ` ORDER BY vl.created_at DESC`;

        const [rows] = await pool.query(query, params);
        return rows;
    }
};

// ==================== CONTROLLER FUNCTIONS ====================

// Get all vendors (public)
exports.getAllVendors = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM vendors ORDER BY created_at DESC");
        return res.status(200).json({
            status: "success",
            data: rows
        });
    } catch (err) {
        console.error("Get All Vendors Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch vendors"
        });
    }
};

// Get all listings (public)
exports.getVendorListings = async (req, res) => {
    try {
        const { search, category, is_active, limit, vendor_id } = req.query;
        const filters = {};
        
        if (search) filters.search = search;
        if (category) filters.category = category;
        if (is_active !== undefined && is_active !== null) filters.is_active = is_active;
        if (limit) filters.limit = parseInt(limit);
        if (vendor_id) filters.vendor_id = vendor_id;

        const listings = await ListingModel.getAllListings(filters);
        
        return res.status(200).json({
            status: "success",
            data: listings
        });
    } catch (err) {
        console.error("Get Listings Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch listings"
        });
    }
};

// Get single listing by ID (public)
exports.getListingById = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await ListingModel.getListingById(id);
        
        if (!listing) {
            return res.status(404).json({
                status: "error",
                message: "Listing not found"
            });
        }

        return res.status(200).json({
            status: "success",
            data: listing
        });
    } catch (err) {
        console.error("Get Listing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch listing"
        });
    }
};

// Create new listing (public)
exports.createListing = async (req, res) => {
    try {
        const { vendor_id, title, category, price, short_description, latitude, longitude, location_address, is_active } = req.body;
        const imageFile = req.file; console.log('Received body:', req.body); console.log('Received file:', req.file);

        if (!title || !category || !price) {
            return res.status(400).json({
                status: "error",
                message: "Title, category, and price are required"
            });
        }

        let imageUrl = null;
        if (imageFile) {
            imageUrl = await saveImage(imageFile);
        }

        const finalVendorId = vendor_id || 1;

        const listing = await ListingModel.createListing({
            vendor_id: finalVendorId,
            title,
            category,
            price: parseFloat(price),
            short_description,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            location_address,
            image_url: imageUrl,
            is_active: is_active !== undefined ? is_active : true
        });

        return res.status(201).json({
            status: "success",
            message: "Listing created successfully",
            data: listing
        });
    } catch (err) {
        console.error("Create Listing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to create listing: " + err.message
        });
    }
};

// Update listing (public)
exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, price, short_description, latitude, longitude, location_address, is_active } = req.body;
        const imageFile = req.file;

        const existingListing = await ListingModel.getListingById(id);
        if (!existingListing) {
            return res.status(404).json({
                status: "error",
                message: "Listing not found"
            });
        }

        let imageUrl = existingListing.image_url;
        if (imageFile) {
            if (imageUrl) {
                await deleteImage(imageUrl);
            }
            imageUrl = await saveImage(imageFile);
        }

        const listing = await ListingModel.updateListing(id, {
            title,
            category,
            price: price ? parseFloat(price) : undefined,
            short_description,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            location_address,
            image_url: imageUrl,
            is_active: is_active !== undefined ? is_active : undefined
        });

        return res.status(200).json({
            status: "success",
            message: "Listing updated successfully",
            data: listing
        });
    } catch (err) {
        console.error("Update Listing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update listing"
        });
    }
};

// Delete listing (public)
exports.deleteListing = async (req, res) => {
    try {
        const { id } = req.params;

        const existingListing = await ListingModel.getListingById(id);
        if (!existingListing) {
            return res.status(404).json({
                status: "error",
                message: "Listing not found"
            });
        }

        if (existingListing.image_url) {
            await deleteImage(existingListing.image_url);
        }

        const deleted = await ListingModel.deleteListing(id);
        
        if (!deleted) {
            return res.status(404).json({
                status: "error",
                message: "Listing not found"
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Listing deleted successfully"
        });
    } catch (err) {
        console.error("Delete Listing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to delete listing"
        });
    }
};

// Search listings (public)
exports.searchListings = async (req, res) => {
    try {
        const { q, vendor_id } = req.query;
        if (!q) {
            return res.status(400).json({
                status: "error",
                message: "Search query is required"
            });
        }

        const listings = await ListingModel.searchListings(q, vendor_id);
        
        return res.status(200).json({
            status: "success",
            data: listings
        });
    } catch (err) {
        console.error("Search Listings Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to search listings"
        });
    }
};

// Get stats (public)
exports.getVendorStats = async (req, res) => {
    try {
        const { vendor_id } = req.query;
        const stats = await ListingModel.getGlobalStats(vendor_id);
        
        return res.status(200).json({
            status: "success",
            data: stats
        });
    } catch (err) {
        console.error("Get Stats Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch stats"
        });
    }
};

// Approve listing
exports.approveListing = async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingListing = await ListingModel.getListingById(id);
        if (!existingListing) {
            return res.status(404).json({
                status: "error",
                message: "Listing not found"
            });
        }

        await pool.query(
            `UPDATE vendor_listings SET is_active = 1, updated_at = NOW() WHERE id = ?`,
            [id]
        );

        const updatedListing = await ListingModel.getListingById(id);
        
        return res.status(200).json({
            status: "success",
            message: "Listing approved successfully",
            data: updatedListing
        });
    } catch (err) {
        console.error("Approve Listing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to approve listing"
        });
    }
};

// Disapprove listing
exports.disapproveListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                status: "error",
                message: "Disapproval reason is required"
            });
        }

        const existingListing = await ListingModel.getListingById(id);
        if (!existingListing) {
            return res.status(404).json({
                status: "error",
                message: "Listing not found"
            });
        }

        await pool.query(
            `UPDATE vendor_listings SET is_active = 0, updated_at = NOW() WHERE id = ?`,
            [id]
        );

        const updatedListing = await ListingModel.getListingById(id);
        
        return res.status(200).json({
            status: "success",
            message: "Listing disapproved successfully",
            data: updatedListing
        });
    } catch (err) {
        console.error("Disapprove Listing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to disapprove listing"
        });
    }
};

// ==================== ADS CONTROLLER FUNCTIONS ====================

// Get all ads
exports.getAds = async (req, res) => {
    try {
        const { ad_type, is_active, vendor_id } = req.query;
        let query = `
            SELECT a.*, v.name as vendor_name, c.category_name as category_name, cp.title as coupon_title
            FROM ads a
            LEFT JOIN vendors v ON a.vendor_id = v.id
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN coupons cp ON a.coupon_id = cp.id
            WHERE 1=1
        `;
        const params = [];

        if (ad_type) {
            query += ` AND a.ad_type = ?`;
            params.push(ad_type);
        }

        if (is_active !== undefined && is_active !== null) {
            query += ` AND a.is_active = ?`;
            params.push(parseInt(is_active));
        }

        if (vendor_id) {
            query += ` AND a.vendor_id = ?`;
            params.push(vendor_id);
        }

        query += ` ORDER BY a.display_order ASC, a.created_at DESC`;

        const [rows] = await pool.query(query, params);
        
        return res.status(200).json({
            status: "success",
            data: rows
        });
    } catch (err) {
        console.error("Get Ads Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch ads"
        });
    }
};

// Get single ad by ID
exports.getAdById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT a.*, v.name as vendor_name, c.category_name as category_name, cp.title as coupon_title
             FROM ads a
             LEFT JOIN vendors v ON a.vendor_id = v.id
             LEFT JOIN categories c ON a.category_id = c.id
             LEFT JOIN coupons cp ON a.coupon_id = cp.id
             WHERE a.id = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Ad not found"
            });
        }

        return res.status(200).json({
            status: "success",
            data: rows[0]
        });
    } catch (err) {
        console.error("Get Ad Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch ad"
        });
    }
};

// Create new ad
exports.createAd = async (req, res) => {
    try {
        const {
            title,
            description,
            ad_type,
            vendor_id,
            coupon_code,
            link_url,
            points_required,
            display_order,
            is_active,
            start_date,
            end_date,
            campaign_type,
            price,
            discount,
            discount_type,
            target_type,
            category_ids,
            coupon_ids,
            category_id,
            coupon_id
        } = req.body;

        const imageFile = req.file;

        if (!title || !ad_type) {
            return res.status(400).json({
                status: "error",
                message: "Title and ad type are required"
            });
        }

        let imageUrl = null;
        if (imageFile) {
            imageUrl = await saveImage(imageFile);
        }

        let normalizedTargetType = target_type || 'all';
        let normalizedCategoryIds = category_ids ? (typeof category_ids === 'object' ? JSON.stringify(category_ids) : String(category_ids)) : null;
        let normalizedCouponIds = coupon_ids ? (typeof coupon_ids === 'object' ? JSON.stringify(coupon_ids) : String(coupon_ids)) : null;
        let primaryCategoryId = category_id ? Number(category_id) : null;
        let primaryCouponId = coupon_id ? Number(coupon_id) : null;
        let normalizedDiscountType = discount_type === 'lumpsum' ? 'lumpsum' : 'percentage';

        const [result] = await pool.query(
            `INSERT INTO ads (
                title, description, image_url, ad_type, vendor_id, 
                coupon_code, link_url, points_required, display_order, 
                is_active, start_date, end_date, campaign_type, price, discount, discount_type,
                target_type, category_ids, coupon_ids, category_id, coupon_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description || null,
                imageUrl,
                ad_type,
                vendor_id || null,
                coupon_code || null,
                link_url || null,
                points_required || 0,
                display_order || 0,
                is_active !== undefined ? parseInt(is_active) : 1,
                start_date || null,
                end_date || null,
                campaign_type || 'featured',
                price || null,
                discount || null,
                normalizedDiscountType,
                normalizedTargetType,
                normalizedCategoryIds,
                normalizedCouponIds,
                primaryCategoryId,
                primaryCouponId
            ]
        );

        const [newAd] = await pool.query(
            `SELECT a.*, v.name as vendor_name, c.category_name as category_name, cp.title as coupon_title
             FROM ads a
             LEFT JOIN vendors v ON a.vendor_id = v.id
             LEFT JOIN categories c ON a.category_id = c.id
             LEFT JOIN coupons cp ON a.coupon_id = cp.id
             WHERE a.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            status: "success",
            message: "Ad created successfully",
            data: newAd[0]
        });
    } catch (err) {
        console.error("Create Ad Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to create ad: " + err.message
        });
    }
};

// Update ad
exports.updateAd = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            ad_type,
            vendor_id,
            coupon_code,
            link_url,
            points_required,
            display_order,
            is_active,
            start_date,
            end_date,
            campaign_type,
            price,
            discount,
            discount_type,
            target_type,
            category_ids,
            coupon_ids,
            category_id,
            coupon_id
        } = req.body;

        const imageFile = req.file;

        const [existingAd] = await pool.query(
            `SELECT * FROM ads WHERE id = ?`,
            [id]
        );

        if (existingAd.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Ad not found"
            });
        }

        let imageUrl = existingAd[0].image_url;
        if (imageFile) {
            if (imageUrl) {
                await deleteImage(imageUrl);
            }
            imageUrl = await saveImage(imageFile);
        }

        let normalizedTargetType = target_type !== undefined ? target_type : existingAd[0].target_type;
        let normalizedCategoryIds = category_ids !== undefined ? (typeof category_ids === 'object' ? JSON.stringify(category_ids) : String(category_ids)) : existingAd[0].category_ids;
        let normalizedCouponIds = coupon_ids !== undefined ? (typeof coupon_ids === 'object' ? JSON.stringify(coupon_ids) : String(coupon_ids)) : existingAd[0].coupon_ids;
        let primaryCategoryId = category_id !== undefined ? (category_id ? Number(category_id) : null) : existingAd[0].category_id;
        let primaryCouponId = coupon_id !== undefined ? (coupon_id ? Number(coupon_id) : null) : existingAd[0].coupon_id;
        let normalizedDiscountType = discount_type !== undefined ? (discount_type === 'lumpsum' ? 'lumpsum' : 'percentage') : existingAd[0].discount_type;

        await pool.query(
            `UPDATE ads SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                image_url = COALESCE(?, image_url),
                ad_type = COALESCE(?, ad_type),
                vendor_id = ?,
                coupon_code = COALESCE(?, coupon_code),
                link_url = COALESCE(?, link_url),
                points_required = COALESCE(?, points_required),
                display_order = COALESCE(?, display_order),
                is_active = COALESCE(?, is_active),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                campaign_type = COALESCE(?, campaign_type),
                price = COALESCE(?, price),
                discount = COALESCE(?, discount),
                discount_type = COALESCE(?, discount_type),
                target_type = ?,
                category_ids = ?,
                coupon_ids = ?,
                category_id = ?,
                coupon_id = ?,
                updated_at = NOW()
            WHERE id = ?`,
            [
                title,
                description,
                imageUrl,
                ad_type,
                vendor_id || null,
                coupon_code,
                link_url,
                points_required,
                display_order,
                is_active,
                start_date,
                end_date,
                campaign_type,
                price,
                discount,
                normalizedDiscountType,
                normalizedTargetType,
                normalizedCategoryIds,
                normalizedCouponIds,
                primaryCategoryId,
                primaryCouponId,
                id
            ]
        );

        const [updatedAd] = await pool.query(
            `SELECT a.*, v.name as vendor_name, c.category_name as category_name, cp.title as coupon_title
             FROM ads a
             LEFT JOIN vendors v ON a.vendor_id = v.id
             LEFT JOIN categories c ON a.category_id = c.id
             LEFT JOIN coupons cp ON a.coupon_id = cp.id
             WHERE a.id = ?`,
            [id]
        );

        return res.status(200).json({
            status: "success",
            message: "Ad updated successfully",
            data: updatedAd[0]
        });
    } catch (err) {
        console.error("Update Ad Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update ad"
        });
    }
};

// Delete ad
exports.deleteAd = async (req, res) => {
    try {
        const { id } = req.params;

        const [existingAd] = await pool.query(
            `SELECT * FROM ads WHERE id = ?`,
            [id]
        );

        if (existingAd.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Ad not found"
            });
        }

        if (existingAd[0].image_url) {
            await deleteImage(existingAd[0].image_url);
        }

        await pool.query(
            `DELETE FROM ads WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            status: "success",
            message: "Ad deleted successfully"
        });
    } catch (err) {
        console.error("Delete Ad Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to delete ad"
        });
    }
};

// Toggle ad status

exports.approveAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.body;
        
        // get ad
        const [ads] = await pool.query('SELECT * FROM ads WHERE id = ?', [id]);
        if (!ads.length) return res.status(404).json({ status: 'error', message: 'Ad not found' });
        const ad = ads[0];

        await pool.query(
            `UPDATE ads SET approval_status = 'approved', start_date = ?, end_date = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [start_date, end_date, id]
        );

        // If it's a notification ad, broadcast it to all customers (user_id = NULL)
        if (ad.campaign_type === 'notification') {
            await pool.query(
                `INSERT INTO customer_notifications (title, message, image_url) VALUES (?, ?, ?)`,
                [ad.title, ad.description || 'Check out our new ad!', ad.image_url]
            );
        }

        return res.status(200).json({ status: 'success', message: 'Ad approved' });
    } catch (err) {
        console.error('Approve Ad Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to approve ad' });
    }
};

exports.disapproveAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        await pool.query(
            `UPDATE ads SET approval_status = 'disapproved', disapproval_reason = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [reason, id]
        );
        return res.status(200).json({ status: 'success', message: 'Ad disapproved' });
    } catch (err) {
        console.error('Disapprove Ad Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to disapprove ad' });
    }
};

exports.toggleAdStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const [existingAd] = await pool.query(
            `SELECT * FROM ads WHERE id = ?`,
            [id]
        );

        if (existingAd.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Ad not found"
            });
        }

        await pool.query(
            `UPDATE ads SET is_active = ?, updated_at = NOW() WHERE id = ?`,
            [is_active, id]
        );

        return res.status(200).json({
            status: "success",
            message: `Ad ${is_active ? 'activated' : 'deactivated'} successfully`
        });
    } catch (err) {
        console.error("Toggle Ad Status Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to toggle ad status"
        });
    }
};

exports.recordAdImpression = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        await pool.query(
            `INSERT INTO ad_events (ad_id, event_type, user_id, ip_address) VALUES (?, 'impression', ?, ?)`,
            [id, user_id || null, ip]
        );

        return res.status(200).json({
            status: "success",
            message: "Impression recorded"
        });
    } catch (err) {
        console.error("Record Impression Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to record impression"
        });
    }
};

exports.recordBatchImpressions = async (req, res) => {
    try {
        const { ad_ids, user_id } = req.body;
        if (!Array.isArray(ad_ids) || ad_ids.length === 0) {
            return res.status(400).json({ status: "error", message: "ad_ids array required" });
        }
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        const values = ad_ids.map(id => [id, 'impression', user_id || null, ip]);
        await pool.query(
            `INSERT INTO ad_events (ad_id, event_type, user_id, ip_address) VALUES ?`,
            [values]
        );

        return res.status(200).json({
            status: "success",
            message: `${ad_ids.length} impressions recorded`
        });
    } catch (err) {
        console.error("Batch Impressions Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to record impressions"
        });
    }
};

exports.recordAdClick = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        await pool.query(
            `INSERT INTO ad_events (ad_id, event_type, user_id, ip_address) VALUES (?, 'click', ?, ?)`,
            [id, user_id || null, ip]
        );

        return res.status(200).json({
            status: "success",
            message: "Click recorded"
        });
    } catch (err) {
        console.error("Record Click Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to record click"
        });
    }
};

exports.getAdReport = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch ad details
        const [ads] = await pool.query(
            `SELECT a.*, v.name as vendor_name 
             FROM ads a
             LEFT JOIN vendors v ON a.vendor_id = v.id
             WHERE a.id = ?`,
            [id]
        );

        if (!ads.length) {
            return res.status(404).json({
                status: "error",
                message: "Ad not found"
            });
        }

        const ad = ads[0];

        // Overall stats
        const [overallStats] = await pool.query(
            `SELECT 
                COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as total_impressions,
                COUNT(DISTINCT CASE WHEN event_type = 'impression' THEN COALESCE(user_id, ip_address, id) END) as unique_viewers,
                COUNT(CASE WHEN event_type = 'click' THEN 1 END) as total_clicks,
                COUNT(DISTINCT CASE WHEN event_type = 'click' THEN COALESCE(user_id, ip_address, id) END) as unique_clickers
             FROM ad_events
             WHERE ad_id = ?`,
            [id]
        );

        const totalImpressions = Number(overallStats[0].total_impressions || 0);
        const uniqueViewers = Math.max(Number(overallStats[0].unique_viewers || 0), totalImpressions > 0 ? 1 : 0);
        const totalClicks = Number(overallStats[0].total_clicks || 0);
        const uniqueClickers = Math.max(Number(overallStats[0].unique_clickers || 0), totalClicks > 0 ? 1 : 0);
        const ctr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

        // Daily trends (last 30 days)
        const [dailyRows] = await pool.query(
            `SELECT 
                DATE(created_at) as event_date,
                COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
                COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
             FROM ad_events
             WHERE ad_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(created_at)
             ORDER BY event_date DESC`,
            [id]
        );

        const dailyTrends = dailyRows.map(row => {
            const imps = Number(row.impressions || 0);
            const clks = Number(row.clicks || 0);
            return {
                date: row.event_date ? new Date(row.event_date).toISOString().split('T')[0] : '',
                impressions: imps,
                clicks: clks,
                ctr: imps > 0 ? parseFloat(((clks / imps) * 100).toFixed(2)) : 0
            };
        });

        const report = {
            ad: {
                id: ad.id,
                title: ad.title,
                description: ad.description,
                image_url: ad.image_url,
                ad_type: ad.ad_type,
                campaign_type: ad.campaign_type,
                vendor_id: ad.vendor_id,
                vendor_name: ad.vendor_name || 'N/A',
                link_url: ad.link_url,
                start_date: ad.start_date,
                end_date: ad.end_date,
                is_active: ad.is_active,
                approval_status: ad.approval_status,
                created_at: ad.created_at
            },
            metrics: {
                total_impressions: totalImpressions,
                unique_viewers: uniqueViewers,
                total_clicks: totalClicks,
                unique_clickers: uniqueClickers,
                ctr: ctr
            },
            daily_trends: dailyTrends,
            generated_at: new Date().toISOString()
        };

        return res.status(200).json({
            status: "success",
            data: report
        });
    } catch (err) {
        console.error("Get Ad Report Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to generate ad report"
        });
    }
};

exports.getAdsAnalyticsSummary = async (req, res) => {
    try {
        const { vendor_id, ad_type, campaign_type } = req.query;

        let query = `
            SELECT 
                a.id, a.title, a.description, a.ad_type, a.campaign_type, a.vendor_id, 
                v.name as vendor_name, a.image_url, a.is_active, a.approval_status, 
                a.price, a.discount, a.discount_type, a.target_type, a.category_ids, a.coupon_ids,
                c.category_name as category_name, cp.title as coupon_title,
                a.start_date, a.end_date, a.created_at,
                COUNT(CASE WHEN ae.event_type = 'impression' THEN 1 END) as total_impressions,
                COUNT(DISTINCT CASE WHEN ae.event_type = 'impression' THEN COALESCE(ae.user_id, ae.ip_address, ae.id) END) as unique_viewers,
                COUNT(CASE WHEN ae.event_type = 'click' THEN 1 END) as total_clicks,
                COUNT(DISTINCT CASE WHEN ae.event_type = 'click' THEN COALESCE(ae.user_id, ae.ip_address, ae.id) END) as unique_clickers,
                (SELECT COUNT(*) FROM ad_conversions ac WHERE ac.ad_id = a.id) as total_orders,
                (SELECT SUM(quantity) FROM ad_conversions ac WHERE ac.ad_id = a.id) as total_coupons_sold,
                (SELECT SUM(amount) FROM ad_conversions ac WHERE ac.ad_id = a.id) as total_revenue
            FROM ads a
            LEFT JOIN vendors v ON a.vendor_id = v.id
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN coupons cp ON a.coupon_id = cp.id
            LEFT JOIN ad_events ae ON a.id = ae.ad_id
            WHERE 1=1
        `;
        const params = [];

        if (vendor_id) {
            query += ` AND a.vendor_id = ?`;
            params.push(vendor_id);
        }

        if (ad_type) {
            query += ` AND a.ad_type = ?`;
            params.push(ad_type);
        }

        if (campaign_type) {
            query += ` AND a.campaign_type = ?`;
            params.push(campaign_type);
        }

        query += ` GROUP BY a.id ORDER BY a.created_at DESC`;

        const [rows] = await pool.query(query, params);

        let sumImpressions = 0;
        let sumClicks = 0;
        let sumUniqueViewers = 0;
        let sumUniqueClickers = 0;

        const tableData = rows.map(r => {
            const imps = Number(r.total_impressions || 0);
            const clks = Number(r.total_clicks || 0);
            const uViewers = Math.max(Number(r.unique_viewers || 0), imps > 0 ? 1 : 0);
            const uClickers = Math.max(Number(r.unique_clickers || 0), clks > 0 ? 1 : 0);
            const ctr = imps > 0 ? parseFloat(((clks / imps) * 100).toFixed(2)) : 0;

            sumImpressions += imps;
            sumClicks += clks;
            sumUniqueViewers += uViewers;
            sumUniqueClickers += uClickers;

            return {
                id: r.id,
                title: r.title,
                description: r.description,
                image_url: r.image_url,
                ad_type: r.ad_type,
                campaign_type: r.campaign_type,
                vendor_id: r.vendor_id,
                vendor_name: r.vendor_name || (r.ad_type === 'marketplace' ? 'Marketplace Ad' : 'N/A'),
                category_name: r.category_name,
                coupon_title: r.coupon_title,
                target_type: r.target_type || 'all',
                price: r.price,
                discount: r.discount,
                discount_type: r.discount_type,
                is_active: r.is_active,
                approval_status: r.approval_status,
                start_date: r.start_date,
                end_date: r.end_date,
                created_at: r.created_at,
                total_impressions: imps,
                unique_viewers: uViewers,
                total_clicks: clks,
                unique_clickers: uClickers,
                ctr: ctr,
                total_orders: Number(r.total_orders || 0),
                total_coupons_sold: Number(r.total_coupons_sold || 0),
                total_revenue: Number(r.total_revenue || 0)
            };
        });

        const overallCtr = sumImpressions > 0 ? parseFloat(((sumClicks / sumImpressions) * 100).toFixed(2)) : 0;

        return res.status(200).json({
            status: "success",
            data: {
                summary: {
                    total_ads: tableData.length,
                    total_impressions: sumImpressions,
                    total_clicks: sumClicks,
                    unique_viewers: sumUniqueViewers,
                    unique_clickers: sumUniqueClickers,
                    average_ctr: overallCtr,
                    active_ads: tableData.filter(a => a.is_active === 1 && a.approval_status === 'approved').length
                },
                ads: tableData,
                generated_at: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error("Get Ads Analytics Summary Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to generate analytics summary"
        });
    }
};

// ==================== ROUTES ====================

// Base route for vendor creation / listing vendors
router.get("/", exports.getAllVendors);

// Vendor listing routes
router.get("/vendor/listings", exports.getVendorListings);
router.get("/vendor/stats", exports.getVendorStats);
router.get("/vendor/search", exports.searchListings);
router.post("/vendor/listings", upload.single('image'), exports.createListing);
router.put("/vendor/listings/:id", upload.single('image'), exports.updateListing);
router.put("/vendor/listings/:id/approve", exports.approveListing);
router.put("/vendor/listings/:id/disapprove", exports.disapproveListing);
router.delete("/vendor/listings/:id", exports.deleteListing);

// Ads tracking & report routes
router.get("/ads/reports/summary", exports.getAdsAnalyticsSummary);
router.get("/vendor/ads/reports/summary", exports.getAdsAnalyticsSummary);
router.post("/ads/impressions", exports.recordBatchImpressions);
router.post("/ads/:id/impression", exports.recordAdImpression);
router.post("/ads/:id/click", exports.recordAdClick);
router.get("/ads/:id/report", exports.getAdReport);

// Ads CRUD & management routes
router.get("/ads", exports.getAds);
router.get("/ads/:id", exports.getAdById);
router.post("/ads", upload.single('image'), exports.createAd);
router.put("/ads/:id", upload.single('image'), exports.updateAd);
router.delete("/ads/:id", exports.deleteAd);

router.put("/ads/:id/approve", exports.approveAd);
router.put("/ads/:id/disapprove", exports.disapproveAd);
router.patch("/ads/:id/toggle", exports.toggleAdStatus);

// Alias routes for /vendor/ads
router.post("/vendor/ads/impressions", exports.recordBatchImpressions);
router.post("/vendor/ads/:id/impression", exports.recordAdImpression);
router.post("/vendor/ads/:id/click", exports.recordAdClick);
router.get("/vendor/ads/:id/report", exports.getAdReport);

router.get("/vendor/ads", exports.getAds);
router.get("/vendor/ads/:id", exports.getAdById);
router.post("/vendor/ads", upload.single('image'), exports.createAd);
router.put("/vendor/ads/:id", upload.single('image'), exports.updateAd);
router.delete("/vendor/ads/:id", exports.deleteAd);
router.put("/vendor/ads/:id/approve", exports.approveAd);
router.put("/vendor/ads/:id/disapprove", exports.disapproveAd);
router.patch("/vendor/ads/:id/toggle", exports.toggleAdStatus);


// Public listing dynamic routes (Keep at bottom so static paths aren't overridden as IDs)
router.get("/:id", exports.getListingById);

module.exports = router;