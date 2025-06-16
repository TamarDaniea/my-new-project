// src/routes/comments.js
const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');

// This router can be used for general comment management
// For comments tied to posts, routes are already in posts.js
// This is useful if you want to expose a /api/comments endpoint directly.

// Example: GET a specific comment by ID
// router.get('/:id', commentsController.getCommentById); // Requires new method in controller
// Example: Update a comment by ID
// router.put('/:id', commentsController.updateComment); // Requires new method in controller
// Example: Delete a comment by ID (already in posts.js, but can be here too)
// router.delete('/:id', commentsController.deleteComment);

module.exports = router;