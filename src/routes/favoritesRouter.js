const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const auth = require('../middlewares/auth'); 


router.use(auth); 

router.get('/', favoritesController.getFavorites);
router.post('/', favoritesController.addFavorite);
router.delete('/', favoritesController.removeFavorite);

module.exports = router;
