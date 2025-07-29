// src/middlewares/fakeAuth.js
const fakeAuth = (req, res, next) => {
    // לדמות משתמש מחובר לצורך פיתוח ובדיקות.
    // ניתן לשלוט בתפקיד המשתמש באמצעות כותרת HTTP בשם 'x-user-role'.
    // אם הכותרת לא קיימת, התפקיד יוגדר כברירת מחדל ל-'user'.
    const userRole = req.headers['x-user-role'] || 'user';
    const userIdHeader = req.headers['user-id']; // ודא שאתה קורא את ה-UID אם הוא נשלח

    // הגדרת firebase_uid:
    // עבור תפקיד 'admin', נשתמש ב-UID קבוע ('admin123') כדי שיהיה קל יותר
    // לשייך נתונים לאדמין ב-DB לבדיקות.
    // עבור תפקיד 'user' (או כל תפקיד אחר), נשתמש ב-UID מההידר, או ב-UID קבוע שהכנסנו ל-DB
    let firebaseUid;
    if (userIdHeader) { // אם ה-UID נשלח בהידר, נשתמש בו
        firebaseUid = userIdHeader;
    } else if (userRole === 'admin') {
        firebaseUid = 'admin123'; // UID קבוע עבור אדמין (כבר קיים ב-DB)
    } else {
        // *** השינוי כאן: השתמש ב-UID הקבוע שיצרת בשלב 1 עבור משתמש רגיל ***
        firebaseUid = 'test_user_001'; // <-- וודא שזה תואם ל-UID שהכנסת ל-DB!
    }

    // הגדרת אובייקט המשתמש ב-req.user.
    // זהו האובייקט שמידלווארים הבאים (כמו adminAuth) יבדקו.
    req.user = {
        firebase_uid: firebaseUid,
        name: userRole === 'admin' ? 'Fake Admin User' : 'Fake Regular User',
        email: userRole === 'admin' ? 'admin@example.com' : 'user.' + firebaseUid + '@example.com',
        role: userRole,
    };

    console.log(`[fakeAuth] req.user initialized: firebase_uid=${req.user.firebase_uid}, role=${req.user.role}`);

    next(); // העבר את הבקשה למידלוואר/ראוט הבא
};

module.exports = fakeAuth;