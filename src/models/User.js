// src/models/User.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

class User {
    static async create(userData) {
        const { firebase_uid, name, email, role, city } = userData;
        const created_at = new Date();
        const sql = `
            INSERT INTO users (firebase_uid, name, email, role, city, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [firebase_uid, name, email, role || 'user', city || null, created_at];
        try {
            const [result] = await db.execute(sql, values);
            return {
                firebase_uid,
                name,
                email,
                role: role || 'user',
                city: city || null,
                created_at: created_at.toISOString()
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
                // המר את created_at לפורמט ISO String אם קיים
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
       WHERE name = ? OR email = ?
        LIMIT 20
    `;
        const [rows] = await db.execute(sql, [query, query]);
        return rows;
    }


}

module.exports = User;