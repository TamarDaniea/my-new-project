// routes/drafts.js
const express = require('express');
const router = express.Router();
const draftsController = require('../controllers/draftsController');
const { body, param } = require('express-validator');
const auth = require('../middlewares/auth');
const multer = require('multer'); // ייבוא multer
const path = require('path');
const fs = require('fs');

// הגדרת אחסון ל-multer עבור קבצים זמניים
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempUploadDir = path.join(__dirname, '../uploads/temp');
        if (!fs.existsSync(tempUploadDir)) {
            fs.mkdirSync(tempUploadDir, { recursive: true });
        }
        cb(null, tempUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post(
    '/upload-temp-images',
    auth,
    upload.array('images'), // שם השדה חייב להיות 'images' כדי להתאים לקוד הלקוח
    (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded.' });
        }

        const uploadedFileNames = req.files.map(file => file.filename);
        res.status(200).json({
            message: 'Images uploaded successfully.',
            imageNames: uploadedFileNames
        });
    }
);

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