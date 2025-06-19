const express = require('express');
const router = express.Router();
const votesController = require('../controllers/votesController');
const fakeAuth = require('../middlewares/fakeAuth'); // תקן ל-middlewares

// POST /api/votes - הוספה או עדכון של דירוג (לייק/דיסלייק)
router.post('/', fakeAuth, votesController.addOrUpdateVote);

module.exports = router;