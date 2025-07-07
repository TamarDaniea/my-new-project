// src/controllers/usersController.js
const User = require('../models/User');
const { registerUser } = require('../services/createVerificationEmail');

const usersController = {
    getUserProfile: async (req, res) => {
        try {
            const requestedFirebaseUid = req.params.firebaseUid; // ה-UID של הפרופיל המבוקש
            const currentUserUid = req.user ? req.user.firebase_uid : null; // ה-UID של המשתמש המחובר (אם קיים)

            if (!requestedFirebaseUid) {
                return res.status(400).json({ message: req.t('users.uid_required') });
            }

            let userData;
            // אם המשתמש מחובר והוא מבקש את הפרופיל שלו עצמו
            if (currentUserUid && requestedFirebaseUid === currentUserUid) {
                userData = await User.getById(requestedFirebaseUid); // קבל את כל הפרטים (כולל אימייל)
            } else {
                // אם המשתמש מבקש פרופיל של משתמש אחר, או שהוא לא מחובר
                userData = await User.getPublicProfileData(requestedFirebaseUid); // קבל רק נתונים ציבוריים 
            }

            if (!userData || (userData.user && !userData.user.firebase_uid)) { // בודק גם עבור המבנה החדש של getPublicProfileData
                return res.status(404).json({ message: req.t('users.not_found') });
            }

            res.status(200).json(userData);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: req.t('users.fetch_error'), error: error.message });
        }
    },

    // createUser: async (req, res) => {
    //     try {
    //         const userData = req.body;
    //         if (!userData.firebase_uid || !userData.name || !userData.email) {
    //             return res.status(400).json({ message: req.t('users.missing_fields') });
    //         }

    //         const newUser = await User.create(userData);
    //         res.status(201).json({ message: req.t('users.create_success'), user: newUser });
    //     } catch (error) {
    //         console.error('Error creating user:', error);
    //         if (error.code === 'ER_DUP_ENTRY') {
    //             return res.status(409).json({ message: req.t('users.duplicate_user') });
    //         }
    //         res.status(500).json({ message: req.t('users.create_error'), error: error.message });
    //     }
    // },
    createUser: async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // בדיקת שדות חובה
            if (!name || !email || !password) {
                return res.status(400).json({ message: req.t('users.missing_fields') });
            }

            // ולידציות בסיסיות
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: req.t('users.invalid_email') });
            }

            if (name.trim().length < 2) {
                return res.status(400).json({ message: req.t('users.invalid_name') });
            }

            if (password.length < 6) {
                return res.status(400).json({ message: req.t('users.invalid_password') }); // ודאי שיש מפתח כזה בקובץ i18n
            }

            // 1. יצירת משתמש ב-Firebase + שליחת מייל אימות
            const firebaseUser = await registerUser(email, password);

            // 2. שמירת המשתמש במסד הנתונים שלך (MySQL)
            const userData = {
                firebase_uid: firebaseUser.uid,
                name,
                email,
                role: 'user', // ברירת מחדל
            };

            const newUser = await User.create(userData);

            // 3. החזרה ללקוח
            res.status(201).json({ message: req.t('users.create_success'), user: newUser });

        } catch (error) {
            console.error('Error creating user:', error);

            // טיפול בשגיאת כפילות משתמש
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: req.t('users.duplicate_user') });
            }

            // שגיאת Firebase – כמו אימייל שכבר קיים
            if (error.code === 'auth/email-already-exists') {
                return res.status(409).json({ message: req.t('users.firebase_email_exists') });
            }

            res.status(500).json({ message: req.t('users.create_error'), error: error.message });
        }
    },

    updateUserProfile: async (req, res) => {
        const { name, email, city } = req.body;
        const firebaseUidToUpdate = req.params.firebaseUid;
        const currentUserUid = req.user?.firebase_uid;

        if (!currentUserUid) {
            return res.status(401).json({ message: req.t('users.unauthorized') });
        }

        if (!name && !email && !city) {
            return res.status(400).json({ message: req.t('users.no_update_fields') });
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: req.t('users.invalid_email') });
            }
        }

        if (name && name.trim().length < 2) {
            return res.status(400).json({ message: req.t('users.invalid_name') });
        }

        if (city && city.trim().length < 2) {
            return res.status(400).json({ message: req.t('users.invalid_city') });
        }

        try {
            const currentUser = await User.getById(currentUserUid);
            const isAdmin = currentUser && currentUser.role === 'admin';

            if (!isAdmin && firebaseUidToUpdate !== currentUserUid) {
                return res.status(403).json({ message: req.t('users.forbidden_update') });
            }

            const existingUser = await User.getById(firebaseUidToUpdate);
            if (!existingUser) {
                return res.status(404).json({ message: req.t('users.not_found_in_db') });
            }

            const fieldsToUpdate = {};
            if (name) fieldsToUpdate.name = name;
            if (email) fieldsToUpdate.email = email;
            if (city) fieldsToUpdate.city = city;

            const affectedRows = await User.update(firebaseUidToUpdate, fieldsToUpdate);
            if (affectedRows === 0) {
                // זה יכול לקרות אם כל השדות שונו לערכים זהים, או שהמשתמש לא נמצא (אבל כבר בדקנו למעלה)
                const updatedUser = await User.getById(firebaseUidToUpdate); // שליפה חוזרת כדי לוודא אם אין שינויים אמיתיים
                return res.status(200).json({
                    message: req.t('users.no_changes'),
                    user: updatedUser
                });
            }

            const updatedUser = await User.getById(firebaseUidToUpdate);
            res.status(200).json({
                message: req.t('users.update_success'),
                user: updatedUser
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: req.t('users.update_error'), error: error.message });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const firebaseUidToDelete = req.params.firebaseUid;
            const currentUserUid = req.user?.firebase_uid; // מי מבצע את המחיקה

            if (!currentUserUid) {
                return res.status(401).json({ message: req.t('users.unauthorized_delete') });
            }

            const currentUser = await User.getById(currentUserUid);
            const isAdmin = currentUser && currentUser.role === 'admin';

            // רק אדמין יכול למחוק כל משתמש, משתמש רגיל יכול למחוק רק את עצמו
            if (!isAdmin && firebaseUidToDelete !== currentUserUid) {
                return res.status(403).json({ message: req.t('users.forbidden_delete') });
            }

            const affectedRows = await User.delete(firebaseUidToDelete);

            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('users.not_found') });
            }

            res.status(200).json({ message: req.t('users.delete_success') });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: req.t('users.delete_error'), error: error.message });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            // הוסף בדיקת הרשאות אדמין לראוט זה אם נדרש
            // לדוגמה: if (!req.user || req.user.role !== 'admin') { return res.status(403).json({ message: req.t('users.forbidden_admin_access') }); }
            const users = await User.getAll();
            res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching all users:', error);
            res.status(500).json({ message: req.t('users.fetch_all_error'), error: error.message });
        }
    },
    searchUsers: async (req, res) => {
        try {
            const userId = req.user ? req.user.firebase_uid : null;
            if (!userId) {
                return res.status(401).json({ message: req.t('users.unauthorized') });
            }

            const user = await User.getById(userId);
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ message: req.t('users.forbidden') });
            }

            const query = req.query.query;
            if (!query || query.trim() === '') {
                return res.status(400).json({ message: req.t('users.query_required') });
            }

            const results = await User.search(query.trim());
            res.status(200).json(results);
        } catch (error) {
            console.error('Error searching users:', error);
            res.status(500).json({ message: req.t('users.search_error'), error: error.message });
        }
    }
};

module.exports = usersController;