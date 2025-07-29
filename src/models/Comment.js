// src/models/Comment.js
const db = require('../config/db');

class Comment {
    /**
     * יוצר/ת תגובה חדשה לפוסט או למיקום.
     */
    static async create(commentData) {
        const { post_id, location_id, user_id, content } = commentData;
        if ((post_id && location_id) || (!post_id && !location_id)) {
            throw new Error('Comment must be associated with either a post_id or a location_id, but not both.');
        }

        const sql = `
            INSERT INTO comments (post_id, location_id, user_id, content)
            VALUES (?, ?, ?, ?)
        `;
        const values = [post_id || null, location_id || null, user_id, content];
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...commentData, created_at: new Date().toISOString() };
    }

    /**
     * מקבל/ת תגובה לפי ה-ID שלה.
     */
    static async getById(id) {
        const sql = `
            SELECT c.*, u.name AS user_name, u.firebase_uid
            FROM comments c
            JOIN users u ON c.user_id = u.firebase_uid
            WHERE c.id = ?
        `;
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }

    /**
     * מקבל/ת את כל התגובות לפוסט ספציפי.
     */
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

    /**
     * מקבל/ת את כל התגובות למיקום ספציפי.
     */
    static async getCommentsByLocationId(locationId) {
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
            WHERE c.location_id = ?
            ORDER BY c.created_at ASC
        `;
        const [rows] = await db.execute(sql, [locationId]);
        return rows;
    }

    /**
     * שיטה כללית לקבלת תגובות לפי סוג ו-ID של פריט.
     */
    static async getCommentsByItem(item_type, item_id) {
        let sql;
        let values = [item_id];

        if (item_type === 'post') {
            sql = `
                SELECT c.*, u.name AS user_name, u.firebase_uid
                FROM comments c
                JOIN users u ON c.user_id = u.firebase_uid
                WHERE c.post_id = ?
                ORDER BY c.created_at DESC
            `;
        } else if (item_type === 'location') {
            sql = `
                SELECT c.*, u.name AS user_name, u.firebase_uid
                FROM comments c
                JOIN users u ON c.user_id = u.firebase_uid
                WHERE c.location_id = ?
                ORDER BY c.created_at DESC
            `;
        } else {
            throw new Error('Invalid item_type provided for getCommentsByItem. Must be "post" or "location".');
        }

        const [rows] = await db.execute(sql, values);
        return rows;
    }

    /**
     * מוחק/ת תגובה לפי ID.
     */
    static async delete(commentId) {
        const sql = `DELETE FROM comments WHERE id = ?`;
        const [result] = await db.execute(sql, [commentId]);
        return result.affectedRows;
    }

    /**
     * מעדכן/ת תגובה לפי ID ובעלות.
     * ישמש לעריכת תגובה על ידי בעליה.
     */
    static async update(commentId, userId, newContent) {
        const sql = `UPDATE comments SET content = ? WHERE id = ? AND user_id = ?`;
        const [result] = await db.execute(sql, [newContent, commentId, userId]);
        return result.affectedRows;
    }

    /**
     * מעדכן/ת רק את תוכן התגובה לפי ה-ID שלה (ללא בדיקת בעלות).
     * מיועד לשימוש על ידי אדמינים או כאשר הבעלות כבר נבדקה בקונטרולר.
     * @param {number} commentId - ה-ID של התגובה לעדכון.
     * @param {string} newContent - התוכן המעודכן של התגובה.
     * @returns {number} מספר השורות שהושפעו (0 או 1).
     */
    static async updateContentOnly(commentId, newContent) {
        const sql = `UPDATE comments SET content = ? WHERE id = ?`;
        const [result] = await db.execute(sql, [newContent, commentId]);
        return result.affectedRows;
    }

    /**
     * מוחק/ת את כל התגובות ששייכות לפוסט מסוים.
     * @param {number} postId - מזהה הפוסט.
     * @returns {number} מספר השורות שנמחקו.
     */
    static async deleteCommentsByPostId(postId) {
        const sql = `DELETE FROM comments WHERE post_id = ?`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    /**
     * מוחק/ת את כל התגובות ששייכות למיקום מסוים.
     * @param {number} locationId - מזהה המיקום.
     * @returns {number} מספר השורות שנמחקו.
     */
    static async deleteCommentsByLocationId(locationId) {
        const sql = `DELETE FROM comments WHERE location_id = ?`;
        const [result] = await db.execute(sql, [locationId]);
        return result.affectedRows;
    }
}

module.exports = Comment;