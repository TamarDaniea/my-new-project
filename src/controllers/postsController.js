// src/controllers/postsController.js
const Post = require('../models/Post');
const Comment = require('../models/Comment'); // כדי לטפל בתגובות של פוסטים

const postsController = {
    // קבלת כל הפוסטים
    getAllPosts: async (req, res) => {
        try {
            const posts = await Post.getAll();
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({ message: 'Error fetching posts', error: error.message });
        }
    },

    // יצירת פוסט חדש
    createPost: async (req, res) => {
        try {
            const postData = req.body;
            // הוספת user_id (מזהה משתמש) מהטוקן המאומת אם קיים middleware אימות
            postData.user_id = req.user ? req.user.firebase_uid : 'test_uid_post'; // TODO: replace 'test_uid_post' with actual authenticated user ID

            const newPost = await Post.create(postData);
            res.status(201).json({ message: 'Post created successfully', post: newPost });
        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ message: 'Error creating post', error: error.message });
        }
    },

    // קבלת פוסט לפי ID
    getPostById: async (req, res) => {
        try {
            const post = await Post.getById(req.params.id);
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }
            res.status(200).json(post);
        } catch (error) {
            console.error('Error fetching post by ID:', error);
            res.status(500).json({ message: 'Error fetching post', error: error.message });
        }
    },

    // עדכון פוסט
    updatePost: async (req, res) => {
        try {
            const affectedRows = await Post.update(req.params.id, req.body);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Post not found or no changes made' });
            }
            res.status(200).json({ message: 'Post updated successfully' });
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({ message: 'Error updating post', error: error.message });
        }
    },

    // מחיקת פוסט
    deletePost: async (req, res) => {
        try {
            const affectedRows = await Post.delete(req.params.id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Post not found' });
            }
            res.status(200).json({ message: 'Post deleted successfully' });
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ message: 'Error deleting post', error: error.message });
        }
    },

    // הוספת לייק לפוסט
    addLikeToPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const affectedRows = await Post.incrementLikeCount(postId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Post not found' });
            }
            res.status(200).json({ message: 'Like added to post' });
        } catch (error) {
            console.error('Error adding like to post:', error);
            res.status(500).json({ message: 'Error adding like', error: error.message });
        }
    },

    // הסרת לייק מפוסט
    removeLikeFromPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const affectedRows = await Post.decrementLikeCount(postId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Post not found or like_count already 0' });
            }
            res.status(200).json({ message: 'Like removed from post' });
        } catch (error) {
            console.error('Error removing like from post:', error);
            res.status(500).json({ message: 'Error removing like', error: error.message });
        }
    }
};

module.exports = postsController;