// // src/app.js
// const express = require('express');
// const cors = require('cors');
// const config = require('./config');
// const { connectToDatabase } = require('./utils/db');
// const locationsRouter = require('./routes/locations');
// const usersRouter = require('./routes/users');
// const postsRouter = require('./routes/posts');
// const commentsRouter = require('./routes/comments');
// const categoriesRouter = require('./routes/categories');
// const logsRouter = require('./routes/logs');
// const statsRouter = require('./routes/stats');
// const fakeAuthMiddleware = require('../middlewares/fakeAuth');


// // *** ייבוא המידלווארים החדשים/מעודכנים ***
// const fakeAuth = require('./middlewares/fakeAuth'); // ה-fakeAuth המעודכן
// const adminAuth = require('./middlewares/adminAuth'); // המידלוואר החדש לבדיקת אדמין
// const authMiddleware = require('./middlewares/auth'); // ה-authMiddleware האמיתי שלך מ-Firebase

// // נשאיר את זה, אך יש לשקול מעבר ל-authMiddleware אמיתי
// const reportsRouter = require('./routes/reports');
// const favoritesRouter = require('./routes/favoritesRouter');

// const i18n = require('./utils/i18n'); // ייבוא אובייקט ה-i18n המוגדר בקובץ utils/i18n.js
// const i18nextMiddleware = require('i18next-http-middleware');

// // ************** הוספה חדשה: ייבוא votesRouter **************
// const votesRouter = require('./routes/votes'); // זה כבר קיים ונכון
// const draftsRouter = require('./routes/drafts');

// // ************** הוספה חדשה: טעינת משתני סביבה (אם לא בטוח/ה ש-config.js מטפל בזה) **************
// // אם קובץ config.js שלך כבר קורא ל-dotenv.config(), שורה זו מיותרת.
// // אם לא, היא חיונית לקריאת PORT ועוד.
// require('dotenv').config(); // זה כבר קיים ונכון


// const app = express();

// // Middleware כלליים
// app.use(cors()); // Enable CORS
// app.use(express.json()); // Parse JSON request bodies
// app.use(express.urlencoded({ extended: true })); // מאפשר קבלת x-www-form-urlencoded

// // התחברות למסד הנתונים
// connectToDatabase();

// // נתיב בסיסי לבדיקה
// app.get('/', (req, res) => {
//     res.send('Shalom Platform Backend is running!');
// });

// // שימוש ב-middleware של i18n
// // חשוב שזה יהיה לפני הראוטים שמשתמשים ב-req.t()
// app.use(i18nextMiddleware.handle(i18n)); // זה כבר קיים ונכון

// // ייבוא הראוטר החדש לזמני שבת
// const shabbatTimesRouter = require('./routes/shabbatTimes');

// // *** קביעת מידלוואר האימות לשימוש בהתאם לסביבה ***
// // משתמשים ב-fakeAuth לפיתוח ובדיקות מקומיות ללא צורך ב-Firebase ID Token.
// // משתמשים ב-authMiddleware (האמיתי) לפרודקשן או בדיקות הדורשות אימות Firebase אמיתי.
// // ניתן לשנות את `process.env.NODE_ENV` בקובץ `.env` או בפקודת ההרצה (לדוגמה: `NODE_ENV=production node app.js`)
// const currentAuthMiddleware = process.env.NODE_ENV === 'production' ? authMiddleware : fakeAuth;


// // *** הגדרת ראוטים והחלת מידלווארים ***

// // ראוטים שדורשים אימות כללי (user או admin)
// app.use('/api/locations', currentAuthMiddleware, locationsRouter);
// app.use('/api/users', currentAuthMiddleware, usersRouter);
// app.use('/api/posts', currentAuthMiddleware, postsRouter);
// app.use('/api/comments', currentAuthMiddleware, commentsRouter);
// app.use('/api/favorites', currentAuthMiddleware, favoritesRouter);
// app.use('/api/votes', currentAuthMiddleware, votesRouter);
// app.use('/api/drafts', currentAuthMiddleware, draftsRouter);
// app.use('/api/logs', currentAuthMiddleware, logsRouter);
// // app.use('/api/reports', currentAuthMiddleware, reportsRouter); // ראוטים לדיווחים - דורשים אימות משתמש

// // ראוטים שדורשים הרשאות אדמין ספציפיות:
// // 1. ניהול קטגוריות: כל פעולות ה-CRUD על קטגוריות צריכות להיות מוגבלות לאדמין.
// app.use('/api/categories', currentAuthMiddleware, adminAuth, categoriesRouter);

// // 2. טיפול בדיווחים: צפייה, עדכון סטטוס וכו' של דיווחים צריכים להיות מוגבלים לאדמין.
// // שימו לב: שיניתי את הנתיב מ-`/api` ל-`/api/reports` כדי שיהיה ספציפי וברור יותר לראוטר זה.
// app.use('/api/reports', currentAuthMiddleware, adminAuth, reportsRouter);


// // ראוטים שלא דורשים אימות (כמו זמני שבת)
// app.use('/api/shabbat-times', shabbatTimesRouter);
// app.use('/api/admin/stats', statsRouter);
// router.get('/admin/stats', fakeAuthMiddleware, adminAuth, statsController.getAdminStats); // <--- השתמש ב-fakeAuthMiddleware

// // טיפול בשגיאות (אופציונלי, מומלץ - הוסף/י בסוף, לפני app.listen)
// app.use((err, req, res, next) => {
//     console.error(err.stack); // הדפס את פרטי השגיאה לקונסול השרת
//     res.status(500).send('Something went wrong on the server!'); // שלח תגובת שגיאה למשתמש
// });

// // הפעלת השרת
// app.listen(config.port, () => {
//     console.log(`Server is running on port ${config.port}`);
// });
// src/app.js
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { connectToDatabase } = require('./utils/db');
const i18n = require('./utils/i18n'); // ייבוא אובייקט ה-i18n המוגדר בקובץ utils/i18n.js
const i18nextMiddleware = require('i18next-http-middleware');
require('dotenv').config(); // טעינת משתני סביבה

const app = express();

// ייבוא מידלווארים
const authMiddleware = require('./middlewares/auth'); // ה-authMiddleware האמיתי שלך מ-Firebase
const fakeAuthMiddleware = require('./middlewares/fakeAuth'); // ה-fakeAuth המעודכן
const adminAuthMiddleware = require('./middlewares/adminAuth'); // המידלוואר לבדיקת אדמין (שיניתי את השם לבהירות)

// ייבוא ראוטרים
const locationsRouter = require('./routes/locations');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const categoriesRouter = require('./routes/categories');
const logsRouter = require('./routes/logs');
const reportsRouter = require('./routes/reports');
const favoritesRouter = require('./routes/favoritesRouter');
const votesRouter = require('./routes/votes');
const draftsRouter = require('./routes/drafts');
const shabbatTimesRouter = require('./routes/shabbatTimes');
const statsRouter = require('./routes/stats'); // ייבוא הראוטר עבור /api/admin/stats

// Middleware כלליים
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // מאפשר קבלת x-www-form-urlencoded

// התחברות למסד הנתונים
connectToDatabase();

// נתיב בסיסי לבדיקה
app.get('/', (req, res) => {
    res.send('Shalom Platform Backend is running!');
});

// שימוש ב-middleware של i18n
app.use(i18nextMiddleware.handle(i18n));

// *** קביעת מידלוואר האימות לשימוש בהתאם לסביבה ***
// משתמשים ב-fakeAuth לפיתוח ובדיקות מקומיות ללא צורך ב-Firebase ID Token.
// משתמשים ב-authMiddleware (האמיתי) לפרודקשן או בדיקות הדורשות אימות Firebase אמיתי.
// הגדר את NODE_ENV=production בקובץ .env או בפקודת ההרצה כדי להשתמש ב-authMiddleware האמיתי.
const currentAuthMiddleware = process.env.NODE_ENV === 'production' ? authMiddleware : fakeAuthMiddleware;


// *** הגדרת ראוטים והחלת מידלווארים ***

// ראוטים שדורשים אימות כללי (user או admin) - מידלוואר האימות בלבד
app.use('/api/locations', currentAuthMiddleware, locationsRouter);
app.use('/api/users', currentAuthMiddleware, usersRouter);
app.use('/api/posts', currentAuthMiddleware, postsRouter);
app.use('/api/comments', currentAuthMiddleware, commentsRouter);
app.use('/api/favorites', currentAuthMiddleware, favoritesRouter);
app.use('/api/votes', currentAuthMiddleware, votesRouter);
app.use('/api/drafts', currentAuthMiddleware, draftsRouter);
app.use('/api/logs', currentAuthMiddleware, logsRouter);
app.use('/api/reports', currentAuthMiddleware, reportsRouter); // ראוטים לדיווחים - דורשים אימות משתמש

// ראוטים שדורשים הרשאות אדמין ספציפיות:
// המידלווארים ירוצו לפי הסדר: currentAuthMiddleware (אימות), adminAuthMiddleware (בדיקת תפקיד אדמין), ואז הראוטר עצמו.
app.use('/api/categories', currentAuthMiddleware, adminAuthMiddleware, categoriesRouter);
app.use('/api/admin/stats', currentAuthMiddleware, adminAuthMiddleware, statsRouter); // <--- חשוב מאוד: הוספתי את שני המידלווארים כאן!
// שים לב: אין צורך ב-router.get('/admin/stats', ...) כאן, כי statsRouter כבר מטפל בזה.


// ראוטים שלא דורשים אימות (כמו זמני שבת)
app.use('/api/shabbat-times', shabbatTimesRouter);


// טיפול בשגיאות
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong on the server!');
});

// הפעלת השרת
app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});