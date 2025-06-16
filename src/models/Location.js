// src/models/Location.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

class Location {
    // שיטה ליצירת מיקום חדש
    static async create(locationData) {
        const { name, lat, lng, description, images, category_id, user_id } = locationData;
        const sql = `
            INSERT INTO locations (name, lat, lng, description, images, category_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, lat, lng, description, JSON.stringify(images), category_id, user_id];
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...locationData };
    }

    // שיטה לקבלת כל המיקומים (כולל קטגוריה ושם משתמש)
    static async getAll() {
        const sql = `
            SELECT
                l.id,
                l.name,
                l.lat,
                l.lng,
                l.description,
                l.images,
                l.like_count,
                l.comment_count,
                l.created_at,
                c.name AS category_name,
                u.name AS user_name,
                l.user_id AS firebase_uid
            FROM
                locations l
            LEFT JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
            ORDER BY
                l.created_at DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // שיטה לקבלת מיקום לפי ID
    static async getById(id) {
        const sql = `
            SELECT
                l.id,
                l.name,
                l.lat,
                l.lng,
                l.description,
                l.images,
                l.like_count,
                l.comment_count,
                l.created_at,
                c.name AS category_name,
                u.name AS user_name,
                l.user_id AS firebase_uid
            FROM
                locations l
            LEFT JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
            WHERE l.id = ?
        `;
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }

    // שיטה לעדכון מיקום
    static async update(id, locationData) {
        const fields = [];
        const values = [];
        for (const key in locationData) {
            if (locationData.hasOwnProperty(key)) {
                fields.push(`${key} = ?`);
                values.push(key === 'images' ? JSON.stringify(locationData[key]) : locationData[key]);
            }
        }
        if (fields.length === 0) return 0; // No fields to update

        const sql = `UPDATE locations SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    // שיטה למחיקת מיקום
    static async delete(id) {
        const sql = `DELETE FROM locations WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה לייקים (הוספת לייק)
    static async incrementLikeCount(locationId) {
        const sql = `UPDATE locations SET like_count = like_count + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [locationId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה לייקים (הסרת לייק)
    static async decrementLikeCount(locationId) {
        const sql = `UPDATE locations SET like_count = like_count - 1 WHERE id = ? AND like_count > 0`;
        const [result] = await db.execute(sql, [locationId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה תגובות (הוספת תגובה)
    static async incrementCommentCount(locationId) {
        const sql = `UPDATE locations SET comment_count = comment_count + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [locationId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה תגובות (הסרת תגובה)
    static async decrementCommentCount(locationId) {
        const sql = `UPDATE locations SET comment_count = comment_count - 1 WHERE id = ? AND comment_count > 0`;
        const [result] = await db.execute(sql, [locationId]);
        return result.affectedRows;
    }
}

module.exports = Location;