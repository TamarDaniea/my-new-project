const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const upload = multer();


// ראוטים למיקומים
// GET all locations and search locations
// נשתמש באותו ראוט '/' עבור קבלת כל המקומות וגם עבור חיפוש
router.get('/', locationsController.searchLocations);

// POST new location - דורש אימות משתמש
// router.post('/', auth, locationsController.createLocation);
router.post(
    '/',
    auth,
    upload.none(), // הוספת multer כ-middleware
    locationsController.createLocation
);

// GET locations sorted by date
router.get('/by-date', locationsController.getLocationsByDate);
// GET location by ID
router.get('/:id', locationsController.getLocationById);

// GET locations by user ID with pagination
router.get('/user/:userId', locationsController.getUserLocationsPaginated);
// PUT update location by ID - דורש אימות משתמש
router.put('/:id', auth, locationsController.updateLocation);

// DELETE location by ID - דורש אימות משתמש
router.delete('/:id', auth, locationsController.deleteLocation);
router.post('/:id/view', locationsController.incrementViews);

module.exports = router;
