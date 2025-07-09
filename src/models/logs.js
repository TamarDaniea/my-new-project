const db = require('../config/db');

const Log = {
  async create(type, description, userId) {
    const [result] = await db.execute(
      'INSERT INTO logs (type, description, user_id) VALUES (?, ?, ?)',
      [type, description, userId]
    );
    return result.insertId;
  },

   async findAll() {
    const [rows] = await db.execute('SELECT * FROM logs ORDER BY timestamp DESC');
    return rows;
  }
};

module.exports = Log;
