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
            INSERT INTO posts (title, content, images, user_id, category_id, location_id, created_at, like_count, comment_count, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, FALSE)
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
                comment_count: 0,
                is_deleted: false // נחזיר את הערך החדש
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
            p.is_deleted, -- הוספה: שדה is_deleted
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
            p.is_deleted = FALSE -- רק פוסטים שאינם מחוקים
        ORDER BY
            p.created_at DESC
        `;
        const [rows] = await db.execute(sql);
        return rows.map(row => ({
            ...row,
            images: safeJsonParseArray(row.images),
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
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
                p.is_deleted, -- הוספה: שדה is_deleted
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
            WHERE p.id = ? AND p.is_deleted = FALSE -- רק פוסטים שאינם מחוקים
        `;
        const [rows] = await db.execute(sql, [id]);
        if (rows[0]) {
            return {
                ...rows[0],
                images: safeJsonParseArray(rows[0].images), // ודא/י שה-images מומר למערך
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
                // ודא שלא ניתן לעדכן את user_id או created_at
                if (key === 'user_id' || key === 'created_at' || key === 'like_count' || key === 'comment_count' || key === 'is_deleted') {
                    continue; // דלג על שדות אלו
                }

                if (key === 'images') {
                    fields.push(`${key} = ?`);
                    // אם images הוא null/undefined, נשמור מערך ריק. אחרת, נמיר ל-JSON
                    values.push(postData[key] === null || postData[key] === undefined ? JSON.stringify([]) : JSON.stringify(postData[key]));
                } else if (key === 'location_id' || key === 'category_id') {
                    fields.push(`${key} = ?`);
                    // מאפשר עדכון ל-NULL אם הערך הוא null או undefined במפורש
                    values.push(postData[key] === null ? null : postData[key]);
                } else {
                    fields.push(`${key} = ?`);
                    values.push(postData[key]);
                }
            }
        }
        if (fields.length === 0) {
            console.log('No fields to update for post ID:', id);
            return 0;
        }

        const sql = `UPDATE posts SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`; // רק פוסטים שאינם מחוקים
        values.push(id);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    /**
     * שיטה למחיקת פוסט.
     * זוהי מחיקה פיזית (Hard Delete) - מיועדת רק לבעל הפוסט.
     * @param {number} id - מזהה הפוסט למחיקה.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async delete(id) {
        const sql = `DELETE FROM posts WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    /**
     * פונקציה חדשה: בודקת אם משתמש מסוים הוא הבעלים של הפוסט.
     * @param {number} postId - מזהה הפוסט.
     * @param {string} userId - ה-UID של המשתמש.
     * @returns {Promise<boolean>} - true אם המשתמש הוא הבעלים, false אחרת.
     */
    static async isOwner(postId, userId) {
        try {
            // הוספנו is_deleted = FALSE כדי לוודא שהפוסט לא מחוק
            const [rows] = await db.query('SELECT user_id FROM posts WHERE id = ? AND is_deleted = FALSE', [postId]);
            if (rows.length === 0) {
                return false; // הפוסט לא נמצא או מחוק
            }
            return rows[0].user_id === userId;
        } catch (error) {
            console.error('Error checking post ownership:', error);
            throw error;
        }
    }

    /**
     * שיטה לעדכון מונה לייקים (הוספת לייק).
     * @param {number} postId - מזהה הפוסט.
     * @param {number} amount - הכמות להגדיל (ברירת מחדל 1).
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async incrementLikeCount(postId, amount = 1) {
        const sql = `UPDATE posts SET like_count = like_count + ? WHERE id = ? AND is_deleted = FALSE`;
        const [result] = await db.execute(sql, [amount, postId]);
        console.log(`Incrementing like_count for post ID: ${postId}, amount: ${amount}`);
        console.log(`Incremented like_count, affected rows: ${result.affectedRows}`);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה לייקים (הסרת לייק או הוספת דיסלייק).
     * @param {number} postId - מזהה הפוסט.
     * @param {number} amount - הכמות להפחית (ברירת מחדל 1).
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async decrementLikeCount(postId, amount = 1) {
        // לוודא ש-like_count לא יורד מתחת ל-0
        const sql = `UPDATE posts SET like_count = GREATEST(0, like_count - ?) WHERE id = ? AND is_deleted = FALSE`;
        const [result] = await db.execute(sql, [amount, postId]);
        console.log(`Decrementing like_count for post ID: ${postId}, amount: ${amount}`);
        console.log(`Decremented like_count, affected rows: ${result.affectedRows}`);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה תגובות (הוספת תגובה).
     * @param {number} postId - מזהה הפוסט.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async incrementCommentCount(postId) {
        const sql = `UPDATE posts SET comment_count = comment_count + 1 WHERE id = ? AND is_deleted = FALSE`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה תגובות (הסרת תגובה).
     * @param {number} postId - מזהה הפוסט.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async decrementCommentCount(postId) {
        // לוודא ש-comment_count לא יורד מתחת ל-0
        const sql = `UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ? AND is_deleted = FALSE`;
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
                p.is_deleted, -- הוספה: שדה is_deleted
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
                p.category_id = ? AND p.is_deleted = FALSE -- רק פוסטים שאינם מחוקים
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

    /**
     * מחיקה רכה (soft delete) של פוסט.
     * @param {number} id - מזהה הפוסט למחיקה רכה.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async softDelete(id) {
        const sql = `UPDATE posts SET is_deleted = TRUE WHERE id = ? AND is_deleted = FALSE`; // וודא שרק פוסטים פעילים מסומנים כמחוקים
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

   static async getPostsByDate(start, end){
        const [rows] = await db.execute(
            `SELECT * FROM posts WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC`,
            [start, end]
        );
        return rows;
    };

}

module.exports = Post;