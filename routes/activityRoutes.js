const router = require("express").Router();
const activityController = require("../controllers/activityController");


/**
 * @swagger
 * tags:
 *   name: Activities
 *   description: Popular activity and experience APIs
 */

/**
 * @swagger
 * /api/activities/popular:
 *   get:
 *     summary: Get popular activities based on city and engagement metrics
 *     tags: [Activities]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Popular activities returned successfully
 */
router.get("/popular", activityController.getPopularActivities);

module.exports = router;
