// src/middlewares/auth.js
const admin = require('../firebase/fireBaseAdmin');
const User = require('../models/User');

const auth = async (req, res, next) => {
    // 1. קבלת הטוקן מה-header של הבקשה
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('No authorization token provided.');
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 2. אימות ופיענוח הטוקן באמצעות Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // 3. חילוץ הנתונים החשובים מהטוקן המפוענח
    // עדכון: יצירת אובייקט מותאם אישית כדי להשתמש ב-firebase_uid
    req.user = {
      firebase_uid: decodedToken.uid,
      // ניתן להוסיף כאן נתונים נוספים אם נדרש
      // לדוגמה: role: decodedToken.role, name: decodedToken.name
    };

    console.log('User authenticated:', req.user.firebase_uid);
    
    // 4. המשך לנקודת הקצה הבאה בשרשרת
    next();
  } catch (error) {
    // 5. טיפול בשגיאות
    console.error('Error verifying Firebase ID token:', error);
    if (error.code === 'auth/id-token-expired') {
        return res.status(401).send('Authorization token expired.');
    }
    return res.status(401).send('Unauthorized: Invalid token.');
  }
};

module.exports = auth;




