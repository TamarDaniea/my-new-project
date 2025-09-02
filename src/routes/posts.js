// src/routes/posts.js
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });
const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const commentsController = require('../controllers/commentsController'); // לטיפול בתגובות של פוסטים
const auth = require('../middlewares/auth');

// GET all posts (לא דורש אימות)
// גם לקטגוריה וגם למשתמש
router.get('/', postsController.getPosts);
// router.get('/', postsController.getAllPosts);
// GET posts sorted by date (לא דורש אימות)
router.get('/by-date', postsController.getPostsByDate);
// GET posts by category (לא דורש אימות)
// router.get('/byCategory', postsController.getPostsByCategory);
// POST new post (דורש אימות)
router.post('/', auth, upload.array('images'), postsController.createPost);

// GET post by ID (לא דורש אימות)
router.get('/:id', postsController.getPostById);
// PUT update post by ID (דורש אימות)
router.put('/:id', auth, postsController.updatePost); // שינוי כאן
// DELETE post by ID (דורש אימות)
router.delete('/:id', auth, postsController.deletePost); // שינוי כאן

// // POST add like to post (דורש אימות)
// router.post('/:postId/like', auth, postsController.addLikeToPost); // שינוי כאן
// // DELETE remove like from post (דורש אימות)
// router.delete('/:postId/like', auth, postsController.removeLikeFromPost); // שינוי כאן


//router.post('/:postId/comments', auth, commentsController.addCommentToPost); // שינוי כאן
// GET all comments for a specific post (לא דורש אימות)
//router.get('/:postId/comments', commentsController.getCommentsForPost);
// DELETE a specific comment (דורש אימות)
router.post('/:id/view', postsController.incrementViews);
router.delete('/comments/:commentId', auth, commentsController.deleteComment); // שינוי כאן

module.exports = router;