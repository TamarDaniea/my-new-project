const express = require('express');
const router = express.Router();
const votesController = require('../controllers/votesController');
const auth = require('../middlewares/auth'); // תקן ל-middlewares
const Vote = require('../models/Vote');

router.get('/:itemType/:itemId/likes', Vote.countLikesByItem);
// POST /api/votes - הוספה או עדכון של דירוג (לייק/דיסלייק)
router.post('/', auth, votesController.addOrUpdateVote);
router.delete('/:userId/:itemType/:itemId', votesController.deleteVote);

module.exports = router;