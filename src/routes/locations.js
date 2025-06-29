const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');
const fakeAuth = require('../middlewares/fakeAuth');


// ראוטים למיקומים
// GET all locations and search locations
// נשתמש באותו ראוט '/' עבור קבלת כל המקומות וגם עבור חיפוש
router.get('/', locationsController.searchLocations);

// POST new location - דורש אימות משתמש
router.post('/', fakeAuth, locationsController.createLocation);

// GET location by ID
router.get('/:id', locationsController.getLocationById);

// PUT update location by ID - דורש אימות משתמש
router.put('/:id', fakeAuth, locationsController.updateLocation);

// DELETE location by ID - דורש אימות משתמש
router.delete('/:id', fakeAuth, locationsController.deleteLocation);

// // POST add like to location (simple increment/decrement) - דורש אימות משתמש
// router.post('/:locationId/like', fakeAuth, locationsController.addLikeToLocation);

// // DELETE remove like from location - דורש אימות משתמש
// router.delete('/:locationId/like', fakeAuth, locationsController.removeLikeFromLocation);


module.exports = router;
// const express = require('express');
// const router = express.Router();
// const locationsController = require('../controllers/locationsController');
// const authMiddleware = require('../middlewares/auth'); // וודא שנתיב זה נכון!
// // <<<<<<< HEAD
// // //  const authenticate = require('../middlewares/auth');
// // const fakeAuth = require('../middlewares/fakeAuth');
// // =======
// // // במידה ויהיה צורך באימות לראוטים מסוימים, יש להוסיף:
// // // const { authenticateToken } = require('../middleware/authMiddleware'); 

// // // GET all locations and search locations
// // // נשתמש באותו ראוט '/' עבור קבלת כל המקומות וגם עבור חיפוש
// // // הלוגיקה שתטפל בפרמטרי החיפוש תהיה בתוך locationsController.getAllLocations (שמה יהיה כעת searchLocations)
// // router.get('/', locationsController.searchLocations); 
// // >>>>>>> feature/search-locations-api

// // POST new location
// // יש לוודא ש-createLocation מטפלת באימות אם נדרש (לדוגמה, באמצעות middleware)
// router.post('/', locationsController.createLocation); 

// // GET location by ID
// router.get('/:id', locationsController.getLocationById);

// // PUT update location by ID
// router.put('/:id', locationsController.updateLocation);

// // DELETE location by ID
// router.delete('/:id', locationsController.deleteLocation);

// // POST add like to location (simple increment/decrement)
// router.post('/:locationId/like', locationsController.addLikeToLocation);

// // DELETE remove like from location
// router.delete('/:locationId/like', locationsController.removeLikeFromLocation);
// router.post('/', fakeAuth, locationsController.createLocation);

// module.exports = router;
