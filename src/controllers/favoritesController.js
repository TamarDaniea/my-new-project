const Favorite = require('../models/Favorite');
const logEvent = require('../utils/logEvent');
const UserActions = require('../utils/UserActions');



const favoritesController = {
    getFavorites: async (req, res) => {
        const userId = req.user.firebase_uid;
        try {
            const favorites = await Favorite.getAllByUser(userId);
            res.json(favorites);
        } catch (err) {
            res.status(500).json({ message: req.t('favorite.fetchError'), error: err });
        }
    },

    addFavorite: async (req, res) => {
        const userId = req.user.firebase_uid;
        const { item_type, item_id } = req.body;

        if (!['post', 'location'].includes(item_type)) {
            return res.status(400).json({ message: req.t('favorite.addError') });
        }

        try {
            await Favorite.add(userId, item_type, item_id);
            await logEvent('ADD_FAVORITE', `User ${userId} added ${item_type} ${item_id} to favorites`, userId);
            await UserActions.trackAction(
                req.user.firebase_uid,
                `favorite_${item_type}`, // post / location
                item_type,
                item_id
            );
            res.json({ message: req.t('favorite.added') });
        } catch (err) {
            res.status(500).json({ message: req.t('favorite.addError'), error: err });
        }
    },

    removeFavorite: async (req, res) => {
        const userId = req.user.firebase_uid;
        const { item_type, item_id } = req.body;

        try {
            const affectedRows = await Favorite.remove(userId, item_type, item_id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('favorite.notFound') });
            }
            await logEvent('REMOVE_FAVORITE', `User ${userId} removed ${item_type} ${item_id} from favorites`, userId);
            res.json({ message: req.t('favorite.removed') });
        } catch (err) {
            res.status(500).json({ message: req.t('favorite.removeError'), error: err });
        }
    }
};

module.exports = favoritesController;
