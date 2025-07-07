const axios = require('axios');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const firebaseApiKey = process.env.FIREBASE_API_KEY; // קבלת מפתח API מ-env
const emailUser = process.env.EMAIL_USER; // כתובת המייל שלך
const emailPass = process.env.EMAIL_PASS; // סיסמה או app password

// 1. יצירת לינק אימות
async function getEmailVerificationLink(email) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`;
  
  const body = {
    requestType: 'VERIFY_EMAIL',
    email,
  };

  const response = await axios.post(url, body);
  // response.data כולל oobCode - קוד האימות
  return response.data.oobCode;
}

// 2. שליחת מייל עם הלינק
async function sendVerificationEmail(email, oobCode) {
  const verificationLink = `https://yourapp.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=${oobCode}`;
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: emailUser,
    to: email,
    subject: 'אישור הרשמה ל-Shalom',
    html: `
      <p>שלום!</p>
      <p>אנא אשר את כתובת המייל שלך על ידי לחיצה על הקישור הבא:</p>
      <a href="${verificationLink}">אשר את המייל</a>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// 3. דוגמה לשימוש בפונקציית יצירת משתמש
async function registerUser(email, password) {
  
  
  // יצירת משתמש
  const userRecord = await admin.auth().createUser({
    email,
    password,
  });

  // יצירת לינק אימות ושליחת מייל
  const oobCode = await getEmailVerificationLink(email);
  await sendVerificationEmail(email, oobCode);

  return userRecord;
}
module.exports = {
  registerUser, 
};

