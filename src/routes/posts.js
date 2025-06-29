// src/routes/posts.js
const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const commentsController = require('../controllers/commentsController'); // לטיפול בתגובות של פוסטים
const fakeAuth = require('../middlewares/fakeAuth'); // ודא שורה זו קיימת

// GET all posts (לא דורש אימות)
router.get('/', postsController.getAllPosts);
// GET posts by category (לא דורש אימות)
router.get('/byCategory', postsController.getPostsByCategory);
// POST new post (דורש אימות)
router.post('/', fakeAuth, postsController.createPost); 

// GET post by ID (לא דורש אימות)
router.get('/:id', postsController.getPostById);
// PUT update post by ID (דורש אימות)
router.put('/:id', fakeAuth, postsController.updatePost); // שינוי כאן
// DELETE post by ID (דורש אימות)
router.delete('/:id', fakeAuth, postsController.deletePost); // שינוי כאן

// // POST add like to post (דורש אימות)
// router.post('/:postId/like', fakeAuth, postsController.addLikeToPost); // שינוי כאן
// // DELETE remove like from post (דורש אימות)
// router.delete('/:postId/like', fakeAuth, postsController.removeLikeFromPost); // שינוי כאן



// --- Routes for comments on posts ---
// POST add a comment to a specific post (דורש אימות)

//router.post('/:postId/comments', fakeAuth, commentsController.addCommentToPost); // שינוי כאן
// GET all comments for a specific post (לא דורש אימות)
//router.get('/:postId/comments', commentsController.getCommentsForPost);
// DELETE a specific comment (דורש אימות)
router.delete('/comments/:commentId', fakeAuth, commentsController.deleteComment); // שינוי כאן

module.exports = router;