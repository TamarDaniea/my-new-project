const Post = require('../models/Post');
const Category = require('../models/Category');
const User = require('../models/User'); // ייבוא מודל User לבדיקת תפקיד אדמין וקיום משתמש
const Location = require('../models/Location'); // ייבוא מודל Location

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
            // שליפת הנתונים מה-body של הבקשה.
            // אין צורך לשלוף user_id מכיוון שהוא נלקח מ-req.user.
            const { title, content, images, category_id, location_id } = req.body;

            // --- תיקון 1: שינוי תנאי האימות לשדות חובה ---
            // היגיון: על פי המפרט, title, content ו-category_id הם שדות חובה.
            // שדה 'images' נתון כמערך. הנחה היא שמערך ריק הוא תקין (כלומר, אין תמונות).
            // לכן, הסרנו את הבדיקה images.length === 0 מהתנאי של "חסרים שדות חובה".
            // בנוסף, ודאנו ש-images, אם קיים, הוא אכן מערך.
            if (!title || !content || !category_id || (images !== undefined && !Array.isArray(images))) {
                console.log('Missing fields for post creation:', { title, content, images, category_id }); // לוג מפורט יותר
                return res.status(400).json({ message: req.t('posts.missing_fields') });
            }

            // --- תיקון 2: ודא ש-images מוגדר תמיד כמערך (אפילו אם לא נשלח או נשלח כ-null) ---
            // היגיון: אם 'images' לא נשלח בכלל (undefined) או נשלח כ-null, אנו רוצים לוודא
            // שהוא נשמר במסד הנתונים כמערך ריק, כדי למנוע שגיאות SQL או בעיות עקביות.
            // אם הוא כבר נשלח כמערך תקין, הוא יישאר כמות שהוא.
            const finalImages = Array.isArray(images) ? images : [];


            // ודא שה-category_id מתאים לקטגוריה קיימת מסוג 'post'
            const category = await Category.getById(category_id);
            if (!category) {
                return res.status(404).json({ message: req.t('posts.category_not_found', { id: category_id }) });
            }
            if (category.type !== 'post') {
                return res.status(400).json({ message: req.t('posts.invalid_category_type', { id: category_id }) });
            }

            // --- תיקון 3: קבלת user_id מ-req.user בצורה בטוחה יותר ---
            // היגיון: המידלוואר authenticate (או fakeAuth) אמור תמיד למלא את req.user.
            // נפיל שגיאה אם user_id אינו זמין, במקום להשתמש ב-'test_uid'.
            // זה חשוב במיוחד ב-production.
            const user_id = req.user && req.user.firebase_uid;
            if (!user_id) {
                return res.status(401).json({ message: req.t('posts.unauthorized_user_id') }); // הודעה חדשה
            }

            // ודא שהמשתמש קיים במסד הנתונים
            const userExists = await User.getById(user_id);
            if (!userExists) {
                return res.status(404).json({ message: req.t('posts.user_not_found', { id: user_id }) });
            }

            // טיפול ב-location_id (אופציונלי)
            let finalLocationId = null;
            if (location_id) {
                const locationExists = await Location.getById(location_id);
                if (!locationExists) {
                    return res.status(404).json({ message: req.t('posts.location_not_found', { id: location_id }) });
                }
                finalLocationId = location_id;
            }

            // בניית אובייקט הנתונים לפוסט החדש
            const postData = {
                title,
                content,
                images: finalImages, // השתמש ב-finalImages כדי להבטיח שהוא מערך
                user_id,
                category_id,
                location_id: finalLocationId
            };

            // יצירת הפוסט במסד הנתונים
            const newPost = await Post.create(postData);
            res.status(201).json({ message: req.t('posts.create_success'), post: newPost });

        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ message: req.t('posts.create_error'), error: error.message });
        }
    },

    // פונקציה לקבלת פוסט לפי ID
    getPostById: async (req, res) => {
        console.log('Current user (getPostById):', req.user); // לוג נוסף לעזרה בניפוי באגים

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

    // פונקציה לעדכון פוסט קיים
    updatePost: async (req, res) => {
        try {
            const { id } = req.params;
            const postData = req.body;
            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('posts.unauthorized') });
            }

            // בדיקת אם המשתמש הוא אדמין
            const user = await User.getById(userId);
            const isAdmin = user && user.role === 'admin';

            // בדיקת בעלות על הפוסט
            const isOwner = await Post.isOwner(id, userId);

            // אם המשתמש אינו בעל הפוסט ואינו אדמין, אין לו הרשאה לעדכן
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: req.t('posts.forbidden_update') });
            }

            // אימות קטגוריה אם סופקה לעדכון
            if (postData.category_id) {
                const category = await Category.getById(postData.category_id);
                if (!category || category.type !== 'post') {
                    return res.status(400).json({ message: req.t('posts.invalid_category_update') });
                }
            }

            // אימות מיקום אם סופק לעדכון
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

    // פונקציה למחיקת פוסט
    deletePost: async (req, res) => {
        console.log('Current user (deletePost):', req.user); // לוג נוסף לעזרה בניפוי באגים

        try {
            const postId = req.params.id;
            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('posts.unauthorized') });
            }

            // בדיקת אם המשתמש הוא אדמין
            const user = await User.getById(userId);
            const isAdmin = user && user.role === 'admin';

            // בדיקת בעלות על הפוסט
            const isOwner = await Post.isOwner(postId, userId);

            // אם המשתמש אינו הבעלים ואינו אדמין, אין לו הרשאה למחוק
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: req.t('posts.forbidden_delete') });
            }

            let affectedRows;

            if (isAdmin) {
                // אם אדמין – מחיקה רכה (soft delete)
                affectedRows = await Post.softDelete(postId);
            } else {
                // אם הבעלים – מחיקה פיזית (hard delete)
                affectedRows = await Post.delete(postId);
            }

            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('posts.not_found') });
            }

            res.status(200).json({ message: req.t('posts.delete_success') });

        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ message: req.t('posts.delete_error'), error: error.message });
        }
    },

    // פונקציה להוספת לייק לפוסט
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

    // פונקציה להסרת לייק מפוסט
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
    },

    // פונקציה לקבלת פוסטים לפי קטגוריה
    getPostsByCategory: async (req, res) => {
        try {
            const { categoryId } = req.query; // קבלת categoryId מפרמטרי שאילתה (query params)

            if (!categoryId) {
                return res.status(400).json({ message: req.t('posts.missing_category_query') });
            }

            // ודא שהקטגוריה קיימת
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