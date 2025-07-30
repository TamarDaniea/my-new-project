const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const fakeAuth = require('../middlewares/fakeAuth');
const auth = require('../middlewares/auth');

// שליפת תגובות לפי פרמטרים בקוורי (GET /comments?itemType=location&itemId=123) - חדש
// חשוב שהנתיב הזה יהיה לפני הנתיב עם פרמטרים ב-path כדי למנוע התנגשות
router.get('/', commentsController.getCommentsByItemByQuery);

// הוספת תגובה (POST /comments)
router.post('/', fakeAuth, commentsController.addComment);

// שליפת תגובות של פוסט או מקום (GET /comments/:item_type/:item_id)
router.get('/:item_type/:item_id', commentsController.getCommentsByItem);

// עריכת תגובה (PUT /comments/:id)
router.put('/:id', fakeAuth, commentsController.editComment);

// מחיקת תגובה (DELETE /comments/:id)
router.delete('/:id', fakeAuth, commentsController.deleteComment);

module.exports = router;