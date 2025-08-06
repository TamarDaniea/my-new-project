// routes/drafts.js
const express = require('express');
const router = express.Router();
const draftsController = require('../controllers/draftsController');
const { body, param } = require('express-validator');
const auth = require('../middlewares/auth');

// POST /api/drafts - שמירת טיוטה (יצירה או עדכון)
router.post(
    '/',
    auth, // דורש אימות משתמש
    [
        body('item_type').isIn(['post', 'location']).withMessage('Invalid item_type. Must be "post" or "location".'),
        body('content').isObject().withMessage('Content must be an object and cannot be empty.')
    ],
    draftsController.saveDraft
);

// GET /api/drafts - קבלת כל הטיוטות של משתמש
router.get('/', auth, draftsController.getDrafts);

// GET /api/drafts/:id - קבלת טיוטה ספציפית לפי ID
router.get('/:id', auth, [
    param('id').isInt().withMessage('ID must be an integer')
], draftsController.getDraftById);

// DELETE /api/drafts/:id - מחיקת טיוטה ספציפית
router.delete('/:id', auth, [
    param('id').isInt().withMessage('ID must be an integer')
], draftsController.deleteDraft);

module.exports = router;