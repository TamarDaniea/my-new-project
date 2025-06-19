// src/app.js
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { connectToDatabase } = require('./utils/db');
const locationsRouter = require('./routes/locations');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const categoriesRouter = require('./routes/categories');
const fakeAuth = require('./middlewares/fakeAuth'); // זה כבר קיים ונכון

// נשאיר את זה, אך יש לשקול מעבר ל-authMiddleware אמיתי
const reportsRouter = require('./routes/reports');
const favoritesRouter = require('./routes/favoritesRouter');

const i18n = require('./utils/i18n'); // ייבוא אובייקט ה-i18n המוגדר בקובץ utils/i18n.js
const i18nextMiddleware = require('i18next-http-middleware');

// ************** הוספה חדשה: ייבוא votesRouter **************
const votesRouter = require('./routes/votes'); // זה כבר קיים ונכון

// ************** הוספה חדשה: טעינת משתני סביבה (אם לא בטוח/ה ש-config.js מטפל בזה) **************
// אם קובץ config.js שלך כבר קורא ל-dotenv.config(), שורה זו מיותרת.
// אם לא, היא חיונית לקריאת PORT ועוד.
require('dotenv').config(); // זה כבר קיים ונכון


const app = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies

// ************** שינוי: הוספת app.use(express.urlencoded) אם נדרש (לפעמים נחוץ) **************
app.use(express.urlencoded({ extended: true })); // מאפשר קבלת x-www-form-urlencoded - זה כבר קיים ונכון

connectToDatabase();

app.get('/', (req, res) => {
    res.send('Shalom Platform Backend is running!');
});

// Routes
// ************** שימוש ב-middleware של i18n. חשוב שזה יהיה לפני הראוטים שמשתמשים ב-req.t() **************
app.use(i18nextMiddleware.handle(i18n)); // זה כבר קיים ונכון


// ************** שינוי/תיקון: הסרת הכפילות ב-locationsRouter **************
// יש לבחור איזה middleware להפעיל על /api/locations. אם fakeAuth הוא כללי לכל המשתתפים, השאירו אותו.
// אם אתם עוברים ל-authMiddleware אמיתי, סביר להניח שהוא יחליף את fakeAuth.
app.use('/api/locations', fakeAuth, locationsRouter); // זה כבר קיים ונכון
// app.use('/api/locations', locationsRouter); // שורה זו הוסרה כי היא כפולה ולא נכונה - זה כבר טופל

app.use('/api/users', fakeAuth, usersRouter); // זה כבר קיים ונכון

// ************** שינויים קטנים: הוספת fakeAuth לראוטים שחסר בהם **************
app.use('/api/posts', fakeAuth, postsRouter); // **שינוי: הוספת fakeAuth**
app.use('/api/comments', fakeAuth, commentsRouter); // **שינוי: הוספת fakeAuth**

app.use('/api/categories', categoriesRouter); // זה כבר קיים ונכון

app.use('/api', fakeAuth, reportsRouter); // **שינוי: הוספת fakeAuth**
app.use('/api/favorites', fakeAuth, favoritesRouter); // **שינוי: הוספת fakeAuth**

// ************** הוספה חדשה: ה-route עבור votes **************
app.use('/api/votes', fakeAuth, votesRouter); // זה כבר קיים ונכון

// טיפול בשגיאות (אופציונלי, מומלץ - הוסף/י בסוף, לפני app.listen)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
// ************** שימוש ב-config.port שלך, כפי שקיים בקוד המקורי **************
app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});