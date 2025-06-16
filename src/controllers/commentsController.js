// src/controllers/commentsController.js
const Comment = require('../models/Comment');
const Post = require('../models/Post'); // כדי לעדכן מונה תגובות בפוסט

const commentsController = {
    // הוספת תגובה לפוסט
    addCommentToPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const commentData = req.body;
            commentData.post_id = postId;
            commentData.user_id = req.user ? req.user.firebase_uid : 'test_uid_commenter'; // TODO: replace with actual authenticated user ID

            const newComment = await Comment.create(commentData);

            // עדכון מונה התגובות בפוסט
            await Post.incrementCommentCount(postId);

            res.status(201).json({ message: 'Comment added successfully', comment: newComment });
        } catch (error) {
            console.error('Error adding comment to post:', error);
            res.status(500).json({ message: 'Error adding comment', error: error.message });
        }
    },

    // קבלת כל התגובות לפוסט מסוים
    getCommentsForPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const comments = await Comment.getCommentsByPostId(postId);
            res.status(200).json(comments);
        } catch (error) {
            console.error('Error fetching comments for post:', error);
            res.status(500).json({ message: 'Error fetching comments', error: error.message });
        }
    },

    // מחיקת תגובה (לשימוש משתמש או אדמין)
    deleteComment: async (req, res) => {
        try {
            const { commentId } = req.params;
            const affectedRows = await Comment.delete(commentId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Comment not found' });
            }
            // TODO: Decrement comment count for the associated post if logic is in place
            res.status(200).json({ message: 'Comment deleted successfully' });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ message: 'Error deleting comment', error: error.message });
        }
    }
};

module.exports = commentsController;