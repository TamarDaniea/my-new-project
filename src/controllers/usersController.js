const User = require('../models/User');

const usersController = {
    getUserProfile: async (req, res) => {
        try {
            const firebaseUid = req.params.firebaseUid || (req.user ? req.user.firebase_uid : null);
            if (!firebaseUid) {
                return res.status(400).json({ message: req.t('users.uid_required') });
            }

            const user = await User.getById(firebaseUid);
            if (!user) {
                return res.status(404).json({ message: req.t('users.not_found') });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: req.t('users.fetch_error'), error: error.message });
        }
    },

    createUser: async (req, res) => {
        try {
            const userData = req.body;
            if (!userData.firebase_uid || !userData.name || !userData.email) {
                return res.status(400).json({ message: req.t('users.missing_fields') });
            }

            const newUser = await User.create(userData);
            res.status(201).json({ message: req.t('users.create_success'), user: newUser });
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: req.t('users.duplicate_user') });
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
                return res.status(404).json({ message: req.t('users.no_changes') });
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
            const firebaseUid = req.params.firebaseUid;
            const affectedRows = await User.delete(firebaseUid);

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
            const users = await User.getAll();
            res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching all users:', error);
            res.status(500).json({ message: req.t('users.fetch_all_error'), error: error.message });
        }
    }, searchUsers: async (req, res) => {
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
