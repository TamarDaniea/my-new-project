// routes/logs.js
const express = require('express');
const router = express.Router();
const Log = require('../models/logs'); // ודאי שהמודל קיים
const adminAuth = require('../middlewares/adminAuth'); // המידלוואר לאימות אדמין

router.get('/', adminAuth, async (req, res) => {
  try {
    console.log('📥 בקשה לצפייה בלוגים התקבלה');
    const logs = await Log.findAll(); // ← כאן לרוב נופל אם הפונקציה לא קיימת או שגויה
    res.status(200).json(logs);
  } catch (error) {
    console.error('❌ שגיאה בעת שליפת הלוגים:', error.message);
    res.status(500).json({ error: req.t('logs.fetch_error'), details: error.message });
  }
});
module.exports = router;
