// src/routes/posts.js
const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const commentsController = require('../controllers/commentsController'); // לטיפול בתגובות של פוסטים

// GET all posts
router.get('/', postsController.getAllPosts);
// GET posts by category
router.get('/byCategory', postsController.getPostsByCategory);
// POST new post
router.post('/', postsController.createPost);
// GET post by ID
router.get('/:id', postsController.getPostById);
// PUT update post by ID
router.put('/:id', postsController.updatePost);
// DELETE post by ID
router.delete('/:id', postsController.deletePost);

// POST add like to post (simple increment/decrement)
router.post('/:postId/like', postsController.addLikeToPost);
// DELETE remove like from post
router.delete('/:postId/like', postsController.removeLikeFromPost);

// --- Routes for comments on posts ---
// POST add a comment to a specific post
router.post('/:postId/comments', commentsController.addCommentToPost);
// GET all comments for a specific post
router.get('/:postId/comments', commentsController.getCommentsForPost);
// DELETE a specific comment (assuming comment ID is unique)
// Note: The structure here assumes commentId is unique enough to delete directly.
// If you need post_id as well, route will be different.
router.delete('/comments/:commentId', commentsController.deleteComment);


module.exports = router;