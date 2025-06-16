
const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');

// Define routes for locations
router.get('/', locationsController.getAllLocations);
router.post('/', locationsController.createLocation);

module.exports = router;