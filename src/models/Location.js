const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

// פונקציות עזר לחישוב מרחק גאוגרפי (Haversine Formula) - מחוץ למחלקה
// למרות שהחישוב עצמו נעשה ב-SQL, הפונקציות האלה יכולות לשמש לבדיקה/הבנה
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// ניתן להשאיר את הפונקציה הזו כהערה או למחוק אם החישוב נעשה רק ב-SQL
/*
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}
*/

class Location {
    // שיטה ליצירת מיקום חדש
    static async create(locationData) {
        const { name, lat, lng, description, images, category_id, user_id } = locationData;
        const sql = `
            INSERT INTO locations (name, lat, lng, description, images, category_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, lat, lng, description, JSON.stringify(images), category_id, user_id];
        const [result] = await db.execute(sql, values);
        return { id: result.insertId, ...locationData };
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
                l.user_id AS firebase_uid
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
        return rows;
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
                l.user_id AS firebase_uid
            FROM
                locations l
            LEFT JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
            WHERE l.id = ?
        `;
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
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

    // שיטה למחיקת מיקום
    static async delete(id) {
        const sql = `DELETE FROM locations WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה לייקים (הוספת לייק)
    static async incrementLikeCount(locationId) {
        const sql = `UPDATE locations SET like_count = like_count + 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [locationId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה לייקים (הסרת לייק)
    static async decrementLikeCount(locationId) {
        const sql = `UPDATE locations SET like_count = like_count - 1 WHERE id = ? AND like_count > 0`;
        const [result] = await db.execute(sql, [locationId]);
        return result.affectedRows;
    }

    // שיטה לעדכון מונה תגובות (הוספת תגובה)
    static async incrementCommentCount(locationId) {
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
                l.user_id AS firebase_uid
            FROM
                locations l
            JOIN
                categories c ON l.category_id = c.id
            LEFT JOIN
                users u ON l.user_id = u.firebase_uid
            WHERE 1=1
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
        return rows;
    }
}

module.exports = Location;