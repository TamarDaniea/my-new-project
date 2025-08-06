// models/Location.js
const db = require('../config/db');

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
        const { name, lat, lng, description, images, category_id, user_id, country, area, city } = locationData; // NEW: Added country, area, city
        const sql = `
            INSERT INTO locations (name, lat, lng, description, images, category_id, user_id, like_count, comment_count, created_at, country, area, city)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), ?, ?, ?)
        `;
        const values = [name, lat, lng, description, JSON.stringify(images), category_id, user_id, country, area, city]; // NEW: Added country, area, city to values
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
                l.country, -- NEW
                l.area,    -- NEW
                l.city,    -- NEW
                c.name AS category_name,
                u.name AS user_name,
                l.user_id AS firebase_uid,
                c.id AS category_id
            FROM
                locations l
            LEFT JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
            WHERE l.is_deleted = false -- Ensure deleted locations are not returned by default
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
                l.country, -- NEW
                l.area,    -- NEW
                l.city,    -- NEW
                c.name AS category_name,
                u.name AS user_name,
                l.user_id AS firebase_uid,
                c.id AS category_id
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
        // NEW: Added country, area, city to allowedFields
        const allowedFields = ['name', 'description', 'images', 'category_id', 'country', 'area', 'city', 'lat', 'lng'];
        const fields = [];
        const values = [];

        for (const key in locationData) {
            if (
                locationData.hasOwnProperty(key) &&
                allowedFields.includes(key)
            ) {
                fields.push(`${key} = ?`);
                const value = key === 'images'
                    ? JSON.stringify(locationData[key])
                    : locationData[key];
                values.push(value);
            }
        }

        if (fields.length === 0) return 0; // אין שדות לעדכן

        const sql = `UPDATE locations SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`;
        values.push(id);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

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
        console.log(`Decremented like_count, affected rows: ${result.affectedRows}`);
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

    // שיטה לחיפוש מיקומים לפי שם, קטגוריה ו/או מרחק, וכעת גם לפי מדינה, אזור ועיר
    static async findLocations({ name, category, lat, lng, radius, country, area, city, rating_min, rating_max }) { // NEW: Added country, area, city, rating_min, rating_max
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
                l.country, -- NEW
                l.area,    -- NEW
                l.city,    -- NEW
                c.name AS category_name,
                u.name AS user_name,
                l.user_id AS firebase_uid,
                c.id AS category_id
                -- COALESCE(AVG(v.value), 0) AS average_rating -- If votes table is used for rating, uncomment
            FROM
                locations l
            LEFT JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
            -- LEFT JOIN votes v ON l.id = v.item_id AND v.item_type = 'location' -- If votes table is used for rating, uncomment
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

        // NEW: Add country filter
        if (country) {
            query += ` AND l.country LIKE ?`;
            params.push(`%${country}%`);
        }

        // NEW: Add area filter
        if (area) {
            query += ` AND l.area LIKE ?`;
            params.push(`%${area}%`);
        }

        // NEW: Add city filter
        if (city) {
            query += ` AND l.city LIKE ?`;
            params.push(`%${city}%`);
        }

        // --- חיפוש גאוגרפי ---
        if (lat && lng && radius) {
            query += `
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

        // NEW: Add rating filters (assuming a rating system based on `votes` table if implemented, or a new `rating` column)
        // This part requires your `votes` table to properly reflect a rating,
        // or you would need a dedicated `ratings` table or a `rating` column in `locations`.
        // For now, I'm providing a placeholder that *would* work if you had a direct `rating` column.
        // If you intend to use `votes` for this, you'd need GROUP BY and HAVING clauses.
        // Given your current `votes` table, calculating an average rating directly might be complex here.
        // Let's assume you'd add a `rating` column to `locations` for simplicity, or modify votes.
        // If using `votes` with `value` as the rating:
        // query += ` GROUP BY l.id`; // Add this line if you uncomment AVG(v.value)
        // if (rating_min || rating_max) {
        //     query += ` HAVING average_rating >= ? AND average_rating <= ?`;
        //     params.push(rating_min || 0, rating_max || 5); // Assuming rating is 0-5
        // }
        // For the sake of not overcomplicating with aggregate functions here,
        // if you only want to filter by category/city/country for now, keep it simple.
        // If you need actual rating filters, we would need to adjust the query significantly with GROUP BY and HAVING.
        // For this task, I'll only add the country/area/city filters.

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
    static async getLocationsByDate(start, end) {
        const endWithTime = end + ' 23:59:59';
        const [rows] = await db.execute(
            `SELECT * FROM locations WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC`,
            [start, endWithTime]
        );

        return rows;
    };

    static async incrementViewCount(id) {
        const sql = `UPDATE locations SET view_count = view_count + 1 WHERE id = ?`;
        await db.execute(sql, [id]);
    }

    static async findLocations({ name, category, lat, lng, radius, country, area, city, limit, offset }) {
        let query = `SELECT SQL_CALC_FOUND_ROWS * FROM locations WHERE 1=1`;
        const params = [];

        if (name) {
            query += ` AND name LIKE ?`;
            params.push(`%${name}%`);
        }
        if (category) {
            query += ` AND category_id = ?`;
            params.push(category);
        }
        if (country) {
            query += ` AND country LIKE ?`;
            params.push(`%${country}%`);
        }
        if (area) {
            query += ` AND area LIKE ?`;
            params.push(`%${area}%`);
        }
        if (city) {
            query += ` AND city LIKE ?`;
            params.push(`%${city}%`);
        }

        // אפשר להוסיף כאן חישוב מרחק לפי lat/lng/radius אם צריך

        query += ` ORDER BY created_at DESC`;

        if (limit !== undefined && offset !== undefined) {
            query += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);
        }

        const [rows] = await db.execute(query, params);
        const [[{ 'FOUND_ROWS()': totalCount }]] = await db.execute(`SELECT FOUND_ROWS()`);

        return { items: rows, totalCount };
    }
}

module.exports = Location;