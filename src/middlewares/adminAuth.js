// src/middlewares/adminAuth.js
const adminAuth = (req, res, next) => {
    // 1. ודא שאובייקט המשתמש קיים ב-req:
    // זה מצביע על כך שמידלוואר אימות (auth.js או fakeAuth.js) פעל לפני כן.
    // אם req.user לא קיים, זה אומר שהמשתמש לא מאומת כלל או שיש בעיה כלשהי.
    if (!req.user || !req.user.role) {
        return res.status(401).json({ error: 'Unauthorized: User authentication missing or incomplete.' });
    }

    // 2. בדוק את תפקיד המשתמש:
    // אם תפקיד המשתמש אינו 'admin', הוא אינו מורשה לגשת למשאב זה.
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Requires administrator privileges.' });
    }

    // 3. אם המשתמש הוא אדמין, אפשר לו להמשיך:
    // קריאה ל-next() מעבירה את הבקשה למידלוואר או לפונקציית הראוט הבאה בשרשרת.
    next();
};

module.exports = adminAuth;