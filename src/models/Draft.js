// models/Draft.js
const db = require('../config/db');

class Draft {
    static async create(userId, itemType, content) {
        const [result] = await db.execute(
            'INSERT INTO drafts (user_id, item_type, content) VALUES (?, ?, ?)',
            [userId, itemType, JSON.stringify(content)] // עדיין צריך לשמור כמחרוזת JSON!
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM drafts WHERE id = ?', [id]);
        if (rows.length > 0) {
            const draft = rows[0];
            // draft.content = JSON.parse(draft.content); // <--- הסר או השאר בהערה את השורה הזו
            return draft; // ה-mysql2 driver כנראה כבר מנתח את זה לאובייקט
        }
        return null;
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute('SELECT * FROM drafts WHERE user_id = ?', [userId]);
        return rows.map(row => {
            // row.content = JSON.parse(row.content); // <--- הסר או השאר בהערה את השורה הזו
            return row; // ה-mysql2 driver כנראה כבר מנתח את זה לאובייקט
        });
    }

    static async update(id, content) {
        const [result] = await db.execute(
            'UPDATE drafts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [JSON.stringify(content), id] // עדיין צריך לשמור כמחרוזת JSON!
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM drafts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Draft;