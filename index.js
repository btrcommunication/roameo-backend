require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");

const swaggerSpec = require("./config/swagger");

// Import routes
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const listingRoutes = require("./routes/listingRoutes");
const homeRoutes = require("./routes/homeRoutes");
const profileRoutes = require("./routes/profileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const activityRoutes = require("./routes/activityRoutes");
const listingVendorRoutes = require("./routes/listingVendorRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const couponRoutes = require("./routes/couponRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistroutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// CORS
app.use(cors());

// Allow large JSON requests containing Base64 category images
app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

// Public uploaded files
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// Swagger documentation
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "Roameo API Docs"
    })
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api", couponRoutes);
app.use("/api/wishlist", wishlistRoutes); // Add before the 404 handler
app.use("/api/payment", paymentRoutes);
// FIXED: Mount vendor routes properly - ONLY at /api/vendorcreation
app.use("/api/vendorcreation", listingVendorRoutes);

// Other vendor routes
app.use("/api/vendor", vendorRoutes);

// Handle unknown API routes - THIS MUST BE AT THE END
app.use((req, res) => {
    console.log('Route not found:', req.method, req.originalUrl);
    return res.status(404).json({
        status: "error",
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
});

// Handle payloads larger than 10 MB
app.use((error, req, res, next) => {
    if (error?.type === "entity.too.large") {
        return res.status(413).json({
            status: "error",
            message: "The uploaded image is too large. Maximum size is 10 MB."
        });
    }

    console.error("Unhandled Server Error:", error);

    return res.status(500).json({
        status: "error",
        message: "Internal server error"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server Running on Port ${PORT}`);
    console.log(
        `API Documentation: http://localhost:${PORT}/api-docs`
    );
});