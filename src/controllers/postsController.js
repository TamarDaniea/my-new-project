// src/controllers/postsController.js
const Post = require('../models/Post');
const Category = require('../models/Category'); // נצטרך את זה לוודא קטגוריה קיימת
const User = require('../models/User');     // נצטרך את זה לוודא משתמש קיים
const Location = require('../models/Location'); // נצטרך את זה לוודא מיקום קיים (אם הוגדר)

const postsController = {
    /**
     * קבלת כל הפוסטים מה-DB.
     * @param {object} req - אובייקט הבקשה.
     * @param {object} res - אובייקט התגובה.
     */
    getAllPosts: async (req, res) => {
        try {
            const posts = await Post.getAll();
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({ message: 'Error fetching posts', error: error.message });
        }
    },

    /**
     * יצירת פוסט חדש.
     * מצפה לקבל ב-body: title, content, images (מערך), category_id, location_id (אופציונלי).
     * user_id יישלף מהטוקן המאומת (req.user.firebase_uid) או יוגדר כ-test_uid לבדיקה.
     * כולל ולידציות עבור שדות חובה, קטגוריה קיימת ותקינה, משתמש קיים ומיקום קיים.
     * @param {object} req - אובייקט הבקשה.
     * @param {object} res - אובייקט התגובה.
     */
    createPost: async (req, res) => {
        try {
            const { title, content, images, category_id, location_id } = req.body;

            // 1. ולידציה בסיסית: וודא/י שקיימים השדות החובה
            if (!title || !content || !images || !Array.isArray(images) || images.length === 0 || !category_id) {
                return res.status(400).json({ 
                    message: 'Missing or invalid required fields. Please provide title, content, images (non-empty array), and category_id.' 
                });
            }

            // 2. וודא/י ש-category_id קיים בטבלת הקטגוריות ושהוא מסוג 'post'
            const category = await Category.getById(category_id);
            if (!category) {
                return res.status(404).json({ message: `Category with ID ${category_id} not found.` });
            }
            if (category.type !== 'post') {
                return res.status(400).json({ message: `Category with ID ${category_id} is not of type 'post'.` });
            }

            // 3. וודא/י ש-user_id קיים בטבלת המשתמשים
            // חשוב: ברגע שיהיה middleware אימות, req.user יהיה קיים.
            // כרגע, נשתמש ב-test_uid לבדיקה ונוודא שהוא קיים ב-DB.
            const user_id = req.user ? req.user.firebase_uid : 'test_uid'; // שינוי ל-'test_uid' אם אין auth
            const userExists = await User.getById(user_id); 
            if (!userExists) {
                return res.status(404).json({ message: `User with ID ${user_id} not found. Cannot create post without a valid user.` });
            }

            // 4. אם location_id סופק, וודא/י שהוא קיים בטבלת המיקומים
            let finalLocationId = null; // נשתמש בזה כדי לאפשר null אם לא סופק
            if (location_id) {
                const locationExists = await Location.getById(location_id);
                if (!locationExists) {
                    return res.status(404).json({ message: `Location with ID ${location_id} does not exist.` });
                }
                finalLocationId = location_id;
            }

            // בונים את אובייקט הנתונים לשליחה למודל
            const postData = {
                title,
                content,
                images,
                user_id,
                category_id,
                location_id: finalLocationId // נשתמש בערך המאושר
            };

            const newPost = await Post.create(postData);
            res.status(201).json({ message: 'Post created successfully', post: newPost });

        } catch (error) {
            console.error('Error creating post:', error);
            // במקרה של שגיאת מפתח זר או שגיאה אחרת מה-DB, נחזיר סטטוס 500
            res.status(500).json({ message: 'Error creating post', error: error.message });
        }
    },

    /**
     * קבלת פוסט לפי ID.
     * @param {object} req - אובייקט הבקשה, עם req.params.id.
     * @param {object} res - אובייקט התגובה.
     */
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

    /**
     * עדכון פוסט קיים.
     * @param {object} req - אובייקט הבקשה, עם req.params.id ו-req.body (נתונים לעדכון).
     * @param {object} res - אובייקט התגובה.
     */
    updatePost: async (req, res) => {
        try {
            const { id } = req.params;
            const postData = req.body;

            // אופציונלי: ולידציה של שדות ספציפיים אם הם מועברים בעדכון
            if (postData.category_id) {
                const category = await Category.getById(postData.category_id);
                if (!category || category.type !== 'post') {
                    return res.status(400).json({ message: `Invalid or non-post category_id provided for update.` });
                }
            }
            if (postData.location_id) {
                const locationExists = await Location.getById(postData.location_id);
                if (!locationExists) {
                    return res.status(404).json({ message: `Provided location_id for update does not exist.` });
                }
            }
            // גם כאן אפשר להוסיף ולידציה אם user_id משתנה, אבל לרוב לא מעדכנים אותו ישירות

            const affectedRows = await Post.update(id, postData);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Post not found or no valid changes provided' });
            }
            res.status(200).json({ message: 'Post updated successfully' });
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({ message: 'Error updating post', error: error.message });
        }
    },

    /**
     * מחיקת פוסט.
     * @param {object} req - אובייקט הבקשה, עם req.params.id.
     * @param {object} res - אובייקט התגובה.
     */
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

    /**
     * הוספת לייק לפוסט.
     * @param {object} req - אובייקט הבקשה, עם req.params.postId.
     * @param {object} res - אובייקט התגובה.
     */
    addLikeToPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const affectedRows = await Post.incrementLikeCount(postId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Post not found or could not increment like_count' });
            }
            res.status(200).json({ message: 'Like added to post' });
        } catch (error) {
            console.error('Error adding like to post:', error);
            res.status(500).json({ message: 'Error adding like', error: error.message });
        }
    },

    /**
     * הסרת לייק מפוסט.
     * @param {object} req - אובייקט הבקשה, עם req.params.postId.
     * @param {object} res - אובייקט התגובה.
     */
    removeLikeFromPost: async (req, res) => {
        try {
            const { postId } = req.params;
            const affectedRows = await Post.decrementLikeCount(postId);
            if (affectedRows === 0) {
                // ניתן להחזיר 404 אם הפוסט לא נמצא, או 400 אם מונה הלייקים כבר 0
                return res.status(404).json({ message: 'Post not found or like_count is already 0' });
            }
            res.status(200).json({ message: 'Like removed from post' });
        } catch (error) {
            console.error('Error removing like from post:', error);
            res.status(500).json({ message: 'Error removing like', error: error.message });
        }
    }
};

module.exports = postsController;