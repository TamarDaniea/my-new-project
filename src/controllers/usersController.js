// src/controllers/usersController.js
const User = require('../models/User');

const usersController = {
    // קבלת פרטי פרופיל של משתמש (לפי firebase_uid)
    getUserProfile: async (req, res) => {
        try {
            // נניח ש-firebase_uid מגיע מהפרמטרים של ה-URL או מ-req.user לאחר אימות
            const firebaseUid = req.params.firebaseUid || (req.user ? req.user.firebase_uid : null);
            if (!firebaseUid) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const user = await User.findByFirebaseUid(firebaseUid);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // להסיר מידע רגיש אם יש לפני שליחה לקליינט (לדוגמה סיסמה אם הייתה)
            delete user.password; // אם היית שומר/ת סיסמאות
            res.status(200).json(user);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: 'Error fetching user profile', error: error.message });
        }
    },

    // יצירת משתמש (נקרא בדרך כלל לאחר הרשמה ב-Firebase)
    createUser: async (req, res) => {
        try {
            const userData = req.body;
            // וודא/י ש-firebase_uid סופק
            if (!userData.firebase_uid || !userData.name || !userData.email) {
                return res.status(400).json({ message: 'firebase_uid, name, and email are required' });
            }
            const newUser = await User.create(userData);
            res.status(201).json({ message: 'User created successfully', user: newUser });
        } catch (error) {
            console.error('Error creating user:', error);
            // במקרה של duplicate entry (email או firebase_uid שכבר קיים),
            // MySQL יזרוק שגיאה 1062, אפשר לטפל בה ספציפית.
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'User with this email or UID already exists' });
            }
            res.status(500).json({ message: 'Error creating user', error: error.message });
        }
    },

    // עדכון פרטי פרופיל משתמש
    updateUserProfile: async (req, res) => {
        try {
            const firebaseUid = req.params.firebaseUid; // UID של המשתמש לעדכון
            const userData = req.body; // הנתונים לעדכון
            const affectedRows = await User.update(firebaseUid, userData);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'User not found or no changes made' });
            }
            res.status(200).json({ message: 'User profile updated successfully' });
        } catch (error) {
            console.error('Error updating user profile:', error);
            res.status(500).json({ message: 'Error updating user profile', error: error.message });
        }
    },

    // מחיקת משתמש (לשימוש אדמין)
    deleteUser: async (req, res) => {
        try {
            const firebaseUid = req.params.firebaseUid;
            const affectedRows = await User.delete(firebaseUid);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: 'Error deleting user', error: error.message });
        }
    },

    // קבלת כל המשתמשים (לשימוש אדמין)
    getAllUsers: async (req, res) => {
        try {
            const users = await User.getAll();
            res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching all users:', error);
            res.status(500).json({ message: 'Error fetching users', error: error.message });
        }
    }
};

module.exports = usersController;