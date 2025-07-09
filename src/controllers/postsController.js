const Post = require('../models/Post');
const Category = require('../models/Category');
const User = require('../models/User');
const Location = require('../models/Location');
const logEvent = require('../utils/logEvent');


const postsController = {

    // פונקציה לקבלת כל הפוסטים
    getAllPosts: async (req, res) => {
        try {
            const posts = await Post.getAll();
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({ message: req.t('posts.fetch_error'), error: error.message });
        }
    },

    // פונקציה ליצירת פוסט חדש
    createPost: async (req, res) => {
        try {
            const { title, content, images, category_id, location_id } = req.body;

            if (!title || !content || !category_id || (images !== undefined && !Array.isArray(images))) {
                console.log('Missing fields for post creation:', { title, content, images, category_id });
                return res.status(400).json({ message: req.t('posts.missing_fields') });
            }

            const finalImages = Array.isArray(images) ? images : [];

            const category = await Category.getById(category_id);
            if (!category) {
                return res.status(404).json({ message: req.t('posts.category_not_found', { id: category_id }) });
            }
            if (category.type !== 'post') {
                return res.status(400).json({ message: req.t('posts.invalid_category_type', { id: category_id }) });
            }

            const user_id = req.user && req.user.firebase_uid;
            if (!user_id) {
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
                images: finalImages,
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
            const { title, content, images, category_id, location_id } = req.body; // שליפת שדות ספציפיים

            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('posts.unauthorized') });
            }

            const user = await User.getById(userId);
            const isAdmin = user && user.role === 'admin';

            // בדיקה אם הפוסט קיים ולא מחוק לפני בדיקת בעלות
            const existingPost = await Post.getById(id);
            if (!existingPost) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }
            // אם הפוסט נמצא אבל מסומן כמחוק, עדיין לא ניתן לעדכן אותו
            if (existingPost.is_deleted) {
                return res.status(404).json({ message: req.t('posts.already_deleted') });
            }

            const isOwner = await Post.isOwner(id, userId);

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: req.t('posts.forbidden_update') });
            }

            // בניית אובייקט עם השדות שרוצים לעדכן בלבד
            const postDataToUpdate = {};
            if (title !== undefined) postDataToUpdate.title = title;
            if (content !== undefined) postDataToUpdate.content = content;
            if (images !== undefined) {
                // ודא ש-images הוא מערך
                if (!Array.isArray(images)) {
                    return res.status(400).json({ message: req.t('posts.invalid_images_format') });
                }
                postDataToUpdate.images = images;
            }
            // אם category_id נשלח, ודא שהוא תקין
            if (category_id !== undefined) {
                const category = await Category.getById(category_id);
                if (!category || category.type !== 'post') {
                    return res.status(400).json({ message: req.t('posts.invalid_category_update') });
                }
                postDataToUpdate.category_id = category_id;
            }
            // אם location_id נשלח, ודא שהוא תקין
            if (location_id !== undefined) {
                if (location_id !== null) { // אם לא null, ודא שהמיקום קיים
                    const locationExists = await Location.getById(location_id);
                    if (!locationExists) {
                        return res.status(404).json({ message: req.t('posts.invalid_location_update') });
                    }
                }
                postDataToUpdate.location_id = location_id;
            }

            // אם אין שדות לעדכון, החזר 400
            if (Object.keys(postDataToUpdate).length === 0) {
                return res.status(400).json({ message: req.t('posts.no_fields_to_update') });
            }

            const affectedRows = await Post.update(id, postDataToUpdate);
            if (affectedRows === 0) {
                // ייתכן שהפוסט לא נמצא (אבל כבר בדקנו) או שלא היו שינויים בנתונים
                // אם existingPost נמצא ולא נמחק, אז כנראה שאין שינויים.
                // במקרה של 0 affectedRows לאחר שעברנו את כל הבדיקות, נחזיר 200 עם הודעה שלא בוצעו שינויים
                return res.status(200).json({ message: req.t('posts.update_no_actual_change') });
            }
            if (affectedRows > 0) {
                await logEvent(
                    'UPDATE',
                    `User ${userId} updated post ${id}`,
                    userId
                );
            }

            res.status(200).json({ message: req.t('posts.update_success') });
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({ message: req.t('posts.update_error'), error: error.message });
        }
    },

    // פונקציה למחיקת פוסט
    deletePost: async (req, res) => {
        console.log('Current user (deletePost):', req.user);

        try {
            const postId = req.params.id;
            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('posts.unauthorized') });
            }

            const user = await User.getById(userId);
            const isAdmin = user && user.role === 'admin';

            // בדוק אם הפוסט קיים
            const postExists = await Post.getById(postId);
            if (!postExists) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }

            let affectedRows;

            if (isAdmin) {
                // אם אדמין – מחיקה רכה (soft delete)
                affectedRows = await Post.softDelete(postId);
                if (affectedRows === 0) {
                    // אם 0, זה אומר שהפוסט כבר היה מחוק או לא נמצא (אבל postExists כבר טיפל בזה)
                    return res.status(200).json({ message: req.t('posts.already_deleted_by_admin') });
                }
                await logEvent(
                    'DELETE',
                    `Admin ${userId} soft deleted post ${postId}`,
                    userId
                );

                res.status(200).json({ message: req.t('posts.soft_delete_success') });

            } else {
                // אם הבעלים – בדיקת בעלות ומחיקה פיזית (hard delete)
                const isOwner = await Post.isOwner(postId, userId);
                if (!isOwner) {
                    return res.status(403).json({ message: req.t('posts.forbidden_delete') });
                }
                affectedRows = await Post.delete(postId); // מחיקה פיזית
                if (affectedRows === 0) {
                    return res.status(404).json({ message: req.t('posts.not_found_for_delete') });
                }
                await logEvent(
                    'DELETE',
                    `User ${userId} deleted post ${postId}`,
                    userId
                );

                res.status(200).json({ message: req.t('posts.hard_delete_success') });
            }

        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ message: req.t('posts.delete_error'), error: error.message });
        }
    },

    // // פונקציה להוספת לייק לפוסט
    // addLikeToPost: async (req, res) => {
    //     try {
    //         const { postId } = req.params;
    //         const affectedRows = await Post.incrementLikeCount(postId);
    //         if (affectedRows === 0) {
    //             return res.status(404).json({ message: req.t('posts.like_increment_failed') });
    //         }
    //         res.status(200).json({ message: req.t('posts.like_added') });
    //     } catch (error) {
    //         console.error('Error adding like to post:', error);
    //         res.status(500).json({ message: req.t('posts.like_add_error'), error: error.message });
    //     }
    // },

    // // פונקציה להסרת לייק מפוסט
    // removeLikeFromPost: async (req, res) => {
    //     try {
    //         const { postId } = req.params;
    //         const affectedRows = await Post.decrementLikeCount(postId);
    //         if (affectedRows === 0) {
    //             return res.status(404).json({ message: req.t('posts.like_decrement_failed') });
    //         }
    //         res.status(200).json({ message: req.t('posts.like_removed') });
    //     } catch (error) {
    //         console.error('Error removing like from post:', error);
    //         res.status(500).json({ message: req.t('posts.like_remove_error'), error: error.message });
    //     }
    // },

    // פונקציה לקבלת פוסטים לפי קטגוריה
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
    }
};

module.exports = postsController;