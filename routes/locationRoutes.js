const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: API for retrieving countries, states, and cities
 */

/**
 * @swagger
 * /api/locations/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: A list of countries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "United States"
 *                       isoCode:
 *                         type: string
 *                         example: "US"
 *                       phonecode:
 *                         type: string
 *                         example: "1"
 *                       currency:
 *                         type: string
 *                         example: "USD"
 *                       flag:
 *                         type: string
 *                         example: "🇺🇸"
 */
// Route to get all countries
router.get('/countries', locationController.getCountries);

/**
 * @swagger
 * /api/locations/states/{countryCode}:
 *   get:
 *     summary: Get states for a specific country
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The ISO Code of the country (e.g., US, IN)
 *     responses:
 *       200:
 *         description: A list of states for the country
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Maharashtra"
 *                       isoCode:
 *                         type: string
 *                         example: "MH"
 *                       countryCode:
 *                         type: string
 *                         example: "IN"
 *       400:
 *         description: Country code is required
 */
// Route to get states by country code (e.g. /states/IN or /states/US)
router.get('/states/:countryCode', locationController.getStatesByCountry);

/**
 * @swagger
 * /api/locations/cities/{countryCode}/{stateCode}:
 *   get:
 *     summary: Get cities for a specific state in a country
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The ISO Code of the country
 *       - in: path
 *         name: stateCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The ISO Code of the state
 *     responses:
 *       200:
 *         description: A list of cities for the state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Mumbai"
 *                       countryCode:
 *                         type: string
 *                         example: "IN"
 *                       stateCode:
 *                         type: string
 *                         example: "MH"
 *       400:
 *         description: Country code and state code are required
 */
// Route to get cities by country code and state code (e.g. /cities/IN/MH)
router.get('/cities/:countryCode/:stateCode', locationController.getCitiesByState);

module.exports = router;
