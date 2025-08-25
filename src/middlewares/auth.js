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




