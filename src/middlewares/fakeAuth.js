module.exports = (req, res, next) => {

    // משתמש מדומה זמני לפיתוח
    req.user = {
        firebase_uid: 'admin123', // או מזהה משתמש אחר לפי הצורך
         role: 'admin', // או 'user' לפי הצורך
    };
    next();
};
//admin-בשביל GET /reports
//user-בשביל POST /report