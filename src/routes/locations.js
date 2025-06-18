const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');
// במידה ויהיה צורך באימות לראוטים מסוימים, יש להוסיף:
// const { authenticateToken } = require('../middleware/authMiddleware'); 

// GET all locations and search locations
// נשתמש באותו ראוט '/' עבור קבלת כל המקומות וגם עבור חיפוש
// הלוגיקה שתטפל בפרמטרי החיפוש תהיה בתוך locationsController.getAllLocations (שמה יהיה כעת searchLocations)
router.get('/', locationsController.searchLocations); 

// POST new location
// יש לוודא ש-createLocation מטפלת באימות אם נדרש (לדוגמה, באמצעות middleware)
router.post('/', locationsController.createLocation); 

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