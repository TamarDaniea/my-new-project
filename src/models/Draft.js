// models/Draft.js
const db = require('../config/db');

class Draft {
    static async create(userId, itemType, content) {
        const images = content.images || []; // חילוץ מערך התמונות
        // מחיקת images מהתוכן כדי לא לשמור אותו פעמיים
        delete content.images;

        const [result] = await db.execute(
            'INSERT INTO drafts (user_id, item_type, content, images) VALUES (?, ?, ?, ?)',
            [userId, itemType, JSON.stringify(content), JSON.stringify(images)]
        );
        return result.insertId;
    }
    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM drafts WHERE id = ?', [id]);
        if (rows.length > 0) {
            const draft = rows[0];
            // לוודא שהתמונות מנותחות כראוי אם לא מתבצע אוטומטית על ידי הדרייבר
            if (typeof draft.images === 'string') {
                draft.images = JSON.parse(draft.images);
            }
            return draft;
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
        const images = content.images || []; // חילוץ מערך התמונות
        // מחיקת images מהתוכן כדי לא לשמור אותו פעמיים
        delete content.images;

        const [result] = await db.execute(
            'UPDATE drafts SET content = ?, images = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [JSON.stringify(content), JSON.stringify(images), id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        // 1. איתור הטיוטה כדי לקבל את שמות התמונות
        const draft = await this.findById(id);
        if (!draft) {
            return 0; // לא נמצאה טיוטה
        }

        // 2. מחיקת הטיוטה ממסד הנתונים
        const [result] = await db.execute('DELETE FROM drafts WHERE id = ?', [id]);
        const isDeleted = result.affectedRows > 0;

        // 3. החזרת שמות התמונות כדי שפונקציית הבקר תוכל למחוק אותן פיזית
        if (isDeleted && draft.images) {
            return { affectedRows: result.affectedRows, imagesToDelete: draft.images };
        }

        return { affectedRows: result.affectedRows, imagesToDelete: [] };
    }
}

module.exports = Draft;