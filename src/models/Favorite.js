const db = require('../config/db');

const Favorite = {
  getAllByUser: async (userId) => {
    const [rows] = await db.execute(
      'SELECT * FROM favorites WHERE user_id = ?',
      [userId]
    );
    return rows;
  },

  add: async (userId, itemType, itemId) => {
    await db.execute(
      'INSERT IGNORE INTO favorites (user_id, item_type, item_id) VALUES (?, ?, ?)',
      [userId, itemType, itemId]
    );
  },

  remove: async (userId, itemType, itemId) => {
    const [result] = await db.execute(
      'DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, itemId]
    );
    return result.affectedRows;
  }
};

module.exports = Favorite;
