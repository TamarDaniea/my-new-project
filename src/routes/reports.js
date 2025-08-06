const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const auth = require('../middlewares/auth'); // המידלוואר המדומה שלך

// רוטה להוספת דיווח (משתמש מחובר)
router.post('/report', auth, reportsController.createReport);

// רוטה לקבלת כל הדיווחים (רק אדמין)
router.get('/reports', auth, (req, res, next) => {
  // בודקים תפקיד לפני ההמשך
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: admin only' });
  }
  next();
}, reportsController.getReports);

module.exports = router;
