const router = require("express").Router();
const adminController = require("../controllers/adminController");

router.post("/category", adminController.createCategory);
router.post("/reviews/reply", adminController.replyToReview);

module.exports = router;
