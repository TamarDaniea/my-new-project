// middleware/auth.js
const admin = require('firebase-admin');
const User = require('../models/User'); // *** חדש: ייבוא מודל User ***

module.exports = async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const firebase_uid = decodedToken.uid;

        // *** חדש: אחזור פרטי המשתמש מה-DB כדי לקבל את ה-role ***
        const userFromDb = await User.getById(firebase_uid); // בהנחה ש-getById ב-User מקבל UID
        
        if (!userFromDb) {
            // אם המשתמש מאומת ב-Firebase אבל לא קיים ב-DB שלנו
            return res.status(401).json({ error: 'User not found in database' });
        }

        req.user = { 
            firebase_uid: firebase_uid,
            role: userFromDb.role // *** הוספנו את ה-role מפרטי המשתמש מה-DB ***
        };
        next();
    } catch (error) {
        console.error('Firebase authentication error:', error); // לוג שגיאה מפורט
        return res.status(401).json({ error: 'Invalid token or authentication failed' });
    }
};