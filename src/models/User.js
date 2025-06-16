// src/models/User.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

class User {
    // שיטה ליצירת משתמש חדש (בדרך כלל לאחר רישום דרך Firebase)
    static async create(userData) {
        const { firebase_uid, name, email, role } = userData;
        const sql = `
            INSERT INTO users (firebase_uid, name, email, role)
            VALUES (?, ?, ?, ?)
        `;
        const values = [firebase_uid, name, email, role || 'user']; // Default role is 'user'
        const [result] = await db.execute(sql, values);
        return { firebase_uid, ...userData };
    }

    // שיטה לקבלת משתמש לפי firebase_uid (מזהה Firebase)
    static async findByFirebaseUid(firebaseUid) {
        const sql = `SELECT * FROM users WHERE firebase_uid = ?`;
        const [rows] = await db.execute(sql, [firebaseUid]);
        return rows[0];
    }

    // שיטה לקבלת משתמש לפי ID (אם תשתמש/י ב-ID אוטו-אינקרמנטלי בנוסף ל-Firebase UID)
    // בהתבסס על הסכמה, firebase_uid הוא ה-PK, אז findByFirebaseUid הוא המרכזי.
    // אם היית בוחר/ת ב-id אוטו-אינקרמנטלי כ-PK, היית צריך/ה לשנות את זה.
    // כרגע, נשתמש ב-findByFirebaseUid כשיטה העיקרית לזיהוי.

    // שיטה לעדכון פרטי משתמש
    static async update(firebaseUid, userData) {
        const fields = [];
        const values = [];
        for (const key in userData) {
            if (userData.hasOwnProperty(key)) {
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
        const sql = `SELECT * FROM users ORDER BY created_at DESC`;
        const [rows] = await db.execute(sql);
        return rows;
    }
}

module.exports = User;