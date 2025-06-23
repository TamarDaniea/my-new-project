// src/routes/users.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const fakeAuth = require('../middlewares/fakeAuth');


router.use((req, res, next) => {
    next();
});
// חיפוש משתמשים לפי שם או אמייל query – רק לאדמין
router.get('/', fakeAuth, usersController.searchUsers);

// ✅ קבלת כל המשתמשים (לשימוש אדמין)
router.get('/', usersController.getAllUsers);

// ✅ יצירת משתמש חדש
router.post('/', usersController.createUser);

// ✅ קבלת משתמש לפי firebase_uid
router.get('/:firebaseUid', usersController.getUserProfile);

// ✅ עדכון פרופיל לפי firebase_uid (שימוש פנימי או אדמין)
router.put('/:firebaseUid', usersController.updateUserProfile);

// ✅ מחיקת משתמש לפי firebase_uid
router.delete('/:firebaseUid', usersController.deleteUser);

module.exports = router;