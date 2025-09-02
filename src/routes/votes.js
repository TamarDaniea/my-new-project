const express = require('express');
const router = express.Router();
const votesController = require('../controllers/votesController');
const auth = require('../middlewares/auth');
const Vote = require('../models/Vote');
// שליפה של רשימת הלייקים לפריט מסוים
router.get('/:itemType/:itemId', votesController.getLikes);

// שליפה של כמות הלייקים לפריט מסוים
router.get('/:itemType/:itemId/count', votesController.getLikeCount);

// הוספה או עדכון של דירוג (לייק/דיסלייק)
router.post('/', auth, votesController.addOrUpdateVote);

// מחיקת לייק (ע"י משתמש מחובר)
router.delete('/:itemType/:itemId', auth, votesController.deleteVote);
// הוסף בתוך הקובץ, לפני ה-module.exports
// ראוט חדש לשליפת כל הדירוגים של משתמש מחובר
router.get('/my-votes', auth, votesController.getUserVotes);

module.exports = router;