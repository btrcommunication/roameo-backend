const router = require("express").Router();
const listingController = require("../controllers/listingController");

// Public Listing APIs
router.get("/", listingController.getFilteredListings);
router.get("/details", listingController.getListingDetails);
router.get("/reviews", listingController.getListingReviews);

// User/Vendor APIs
router.post("/reviews", listingController.addReview);
// Note: Vendor add listing is defined as /api/vendor/listing in doc
router.post("/vendor", listingController.addListing);

module.exports = router;
