const Favorite = require('../models/Favorite');

const favoritesController = {
  getFavorites: async (req, res) => {
    const userId = req.user.firebase_uid;
    try {
      const favorites = await Favorite.getAllByUser(userId);
      res.json(favorites);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching favorites', error: err });
    }
  },

  addFavorite: async (req, res) => {
    const userId = req.user.firebase_uid;
    const { item_type, item_id } = req.body;

    if (!['post', 'location'].includes(item_type)) {
      return res.status(400).json({ message: 'Invalid item_type' });
    }

    try {
      await Favorite.add(userId, item_type, item_id);
      res.json({ message: 'Favorite added' });
    } catch (err) {
      res.status(500).json({ message: 'Error adding favorite', error: err });
    }
  },

  removeFavorite: async (req, res) => {
    const userId = req.user.firebase_uid;
    const { item_type, item_id } = req.body;

    try {
      const affectedRows = await Favorite.remove(userId, item_type, item_id);
      if (affectedRows === 0) {
        return res.status(404).json({ message: 'Favorite not found' });
      }
      res.json({ message: 'Favorite removed' });
    } catch (err) {
      res.status(500).json({ message: 'Error removing favorite', error: err });
    }
  }
};

module.exports = favoritesController;
