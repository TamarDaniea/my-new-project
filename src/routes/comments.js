const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const auth = require('../middlewares/auth');


// שליפת תגובות של פוסט או מקום (GET /comments/:item_type/:item_id)
// נתיב זה מאחד את שתי הפונקציות שהיו בלקוח (לפוסט וכללי)
router.get('/:item_type/:item_id', commentsController.getCommentsByItem);

// הוספת תגובה (POST /comments)
router.post('/', auth, commentsController.addComment);

// עריכת תגובה (PUT /comments/:id)
router.put('/:id', auth, commentsController.editComment);

// מחיקת תגובה (DELETE /comments/:id)
router.delete('/:id', auth, commentsController.deleteComment);

module.exports = router;