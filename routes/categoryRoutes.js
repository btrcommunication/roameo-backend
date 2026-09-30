const router = require("express").Router();
const categoryController = require("../controllers/categoryController");

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category hierarchy management
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories (Tree View)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get("/", categoryController.getAllCategories);

/**
 * @swagger
 * /api/categories/newly-listed:
 *   get:
 *     summary: Get Newly Listed Categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Newly listed categories retrieved
 */
router.get("/newly-listed", categoryController.getNewlyListedCategories);

// ─────────────────────────────────────────────
// POST /api/categories
// Create a new category
// ─────────────────────────────────────────────
router.post("/", categoryController.createCategory);

// ─────────────────────────────────────────────
// PUT /api/categories/:id
// Update a category
// ─────────────────────────────────────────────
router.put("/:id", categoryController.updateCategory);

// ─────────────────────────────────────────────
// DELETE /api/categories/:id
// Delete a category
// ─────────────────────────────────────────────
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;