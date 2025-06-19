// src/models/Post.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

function safeJsonParseArray(value) {
    if (!value || typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

class Post {
    
    /**
     * יוצר פוסט חדש במסד הנתונים.
     * @param {object} postData - אובייקט המכיל את פרטי הפוסט.
     * צריך לכלול: title, content, images (כמערך), user_id, category_id, location_id (אופציונלי).
     * like_count ו-comment_count יאותחלו ל-0.
     * @returns {Promise<object>} - אובייקט המייצג את הפוסט שנוצר, כולל ה-ID שלו.
     */
    static async create(postData) {
        const { title, content, images, user_id, category_id, location_id } = postData;
        const created_at = new Date(); // הוספנו תאריך יצירה

        const sql = `
            INSERT INTO posts (title, content, images, user_id, category_id, location_id, created_at, like_count, comment_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
        `; 
        
        const values = [
            title,
            content,
            JSON.stringify(images), // נשמר כמחרוזת JSON ב-DB
            user_id,
            category_id || null, // יכול להיות null אם אין קטגוריה (אבל האיפיון דורש קישור)
            location_id || null, // אופציונלי
            created_at // תאריך יצירה
        ];

        try {
            const [result] = await db.execute(sql, values);
            return {
                id: result.insertId,
                title,
                content,
                images: images, // נחזיר את המערך המקורי לצורך הנוחות
                user_id,
                category_id: category_id || null,
                location_id: location_id || null,
                created_at: created_at.toISOString(),
                like_count: 0,
                comment_count: 0
            };
        } catch (error) {
            console.error('Error creating post in model:', error);
            throw error;
        }
    }

    /**
     * שיטה לקבלת כל הפוסטים (כולל פרטי משתמש, מיקום וקטגוריה אם קיימים).
     * מטפלת בהמרה של שדה 'images' ממחרוזת JSON למערך.
     * @returns {Promise<Array<object>>} - מערך של אובייקטי פוסט.
     */
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
                l.id AS location_id,
                c.name AS category_name,  -- הוסף/הוסיפי את שם הקטגוריה
                c.id AS category_id       -- הוסף/הוסיפי את ID הקטגוריה
            FROM
                posts p
            LEFT JOIN
                users u ON p.user_id = u.firebase_uid
            LEFT JOIN
                locations l ON p.location_id = l.id
            LEFT JOIN
                categories c ON p.category_id = c.id -- הצטרפות לטבלת קטגוריות
            ORDER BY
                p.created_at DESC
        `;
        const [rows] = await db.execute(sql);
        // חשוב לטפל ב-images: הוא נשמר כ-JSON string ב-DB
        return rows.map(row => ({
            ...row,
          images: safeJsonParseArray(row.images),
 // ודא/י שה-images מומר למערך
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null // לוודא פורמט עקבי
        }));
    }

    /**
     * שיטה לקבלת פוסט לפי ID.
     * מטפלת בהמרה של שדה 'images' ממחרוזת JSON למערך.
     * @param {number} id - מזהה הפוסט.
     * @returns {Promise<object|null>} - אובייקט הפוסט או null אם לא נמצא.
     */
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
                l.id AS location_id,
                c.name AS category_name,  -- הוסף/הוסיפי את שם הקטגוריה
                c.id AS category_id       -- הוסף/הוסיפי את ID הקטגוריה
            FROM
                posts p
            LEFT JOIN
                users u ON p.user_id = u.firebase_uid
            LEFT JOIN
                locations l ON p.location_id = l.id
            LEFT JOIN
                categories c ON p.category_id = c.id -- הצטרפות לטבלת קטגוריות
            WHERE p.id = ?
        `;
        const [rows] = await db.execute(sql, [id]);
        if (rows[0]) {
            return {
                ...rows[0],
           images: safeJsonParseArray(row.images),
 // ודא/י שה-images מומר למערך
                created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : null // לוודא פורמט עקבי
            };
        }
        return null;
    }

    /**
     * שיטה לעדכון פוסט קיים.
     * @param {number} id - מזהה הפוסט לעדכון.
     * @param {object} postData - אובייקט עם השדות לעדכון.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async update(id, postData) {
        const fields = [];
        const values = [];
        for (const key in postData) {
            if (postData.hasOwnProperty(key)) {
                if (key === 'images') {
                    fields.push(`${key} = ?`);
                    values.push(JSON.stringify(postData[key]));
                } else if (key === 'location_id' || key === 'category_id') { 
                    fields.push(`${key} = ?`);
                    values.push(postData[key] === undefined ? null : postData[key]); 
                } else {
                    fields.push(`${key} = ?`);
                    values.push(postData[key]);
                }
            }
        }
        if (fields.length === 0) return 0;

        const sql = `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    /**
     * שיטה למחיקת פוסט.
     * @param {number} id - מזהה הפוסט למחיקה.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async delete(id) {
        const sql = `DELETE FROM posts WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה לייקים (הוספת לייק).
     * @param {number} postId - מזהה הפוסט.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async incrementLikeCount(postId) {
        const sql = `UPDATE posts SET like_count = like_count + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה לייקים (הסרת לייק).
     * @param {number} postId - מזהה הפוסט.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async decrementLikeCount(postId) {
        const sql = `UPDATE posts SET like_count = like_count - 1 WHERE id = ? AND like_count > 0`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה תגובות (הוספת תגובה).
     * @param {number} postId - מזהה הפוסט.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async incrementCommentCount(postId) {
        const sql = `UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה תגובות (הסרת תגובה).
     * @param {number} postId - מזהה הפוסט.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async decrementCommentCount(postId) {
        const sql = `UPDATE posts SET comment_count = comment_count - 1 WHERE id = ? AND comment_count > 0`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }
        /**
     * שליפת פוסטים לפי מזהה קטגוריה.
     * @param {number} categoryId - מזהה הקטגוריה.
     * @returns {Promise<Array<object>>} - מערך של פוסטים התואמים לקטגוריה.
     */
    static async getByCategoryId(categoryId) {
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
                l.id AS location_id,
                c.name AS category_name,
                c.id AS category_id
            FROM
                posts p
            LEFT JOIN
                users u ON p.user_id = u.firebase_uid
            LEFT JOIN
                locations l ON p.location_id = l.id
            LEFT JOIN
                categories c ON p.category_id = c.id
            WHERE
                p.category_id = ?
            ORDER BY
                p.created_at DESC
        `;

        const [rows] = await db.execute(sql, [categoryId]);

        return rows.map(row => ({
            ...row,
            images: safeJsonParseArray(row.images),

            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        }));
    }

}

module.exports = Post;