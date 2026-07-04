const router = require("express").Router();
const categoryController = require("../controllers/categoryController");

router.get("/", categoryController.getAllCategories);
router.get("/newly-listed", categoryController.getNewlyListedCategories);

module.exports = router;
