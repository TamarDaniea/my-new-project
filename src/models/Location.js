const db = require('../config/db');

// פונקציות עזר לטיפול ב-JSON של תמונות
function safeJsonParseArray(value) {
    if (!value || typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

class Location {
    /**
     * שיטה ליצירת מיקום חדש ב-DB.
     * @param {object} locationData - הנתונים של המיקום.
     * @returns {Promise<object>} - אובייקט עם מזהה המיקום החדש והנתונים שלו.
     */
    static async create(locationData, images) {
        const { name, lat, lng, description, category_id, user_id, country, area, city } = locationData;
        // images כבר קיים כפרמטר, אין צורך לחלץ אותו שוב מתוך locationData
        const sql = `
        INSERT INTO locations (name, lat, lng, description, images, category_id, user_id, like_count, comment_count, created_at, country, area, city, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), ?, ?, ?, false)
    `;
        const values = [name, lat, lng, description, JSON.stringify(images), category_id, user_id, country, area, city];
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...locationData, images, like_count: 0, comment_count: 0, created_at: new Date().toISOString() };
    }

    /**
     * שיטה לקבלת מיקום לפי ID.
     * @param {number} id - מזהה המיקום.
     * @returns {Promise<object|null>} - אובייקט המיקום או null אם לא נמצא.
     */
    static async getById(id) {
        const sql = `
            SELECT
                l.id, l.name, l.lat, l.lng, l.description, l.images, l.like_count, l.comment_count, l.created_at, l.country, l.area, l.city,
                c.name AS category_name, u.name AS user_name, l.user_id AS firebase_uid, c.id AS category_id
            FROM
                locations l
            LEFT JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
            WHERE l.id = ? AND l.is_deleted = false
        `;
        const [rows] = await db.execute(sql, [id]);
        if (rows[0]) {
            return {
                ...rows[0],
                images: safeJsonParseArray(rows[0].images),
                created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : null
            };
        }
        return null;
    }

    /**
     * שיטה לקבלת מיקומים של משתמש עם פגינציה.
     * @param {string} userId - ה-UID של המשתמש.
     * @param {number} limit - מספר הפריטים להחזיר.
     * @param {number} offset - מספר הפריטים לדלג.
     * @returns {Promise<object>} - אובייקט עם מערך של מיקומים וסך הכל המיקומים של המשתמש.
     */
    static async getByUserIdPaginated(userId, limit, offset) {
        try {
            // קבלת סך כל המיקומים עבור המשתמש
            const [totalRows] = await db.execute(
                `SELECT COUNT(*) AS totalCount FROM locations WHERE user_id = ? AND is_deleted = false`,
                [userId]
            );
            const totalCount = totalRows[0].totalCount;

            // שליפת המיקומים עם פגינציה
            const sql = `
                SELECT
                    l.id, l.name, l.lat, l.lng, l.description, l.images, l.like_count, l.comment_count, l.created_at, l.country, l.area, l.city,
                    c.name AS category_name, u.name AS user_name, l.user_id AS firebase_uid, c.id AS category_id
                FROM
                    locations l
                LEFT JOIN
                    categories c ON l.category_id = c.id
                LEFT JOIN
                    users u ON l.user_id = u.firebase_uid
                WHERE l.user_id = ? AND l.is_deleted = false
                ORDER BY l.created_at DESC
                LIMIT ? OFFSET ?
            `;
            const [rows] = await db.execute(sql, [userId, limit, offset]);

            const locations = rows.map(row => ({
                ...row,
                images: safeJsonParseArray(row.images),
                created_at: row.created_at ? new Date(row.created_at).toISOString() : null
            }));

            return { locations, totalCount };
        } catch (error) {
            console.error('Error fetching locations by user ID:', error);
            throw error;
        }
    }

    /**
     * שיטה לעדכון מיקום קיים.
     * @param {number} id - מזהה המיקום.
     * @param {object} locationData - הנתונים לעדכון.
     * @returns {Promise<number>} - מספר השורות שהושפעו (1 אם העדכון הצליח, 0 אחרת).
     */
    static async update(id, locationData) {
        const allowedFields = ['name', 'description', 'images', 'category_id', 'country', 'area', 'city', 'lat', 'lng'];
        const fields = [];
        const values = [];

        for (const key in locationData) {
            if (locationData.hasOwnProperty(key) && allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                const value = key === 'images' ? JSON.stringify(locationData[key]) : locationData[key];
                values.push(value);
            }
        }

        if (fields.length === 0) return 0;

        const sql = `UPDATE locations SET ${fields.join(', ')} WHERE id = ? AND is_deleted = false`;
        values.push(id);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    /**
     * מחיקה רכה (רק שינוי is_deleted ל-true).
     * @param {number} id - מזהה המיקום.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async softDelete(id) {
        const sql = `UPDATE locations SET is_deleted = true WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    /**
     * מחיקה לצמיתות של מיקום מה-DB.
     * @param {number} id - מזהה המיקום.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async delete(id) {
        const sql = `DELETE FROM locations WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    /**
     * הפונקציה בודקת אם משתמש מסוים הוא הבעלים של המיקום.
     * @param {number} locationId - מזהה המיקום.
     * @param {string} userId - ה-UID של המשתמש.
     * @returns {Promise<boolean>} - true אם המשתמש הוא הבעלים, false אחרת.
     */
    static async isOwner(locationId, userId) {
        try {
            const [rows] = await db.query('SELECT user_id FROM locations WHERE id = ? AND is_deleted = false', [locationId]);
            if (rows.length === 0) {
                return false;
            }
            return rows[0].user_id === userId;
        } catch (error) {
            console.error('Error checking location ownership:', error);
            throw error;
        }
    }

    /**
     * שיטה לעדכון מונה לייקים (הגדלה).
     * @param {number} locationId - מזהה המיקום.
     * @param {number} amount - הכמות להגדיל (ברירת מחדל 1).
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async incrementLikeCount(locationId, amount = 1) {
        const sql = `UPDATE locations SET like_count = like_count + ? WHERE id = ? AND is_deleted = false`;
        const [result] = await db.execute(sql, [amount, locationId]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה לייקים (הקטנה).
     * @param {number} locationId - מזהה המיקום.
     * @param {number} amount - הכמות להפחית (ברירת מחדל 1).
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async decrementLikeCount(locationId, amount = 1) {
        const sql = `UPDATE locations SET like_count = like_count - ? WHERE id = ? AND like_count > 0 AND is_deleted = false`;
        const [result] = await db.execute(sql, [amount, locationId]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה תגובות.
     * @param {number} locationId - מזהה המיקום.
     * @param {number} amount - כמות ההגדלה/הקטנה.
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async updateCommentCount(locationId, amount) {
        const sql = `UPDATE locations SET comment_count = comment_count + ? WHERE id = ? AND is_deleted = false`;
        const [result] = await db.execute(sql, [amount, locationId]);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה צפיות.
     * @param {number} id - מזהה המיקום.
     */
    static async incrementViewCount(id) {
        const sql = `UPDATE locations SET view_count = view_count + 1 WHERE id = ? AND is_deleted = false`;
        await db.execute(sql, [id]);
    }

    /**
     * שיטה לחיפוש מיקומים לפי מגוון קריטריונים.
     * @param {object} options - אובייקט המכיל פרמטרים לסינון.
     * @returns {Promise<object>} - אובייקט עם מערך של פריטים וסך כל הפריטים.
     */
    static async findLocations({ name, category, lat, lng, radius, country, area, city, limit, offset, sortBy, sortOrder, date_start, date_end }) {
        let whereClause = `WHERE l.is_deleted = false`;
        const params = [];

        // Filters
        if (name) {
            whereClause += ` AND l.name LIKE ?`;
            params.push(`%${name}%`);
        }
        if (category) {
            whereClause += ` AND c.name LIKE ?`;
            params.push(`%${category}%`);
        }
        if (country) {
            whereClause += ` AND l.country LIKE ?`;
            params.push(`%${country}%`);
        }
        if (area) {
            whereClause += ` AND l.area LIKE ?`;
            params.push(`%${area}%`);
        }
        if (city) {
            whereClause += ` AND l.city LIKE ?`;
            params.push(`%${city}%`);
        }
        if (lat && lng && radius) {
            whereClause += `
        AND (
          6371 * ACOS(
            COS(RADIANS(?)) * COS(RADIANS(l.lat)) *
            COS(RADIANS(l.lng) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(l.lat))
          )
        ) <= ?
      `;
            params.push(parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius));
        }

        if (date_start && date_end) {
            whereClause += ` AND l.created_at BETWEEN ? AND ?`;
            params.push(date_start, date_end + ' 23:59:59');
        }

        // Sorting
        let orderByClause = `ORDER BY l.created_at DESC`;
        if (sortBy) {
            orderByClause = `ORDER BY l.${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
        }

        // Main query with pagination
        const sql = `
      SELECT
          l.id, l.name, l.lat, l.lng, l.description, l.images, l.like_count, l.comment_count, l.created_at, l.country, l.area, l.city,
          c.name AS category_name, u.name AS user_name, l.user_id AS firebase_uid, c.id AS category_id
      FROM
          locations l
      LEFT JOIN
          categories c ON l.category_id = c.id
      LEFT JOIN
          users u ON l.user_id = u.firebase_uid
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

        const [rows] = await db.execute(sql, [...params, limit, offset]);

        // Count all rows matching the criteria for pagination
        const countSql = `SELECT COUNT(*) AS totalCount FROM locations l LEFT JOIN categories c ON l.category_id = c.id LEFT JOIN users u ON l.user_id = u.firebase_uid ${whereClause}`;
        const [countRows] = await db.execute(countSql, params);
        const totalCount = countRows[0].totalCount;

        const locations = rows.map(row => ({
            ...row,
            images: safeJsonParseArray(row.images),
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        }));

        return { items: locations, totalCount };
    }

    /**
     * מעלה את מונה הצפיות של מיקום.
     * @param {number} id - מזהה המיקום.
     * @returns {Promise<number|null>} - מונה הצפיות החדש או null אם לא נמצא.
     */
    static async incrementViewCount(id) {
        const sql = `UPDATE locations SET views = views + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);

        if (result.affectedRows === 0) {
            return null;
        }

        // לאחר העדכון, נקבל את הערך החדש
        const [rows] = await db.execute('SELECT views FROM locations WHERE id = ?', [id]);

        return rows[0].views;
    }
}

module.exports = Location;
