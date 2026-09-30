const router = require("express").Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const JWT_SECRET = process.env.JWT_SECRET || 'roameo_admin_secret_key_2025';

// ==================== HELPER FUNCTIONS ====================

const generateToken = (adminId, email, role) => {
    return jwt.sign(
        { id: adminId, email, role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// ==================== MIDDLEWARE ====================

const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: "error",
                message: "Unauthorized. No token provided."
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                status: "error",
                message: "Invalid or expired token."
            });
        }

        // Check if admin exists and is active
        const [admins] = await pool.query(
            `SELECT id, name, email, role, is_active FROM admins WHERE id = ? AND is_active = 1`,
            [decoded.id]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "Admin not found or inactive."
            });
        }

        req.admin = admins[0];
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Authentication error."
        });
    }
};

// ==================== CONTROLLER FUNCTIONS ====================

// Admin Signup
exports.signup = async (req, res) => {
    try {
        const { name, email, password, role = 'admin' } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Name, email and password are required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid email format"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                status: "error",
                message: "Password must be at least 6 characters long"
            });
        }

        // Check if email already exists
        const [existingAdmins] = await pool.query(
            `SELECT id FROM admins WHERE email = ?`,
            [email]
        );

        if (existingAdmins.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new admin
        const [result] = await pool.query(
            `INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, role]
        );

        // Generate token
        const token = generateToken(result.insertId, email, role);

        return res.status(201).json({
            status: "success",
            message: "Admin created successfully",
            data: {
                id: result.insertId,
                name,
                email,
                role,
                token
            }
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to create admin: " + error.message
        });
    }
};

// Admin Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required"
            });
        }

        // Find admin by email
        const [admins] = await pool.query(
            `SELECT id, name, email, password, role, is_active FROM admins WHERE email = ?`,
            [email]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "Invalid credentials"
            });
        }

        const admin = admins[0];

        // Check if admin is active
        if (admin.is_active !== 1) {
            return res.status(403).json({
                status: "error",
                message: "Account is inactive. Please contact support."
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: "error",
                message: "Invalid credentials"
            });
        }

        // Update last login
        await pool.query(
            `UPDATE admins SET last_login = NOW() WHERE id = ?`,
            [admin.id]
        );

        // Generate token
        const token = generateToken(admin.id, admin.email, admin.role);

        return res.status(200).json({
            status: "success",
            message: "Login successful",
            data: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                token
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to login: " + error.message
        });
    }
};

// Get Current Admin Profile
exports.getProfile = async (req, res) => {
    try {
        const admin = req.admin;
        return res.status(200).json({
            status: "success",
            data: admin
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to get profile"
        });
    }
};

// Admin Logout
exports.logout = async (req, res) => {
    try {
        // Since we're using stateless JWT, logout is handled on client side
        // by removing the token. But we can optionally blacklist tokens here.
        return res.status(200).json({
            status: "success",
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to logout"
        });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const adminId = req.admin.id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                status: "error",
                message: "Old and new passwords are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                status: "error",
                message: "New password must be at least 6 characters long"
            });
        }

        // Get current admin with password
        const [admins] = await pool.query(
            `SELECT password FROM admins WHERE id = ?`,
            [adminId]
        );

        if (admins.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Admin not found"
            });
        }

        // Verify old password
        const isPasswordValid = await bcrypt.compare(oldPassword, admins[0].password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: "error",
                message: "Old password is incorrect"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            `UPDATE admins SET password = ? WHERE id = ?`,
            [hashedPassword, adminId]
        );

        return res.status(200).json({
            status: "success",
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Change Password Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to change password"
        });
    }
};

// ==================== ROUTES ====================

// Public routes
router.post("/auth/signup", [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], exports.signup);

router.post("/auth/login", exports.login);

// Protected routes
router.get("/auth/profile", authenticateAdmin, exports.getProfile);
router.post("/auth/logout", authenticateAdmin, exports.logout);
router.put("/auth/change-password", authenticateAdmin, exports.changePassword);

// Export middleware for use in other routes
exports.authenticateAdmin = authenticateAdmin;

module.exports = router;