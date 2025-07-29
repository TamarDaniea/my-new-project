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