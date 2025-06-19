// src/routes/comments.js
const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const fakeAuth = require('../middlewares/fakeAuth'); 


// POST /api/comments - הוספת תגובה לפוסט או למיקום (דורש אימות)
// גוף הבקשה יכלול: { item_type: 'post' | 'location', item_id: number, content: string }
router.post('/', fakeAuth, commentsController.addComment);

// GET /api/comments/:item_type/:item_id - שליפת תגובות לפוסט או למיקום לפי סוג ו-ID (לא דורש אימות)
// לדוגמה: /api/comments/post/123 או /api/comments/location/456
router.get('/:item_type/:item_id', commentsController.getCommentsByItem);

// DELETE /api/comments/:id - מחיקת תגובה לפי ID (דורש אימות בעלות/אדמין)
router.delete('/:id', fakeAuth, commentsController.deleteComment);

module.exports = router;