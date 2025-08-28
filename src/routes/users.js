// src/routes/users.js

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const auth = require('../middlewares/auth');

// מסלולים שלא דורשים אימות
router.post('/', usersController.createUser);
router.post('/login', usersController.loginUser);
router.get('/:firebaseUid', usersController.getUserProfile); // מסלול זה לא דורש אימות

// כל המסלולים הבאים דורשים אימות באמצעות המידלוור auth
router.use(auth);

// מסלולים ספציפיים שדורשים אימות
router.get('/all', usersController.getAllUsers);
router.get('/search', usersController.searchUsers);
router.get('/recent-views', usersController.getRecentViews);
router.post('/import-firebase-users', usersController.importFirebaseUsersToSQL);

// מסלולים עם פרמטר firebaseUid שדורשים אימות
router.get('/:firebaseUid/history', usersController.getUserHistory);
router.put('/:firebaseUid', usersController.updateUserProfile);
router.delete('/:firebaseUid', usersController.deleteUser);
router.get('/:firebaseUid/actions', usersController.getUserActions);


// ייצוא הראוטר לשימוש בקובץ הראשי של השרת
module.exports = router;
