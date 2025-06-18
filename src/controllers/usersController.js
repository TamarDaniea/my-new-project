// src/controllers/usersController.js
const User = require('../models/User');

const usersController = {
    // קבלת פרטי פרופיל של משתמש (לפי firebase_uid)
    getUserProfile: async (req, res) => {
        try {
            const firebaseUid = req.params.firebaseUid || (req.user ? req.user.firebase_uid : null);
            if (!firebaseUid) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const user = await User.getById(firebaseUid);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: 'Error fetching user profile', error: error.message });
        }
    },

    // יצירת משתמש חדש
    createUser: async (req, res) => {
        try {
            const userData = req.body;
            if (!userData.firebase_uid || !userData.name || !userData.email) {
                return res.status(400).json({ message: 'firebase_uid, name, and email are required' });
            }

            const newUser = await User.create(userData);
            res.status(201).json({ message: 'User created successfully', user: newUser });
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'User with this email or UID already exists' });
            }
            res.status(500).json({ message: 'Error creating user', error: error.message });
        }
    },



    // עדכון פרופיל של משתמש לפי UID (שימוש פנימי / אדמין)
    updateUserProfile: async (req, res) => {
        const { name, email, city } = req.body;
        const firebase_uid = req.user?.firebase_uid;

        console.log('Extracted firebase_uid:', firebase_uid);

        if (!firebase_uid) {

            return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
        }

        if (!name && !email && !city) {

            return res.status(400).json({ message: 'No fields to update' });
        }

        // ולידציה על אימייל
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
        }

        // ולידציה על שם
        if (name && name.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }

        // ולידציה על עיר
        if (city && city.trim().length < 2) {
            return res.status(400).json({ message: 'City must be at least 2 characters' });
        }

        try {
            // קודם כל - בואי נוודא שהמשתמש קיים

            const existingUser = await User.getById(firebase_uid);


            if (!existingUser) {

                return res.status(404).json({ message: 'User not found in database' });
            }

            // בניית אובייקט עם השדות לעדכון
            const fieldsToUpdate = {};
            if (name) fieldsToUpdate.name = name;
            if (email) fieldsToUpdate.email = email;
            if (city) fieldsToUpdate.city = city;



            // עדכון המשתמש

            const affectedRows = await User.update(firebase_uid, fieldsToUpdate);


            if (affectedRows === 0) {

                return res.status(404).json({ message: 'User not found or no changes made!!' });
            }

            // שליפת פרטי המשתמש לאחר העדכון

            const updatedUser = await User.getById(firebase_uid);

            res.status(200).json({
                message: 'User profile updated successfully',
                user: updatedUser
            });
        } catch (error) {

            res.status(500).json({ message: 'Error updating profile', error: error.message });
        }
    },

    // מחיקת משתמש
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

    // קבלת כל המשתמשים (אדמין)
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
