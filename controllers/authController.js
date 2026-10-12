const bcrypt = require("bcrypt");
const User = require("../models/User");
const { generateToken } = require("../config/jwt");
const { sendWelcomeEmail } = require("../services/emailService");
const pool = require("../config/db");

// Auto-create device_tokens table for all devices (guests and authenticated users)
pool.query(`
    CREATE TABLE IF NOT EXISTS device_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        user_id INT NULL,
        platform VARCHAR(50) DEFAULT 'android',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`).catch(err => console.error('[Push Notification Error] Failed to ensure device_tokens table:', err.message));

// ─────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────
exports.signup = async (req, res) => {
    try {
        const {
            name, email, password, phone,
            address_line1, address_line2,
            city, district, pincode, country,
            role
        } = req.body;

        // ── Validate required fields ──────────────────
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                status: "error",
                message: "Name, email, password, and phone are required."
            });
        }

        // ── Check for duplicate email ──────────────────
        const existing = await User.findByEmail(email);
        if (existing) {
            return res.status(400).json({
                status: "error",
                message: "An account with this email address already exists."
            });
        }

        // ── Resolve role_id from roles table ──────────
        const roleName = role || "customer";
        const roleData = await User.getRoleByName(roleName);
        if (!roleData) {
            return res.status(400).json({
                status: "error",
                message: `Invalid role: '${roleName}'. Must be admin, vendor, or customer.`
            });
        }
        const { id: role_id, name: role_name } = roleData;

        // ── Hash password ─────────────────────────────
        const hashedPassword = await bcrypt.hash(password, 10);

        // ── Insert user ───────────────────────────────
        const user_id = await User.create({
            name, email, password: hashedPassword, phone, role_id,
            address_line1, address_line2, city, district, pincode, country
        });

        // ── Send welcome email in background (non-blocking) ──
        sendWelcomeEmail(email, { name, email }).catch(mailErr => {
            console.error(`[EmailService] Failed to send welcome email to ${email}:`, mailErr.message);
        });

        // ── Generate JWT ──────────────────────────────
        const token = generateToken({ id: user_id, email, role_id, role_name });

        return res.status(201).json({
            status: "success",
            message: "Account created successfully!",
            token,
            data: {
                user_id,
                name,
                email,
                phone,
                role: role_name
            }
        });

    } catch (err) {
        console.error("Signup Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Registration failed. Please try again later."
        });
    }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ── Validate required fields ──────────────────
        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required."
            });
        }

        // ── Find user with role ───────────────────────
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password. Please try again."
            });
        }

        // ── Check if account is active ────────────────
        if (!user.is_active) {
            return res.status(403).json({
                status: "error",
                message: "Your account has been deactivated. Please contact support."
            });
        }

        // ── Compare password ──────────────────────────
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password. Please try again."
            });
        }

        // ── Generate JWT ──────────────────────────────
        const token = generateToken({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            role_name: user.role_name
        });

        return res.status(200).json({
            status: "success",
            message: "Logged in successfully!",
            token,
            data: {
                user_id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role_name,
                city: user.city
            }
        });

    } catch (err) {
        console.error("login Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Login failed. Please try again later."
        });
    }
};


exports.savePushToken = async (req, res) => {
    try {
        const { token, platform } = req.body;
        const userId = req.user ? req.user.id : null;
        if (!token) {
            console.warn('[Push Notification] savePushToken called without token');
            return res.status(400).json({ status: 'error', message: 'Token is required' });
        }

        console.log(`[Push Notification] Saving token (${token.substring(0, 15)}...) for user: ${userId || 'guest device'}`);

        // 1. Save in device_tokens table
        try {
            await pool.query(
                `INSERT INTO device_tokens (token, user_id, platform) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                    user_id = COALESCE(VALUES(user_id), user_id),
                    platform = VALUES(platform),
                    updated_at = NOW()`,
                [token, userId, platform || 'android']
            );
        } catch (dbErr) {
            console.error('[Push Notification Error] Failed to insert into device_tokens:', dbErr.message);
        }

        // 2. Also update users table if userId is present
        if (userId) {
            await User.updatePushToken(userId, token);
        }

        console.log(`[Push Notification] Successfully registered push token for ${userId ? `user ID ${userId}` : 'guest device'}`);
        return res.json({ status: 'success', message: 'Push token saved successfully' });
    } catch (err) {
        console.error('[Push Notification Error] Save Push Token Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to save push token' });
    }
};
