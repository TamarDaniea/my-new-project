// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { connectToDatabase } = require('./utils/db');
const i18n = require('./utils/i18n'); // ייבוא אובייקט ה-i18n המוגדר בקובץ utils/i18n.js
const i18nextMiddleware = require('i18next-http-middleware');
require('dotenv').config(); // טעינת משתני סביבה

const app = express();

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ייבוא מידלווארים
const auth = require('./middlewares/auth');
const adminAuthMiddleware = require('./middlewares/adminAuth'); // המידלוואר לבדיקת אדמין

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
const statsRouter = require('./routes/stats');
const reportReasonsRoutes = require('./routes/reportReasons');

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

// *** הגדרת ראוטים והחלת מידלווארים ***

// ראוטים שלא דורשים אימות (כמו קטגוריות, זמני שבת)
app.use('/api/categories', categoriesRouter);
app.use('/api/shabbat-times', shabbatTimesRouter);

// ראוטים שדורשים אימות כללי (user או admin) - מידלוואר האימות בלבד
app.use('/api/locations', auth, locationsRouter);
app.use('/api/users', auth, usersRouter);
app.use('/api/posts', auth, postsRouter);
app.use('/api/comments', auth, commentsRouter);
app.use('/api/favorites', auth, favoritesRouter);
app.use('/api/votes', auth, votesRouter);
app.use('/api/drafts', auth, draftsRouter);
app.use('/api/logs', auth, logsRouter);
app.use('/api/reports', auth, reportsRouter); // ראוטים לדיווחים - דורשים אימות משתמש
app.use('/api/report-reasons', auth, reportReasonsRoutes);

// ראוטים שדורשים הרשאות אדמין ספציפיות:
// המידלווארים ירוצו לפי הסדר: auth (אימות), adminAuthMiddleware (בדיקת תפקיד אדמין), ואז הראוטר עצמו.
app.use('/api/admin/categories', auth, adminAuthMiddleware, categoriesRouter);
app.use('/api/admin/stats', auth, adminAuthMiddleware, statsRouter);

// טיפול בשגיאות
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong on the server!');
});

// הפעלת השרת
app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});