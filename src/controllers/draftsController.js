// controllers/draftsController.js
const Draft = require('../models/Draft');
const { validationResult } = require('express-validator');
const logEvent = require('../utils/logEvent');


const saveDraft = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { item_type, content } = req.body;
    const userId = req.user.firebase_uid; // מניח שה-middleware של האותנטיקציה מוסיף את user ל-req

    if (!['post', 'location'].includes(item_type)) {
        return res.status(400).json({ message: 'Invalid item_type. Must be "post" or "location".' });
    }

    try {
        // אם קיים draftId ב-content, אולי זו עדכון לטיוטה קיימת
        if (content.draftId) {
            const updated = await Draft.update(content.draftId, content);
            if (updated) {
                await logEvent('UPDATE_DRAFT', `User ${userId} updated ${item_type} draft ${content.draftId}`, userId);
                return res.status(200).json({ message: 'Draft updated successfully', draftId: content.draftId });
            } else {
                return res.status(404).json({ message: 'Draft not found or not updated' });
            }
        } else {
            // יצירת טיוטה חדשה
            const draftId = await Draft.create(userId, item_type, content);
            await logEvent('CREATE_DRAFT', `User ${userId} created a new ${item_type} draft`, userId);
            res.status(201).json({ message: 'Draft saved successfully', draftId });
        }
    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ message: 'Error saving draft', error: error.message });
    }
};

// const getDrafts = async (req, res) => {
//     const userId = req.user.firebase_uid;

//     try {
//         const drafts = await Draft.findByUserId(userId);
//         res.status(200).json(drafts);
//     } catch (error) {
//         console.error('Error fetching drafts:', error);
//         res.status(500).json({ message: 'Error fetching drafts', error: error.message });
//     }
// };
const getDrafts = async (req, res) => {
    console.log('🔍 Current user:', req.user);
    const requesterId = req.user.firebase_uid;
    const requesterRole = req.user.role;
    const queryUserId = req.query.userId;

    // אם נשלח userId – נבדוק הרשאה
    const userIdToFetch = queryUserId || requesterId;

    // רק אדמין יכול לשלוף טיוטות של משתמש אחר
    if (queryUserId && requesterId !== queryUserId && requesterRole !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized to access drafts of another user.' });
    }

    try {
        const drafts = await Draft.findByUserId(userIdToFetch);
        res.status(200).json(drafts);
    } catch (error) {
        console.error('Error fetching drafts:', error);
        res.status(500).json({ message: 'Error fetching drafts', error: error.message });
    }
};


const getDraftById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.firebase_uid;

    try {
        const draft = await Draft.findById(id);
        // וודא שהטיוטה שייכת למשתמש, או שהמשתמש הוא אדמין אם תרצה לאפשר זאת גם כאן
        if (!draft || (draft.user_id !== userId && req.user.role !== 'admin')) {
            return res.status(404).json({ message: 'Draft not found or unauthorized' });
        }
        res.status(200).json(draft);
    } catch (error) {
        console.error('Error fetching draft:', error);
        res.status(500).json({ message: 'Error fetching draft', error: error.message });
    }
};

// *** פונקציית deleteDraft המעודכנת ***
const deleteDraft = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.firebase_uid;
    const userRole = req.user.role; // <--- קבל את תפקיד המשתמש מה-req.user

    try {
        const draftToDelete = await Draft.findById(id);

        // 1. בדוק אם הטיוטה קיימת בכלל
        if (!draftToDelete) {
            return res.status(404).json({ message: 'Draft not found' });
        }

        // 2. בדוק הרשאות:
        //    א. אם המשתמש הוא הבעלים של הטיוטה (draftToDelete.user_id === userId),
        //    ב. או אם המשתמש המחובר הוא אדמין (userRole === 'admin').
        //    אם אף אחד מהתנאים לא מתקיים, המשתמש אינו מורשה.
        if (draftToDelete.user_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this draft.' });
        }

        // אם עבר את בדיקת ההרשאות (הוא הבעלים או אדמין), המשך למחיקה
        const deleted = await Draft.delete(id);
        if (deleted) {
            await logEvent('DELETE_DRAFT', `User ${userId} deleted draft ${id}`, userId);
            res.status(200).json({ message: 'Draft deleted successfully' });
        } else {
            res.status(500).json({ message: 'Failed to delete draft' });
        }
    } catch (error) {
        console.error('Error deleting draft:', error);
        res.status(500).json({ message: 'Error deleting draft', error: error.message });
    }
};

module.exports = {
    saveDraft,
    getDrafts,
    getDraftById,
    deleteDraft
};