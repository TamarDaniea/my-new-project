// src/controllers/commentsController.js
const Comment = require('../models/Comment');
const Location = require('../models/Location'); // ייבוא מודל Location
const Post = require('../models/Post');

const commentsController = {
    // פונקציה כללית להוספת תגובה לפוסט או למיקום
    addComment: async (req, res) => {
        try {
            // מקבלים את סוג הפריט (post/location) ואת ה-ID שלו, ואת תוכן התגובה
            const { item_type, item_id, content } = req.body;
            // מזהה המשתמש מגיע מה-authMiddleware
            const user_id = req.user ? req.user.firebase_uid : 'test_uid_commenter'; // שימוש ב-req.user.firebase_uid

            // 1. ולידציה בסיסית לקלט
            if (!item_type || !item_id || !content || !['post', 'location'].includes(item_type) || content.trim() === '') {
                return res.status(400).json({ message: req.t('comments.invalid_input') });
            }

            // 2. ודא שה-item_id קיים ועדכן את מונה התגובות המתאים
            let commentData = { user_id, content };
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

            // 3. צור את התגובה במסד הנתונים
            const newComment = await Comment.create(commentData);

            res.status(201).json({ message: req.t('comments.added_success'), comment: newComment });
        } catch (error) {
            console.error('Error adding comment:', error);
            res.status(500).json({ message: req.t('comments.add_error'), error: error.message });
        }
    },

    // פונקציה כללית לשליפת תגובות עבור פוסט או מיקום
    // (זו הפונקציה שתחליף את getCommentsForPost)
    getCommentsByItem: async (req, res) => {
        try {
            const { item_type, item_id } = req.params; // נניח שנקבל item_type ו-item_id בפרמטרים של ה-URL

            if (!item_type || !item_id || !['post', 'location'].includes(item_type)) {
                return res.status(400).json({ message: req.t('comments.invalid_input') });
            }

            // קורא לפונקציה גנרית במודל Comment
            const comments = await Comment.getCommentsByItem(item_type, item_id);
            res.status(200).json(comments);
        } catch (error) {
            console.error('Error fetching comments:', error);
            res.status(500).json({ message: req.t('comments.fetch_error'), error: error.message });
        }
    },

    // פונקציה למחיקת תגובה
    deleteComment: async (req, res) => {
        try {
            const { id } = req.params; // ה-ID של התגובה למחיקה
            const user_id = req.user ? req.user.firebase_uid : 'test_uid_deleter'; // מזהה המשתמש המאומת

            // 1. קבל את פרטי התגובה כדי לדעת לאיזה פריט היא שייכת ומי המשתמש שיצר אותה
            const comment = await Comment.getById(id);
            if (!comment) {
                return res.status(404).json({ message: req.t('comments.not_found') });
            }

            // 2. ודא שהמשתמש הוא בעל התגובה או אדמין
            // (נניח ש-req.user.role מוגדר ע"י ה-authMiddleware)
            if (comment.user_id !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ message: req.t('comments.unauthorized_delete') });
            }

            // 3. מחק את התגובה ממסד הנתונים
            const affectedRows = await Comment.delete(id); // הפונקציה במודל תמחק לפי ID
            if (affectedRows === 0) {
                // למרות שכבר בדקנו אם התגובה קיימת, זו בדיקה נוספת
                return res.status(404).json({ message: req.t('comments.not_found') });
            }

            // 4. עדכן את מונה התגובות של הפוסט/מיקום המתאים
            if (comment.location_id) {
                await Location.decrementCommentCount(comment.location_id);
            } else if (comment.post_id) {
                await Post.decrementCommentCount(comment.post_id);
            }

            res.status(200).json({ message: req.t('comments.delete_success') });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ message: req.t('comments.delete_error'), error: error.message });
        }
    }
};

module.exports = commentsController;