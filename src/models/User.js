// src/models/User.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

class User {
    // שיטה ליצירת משתמש חדש (בדרך כלל לאחר רישום דרך Firebase)
    static async create(userData) {
        const { firebase_uid, name, email, role } = userData;
        // הוספנו created_at כאן, מכיוון שזה שדה בסכמה 
        const created_at = new Date(); 
        const sql = `
            INSERT INTO users (firebase_uid, name, email, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [firebase_uid, name, email, role || 'user', created_at]; // Default role is 'user'
        try {
            const [result] = await db.execute(sql, values);
            // נחזיר את האובייקט המלא שנוצר, כולל created_at
            return { firebase_uid, name, email, role: role || 'user', created_at: created_at.toISOString() };
        } catch (error) {
            // טיפול בשגיאת כפילות (אם firebase_uid הוא UNIQUE KEY)
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('User with this email or UID already exists');
            }
            throw error;
        }
    }

    /**
     * שיטה לקבלת משתמש לפי firebase_uid (מזהה Firebase).
     * שינינו את השם מ-findByFirebaseUid ל-getById כדי להתאים לבקר.
     * @param {string} firebaseUid - מזהה Firebase של המשתמש.
     * @returns {Promise<object|null>} - אובייקט המשתמש או null אם לא נמצא.
     */
    static async getById(firebaseUid) { // שונה מ-findByFirebaseUid
        const sql = `SELECT firebase_uid, name, email, role, created_at FROM users WHERE firebase_uid = ?`;
        const [rows] = await db.execute(sql, [firebaseUid]);
        if (rows[0]) {
            return {
                ...rows[0],
                created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : null // לוודא פורמט עקבי
            };
        }
        return null;
    }

    // שיטה לעדכון פרטי משתמש
    static async update(firebaseUid, userData) {
        const fields = [];
        const values = [];
        for (const key in userData) {
            if (userData.hasOwnProperty(key)) {
                // לא נאפשר לעדכן את firebase_uid דרך פונקציית עדכון זו
                if (key === 'firebase_uid') continue; 
                fields.push(`${key} = ?`);
                values.push(userData[key]);
            }
        }
        if (fields.length === 0) return 0; // No fields to update

        const sql = `UPDATE users SET ${fields.join(', ')} WHERE firebase_uid = ?`;
        values.push(firebaseUid);
        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    // שיטה למחיקת משתמש
    static async delete(firebaseUid) {
        const sql = `DELETE FROM users WHERE firebase_uid = ?`;
        const [result] = await db.execute(sql, [firebaseUid]);
        return result.affectedRows;
    }

    // שיטה לקבלת כל המשתמשים (לשימוש אדמין)
    static async getAll() {
        const sql = `SELECT firebase_uid, name, email, role, created_at FROM users ORDER BY created_at DESC`;
        const [rows] = await db.execute(sql);
        // וודא/י ש-created_at מומר לפורמט ISO String
        return rows.map(row => ({
            ...row,
            created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        }));
    }
}

module.exports = User;