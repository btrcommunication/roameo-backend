const router = require("express").Router();
const listingController = require("../controllers/listingController");
const upload = require("../config/multer");

/**
 * @swagger
 * tags:
 *   name: Listings
 *   description: Listing APIs
 */

// Public Listing APIs
/**
 * @swagger
 * /api/listings:
 *   get:
 *     summary: Get listings for discovery and search screens
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Listings returned successfully
 */
router.get("/", listingController.getFilteredListings);

/**
 * @swagger
 * /api/listings/newlyAdded:
 *   get:
 *     summary: Get latest approved listings
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: New listings returned successfully
 */
router.get("/newlyAdded", listingController.getNewListings);
/**
 * @swagger
 * /api/listings/details:
 *   get:
 *     summary: Get detailed information for a specific listing
 *     tags: [Listings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listing_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the listing to retrieve
 *     responses:
 *       200:
 *         description: Listing details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Listing details fetched
 *                 data:
 *                   $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Missing or invalid listing_id
 *       401:
 *         description: Unauthorized
 */
router.get("/details", listingController.getListingDetails);
/**
 * @swagger
 * /api/listings/reviews:
 *   get:
 *     summary: Retrieve reviews for a specific listing
 *     tags: [Listings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listing_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the listing whose reviews are requested
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Reviews fetched
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       rating:
 *                         type: integer
 *                         example: 5
 *                       comment:
 *                         type: string
 *                         example: "Excellent experience!"
 *                       user_id:
 *                         type: integer
 *                         example: 7
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-07-01T12:34:56Z"
 *       400:
 *         description: Missing or invalid listing_id
 *       401:
 *         description: Unauthorized
 */
router.get("/reviews", listingController.getListingReviews);

// User/Vendor APIs
/**
 * @swagger
 * /api/listings/reviews:
 *   post:
 *     summary: Submit a new review for a listing
 *     tags: [Listings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *               - listing_id
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Great service!"
 *               listing_id:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Review added
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 202
 *                     rating:
 *                       type: integer
 *                       example: 5
 *                     comment:
 *                       type: string
 *                       example: "Great service!"
 *                     user_id:
 *                       type: integer
 *                       example: 7
 *                     listing_id:
 *                       type: integer
 *                       example: 42
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-07-02T10:20:30Z"
 *       400:
 *         description: Validation error or missing fields
 *       401:
 *         description: Unauthorized
 */
router.post("/reviews", listingController.addReview);

/**
 * @swagger
 * /api/listings/vendor/create:
 *   post:
 *     summary: Create a new vendor listing
 *     tags: [Listings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               listing_image:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *                 example: "Romantic Dinner Cruise"
 *               category_id:
 *                 type: integer
 *                 example: 4
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 125.00
 *               description:
 *                 type: string
 *                 example: "A cozy sunset dinner on the river."
 *               city:
 *                 type: string
 *                 example: "New York"
 *               district:
 *                 type: string
 *                 example: "Manhattan"
 *               discount_percentage:
 *                 type: integer
 *                 example: 15
 *               offer_label:
 *                 type: string
 *                 example: "20% Off"
 *               valid_until:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-31T23:59:59Z"
 *             required:
 *               - listing_image
 *               - title
 *               - category_id
 *               - price
 *               - description
 *     responses:
 *       201:
 *         description: Listing created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Listing created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     listing:
 *                       $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Validation failed or missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post("/vendor/create", upload.single("listing_image"), listingController.addListing);

module.exports = router;
