// src/firebase/fireBaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// אתחול Firebase Admin SDK
// השגיאה "admin.auth is not a function" מופיעה בדרך כלל
// כשאין גישה נכונה למתודות של האובייקט admin.
// הקוד הזה נראה תקין, והוא אמור לייצא את המופע המלא של admin.
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// ייצוא המופע של admin.
module.exports = admin;
