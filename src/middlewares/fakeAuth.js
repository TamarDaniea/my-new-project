// middlewares/fakeAuth.js

module.exports = (req, res, next) => {
    // משתמש מדומה זמני לפיתוח
    req.user = {
        firebase_uid: 'abc123' // אפשר לשנות למזהה אחר אם בא לך
    };
    next();
};
