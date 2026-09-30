const { verifyToken } = require("../config/jwt");

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (
            typeof authHeader !== "string" ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                status: "error",
                message: "Access denied. No token provided.",
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                status: "error",
                message: "Access denied. No token provided.",
            });
        }

        const decoded = verifyToken(token);

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                status: "error",
                message: "Invalid or expired token. Please log in again.",
            });
        }

        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({
            status: "error",
            message: "Invalid or expired token. Please log in again.",
        });
    }
};

module.exports = authenticate;