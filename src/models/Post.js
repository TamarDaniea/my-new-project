const db = require('../config/db');

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
     * @returns {Promise<object>} - אובייקט המייצג את הפוסט שנוצר, כולל ה-ID שלו.
     */
    static async create(postData) {
        const { title, content, images, user_id, category_id, location_id } = postData;
        const created_at = new Date();
        const sql = `
            INSERT INTO posts (title, content, images, user_id, category_id, location_id, created_at, like_count, comment_count, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, FALSE)
        `;
        const values = [
            title,
            content,
            JSON.stringify(images),
            user_id,
            category_id || null,
            location_id || null,
            created_at
        ];
        try {
            const [result] = await db.execute(sql, values);
            return {
                id: result.insertId,
                title,
                content,
                images: images,
                user_id,
                category_id: category_id || null,
                location_id: location_id || null,
                created_at: created_at.toISOString(),
                like_count: 0,
                comment_count: 0,
                is_deleted: false
            };
        } catch (error) {
            console.error('Error creating post in model:', error);
            throw error;
        }
    }

    static async getFilteredAndPaginated({ page = 1, limit = 6, userId, categoryId }) {
        // להמיר ל־number
        page = Number(page) || 1;
        limit = Number(limit) || 6;

        const offset = (page - 1) * limit;

        const whereClauses = ['p.is_deleted = FALSE'];
        const params = [];

        if (userId) {
            whereClauses.push('p.user_id = ?');
            params.push(userId);
        }

        if (categoryId) {
            whereClauses.push('p.category_id = ?');
            params.push(categoryId);
        }

        const whereString = `WHERE ${whereClauses.join(' AND ')}`;

        const sql = `
        SELECT
            SQL_CALC_FOUND_ROWS
            p.id,
            p.title,
            p.content,
            p.images,
            p.like_count,
            p.comment_count,
            p.created_at,
            p.is_deleted,
            u.name AS user_name,
            p.user_id AS firebase_uid,
            l.name AS location_name,
            l.id AS location_id,
            c.name AS category_name,
            c.id AS category_id
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.firebase_uid
        LEFT JOIN locations l ON p.location_id = l.id
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereString}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `;

        const queryParams = [...params, limit, offset];

        try {
            const [rows] = await db.execute(sql, queryParams);
            const [[{ total }]] = await db.execute(`SELECT FOUND_ROWS() AS total`);

            return {
                items: rows.map(row => ({
                    ...row,
                    images: safeJsonParseArray(row.images),
                    created_at: row.created_at
                        ? new Date(row.created_at).toISOString()
                        : null
                })),
                totalCount: total
            };
        } catch (error) {
            console.error('Error fetching filtered and paginated posts:', error);
            throw error;
        }
    }


    /**
     * שיטה לקבלת פוסט לפי ID, תוך עדכון מונה צפיות (view_count).
     * @param {number} id - מזהה הפוסט.
     * @returns {Promise<object|null>} - אובייקט הפוסט או null אם לא נמצא.
     */
    static async getById(id) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.execute(
                `
                SELECT
                    p.id, p.title, p.content, p.images, p.like_count, p.comment_count, p.created_at, p.view_count, p.is_deleted,
                    u.name AS user_name, p.user_id AS firebase_uid,
                    l.name AS location_name, l.id AS location_id,
                    c.name AS category_name, c.id AS category_id
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.firebase_uid
                LEFT JOIN locations l ON p.location_id = l.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = ? AND p.is_deleted = FALSE
                `,
                [id]
            );
            if (rows.length === 0) {
                await connection.rollback();
                return null;
            }
            await connection.execute(
                `UPDATE posts SET view_count = view_count + 1 WHERE id = ?`,
                [id]
            );
            await connection.commit();
            const post = rows[0];
            return {
                ...post,
                images: safeJsonParseArray(post.images),
                created_at: post.created_at ? new Date(post.created_at).toISOString() : null
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error in getById with view_count:', error);
            throw error;
        } finally {
            connection.release();
        }
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
                if (['user_id', 'created_at', 'like_count', 'comment_count', 'is_deleted'].includes(key)) {
                    continue;
                }
                if (key === 'images') {
                    fields.push(`${key} = ?`);
                    values.push(postData[key] === null || postData[key] === undefined ? JSON.stringify([]) : JSON.stringify(postData[key]));
                } else if (key === 'location_id' || key === 'category_id') {
                    fields.push(`${key} = ?`);
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
        const sql = `UPDATE posts SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`;
        values.push(id);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    /**
     * מחיקה פיזית (Hard Delete) - מיועדת רק לבעל הפוסט.
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
            const [rows] = await db.query('SELECT user_id FROM posts WHERE id = ? AND is_deleted = FALSE', [postId]);
            if (rows.length === 0) {
                return false;
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
        const sql = `UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ? AND is_deleted = FALSE`;
        const [result] = await db.execute(sql, [postId]);
        return result.affectedRows;
    }

    /**
     * מחיקה רכה (soft delete) של פוסט.
     * @param {number} id - מזהה הפוסט למחיקה רכה.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async softDelete(id) {
        const sql = `UPDATE posts SET is_deleted = TRUE WHERE id = ? AND is_deleted = FALSE`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    static async getPostsByDate(start, end) {
        const [rows] = await db.execute(
            `SELECT * FROM posts WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC`,
            [start, end]
        );
        return rows;
    };

    /**
     * שיטה לקבלת כל הפוסטים (כולל פרטי משתמש, מיקום וקטגוריה אם קיימים).
     * תומכת בפאג'ינציה עם limit ו-offset.
     * מטפלת בהמרה של שדה 'images' ממחרוזת JSON למערך.
     * @param {object} options - הגדרות שליפת פוסטים.
     * @param {number} options.limit - מספר פריטים בעמוד.
     * @param {number} options.offset - כמה פריטים לדלג (לפי עמוד).
     * @returns {Promise<{items: Array<object>, totalCount: number}>}
     */
    static async getAll({ limit, offset }) {
        let sql = `
        SELECT
            SQL_CALC_FOUND_ROWS
            p.id, p.title, p.content, p.images, p.like_count, p.comment_count, p.created_at, p.is_deleted,
            u.name AS user_name, p.user_id AS firebase_uid,
            l.name AS location_name, l.id AS location_id,
            c.name AS category_name, c.id AS category_id
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.firebase_uid
        LEFT JOIN locations l ON p.location_id = l.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_deleted = FALSE
        ORDER BY p.created_at DESC
        `;
        const params = [];
        if (limit !== undefined && offset !== undefined) {
            sql += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);
        }
        const [rows] = await db.execute(sql, params);
        const [[{ 'FOUND_ROWS()': totalCount }]] = await db.execute(`SELECT FOUND_ROWS()`);
        return {
            items: rows.map(row => ({
                ...row,
                images: safeJsonParseArray(row.images),
                created_at: row.created_at ? new Date(row.created_at).toISOString() : null
            })),
            totalCount
        };
    }

    /**
     * שליפת פוסטים לפי מזהה קטגוריה.
     * @param {number} categoryId - מזהה הקטגוריה.
     * @returns {Promise<Array<object>>} - מערך של פוסטים התואמים לקטגוריה.
     */
    static async getByCategoryId(categoryId) {
        const sql = `
            SELECT
                p.id, p.title, p.content, p.images, p.like_count, p.comment_count, p.created_at, p.is_deleted,
                u.name AS user_name, p.user_id AS firebase_uid,
                l.name AS location_name, l.id AS location_id,
                c.name AS category_name, c.id AS category_id
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.firebase_uid
            LEFT JOIN locations l ON p.location_id = l.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.is_deleted = FALSE
            ORDER BY p.created_at DESC
        `;
        const [rows] = await db.execute(sql, [categoryId]);
        return rows.map(row => ({
            ...row,
            images: safeJsonParseArray(row.images),
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        }));
    }

    /**
     * שליפת פוסטים לפי מזהה משתמש.
     * @param {string} userId - מזהה המשתמש.
     * @returns {Promise<Array<object>>} - מערך של פוסטים התואמים למשתמש.
     */
    static async getByUserId(userId) {
        try {
            const sql = `
                SELECT
                    p.id, p.title, p.content, p.images, p.like_count, p.comment_count, p.created_at, p.is_deleted,
                    u.name AS user_name, p.user_id AS firebase_uid,
                    l.name AS location_name, l.id AS location_id,
                    c.name AS category_name, c.id AS category_id
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.firebase_uid
                LEFT JOIN locations l ON p.location_id = l.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.user_id = ? AND p.is_deleted = FALSE
                ORDER BY p.created_at DESC
            `;
            const [rows] = await db.execute(sql, [userId]);
            return rows.map(row => ({
                ...row,
                images: safeJsonParseArray(row.images),
                created_at: row.created_at ? new Date(row.created_at).toISOString() : null
            }));
        } catch (error) {
            console.error('Error fetching posts by user ID:', error);
            throw error;
        }
    }

    /**
     * מעלה את מונה הצפיות ב-1.
     * @param {string} id - מזהה הפוסט.
     * @returns {Promise<number|null>} - ספירת הצפיות המעודכנת או null אם הפוסט לא נמצא.
     */
    static async incrementViewCount(id) {
        try {
            const [result] = await db.execute(
                `UPDATE posts SET view_count = view_count + 1 WHERE id = ?`,
                [id]
            );
            if (result.affectedRows === 0) {
                return null;
            }
            const [rows] = await db.execute(
                `SELECT view_count FROM posts WHERE id = ?`,
                [id]
            );
            return rows[0] ? rows[0].view_count : null;
        } catch (error) {
            console.error('Error incrementing post view count:', error);
            throw error;
        }
    }
}

module.exports = Post;
