// src/routes/locations.js
const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');

// GET all locations
router.get('/', locationsController.getAllLocations);
// POST new location
router.post('/', locationsController.createLocation); // יצירת מיקום
// GET location by ID
router.get('/:id', locationsController.getLocationById);
// PUT update location by ID
router.put('/:id', locationsController.updateLocation);
// DELETE location by ID
router.delete('/:id', locationsController.deleteLocation);

// POST add like to location (simple increment/decrement)
router.post('/:locationId/like', locationsController.addLikeToLocation);
// DELETE remove like from location
router.delete('/:locationId/like', locationsController.removeLikeFromLocation);

module.exports = router;