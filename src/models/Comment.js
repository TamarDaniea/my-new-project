// src/models/Comment.js
const db = require('../config/db');

class Comment {
    /**
     * יוצר/ת תגובה חדשה לפוסט או למיקום.
     * @param {object} commentData - הנתונים של התגובה.
     * @param {number} [commentData.post_id] - ה-ID של הפוסט (אופציונלי).
     * @param {number} [commentData.location_id] - ה-ID של המיקום (אופציונלי).
     * @param {string} commentData.user_id - ה-ID של המשתמש שיצר את התגובה.
     * @param {string} commentData.content - תוכן התגובה.
     * @returns {object} אובייקט התגובה שנוצר כולל ה-ID.
     */
    static async create(commentData) {
        const { post_id, location_id, user_id, content } = commentData;

        // וודא/י שרק אחד מ-post_id או location_id קיימים
        if ((post_id && location_id) || (!post_id && !location_id)) {
            throw new Error('Comment must be associated with either a post_id or a location_id, but not both.');
        }

        const sql = `
            INSERT INTO comments (post_id, location_id, user_id, content)
            VALUES (?, ?, ?, ?)
        `;
        const values = [post_id || null, location_id || null, user_id, content]; // שמור null אם לא קיים
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...commentData, created_at: new Date().toISOString() }; // הוספת created_at
    }

    /**
     * מקבל/ת תגובה לפי ה-ID שלה.
     * @param {number} id - ה-ID של התגובה.
     * @returns {object|undefined} אובייקט התגובה או undefined אם לא נמצאה.
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
     * @param {number} postId - ה-ID של הפוסט.
     * @returns {Array<object>} מערך של אובייקטי תגובות.
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
     * @param {number} locationId - ה-ID של המיקום.
     * @returns {Array<object>} מערך של אובייקטי תגובות.
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
     * שיטה כללית לקבלת תגובות לפי סוג ו-ID של פריט (פוסט או מיקום).
     * @param {string} item_type - 'post' או 'location'.
     * @param {number} item_id - ה-ID של הפריט (פוסט או מיקום).
     * @returns {Promise<Array<object>>} - מערך של אובייקטי תגובות.
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
            // אם item_type לא תקין, נחזיר מערך ריק או נזרוק שגיאה
            throw new Error('Invalid item_type provided for getCommentsByItem. Must be "post" or "location".');
        }

        const [rows] = await db.execute(sql, values);
        return rows;
    }


    /**
     * מוחק/ת תגובה לפי ה-ID שלה.
     * חשוב: הפונקציה הזו במודל צריכה למחוק רק לפי ID.
     * בדיקת בעלות צריכה להתבצע בקונטרולר לפני הקריאה לפונקציה זו.
     * @param {number} commentId - ה-ID של התגובה למחיקה.
     * @returns {number} מספר השורות שהושפעו (0 או 1).
     */
    static async delete(commentId) {
        // הסרתי את userId מה-WHERE כאן, מכיוון שבדיקת ההרשאות צריכה להיות בקונטרולר.
        // המודל רק מבצע את פעולת המחיקה.
        const sql = `DELETE FROM comments WHERE id = ?`;
        const [result] = await db.execute(sql, [commentId]);
        return result.affectedRows;
    }

    /**
     * מעדכן/ת תגובה.
     * @param {number} commentId - ה-ID של התגובה לעדכון.
     * @param {string} userId - ה-ID של המשתמש המבצע את העדכון (לאימות בעלות).
     * @param {string} newContent - התוכן המעודכן של התגובה.
     * @returns {number} מספר השורות שהושפעו (0 או 1).
     */
    static async update(commentId, userId, newContent) {
        const sql = `UPDATE comments SET content = ? WHERE id = ? AND user_id = ?`;
        const [result] = await db.execute(sql, [newContent, commentId, userId]);
        return result.affectedRows;
    }
    
    // שימו לב: הפונקציה updateCommentCount כבר לא נחוצה ישירות כאן
    // מכיוון שהמונה מתעדכן ישירות ב-Post וב-Location Models
    // לכן היא הוסרה מהקוד המעודכן.
}

module.exports = Comment;