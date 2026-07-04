const router = require("express").Router();
const homeController = require("../controllers/homeController");

router.get("/", homeController.getHomePageDetails);
router.get("/recommended", homeController.getRecommendedListings);

module.exports = router;
