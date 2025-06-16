// src/models/Post.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

class Post {
    // שיטה ליצירת פוסט חדש
    static async create(postData) {
        const { title, content, images, user_id, location_id } = postData;
        const sql = `
            INSERT INTO posts (title, content, images, user_id, location_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [title, content, JSON.stringify(images), user_id, location_id || null];
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...postData };
    }

    // שיטה לקבלת כל הפוסטים (כולל פרטי משתמש ומיקום אם קיימים)
    static async getAll() {
        const sql = `
            SELECT
                p.id,
                p.title,
                p.content,
                p.images,
                p.like_count,
                p.comment_count,
                p.created_at,
                u.name AS user_name,
                p.user_id AS firebase_uid,
                l.name AS location_name,
                l.id AS location_id
            FROM
                posts p
            LEFT JOIN
                users u ON p.user_id = u.firebase_uid
            LEFT JOIN
                locations l ON p.location_id = l.id
            ORDER BY
                p.created_at DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // שיטה לקבלת פוסט לפי ID
    static async getById(id) {
        const sql = `
            SELECT
                p.id,
                p.title,
                p.content,
                p.images,
                p.like_count,
                p.comment_count,
                p.created_at,
                u.name AS user_name,
                p.user_id AS firebase_uid,
                l.name AS location_name,
                l.id AS location_id
            FROM
                posts p
            LEFT JOIN
                users u ON p.user_id = u.firebase_uid
            LEFT JOIN
                locations l ON p.location_id = l.id
            WHERE p.id = ?
        `;
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }

    // שיטה לעדכון פוסט
    static async update(id, postData) {
        const fields = [];
        const values = [];
        for (const key in postData) {
            if (postData.hasOwnProperty(key)) {
                fields.push(`${key} = ?`);
                values.push(key === 'images' ? JSON.stringify(postData[key]) : postData[key]);
            }
        }
        if (fields.length === 0) return 0;

        const sql = `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    // שיטה למחיקת פוסט
    static async delete(id) {
        const sql = `DELETE FROM posts WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה לייקים (הוספת לייק)
    static async incrementLikeCount(postId) {
        const sql = `UPDATE posts SET like_count = like_count + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה לייקים (הסרת לייק)
    static async decrementLikeCount(postId) {
        const sql = `UPDATE posts SET like_count = like_count - 1 WHERE id = ? AND like_count > 0`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה תגובות (הוספת תגובה)
    static async incrementCommentCount(postId) {
        const sql = `UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה תגובות (הסרת תגובה)
    static async decrementCommentCount(postId) {
        const sql = `UPDATE posts SET comment_count = comment_count - 1 WHERE id = ? AND comment_count > 0`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }
}

module.exports = Post;