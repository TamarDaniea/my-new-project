// src/models/Comment.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

class Comment {
    // שיטה ליצירת תגובה חדשה
    static async create(commentData) {
        const { post_id, user_id, content } = commentData;
        const sql = `
            INSERT INTO comments (post_id, user_id, content)
            VALUES (?, ?, ?)
        `;
        const values = [post_id, user_id, content];
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...commentData };
    }

    // שיטה לקבלת תגובות לפי ID של פוסט
    static async getCommentsByPostId(postId) {
        const sql = `
            SELECT
                c.id,
                c.content,
                c.created_at,
                u.name AS user_name,
                c.user_id AS firebase_uid
            FROM
                comments c
            JOIN
                users u ON c.user_id = u.firebase_uid
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `;
        const [rows] = await db.execute(sql, [postId]);
        return rows;
    }

    // שיטה למחיקת תגובה
    static async delete(commentId) {
        const sql = `DELETE FROM comments WHERE id = ?`;
        const [result] = await db.execute(sql, [commentId]);
        return result.affectedRows;
    }
}

module.exports = Comment;