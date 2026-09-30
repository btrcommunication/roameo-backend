const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Roameo API",
            version: "1.0.0",
            description: "Backend API documentation for the Roameo platform"
        },
        servers: [
            {
                url: "http://localhost:5000",
                description: "Local Development Server"
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter your JWT token (without 'Bearer ' prefix)"
                }
            },
            schemas: {
                Listing: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 42 },
                        title: { type: "string", example: "Romantic Dinner Cruise" },
                        description: { type: "string", example: "A cozy sunset dinner on the river." },
                        price: { type: "number", format: "float", example: 125.00 },
                        original_price: { type: "number", format: "float", example: 125.00 },
                        discount_percentage: { type: "integer", example: 15 },
                        final_price: { type: "number", format: "float", example: 106.25 },
                        offer_label: { type: "string", example: "20% Off" },
                        thumbnail_url: { type: "string", example: "/uploads/listing-123.jpg" },
                        category: {
                            type: "object",
                            properties: {
                                id: { type: "integer", example: 4 }
                            }
                        },
                        vendor: {
                            type: "object",
                            properties: {
                                id: { type: "integer", example: 11 }
                            }
                        },
                        city: { type: "string", example: "New York" },
                        district: { type: "string", example: "Manhattan" },
                        valid_until: { type: "string", format: "date-time", example: "2026-08-31T23:59:59Z" },
                        is_active: { type: "boolean", example: true },
                        is_approved: { type: "boolean", example: false },
                        rating: { type: "number", example: 0 },
                        review_count: { type: "integer", example: 0 },
                        created_at: { type: "string", format: "date-time", example: "2026-07-07T10:00:00Z" },
                        expiry: { type: "string", format: "date-time", example: "2026-08-31T23:59:59Z" }
                    }
                },
                Review: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 101 },
                        rating: { type: "integer", example: 5 },
                        comment: { type: "string", example: "Excellent experience!" },
                        user_id: { type: "integer", example: 7 },
                        listing_id: { type: "integer", example: 42 },
                        created_at: { type: "string", format: "date-time", example: "2026-07-01T12:34:56Z" }
                    }
                },
                Category: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 101 },
                        category_name: { type: "string", example: "Italian" },
                        parent_id: { type: "integer", example: 1 },
                        level: { type: "integer", example: 2 }
                    }
                },
                Coupon: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 201 },
                        code: { type: "string", example: "WELCOME10" },
                        discount: { type: "integer", example: 10 },
                        expires_at: { type: "string", format: "date-time", example: "2026-12-31T23:59:59Z" }
                    }
                },
                Activity: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 301 },
                        name: { type: "string", example: "Sunset Boat Tour" },
                        popularity_score: { type: "number", example: 4.8 }
                    }
                },
                Deal: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 401 },
                        title: { type: "string", example: "50% Off Spa" },
                        discount: { type: "integer", example: 50 },
                        valid_until: { type: "string", format: "date-time", example: "2026-09-30T23:59:59Z" }
                    }
                },
                UserProfile: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        name: { type: "string", example: "John Doe" },
                        email: { type: "string", example: "johndoe@example.com" },
                        phone: { type: "string", example: "+1 212-555-0000" },
                        address_line1: { type: "string", example: "123 Madison Ave" },
                        address_line2: { type: "string", example: "Apt 4B" },
                        city: { type: "string", example: "New York" },
                        district: { type: "string", example: "Manhattan" },
                        pincode: { type: "string", example: "10016" },
                        country: { type: "string", example: "USA" },
                        role: { type: "string", example: "customer" },
                        created_at: { type: "string", format: "date-time", example: "2026-07-04T12:00:00Z" }
                    }
                },
                AuthSuccess: {
                    type: "object",
                    properties: {
                        status: { type: "string", example: "success" },
                        message: { type: "string", example: "Logged in successfully!" },
                        token: { type: "string", example: "eyJhbGciOiJI..." },
                        data: { $ref: "#/components/schemas/UserProfile" }
                    }
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        status: { type: "string", example: "error" },
                        message: { type: "string", example: "Invalid request" }
                    }
                }
            }
        },
        security: []
    },
    apis: ["./routes/*.js"]  // Scan all route files for @swagger comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
