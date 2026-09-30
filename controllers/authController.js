const bcrypt = require("bcrypt");
const User = require("../models/User");
const { generateToken } = require("../config/jwt");
const { sendWelcomeEmail } = require("../services/emailService");

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
        const { token } = req.body;
        const userId = req.user.id;
        if (!token) {
            return res.status(400).json({ status: 'error', message: 'Token is required' });
        }
        await User.updatePushToken(userId, token);
        res.json({ status: 'success', message: 'Push token saved successfully' });
    } catch (err) {
        console.error('Save Push Token Error:', err);
        res.status(500).json({ status: 'error', message: 'Failed to save push token' });
    }
};
