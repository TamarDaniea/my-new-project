const db = require('../config/db');
const User = require('../models/User');

const UserActions = {
  async trackAction(userId, action, itemType = null, itemId = null) {
    try {
      await db.execute(
        `INSERT INTO user_actions (user_id, action, item_type, item_id, timestamp)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, action, itemType, itemId]
      );
    } catch (err) {
      console.error('Error logging user action:', err);
    }
  }
}

async function isAdminUser(userId) {
  try {
    const user = await User.getById(userId);  // מחזיר את אובייקט המשתמש מה-DB
    if (!user) return false;
    return user.role === 'admin';
  } catch (error) {
    console.error('Error checking admin user:', error);
    return false;
  }
};

module.exports = UserActions;
