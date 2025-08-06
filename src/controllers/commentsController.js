const Comment = require('../models/Comment');
const Location = require('../models/Location');
const Post = require('../models/Post');
const logEvent = require('../utils/logEvent');
const UserActions = require('../utils/UserActions');

const commentsController = {
    addComment: async (req, res) => {
        try {
            const { item_type, item_id, content, parent_id } = req.body;
            const user_id = req.user ? req.user.firebase_uid : 'test_uid_commenter';

            if (!item_type || !item_id || !content || !['post', 'location'].includes(item_type) || content.trim() === '') {
                return res.status(400).json({ message: req.t('comments.invalid_input') });
            }

            let commentData = { user_id, content };
            if (parent_id) commentData.parent_id = parent_id;
            if (item_type === 'location') {
                const location = await Location.getById(item_id);
                if (!location) {
                    return res.status(404).json({ message: req.t('comments.location_not_found') });
                }
                commentData.location_id = item_id;
                await Location.incrementCommentCount(item_id);
            } else if (item_type === 'post') {
                const post = await Post.getById(item_id);
                if (!post) {
                    return res.status(404).json({ message: req.t('comments.post_not_found') });
                }
                commentData.post_id = item_id;
                await Post.incrementCommentCount(item_id);
            }

            const newComment = await Comment.create(commentData);
            await logEvent('ADD_COMMENT', `User ${user_id} added comment to ${item_type} ${item_id}`, user_id);
            await UserActions.trackAction(
                req.user.firebase_uid,
                `comment_${item_type}`,
                item_type,
                item_id
            );

            res.status(201).json({ message: req.t('comments.added_success'), comment: newComment });
        } catch (error) {
            console.error('Error adding comment:', error);
            res.status(500).json({ message: req.t('comments.add_error'), error: error.message });
        }
    },

    getCommentsByItem: async (req, res) => {
        try {
            const { item_type, item_id } = req.params;

            if (!item_type || !item_id || !['post', 'location'].includes(item_type)) {
                return res.status(400).json({ message: req.t('comments.invalid_input') });
            }

            const commentsFlat = await Comment.getHierarchicalComments(item_type, item_id);

            // בניית עץ תגובות מהפלט השטוח
            const commentMap = {};
            const roots = [];

            commentsFlat.forEach(comment => {
                comment.replies = [];
                commentMap[comment.id] = comment;
            });

            commentsFlat.forEach(comment => {
                if (comment.parent_id) {
                    commentMap[comment.parent_id]?.replies.push(comment);
                } else {
                    roots.push(comment);
                }
            });

            res.status(200).json(roots);
        } catch (error) {
            console.error('Error fetching hierarchical comments:', error);
            res.status(500).json({ message: req.t('comments.fetch_error'), error: error.message });
        }
    },


    // פונקציה חדשה לשליפת תגובות לפי פרמטרי קוורי
    getCommentsByItemByQuery: async (req, res) => {
        try {
            const { itemType, itemId } = req.query; // משתמשים ב-req.query

            if (!itemType || !itemId || !['post', 'location'].includes(itemType)) {
                return res.status(400).json({ message: req.t('comments.invalid_input') });
            }

            const comments = await Comment.getCommentsByItem(itemType, itemId);
            res.status(200).json(comments);
        } catch (error) {
            console.error('Error fetching comments by query params:', error);
            res.status(500).json({ message: req.t('comments.fetch_error'), error: error.message });
        }
    },

    deleteComment: async (req, res) => {
        try {
            const { id } = req.params;
            const user_id = req.user ? req.user.firebase_uid : 'test_uid_deleter';

            const comment = await Comment.getById(id);
            if (!comment) {
                return res.status(404).json({ message: req.t('comments.not_found') });
            }

            // לוגיקת הרשאות למחיקה
            // המשתמש יכול למחוק אם הוא בעל התגובה או אם הוא אדמין
            if (comment.user_id !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ message: req.t('comments.unauthorized_delete') });
            }

            const affectedRows = await Comment.delete(id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('comments.not_found') });
            }

            if (comment.location_id) {
                await Location.decrementCommentCount(comment.location_id);
            } else if (comment.post_id) {
                await Post.decrementCommentCount(comment.post_id);
            }

            await logEvent('DELETE_COMMENT', `User ${user_id} deleted comment ${id} from ${comment.post_id ? 'post' : 'location'}`, user_id);
            res.status(200).json({ message: req.t('comments.delete_success') });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ message: req.t('comments.delete_error'), error: error.message });
        }
    },

    editComment: async (req, res) => {
        try {
            const { id } = req.params;
            const { content } = req.body;
            const user_id = req.user ? req.user.firebase_uid : 'test_uid_editor';
            const user_role = req.user ? req.user.role : 'guest';

            if (!content || content.trim() === '') {
                return res.status(400).json({ message: req.t('comments.content_missing') });
            }

            const comment = await Comment.getById(id);
            if (!comment) {
                return res.status(404).json({ message: req.t('comments.not_found') });
            }

            let canEdit = false;
            if (comment.user_id === user_id) {
                canEdit = true;
            } else if (user_role === 'admin') {
                canEdit = true;
            }

            if (!canEdit) {
                return res.status(403).json({ message: req.t('comments.unauthorized_edit') });
            }

            let affectedRows;
            if (user_role === 'admin') {
                affectedRows = await Comment.updateContentOnly(id, content);
            } else {
                affectedRows = await Comment.update(id, user_id, content);
            }

            if (affectedRows === 0) {
                return res.status(200).json({ message: req.t('comments.update_no_actual_change') });
            }

            await logEvent('EDIT_COMMENT', `User ${user_id} updated comment ${id}`, user_id);
            res.status(200).json({ message: req.t('comments.edit_success'), updatedCommentId: id });

        } catch (error) {
            console.error('Error editing comment:', error);
            res.status(500).json({ message: req.t('comments.edit_error'), error: error.message });
        }
    }
};

module.exports = commentsController;