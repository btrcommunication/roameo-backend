/**
 * Role-based access control middleware factory.
 * Usage: router.get('/admin-only', authenticate, authorize('admin'), handler)
 * @param {...string} roles - Allowed role names (e.g. 'admin', 'vendor')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: "error",
                message: "Not authenticated."
            });
        }
        if (!roles.includes(req.user.role_name)) {
            return res.status(403).json({
                status: "error",
                message: `Access denied. Required role: ${roles.join(" or ")}.`
            });
        }
        next();
    };
};

module.exports = authorize;
