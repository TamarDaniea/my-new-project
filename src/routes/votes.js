const express = require('express');
const router = express.Router();
const votesController = require('../controllers/votesController');
const auth = require('../middlewares/auth'); // תקן ל-middlewares


// POST /api/votes - הוספה או עדכון של דירוג (לייק/דיסלייק)
router.post('/', auth, votesController.addOrUpdateVote);

module.exports = router;