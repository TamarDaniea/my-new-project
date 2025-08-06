const db = require('../config/db');


const Report = {
  create: async ({ item_type, item_id, user_id, reason , category_id}) => {
    const sql = `
      INSERT INTO reports (item_type, item_id, user_id, reason, category_id status, created_at)
      VALUES (?, ?, ?, ?, 'open', NOW())
    `;
    const [result] = await db.execute(sql, [item_type, item_id, user_id, reason, category_id]);
    return result.insertId; // מחזיר את מזהה הדיווח החדש
  },

  getAll: async () => {
    const sql = `
      SELECT r.*, u.name as user_name, u.email as user_email
      FROM reports r
      JOIN users u ON r.user_id = u.firebase_uid
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },
};

module.exports = Report;
