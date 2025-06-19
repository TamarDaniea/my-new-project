const Post = require('../models/Post');
const Category = require('../models/Category');
const User = require('../models/User');
const Location = require('../models/Location');

const postsController = {
    getAllPosts: async (req, res) => {
        try {
            const posts = await Post.getAll();
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({ message: req.t('posts.fetch_error'), error: error.message });
        }
    },

    createPost: async (req, res) => {
        try {
            const { title, content, images, category_id, location_id } = req.body;

            if (!title || !content || !images || !Array.isArray(images) || images.length === 0 || !category_id) {
                return res.status(400).json({ message: req.t('posts.missing_fields') });
            }

            const category = await Category.getById(category_id);
            if (!category) {
                return res.status(404).json({ message: req.t('posts.category_not_found', { id: category_id }) });
            }
            if (category.type !== 'post') {
                return res.status(400).json({ message: req.t('posts.invalid_category_type', { id: category_id }) });
            }

            const user_id = req.user ? req.user.firebase_uid : 'test_uid';
            const userExists = await User.getById(user_id);
            if (!userExists) {
                return res.status(404).json({ message: req.t('posts.user_not_found', { id: user_id }) });
            }

            let finalLocationId = null;
            if (location_id) {
                const locationExists = await Location.getById(location_id);
                if (!locationExists) {
                    return res.status(404).json({ message: req.t('posts.location_not_found', { id: location_id }) });
                }
                finalLocationId = location_id;
            }

            const postData = {
                title,
                content,
                images,
                user_id,
                category_id,
                location_id: finalLocationId
            };

            const newPost = await Post.create(postData);
            res.status(201).json({ message: req.t('posts.create_success'), post: newPost });

        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ message: req.t('posts.create_error'), error: error.message });
        }
    },

    getPostById: async (req, res) => {
        try {
            const post = await Post.getById(req.params.id);
            if (!post) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }
            res.status(200).json(post);
        } catch (error) {
            console.error('Error fetching post by ID:', error);
            res.status(500).json({ message: req.t('posts.fetch_error'), error: error.message });
        }
    },

    updatePost: async (req, res) => {
        try {
            const { id } = req.params;
            const postData = req.body;

            if (postData.category_id) {
                const category = await Category.getById(postData.category_id);
                if (!category || category.type !== 'post') {
                    return res.status(400).json({ message: req.t('posts.invalid_category_update') });
                }
            }

            if (postData.location_id) {
                const locationExists = await Location.getById(postData.location_id);
                if (!locationExists) {
                    return res.status(404).json({ message: req.t('posts.invalid_location_update') });
                }
            }

            const affectedRows = await Post.update(id, postData);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('posts.update_no_change') });
            }

            res.status(200).json({ message: req.t('posts.update_success') });
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({ message: req.t('posts.update_error'), error: error.message });
        }
    },

    deletePost: async (req, res) => {
        try {
            const affectedRows = await Post.delete(req.params.id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }
            res.status(200).json({ message: req.t('posts.delete_success') });
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ message: req.t('posts.delete_error'), error: error.message });
        }
    },

    addLikeToPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const affectedRows = await Post.incrementLikeCount(postId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('posts.like_increment_failed') });
            }
            res.status(200).json({ message: req.t('posts.like_added') });
        } catch (error) {
            console.error('Error adding like to post:', error);
            res.status(500).json({ message: req.t('posts.like_add_error'), error: error.message });
        }
    },

    getPostsByCategory: async (req, res) => {
        try {
            const { categoryId } = req.query;

            if (!categoryId) {
                return res.status(400).json({ message: req.t('posts.missing_category_query') });
            }

            const category = await Category.getById(categoryId);
            if (!category) {
                return res.status(404).json({ message: req.t('posts.category_not_found', { id: categoryId }) });
            }

            const posts = await Post.getByCategoryId(categoryId);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error fetching posts by category:', error);
            res.status(500).json({ message: req.t('posts.fetch_by_category_error'), error: error.message });
        }
    },

    removeLikeFromPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const affectedRows = await Post.decrementLikeCount(postId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('posts.like_decrement_failed') });
            }
            res.status(200).json({ message: req.t('posts.like_removed') });
        } catch (error) {
            console.error('Error removing like from post:', error);
            res.status(500).json({ message: req.t('posts.like_remove_error'), error: error.message });
        }
    }
};

module.exports = postsController;
