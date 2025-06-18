module.exports = (req, res, next) => {

    // משתמש מדומה זמני לפיתוח
    req.user = {
        firebase_uid: 'abc1234'
    };
    next();
};