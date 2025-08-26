// src/models/User.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון
const bcrypt = require('bcryptjs');


class User {
    static async create(userData) {
        const { firebase_uid, name, email, password, role, city, created_at } = userData;
        const createdAt = created_at || new Date();

        const sql = `
        INSERT INTO users (firebase_uid, name, email, password, role, city, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [firebase_uid, name, email, password, role || 'user', city || null, createdAt];

        try {
            const [result] = await db.execute(sql, values);
            return {
                firebase_uid,
                name,
                email,
                role: role || 'user',
                city: city || null,
                created_at: createdAt.toISOString()
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('User with this email or UID already exists');
            }
            throw error;
        }
    }

    /**
     * מקבל משתמש לפי firebase_uid.
     * @param {string} firebaseUid - ה-UID של המשתמש מ-Firebase.
     * @returns {Promise<object|null>} - אובייקט המשתמש או null אם לא נמצא.
     */
    static async getById(firebaseUid) {
        try {
            const sql = `
                SELECT 
                    firebase_uid, 
                    name, 
                    email, 
                    role, 
                    city, 
                    created_at 
                FROM 
                    users 
                WHERE 
                    firebase_uid = ?
            `;
            const [rows] = await db.execute(sql, [firebaseUid]);
            if (rows.length > 0) {
                return {
                    ...rows[0],
                    created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : null
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }

    /**
     * מקבל נתונים ציבוריים של משתמש, כולל פוסטים ומקומות שהוסיף, ופוסטים ומקומות שסימן כמועדפים.
     * @param {string} firebaseUid - ה-UID של המשתמש מ-Firebase.
     * @returns {Promise<object|null>} - אובייקט עם פרטי פרופיל ציבוריים, פוסטים ומקומות, או null אם המשתמש לא נמצא.
     */
    static async getPublicProfileData(firebaseUid) {
        try {
            // שליפת פרטי המשתמש הציבוריים
            const userSql = `
                SELECT 
                    firebase_uid, 
                    name, 
                    city, 
                    created_at 
                FROM 
                    users 
                WHERE 
                    firebase_uid = ?
            `;
            const [userRows] = await db.execute(userSql, [firebaseUid]);
            if (userRows.length === 0) {
                return null; // המשתמש לא נמצא
            }
            const user = {
                ...userRows[0],
                created_at: userRows[0].created_at ? new Date(userRows[0].created_at).toISOString() : null
            };

            // שליפת פוסטים שהמשתמש יצר 
            const postsSql = `
                SELECT 
                    id, title, content, images, created_at, location_id, like_count, comment_count
                FROM 
                    posts 
                WHERE 
                    user_id = ? AND is_deleted = FALSE
                ORDER BY 
                    created_at DESC
            `;
            const [posts] = await db.execute(postsSql, [firebaseUid]);

            // שליפת מקומות שהמשתמש יצר 
            const locationsSql = `
                SELECT 
                    id, name, description, images, lat, lng, created_at, category_id, like_count, comment_count
                FROM 
                    locations 
                WHERE 
                    user_id = ? AND is_deleted = FALSE
                ORDER BY 
                    created_at DESC
            `;
            const [locations] = await db.execute(locationsSql, [firebaseUid]);

            // *** הוספה חדשה: שליפת פוסטים מועדפים ***
            const favoritedPostsSql = `
                SELECT 
                    p.id, p.title, p.content, p.images, p.created_at, p.location_id, p.like_count, p.comment_count
                FROM 
                    posts p
                JOIN 
                    favorites f ON p.id = f.item_id
                WHERE 
                    f.user_id = ? AND f.item_type = 'post' AND p.is_deleted = FALSE
                -- אין עמודת created_at בטבלת favorites, לכן אין מיון לפי f.created_at
            `;
            const [favoritedPosts] = await db.execute(favoritedPostsSql, [firebaseUid]);

            // *** הוספה חדשה: שליפת מקומות מועדפים ***
            const favoritedLocationsSql = `
                SELECT 
                    l.id, l.name, l.description, l.images, l.lat, l.lng, l.created_at, l.category_id, l.like_count, l.comment_count
                FROM 
                    locations l
                JOIN 
                    favorites f ON l.id = f.item_id
                WHERE 
                    f.user_id = ? AND f.item_type = 'location' AND l.is_deleted = FALSE
                -- אין עמודת created_at בטבלת favorites, לכן אין מיון לפי f.created_at
            `;
            const [favoritedLocations] = await db.execute(favoritedLocationsSql, [firebaseUid]);


            return {
                user: user,
                posts: posts.map(post => ({
                    ...post,
                    images: post.images ? JSON.parse(post.images) : null,
                    created_at: post.created_at ? new Date(post.created_at).toISOString() : null
                })),
                locations: locations.map(location => ({
                    ...location,
                    images: location.images ? JSON.parse(location.images) : null,
                    created_at: location.created_at ? new Date(location.created_at).toISOString() : null
                })),
                favoritedPosts: favoritedPosts.map(post => ({ // הוספה חדשה
                    ...post,
                    images: post.images ? JSON.parse(post.images) : null,
                    created_at: post.created_at ? new Date(post.created_at).toISOString() : null
                })),
                favoritedLocations: favoritedLocations.map(location => ({ // הוספה חדשה
                    ...location,
                    images: location.images ? JSON.parse(location.images) : null,
                    created_at: location.created_at ? new Date(location.created_at).toISOString() : null
                }))
            };

        } catch (error) {
            console.error('Error fetching public profile data:', error);
            throw error;
        }
    }


    static async update(firebaseUid, userData) {
        const fields = [];
        const values = [];
        for (const key in userData) {
            if (userData.hasOwnProperty(key) && key !== 'firebase_uid') {
                fields.push(`${key} = ?`);
                values.push(userData[key]);
            }
        }
        if (fields.length === 0) return 0;

        const sql = `UPDATE users SET ${fields.join(', ')} WHERE firebase_uid = ?`;
        values.push(firebaseUid);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    static async delete(firebaseUid) {
        const sql = `DELETE FROM users WHERE firebase_uid = ?`;
        const [result] = await db.execute(sql, [firebaseUid]);
        return result.affectedRows;
    }

    static async getAll() {
        const sql = `SELECT firebase_uid, name, email, role, city, created_at FROM users ORDER BY created_at DESC`;
        const [rows] = await db.execute(sql);
        return rows.map(row => ({
            ...row,
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        }));
    }
    static async search(query) {
        const sql = `
        SELECT firebase_uid, name, email, role, city, created_at
        FROM users
        WHERE name LIKE ? OR email LIKE ?
        LIMIT 20
    `;
        // השתמש ב-% עבור חיפוש LIKE מלא
        const [rows] = await db.execute(sql, [`%${query}%`, `%${query}%`]);
        return rows.map(row => ({
            ...row,
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        }));

    }

    static async findOne({ where }) {
        const { email } = where;
        const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
        const [rows] = await db.execute(sql, [email]);
        if (rows.length === 0) return null;
        return rows[0]; // מחזיר את השורה הראשונה
    }

    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;