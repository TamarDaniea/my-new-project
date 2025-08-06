// src/middlewares/adminAuth.js
const { ADMIN_UID } = require('../config/index');
const isAdminUser = require('../utils/UserActions');

const adminAuth = async (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    // בדיקה לפי UID, אפשר להוסיף גם בדיקת role אם רוצים
    if (req.user.firebase_uid !== ADMIN_UID) {
        return res.status(403).json({ error: 'Forbidden: Requires administrator privileges.' });
    }

    const isAdmin = await isAdminUser(req.user.firebase_uid);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Requires administrator privileges.' });
    }
    next();
};

module.exports = adminAuth;


// // src/middlewares/adminAuth.js
// const adminAuth = (req, res, next) => {
//     // 1. ודא שאובייקט המשתמש קיים ב-req:
//     // זה מצביע על כך שמידלוואר אימות (auth.js או fakeAuth.js) פעל לפני כן.
//     // אם req.user לא קיים, זה אומר שהמשתמש לא מאומת כלל או שיש בעיה כלשהי.
//     if (!req.user || !req.user.role) {
//         // נותן הודעה מפורטת יותר עבור דיבוג
//         console.error('adminAuth: req.user or req.user.role is missing.', { reqUser: req.user });
//         return res.status(401).json({ error: 'Unauthorized: User authentication missing or incomplete.' });
//     }

//     // 2. בדוק את תפקיד המשתמש:
//     // אם תפקיד המשתמש אינו 'admin', הוא אינו מורשה לגשת למשאב זה.
//     if (req.user.role !== 'admin') {
//         console.warn(`adminAuth: User ${req.user.firebase_uid} (Role: ${req.user.role}) attempted to access admin route.`);
//         return res.status(403).json({ error: 'Forbidden: Requires administrator privileges.' });
//     }

//     // 3. אם המשתמש הוא אדמין, אפשר לו להמשיך:
//     // קריאה ל-next() מעבירה את הבקשה למידלוואר או לפונקציית הראוט הבאה בשרשרת.
//     next();
// };

// module.exports = adminAuth;