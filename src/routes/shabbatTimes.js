// routes/shabbatTimes.js
const express = require('express');
const router = express.Router();
const shabbatTimesController = require('../controllers/shabbatTimesController');

// הגדרת נקודת קצה לזמני שבת
// לדוגמה: GET /api/shabbat-times?lat=31.77&lng=35.22&tzid=Asia/Jerusalem&candleLightingOffset=40&havdalahOffset=72
router.get('/', shabbatTimesController.getShabbatTimesForLocation);

module.exports = router;