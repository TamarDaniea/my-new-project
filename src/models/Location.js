// models/Location.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

// פונקציות עזר לחישוב מרחק גאוגרפי (Haversine Formula) - מחוץ למחלקה
// למרות שהחישוב עצמו נעשה ב-SQL, הפונקציות האלה יכולות לשמש לבדיקה/הבנה
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// פונקציית עזר לטיפול ב-JSON של תמונות, כמו ב-Post.js
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
    // שיטה ליצירת מיקום חדש
    static async create(locationData) {
        const { name, lat, lng, description, images, category_id, user_id } = locationData;
        const sql = `
            INSERT INTO locations (name, lat, lng, description, images, category_id, user_id, like_count, comment_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())
        `;
        const values = [name, lat, lng, description, JSON.stringify(images), category_id, user_id];
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...locationData, like_count: 0, comment_count: 0, created_at: new Date().toISOString() };
    }

    // שיטה לקבלת כל המיקומים (כולל קטגוריה ושם משתמש)
    // הערה: שיטה זו תוחלף ב-findLocations כאשר אין פרמטרי חיפוש
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
                l.user_id AS firebase_uid,
                c.id AS category_id -- הוסף/הוסיפי את ה-ID של הקטגוריה
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
        return rows.map(row => ({
            ...row,
            images: safeJsonParseArray(row.images), // המר/י את מחרוזת ה-JSON למערך
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null // ודא/י פורמט תאריך עקבי
        }));
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
                l.user_id AS firebase_uid,
                c.id AS category_id -- הוסף/הוסיפי את ה-ID של הקטגוריה
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
                images: safeJsonParseArray(rows[0].images), // המר/י את מחרוזת ה-JSON למערך
                created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : null // ודא/י פורמט תאריך עקבי
            };
        }
        return null;
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

    // שיטה למחיקת מיקום - נשארת כפי שהיא, יעילה בזכות הגדרות ה-DB
    static async delete(id) {
        const sql = `DELETE FROM locations WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    /**
     * פונקציה חדשה: בודקת אם משתמש מסוים הוא הבעלים של המיקום.
     * @param {number} locationId - מזהה המיקום.
     * @param {string} userId - ה-UID של המשתמש.
     * @returns {Promise<boolean>} - true אם המשתמש הוא הבעלים, false אחרת.
     */
    static async isOwner(locationId, userId) {
        try {
            const [rows] = await db.query('SELECT user_id FROM locations WHERE id = ?', [locationId]);
            if (rows.length === 0) {
                return false; // המיקום לא נמצא
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
        const sql = `UPDATE locations SET like_count = like_count + ? WHERE id = ?`;
        const [result] = await db.execute(sql, [amount, locationId]);
        console.log(`Incrementing like_count for location ID: ${locationId}, amount: ${amount}`);
        console.log(`Incremented like_count, affected rows: ${result.affectedRows}`);
        return result.affectedRows;
    }

    /**
     * שיטה לעדכון מונה לייקים (הקטנה).
     * @param {number} locationId - מזהה המיקום.
     * @param {number} amount - הכמות להפחית (ברירת מחדל 1).
     * @returns {Promise<number>} - מספר השורות שהושפעו.
     */
    static async decrementLikeCount(locationId, amount = 1) {
        const sql = `UPDATE locations SET like_count = like_count - ? WHERE id = ?`;
        const [result] = await db.execute(sql, [amount, locationId]);
        console.log(`Decrementing like_count for location ID: ${locationId}, amount: ${amount}`);
        console.console.log(`Decremented like_count, affected rows: ${result.affectedRows}`);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה תגובות (הוספת תגובה)
    static async incrementCommentCount(locationId, amount = 1) {
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

    // שיטה לחיפוש מיקומים לפי שם, קטגוריה ו/או מרחק
    static async findLocations({ name, category, lat, lng, radius }) {
        let query = `
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
                l.user_id AS firebase_uid,
                c.id AS category_id
            FROM
                locations l
            JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
             WHERE l.is_deleted = false
        `;
        const params = [];

        if (name) {
            query += ` AND l.name LIKE ?`;
            params.push(`%${name}%`);
        }

        if (category) {
            query += ` AND c.name LIKE ?`; // חיפוש לפי שם קטגוריה
            params.push(`%${category}%`);
        }

        // --- חיפוש גאוגרפי ---
        if (lat && lng && radius) {
            // חישוב מרחק באמצעות נוסחת Haversine ב-SQL
            // 6371 הוא רדיוס כדור הארץ בקילומטרים
            query += `
                AND (
                    6371 * ACOS(
                        COS(RADIANS(?)) * COS(RADIANS(l.lat)) *
                        COS(RADIANS(l.lng) - RADIANS(?)) +
                        SIN(RADIANS(?)) * SIN(RADIANS(l.lat))
                    )
                ) <= ?
            `;
            // הפרמטרים ל-Haversine: current_lat, current_lng, current_lat, radius
            params.push(parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius));
        }

        // אם לא סופקו פרמטרי חיפוש, נחזיר את כל המיקומים
        // אם כן, נמיין לפי תאריך יצירה (או לפי רלוונטיות אחרת)
        query += ` ORDER BY l.created_at DESC`;

        const [rows] = await db.execute(query, params);
        // המר/י את מחרוזת ה-JSON של images למערך עבור כל שורה
        return rows.map(row => ({
            ...row,
            images: safeJsonParseArray(row.images),
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        }));
    }
    // מחיקה רכה (רק שינוי is_deleted ל-true)
    static async softDelete(id) {
        const sql = `UPDATE locations SET is_deleted = true WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

}

module.exports = Location;