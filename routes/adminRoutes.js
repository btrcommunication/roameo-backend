const router = require("express").Router();
const adminController = require("../controllers/adminController");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative endpoints
 */

/**
 * @swagger
 * /api/admin/category:
 *   post:
 *     summary: Create Category (Admin Only)
 *     description: Allows the admin to build a new category or sub-category.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               category_name: "Italian"
 *               parent_id: 1
 *               level: 2
 *     responses:
 *       200:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Category created successfully"
 *                 data:
 *                   id: 101
 *                   category_name: "Italian"
 *                   parent_id: 1
 *                   level: 2
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "error"
 *                 message: "Category name is required."
 */
router.post("/category", adminController.createCategory);

// Listings Management

/**
 * @swagger
 * /api/admin/listings:
 *   get:
 *     summary: Get All Listings (Admin View)
 *     description: Fetches every single listing across the entire platform.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendor_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All listings retrieved successfully for admin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "All listings retrieved successfully for admin."
 *                 data:
 *                   - id: 12
 *                     title: "Romantic Date dinner"
 *                     category: "Restaurant Deals"
 *                     price: 90000.00
 *                     description: "DUMMY DESCRIPTION THINGS"
 *                     image_url: "https://example.com/images/listing12.png"
 *                     bookings: 0
 *                     rating: 0.0
 *                     created_days_ago: 27
 *                     vendor:
 *                       id: 5
 *                       name: "Luxe Vendor Elite"
 */
router.get("/listings", adminController.getAllListings);

/**
 * @swagger
 * /api/admin/listings/{id}:
 *   put:
 *     summary: Admin Edit/Update Listing
 *     description: Modifies details of any listing using its unique ID.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               title: "Romantic Date Dinner - Premium Edition"
 *               category_id: 4
 *               price: 95000.00
 *               description: "Updated luxury private dinner experience description."
 *               image_url: "https://example.com/images/updated_listing12.png"
 *     responses:
 *       200:
 *         description: Listing updated successfully by admin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Listing updated successfully by admin."
 *                 data:
 *                   id: 12
 *                   title: "Romantic Date Dinner - Premium Edition"
 *                   category: "Dating Experiences"
 *                   price: 95000.00
 *                   description: "Updated luxury private dinner experience description."
 *                   image_url: "https://example.com/images/updated_listing12.png"
 *                   updated_at: "2026-07-09T21:36:21Z"
 */
router.put("/listings/:id", adminController.updateListing);

/**
 * @swagger
 * /api/admin/listings/{id}:
 *   delete:
 *     summary: Admin Delete Listing
 *     description: Permanently removes or soft-deletes a listing from the platform by its ID.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing has been permanently deleted by admin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Listing has been permanently deleted by admin."
 *                 data:
 *                   deleted_listing_id: 12
 */
router.delete("/listings/:id", adminController.deleteListing);

// Reviews Management

/**
 * @swagger
 * /api/admin/reviews/reply:
 *   post:
 *     summary: Admin Reply to Review
 *     description: Submits an official admin response to a specific customer review.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               review_id: 88
 *               reply_comment: "Thank you for your feedback. We are addressing this issue."
 *     responses:
 *       200:
 *         description: Admin reply added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Admin reply added successfully"
 *                 data:
 *                   reply_id: 88
 *                   review_id: 88
 *                   reply_comment: "Thank you for your feedback. We are addressing this issue."
 *                   replied_at: "2026-07-10T14:22:00Z"
 */
router.post("/reviews/reply", adminController.replyToReview);

// Reward Tiers Management

/**
 * @swagger
 * /api/admin/rewards/tiers:
 *   get:
 *     summary: Get All Reward Tiers
 *     description: Fetches the reward tiers matrix (Bronze, Silver, Gold, Platinum).
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Reward tiers retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Reward tiers retrieved successfully."
 *                 data:
 *                   - id: 1
 *                     tier_name: "Bronze"
 *                     tier_level: 1
 *                     min_earnings: 0.00
 *                     min_bookings: 0
 *                     benefits: {"commission_rate": 0.15, "priority_support": false}
 *                     created_at: "2026-06-01T00:00:00Z"
 *                     updated_at: "2026-06-01T00:00:00Z"
 */
router.get("/rewards/tiers", adminController.getRewardTiers);

/**
 * @swagger
 * /api/admin/rewards/tiers/{id}:
 *   put:
 *     summary: Update Reward Tier
 *     description: Modifies the criteria or benefits of a specific reward tier.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               tier_name: "Gold"
 *               min_earnings: 500000.00
 *               min_bookings: 100
 *               benefits: {"commission_rate": 0.08, "priority_support": true, "featured_listings": 2}
 *     responses:
 *       200:
 *         description: Reward tier criteria and benefits updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Reward tier criteria and benefits updated successfully."
 *                 data:
 *                   id: 3
 *                   tier_name: "Gold"
 *                   tier_level: 3
 *                   min_earnings: 500000.00
 *                   min_bookings: 100
 *                   benefits: {"commission_rate": 0.08, "priority_support": true, "featured_listings": 2}
 *                   created_at: "2026-06-01T00:00:00Z"
 *                   updated_at: "2026-07-11T12:00:00Z"
 */
router.put("/rewards/tiers/:id", adminController.updateRewardTier);

// Vendor Management

/**
 * @swagger
 * /api/admin/vendors:
 *   get:
 *     summary: Get All Vendors with Metrics
 *     description: Retrieves a list of all vendors along with their computed performance metrics (earnings, bookings, rating).
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vendors list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Vendors list retrieved successfully."
 *                 data:
 *                   - vendor_id: 5
 *                     business_name: "Luxe Vendor Elite"
 *                     email: "luxe@example.com"
 *                     phone: "+1234567890"
 *                     address: "123 Elite St"
 *                     joined_date: "2026-01-15"
 *                     reward_points: 1500
 *                     tier_status: "Silver"
 *                     total_listings: 10
 *                     total_earnings: 125000.00
 *                     total_bookings: 45
 *                     rating: 4.8
 */
router.get("/vendors", adminController.getAllVendors);

/**
 * @swagger
 * /api/admin/vendors/{vendor_id}:
 *   put:
 *     summary: Update Vendor Profile
 *     description: Manual override for a vendor's profile information by an admin.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendor_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               business_name: "Luxe Vendor Elite - Updated"
 *               phone: "+0987654321"
 *               address: "456 New Elite St"
 *               business_description: "Updated description for Luxe Vendor Elite."
 *     responses:
 *       200:
 *         description: Vendor profile successfully updated by admin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Vendor profile successfully updated by admin."
 *                 data:
 *                   vendor_id: 5
 *                   business_name: "Luxe Vendor Elite - Updated"
 *                   phone: "+0987654321"
 *                   address: "456 New Elite St"
 *                   business_description: "Updated description for Luxe Vendor Elite."
 */
router.put("/vendors/:vendor_id", adminController.updateVendorProfile);

/**
 * @swagger
 * /api/admin/vendors/{vendor_id}/adjust-rewards:
 *   post:
 *     summary: Adjust Vendor Rewards
 *     description: Adjusts a vendor's tier manually or awards them bonus points.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendor_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               add_reward_points: 500
 *               manual_tier_override: "Gold"
 *     responses:
 *       200:
 *         description: Vendor rewards matrix updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 status: "success"
 *                 message: "Vendor rewards matrix updated successfully."
 *                 data:
 *                   vendor_id: 5
 *                   new_tier: "Gold"
 *                   new_reward_points: 2000
 */
router.post("/vendors/:vendor_id/adjust-rewards", adminController.adjustVendorRewards);

router.get("/orders", adminController.getOrders);

module.exports = router;
