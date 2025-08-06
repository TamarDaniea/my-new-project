// src/routes/users.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const auth = require('../middlewares/auth'); 


// החל מידלוואר אימות (אמיתי או מזויף) על כל הראוטים בראוטר זה
// השתמש ב-auth בסביבת Production וב-auth בסביבת פיתוח/בדיקות
router.use(auth); // או router.use(auth);

// ✅ קבלת כל המשתמשים (לשימוש אדמין) - דורש הרשאת אדמין
router.get('/all', usersController.getAllUsers); // שיניתי את הנתיב כדי למנוע התנגשות עם /:firebaseUid

// חיפוש משתמשים לפי שם או אמייל query – רק לאדמין
router.get('/search', usersController.searchUsers); // שיניתי את הנתיב כדי למנוע התנגשות עם /:firebaseUid


router.get('/recent-views', usersController.getRecentViews);
// ✅ יצירת משתמש חדש - לרוב לא דורש אימות, אבל יכול להיות שמנגנון ה-signup מטפל בזה
// אם יצירת משתמש היא חלק מתהליך Signup שאינו דורש שהמשתמש כבר יהיה מאומת,
// ניתן להזיז את ה-POST / מחוץ ל-router.use(auth).
// כרגע, עם auth/auth על כל הראוטר, זה אומר שגם יצירת משתמש דורשת טוקן.
// אם זה לא רצוי, יש להזיז ראוט זה מעל ה-router.use(auth);
router.post('/', usersController.createUser);

// ✅ קבלת משתמש לפי firebase_uid (פרופיל ציבורי או מלא בהתאם למשתמש)
router.get('/:firebaseUid', usersController.getUserProfile);

// ✅ עדכון פרופיל לפי firebase_uid (שימוש פנימי או אדמין)
router.put('/:firebaseUid', usersController.updateUserProfile);

// ✅ מחיקת משתמש לפי firebase_uid (רק משתמש עצמו או אדמין)
router.delete('/:firebaseUid', usersController.deleteUser);


module.exports = router;