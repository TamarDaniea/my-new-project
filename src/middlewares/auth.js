// src/middlewares/auth.js
const admin = require('../firebase/fireBaseAdmin');
const User = require('../models/User');

const auth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const firebase_uid = decodedToken.uid;

        if (!decodedToken.email_verified) {
            return res.status(403).json({ error: 'Email not verified' });
        }

        const userFromDb = await User.getById(firebase_uid);
        if (!userFromDb) {
            return res.status(401).json({ error: 'User not found in database' });
        }

        req.user = {
            firebase_uid,
            role: userFromDb.role,
            name: userFromDb.name,
            email: userFromDb.email,
        };

        next();
    } catch (error) {
        console.error('Firebase authentication error:', error);
        return res.status(401).json({ error: 'Invalid token or authentication failed' });
    }
};

module.exports = auth;




// const admin = require('firebase-admin');
// const User = require('../models/User');

// module.exports = async function authenticate(req, res, next) {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return res.status(401).json({ error: req.t ? req.t('auth.no_token') : 'No token provided' });
//     }

//     const token = authHeader.split(' ')[1];

//     try {
//         const decodedToken = await admin.auth().verifyIdToken(token);
//         const firebase_uid = decodedToken.uid;

//         // ⛔️ בדיקת האם המשתמש אישר את המייל שלו
//         if (!decodedToken.email_verified) {
//             return res.status(403).json({ error: req.t ? req.t('auth.email_not_verified') : 'Email not verified. Please check your inbox.' });
//         }

//         // אחזור פרטי המשתמש מה-DB
//         const userFromDb = await User.getById(firebase_uid);
//         if (!userFromDb) {
//             return res.status(401).json({ error: req.t ? req.t('auth.user_not_found') : 'User not found in database' });
//         }

//         req.user = {
//             firebase_uid: firebase_uid,
//             role: userFromDb.role
//         };

//         next();
//     } catch (error) {
//         console.error('Firebase authentication error:', error);
//         return res.status(401).json({ error: req.t ? req.t('auth.invalid_token') : 'Invalid token or authentication failed' });
//     }
// };


