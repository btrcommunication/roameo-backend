const router = require("express").Router();
const profileController = require("../controllers/profileController");

router.get("/", profileController.getUserProfile);
router.put("/edit-info", profileController.editInfo);
router.put("/edit-address", profileController.editAddress);

module.exports = router;
