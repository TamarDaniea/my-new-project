// src/controllers/usersController.js

// ייבוא מודלים וספריות נדרשות
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Favorite = require('../models/Favorite');
const Vote = require('../models/Vote');
const logEvent = require('../utils/logEvent');
const db = require('../config/db');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const admin = require('../firebase/fireBaseAdmin'); // ייבוא המודול המתוקן של Firebase Admin

// הגדרת אובייקט הבקר
const usersController = {

    // פונקציית בקר ליצירת משתמש
    createUser: async (req, res) => {
        try {
            const { idToken, name, role, city } = req.body;

            if (!idToken || !name) {
                return res.status(400).json({ message: req.t('users.missing_fields') });
            }

            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            } catch (authError) {
                console.error("Firebase auth error:", authError);
                return res.status(401).json({ message: req.t('users.invalid_token'), error: authError.message });
            }
            
            const firebase_uid = decodedToken.uid;
            const email = decodedToken.email;

            // בדיקה אם המשתמש כבר קיים לפי firebase_uid
            let user = await User.getById(firebase_uid);

            if (user) {
                // אם המשתמש כבר קיים, נחזיר שגיאת קונפליקט
                return res.status(409).json({ message: req.t('users.duplicate_user') });
            }
            
            // יצירת המשתמש במסד הנתונים
            try {
                console.log('Attempting to create user in the database...');
                user = await User.create({
                    firebase_uid,
                    name,
                    email,
                    role: role || 'user',
                    city: city || null
                });
                console.log('User created successfully in the database.');
            } catch (dbError) {
                console.error('Database user creation error:', dbError);
                return res.status(500).json({ 
                    message: req.t('users.create_error'), 
                    error: `Database error: ${dbError.message}` 
                });
            }

            if (!user) {
                // בדיקה אם יצירת המשתמש נכשלה מסיבה לא ידועה
                return res.status(500).json({ message: req.t('users.create_error') });
            }

            await logEvent('CREATE_USER', `New user created: ${user.name} (${user.firebase_uid})`, user.firebase_uid);

            const token = generateToken({
                id: user.id,
                role: user.role,
                name: user.name
            });

            res.status(201).json({ message: req.t('users.create_success'), user, token });

        } catch (error) {
            console.error('Error creating user:', error);

            // טיפול בשגיאות ספציפיות
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: req.t('users.duplicate_user') });
            }

            if (error.code === 'auth/email-already-exists') {
                return res.status(409).json({ message: req.t('users.firebase_email_exists') });
            }

            // החזרת שגיאה כללית אם לא מדובר באחת השגיאות הספציפיות
            res.status(500).json({ message: req.t('users.create_error'), error: error.message });
        }
    },

    // פונקציית בקר לכניסת משתמש
    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }
            let user = await User.findOne({ where: { email } });
            if (!user) {
                // אם המשתמש לא קיים ב-SQL, ננסה לשלוף אותו מ-Firebase ולהכניס ל-DB
                // כאן אפשר להוסיף שליפה מ-Firebase לפי אימייל (אם יש צורך)
                // כרגע ניצור משתמש חדש ב-SQL
                user = await User.create({
                    firebase_uid: null, // אם יש לך אפשרות לשלוף UID מ-Firebase, תכניס כאן
                    name: '',
                    email,
                    role: 'user',
                    city: null
                });
            }
            // השוואה בין הסיסמה שהתקבלה מהבקשה לסיסמה במסד הנתונים
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: "Invalid password" });
            }

            const token = generateToken({
                firebase_uid: user.firebase_uid,
                email,
                role: user.role || 'user',
                name: user.name,
            });

            res.status(200).json({
                message: "Login successful",
                token,
                user: {
                    firebase_uid: user.firebase_uid,
                    name: user.name,
                    email,
                    role: user.role || 'user',
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ message: "Internal server error", error: error.message });
        }
    },

    // פונקציית בקר לעדכון פרופיל משתמש
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
                const updatedUser = await User.getById(firebaseUidToUpdate);
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
            await logEvent('UPDATE_USER', `User ${firebaseUidToUpdate} updated profile`, currentUserUid);

        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: req.t('users.update_error'), error: error.message });
        }
    },

    // פונקציית בקר למחיקת משתמש
    deleteUser: async (req, res) => {
        try {
            const firebaseUidToDelete = req.params.firebaseUid;
            const currentUserUid = req.user?.firebase_uid;

            if (!currentUserUid) {
                return res.status(401).json({ message: req.t('users.unauthorized_delete') });
            }

            const currentUser = await User.getById(currentUserUid);
            const isAdmin = currentUser && currentUser.role === 'admin';

            if (!isAdmin && firebaseUidToDelete !== currentUserUid) {
                return res.status(403).json({ message: req.t('users.forbidden_delete') });
            }

            const affectedRows = await User.delete(firebaseUidToDelete);

            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('users.not_found') });
            }
            await logEvent('DELETE_USER', `User ${firebaseUidToDelete} deleted by ${currentUserUid}`, currentUserUid);

            res.status(200).json({ message: req.t('users.delete_success') });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: req.t('users.delete_error'), error: error.message });
        }
    },

    // פונקציית בקר לקבלת כל המשתמשים
    getAllUsers: async (req, res) => {
        try {
            const users = await User.getAll();
            res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching all users:', error);
            res.status(500).json({ message: req.t('users.fetch_all_error'), error: error.message });
        }
    },

    // פונקציית בקר לחיפוש משתמשים
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
    },

    // פונקציית בקר לקבלת פריטים שנצפו לאחרונה
    getRecentViews: async (req, res) => {
        console.log('req.user:', req.user);
        const userId = req.user?.firebase_uid;
        const { type } = req.query;

        if (!userId || !['location', 'post'].includes(type)) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        try {
            const [views] = await db.execute(
                `SELECT item_id FROM user_actions
                WHERE user_id = ? AND action = ? AND timestamp >= NOW() - INTERVAL 7 DAY
                ORDER BY timestamp DESC
                LIMIT 10`,
                [userId, `view_${type}`]
            );

            if (views.length === 0) {
                return res.json({ message: 'אין פריטים שנצפו לאחרונה' });
            }

            const ids = views.map(v => v.item_id);

            const [items] = await db.query(
                `SELECT * FROM ${type === 'location' ? 'locations' : 'posts'}
                WHERE id IN (${ids.map(() => '?').join(',')})`,
                ids
            );

            const sortedItems = ids.map(id => items.find(item => item.id === id));

            res.json(sortedItems);
        } catch (error) {
            console.error('Error fetching recent views:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },
    // מחזירה את כל הפעולות שבוצעו על ידי משתמש מסוים.

    getUserActions: async (req, res) => {
        try {
            const requestedFirebaseUid = req.params.firebaseUid;
            const currentUserUid = req.user ? req.user.firebase_uid : null;

            // בדיקת אימות בסיסית: ודאי שיש משתמש מחובר.
            if (!currentUserUid) {
                return res.status(401).json({ message: req.t('users.unauthorized') });
            }

            // כדי למנוע גישה למידע פרטי של משתמשים אחרים,
            // נאפשר למשתמש לראות רק את הפעולות שלו.
            if (requestedFirebaseUid !== currentUserUid) {
                return res.status(403).json({ message: req.t('users.forbidden') });
            }

            // קריאה למסד הנתונים כדי לשלוף את הפעולות
            const [rows] = await db.execute(
                `SELECT * FROM user_actions WHERE user_id = ? ORDER BY timestamp DESC`,
                [requestedFirebaseUid]
            );

            // החזרת הנתונים ששונפו
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching user actions:', error);
            res.status(500).json({ message: req.t('users.actions_fetch_error'), error: error.message });
        }
    },

    getUserHistory: async (req, res) => {
        try {
            const requestedFirebaseUid = req.params.firebaseUid;
            const currentUserUid = req.user ? req.user.firebase_uid : null;

            if (!currentUserUid || requestedFirebaseUid !== currentUserUid) {
                return res.status(403).json({ message: req.t('users.forbidden') });
            }

            // שלב 1: שלוף פעולות שונות ממסד הנתונים באופן מקבילי
            const [userPosts, userComments, userFavorites, userVotes] = await Promise.all([
                Post.getByFirebaseUid(requestedFirebaseUid),
                Comment.getByFirebaseUid(requestedFirebaseUid),
                Favorite.getByFirebaseUid(requestedFirebaseUid),
                Vote.getByFirebaseUid(requestedFirebaseUid)
            ]);
            
            // שלב 2: תאם את הפורמט של כל פעולה
            const mappedPosts = userPosts.map(p => ({
                type: 'post',
                id: p.id,
                description: p.title,
                createdAt: p.createdAt
            }));

            const mappedComments = userComments.map(c => ({
                type: 'comment',
                id: c.id,
                description: c.content,
                createdAt: c.createdAt
            }));

            const mappedFavorites = userFavorites.map(f => ({
                type: 'favorite',
                id: f.id,
                description: `Favorited an item of type ${f.item_type} with ID ${f.id}`,
                createdAt: f.createdAt
            }));

            const mappedVotes = userVotes.map(v => ({
                type: v.value === 1 ? 'like' : 'dislike',
                id: v.id,
                description: `${v.value === 1 ? 'Liked' : 'Disliked'} an item of type ${v.item_type}`,
                createdAt: v.createdAt
            }));
            // שלב 3: אחד את כל הפעולות לרשימה אחת
            const allActions = [...mappedPosts, ...mappedComments, ...mappedFavorites, ...mappedVotes];

            // שלב 4: מיין את הרשימה לפי תאריך יצירה (מהחדש לישן)
            allActions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // שלב 5: החזר את התוצאה
            res.status(200).json(allActions);

        } catch (error) {
            console.error('Error fetching user history:', error);
            res.status(500).json({ message: req.t('users.history_fetch_error'), error: error.message });
        }
    },


    // פונקציה לייבוא כל המשתמשים מ-Firebase ל-SQL
    importFirebaseUsersToSQL: async (req, res) => {
        try {
            const allUsers = [];
            let nextPageToken;
            do {
                const result = await admin.auth().listUsers(1000, nextPageToken);
                allUsers.push(...result.users);
                nextPageToken = result.pageToken;
            } while (nextPageToken);

            let importedCount = 0;
            for (const fbUser of allUsers) {
                let user = await User.getById(fbUser.uid);
                if (!user) {
                    await User.create({
                        firebase_uid: fbUser.uid,
                        name: fbUser.displayName || '',
                        email: fbUser.email || '',
                        role: 'user',
                        city: null
                    });
                    importedCount++;
                }
            }
            res.status(200).json({ message: `Imported ${importedCount} users from Firebase to SQL.` });
        } catch (error) {
            console.error('Error importing users from Firebase:', error);
            res.status(500).json({ message: 'Error importing users from Firebase', error: error.message });
        }
    },

    getUserProfile: async (req, res) => {
        try {
            const firebaseUid = req.params.firebaseUid;
            const user = await User.getById(firebaseUid);

            if (!user) {
                return res.status(404).json({ message: req.t('users.not_found') });
            }

            // הסר מידע רגיש לפני שליחה
            const publicProfile = {
                name: user.name,
                city: user.city,
                role: user.role
            };

            res.status(200).json(publicProfile);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: req.t('users.profile_fetch_error'), error: error.message });
        }
    }
};

module.exports = usersController;
