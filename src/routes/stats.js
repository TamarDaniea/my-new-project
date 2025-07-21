// src/routes/stats.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// הנתיב לסטטיסטיקות אדמין יטופל כאן
// שימו לב: אין צורך במידלווארים לאימות או הרשאה כאן,
// מכיוון שהם כבר הוגדרו ב-app.js עבור '/api/admin/stats'.
router.get('/', statsController.getAdminStats); // הראוטר הזה מופעל תחת '/api/admin/stats'

module.exports = router;