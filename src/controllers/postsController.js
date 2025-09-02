// src/controllers/postsController.js
const multer = require('multer');
const Post = require('../models/Post');
const Category = require('../models/Category');
const User = require('../models/User');
const Location = require('../models/Location');
const logEvent = require('../utils/logEvent');
const UserActions = require('../utils/UserActions');
const path = require('path');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });


const postsController = {

    // פונקציה לקבלת כל הפוסטים
    // getAllPosts: async (req, res) => {
    //     try {
    //         const { page = 1, limit = 6 } = req.query;
    //         const offset = (parseInt(page) - 1) * parseInt(limit);

    //         const { items, totalCount } = await Post.getAll({
    //             limit: parseInt(limit),
    //             offset
    //         });

    //         const hasMore = offset + parseInt(limit) < totalCount;

    //         res.status(200).json({
    //             items,
    //             hasMore
    //         });

    //     } catch (error) {
    //         console.error('Error fetching posts:', error);
    //         res.status(500).json({ message: req.t('posts.fetch_error'), error: error.message });
    //     }
    // },
    // פונקציה מאוחדת לקבלת פוסטים עם פילטרים ופגינציה
    // היא מטפלת בכל המקרים: כל הפוסטים, פוסטים לפי קטגוריה ופוסטים לפי משתמש.
    getPosts: async (req, res) => {
        try {
            // קבלת פרמטרים מפגינציה וסינון מתוך השאילתה (query parameters)
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 6;
            const userId = req.query.userId || null;
            const categoryId = req.query.categoryId || null;

            // בדיקת קיום הקטגוריה אם צוינה
            if (categoryId) {
                const category = await Category.getById(categoryId);
                if (!category) {
                    return res.status(404).json({ message: req.t('posts.category_not_found', { id: categoryId }) });
                }
            }

            // בדיקת קיום המשתמש אם צוין
            if (userId) {
                const user = await User.getById(userId);
                if (!user) {
                    return res.status(404).json({ message: req.t('posts.user_not_found', { id: userId }) });
                }
            }

            // קריאה לפונקציה חדשה במודל שתבצע את הסינון והפגינציה במסד הנתונים
            const { items, totalCount } = await Post.getFilteredAndPaginated({
                page,
                limit,
                userId,
                categoryId
            });

            // חישוב האם ישנם עוד פוסטים בעמודים הבאים
            const hasMore = (page * limit) < totalCount;

            res.status(200).json({
                items,
                hasMore
            });
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({ message: req.t('posts.fetch_error'), error: error.message });
        }
    },

    // פונקציה ליצירת פוסט חדש
    createPost: async (req, res) => {
        try {
            // הנתונים הטקסטואליים נמצאים ב-req.body
            const { title, content, category_id, location_id } = req.body;
            // התמונות שהועלו נמצאות ב-req.files
            // אנו יוצרים מערך של נתיבי קבצים
            let finalImages = req.files ? req.files.map(file => file.path) : [];

            if (!title || !content || !category_id || (images !== undefined && !Array.isArray(images))) {
                console.log('Missing fields for post creation:', { title, content, images, category_id });
                return res.status(400).json({ message: req.t('posts.missing_fields') });
            }

            finalImages = Array.isArray(images) ? images : [];

            const category = await Category.getById(category_id);
            if (!category) {
                return res.status(404).json({ message: req.t('posts.category_not_found', { id: category_id }) });
            }
            if (category.type !== 'post') {
                return res.status(400).json({ message: req.t('posts.invalid_category_type', { id: category_id }) });
            }

            // ודא ש-req.user.firebase_uid קיים - שונה מעט ללוגיקה בטוחה יותר
            const user_id = req.user && req.user.firebase_uid ? req.user.firebase_uid : null;
            if (!user_id) {
                console.error('createPost: User ID is missing from req.user', req.user);
                return res.status(401).json({ message: req.t('posts.unauthorized_user_id') });
            }

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
                images: finalImages, // השתמש בנתיבי הקבצים שהתקבלו
                user_id,
                category_id,
                location_id: finalLocationId
            };

            const newPost = await Post.create(postData);

            await logEvent(
                'CREATE',
                `User ${user_id} created post "${title}"`,
                user_id
            );
            // ודא ש-user_id קיים לפני מעקב פעולה
            if (user_id) {
                await UserActions.trackAction(
                    user_id,
                    'create_post',
                    'post',
                    newPost.id
                );
            }
            res.status(201).json({ message: req.t('posts.create_success'), post: newPost });

        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ message: req.t('posts.create_error'), error: error.message });
        }
    },

    // פונקציה לקבלת פוסט לפי ID
    getPostById: async (req, res) => {
        console.log('Current user (getPostById):', req.user);

        try {
            const post = await Post.getById(req.params.id);
            if (!post) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }

            await Post.incrementViewCount(req.params.id);
            // ודא ש-req.user.firebase_uid קיים לפני מעקב פעולה
            if (req.user && req.user.firebase_uid) {
                await UserActions.trackAction(
                    req.user.firebase_uid,
                    'view_post',
                    'post',
                    post.id
                );
            } else {
                console.warn('getPostById: req.user or firebase_uid missing for tracking action.');
            }
            res.status(200).json(post);
        } catch (error) {
            console.error('Error fetching post by ID:', error);
            res.status(500).json({ message: req.t('posts.fetch_error'), error: error.message });
        }
    },
    getPostsByDate: async (req, res) => {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ message: 'Missing start or end date' });
        }

        try {
            const posts = await Post.getPostsByDate(start, end);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // פונקציה לעדכון פוסט קיים
    updatePost: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, content, images, category_id, location_id } = req.body;
            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('posts.unauthorized') });
            }

            const user = await User.getById(userId);
            const isAdmin = user && user.role === 'admin';

            const existingPost = await Post.getById(id);
            if (!existingPost || existingPost.is_deleted) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }

            const isOwner = await Post.isOwner(id, userId);
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: req.t('posts.forbidden_update') });
            }

            const postDataToUpdate = {};
            // ... (הקוד הקיים לבניית postDataToUpdate) ...
            if (title !== undefined) postDataToUpdate.title = title;
            if (content !== undefined) postDataToUpdate.content = content;
            if (images !== undefined) {
                if (!Array.isArray(images)) {
                    return res.status(400).json({ message: req.t('posts.invalid_images_format') });
                }
                // שלב 1: אם יש תמונות חדשות, מחק את הישנות
                if (existingPost.images && existingPost.images.length > 0) {
                    const uploadsDir = path.join(__dirname, '../uploads');
                    for (const imageName of existingPost.images) {
                        try {
                            const imagePath = path.join(uploadsDir, imageName);
                            await fs.unlink(imagePath);
                            console.log(`Deleted old image during update: ${imageName}`);
                        } catch (err) {
                            console.error(`Error deleting old image: ${imageName}`, err);
                        }
                    }
                }
                postDataToUpdate.images = images;
            }

            if (category_id !== undefined) {
                const category = await Category.getById(category_id);
                if (!category || category.type !== 'post') {
                    return res.status(400).json({ message: req.t('posts.invalid_category_update') });
                }
                postDataToUpdate.category_id = category_id;
            }

            if (location_id !== undefined) {
                if (location_id !== null) {
                    const locationExists = await Location.getById(location_id);
                    if (!locationExists) {
                        return res.status(404).json({ message: req.t('posts.invalid_location_update') });
                    }
                }
                postDataToUpdate.location_id = location_id;
            }

            if (Object.keys(postDataToUpdate).length === 0) {
                return res.status(400).json({ message: req.t('posts.no_fields_to_update') });
            }

            const affectedRows = await Post.update(id, postDataToUpdate);

            if (affectedRows > 0) {
                await logEvent('UPDATE', `User ${userId} updated post ${id}`, userId);
            }

            res.status(200).json({ message: req.t('posts.update_success') });
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({ message: req.t('posts.update_error'), error: error.message });
        }
    },

    // פונקציה למחיקת פוסט
    deletePost: async (req, res) => {
        try {
            const postId = req.params.id;
            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('posts.unauthorized') });
            }

            const user = await User.getById(userId);
            if (!user) {
                return res.status(404).json({ message: req.t('posts.user_not_found', { id: userId }) });
            }
            const isAdmin = user.role === 'admin';

            // קבלת הפוסט כדי לבדוק קיום ולקבל את שמות התמונות
            const postToDelete = await Post.getById(postId);
            if (!postToDelete || postToDelete.is_deleted) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }

            const isOwner = await Post.isOwner(postId, userId);
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: req.t('posts.forbidden_delete') });
            }

            // נשתמש בפונקציה אחת מותאמת אישית שתטפל בשני המקרים
            const result = await Post.performDelete(postId, isAdmin);
            const affectedRows = result.affectedRows;

            if (affectedRows > 0) {
                // אם המחיקה לא הייתה מחיקה רכה, מחק את התמונות הפיזיות
                if (result.imagesToDelete && result.imagesToDelete.length > 0) {
                    const uploadsDir = path.join(__dirname, '../uploads');
                    for (const imageName of result.imagesToDelete) {
                        try {
                            const imagePath = path.join(uploadsDir, imageName);
                            await fs.unlink(imagePath);
                            console.log(`Deleted image: ${imageName}`);
                        } catch (err) {
                            console.error(`Error deleting image: ${imageName}`, err);
                        }
                    }
                }
            }

            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('posts.not_found_for_delete') });
            }

            await logEvent('DELETE', `User ${userId} deleted post ${postId} ${isAdmin ? '(admin soft delete)' : ''}`, userId);

            res.status(200).json({ message: req.t('posts.delete_success') });

        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ message: req.t('posts.delete_error'), error: error.message });
        }
    },
    incrementViews: async (req, res) => {
        try {
            const { id } = req.params;
            const updatedViews = await Post.incrementViewCount(id);
            if (updatedViews === null) {
                return res.status(404).json({ message: 'Post not found' });
            }
            res.status(200).json({ views: updatedViews });
        } catch (error) {
            console.error('Error incrementing post views:', error);
            res.status(500).json({ message: 'Error incrementing views' });
        }
    },

    // פונקציה לקבלת פוסטים לפי קטגוריה
    // getPostsByCategory: async (req, res) => {
    //     try {
    //         const { categoryId } = req.query;

    //         if (!categoryId) {
    //             return res.status(400).json({ message: req.t('posts.missing_category_query') });
    //         }

    //         const category = await Category.getById(categoryId);
    //         if (!category) {
    //             return res.status(404).json({ message: req.t('posts.category_not_found', { id: categoryId }) });
    //         }

    //         const posts = await Post.getByCategoryId(categoryId);
    //         res.status(200).json(posts);
    //     } catch (error) {
    //         console.error('Error fetching posts by category:', error);
    //         res.status(500).json({ message: req.t('posts.fetch_by_category_error'), error: error.message });
    //     }
    // }
};

module.exports = postsController;