const Comment = require('../models/Comment');
const Post = require('../models/Post');

const commentsController = {
    addCommentToPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const commentData = req.body;
            commentData.post_id = postId;
            commentData.user_id = req.user ? req.user.firebase_uid : 'test_uid_commenter';

            const newComment = await Comment.create(commentData);
            await Post.incrementCommentCount(postId);

            res.status(201).json({ message: req.t('comment.added'), comment: newComment });
        } catch (error) {
            console.error('Error adding comment to post:', error);
            res.status(500).json({ message: req.t('comment.addError'), error: error.message });
        }
    },

    getCommentsForPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const comments = await Comment.getCommentsByPostId(postId);
            res.status(200).json(comments);
        } catch (error) {
            console.error('Error fetching comments for post:', error);
            res.status(500).json({ message: req.t('comment.fetchError'), error: error.message });
        }
    },

    deleteComment: async (req, res) => {
        try {
            const { commentId } = req.params;
            const affectedRows = await Comment.delete(commentId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('comment.notFound') });
            }
            res.status(200).json({ message: req.t('comment.deleted') });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ message: req.t('comment.fetchError'), error: error.message });
        }
    }
};

module.exports = commentsController;
