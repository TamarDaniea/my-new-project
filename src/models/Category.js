// src/models/Category.js
const db = require('../config/db'); // ודא/י שהנתיב לקובץ ה-db config נכון

class Category {
    // שיטה לקבלת כל הקטגוריות
    static async getAll() {
        const sql = `SELECT * FROM categories ORDER BY name ASC`;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // שיטה לקבלת קטגוריה לפי ID
    static async getById(id) {
        const sql = `SELECT * FROM categories WHERE id = ?`;
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }

    // שיטה ליצירת קטגוריה חדשה (לשימוש אדמין)
    static async create(categoryData) {
        const { name, type } = categoryData;
        const sql = `INSERT INTO categories (name, type) VALUES (?, ?)`;
        const [result] = await db.execute(sql, [name, type]);
        return { id: result.insertId, ...categoryData };
    }

    // שיטה לעדכון קטגוריה (לשימוש אדמין)
    static async update(id, categoryData) {
        const { name, type } = categoryData;
        const sql = `UPDATE categories SET name = ?, type = ? WHERE id = ?`;
        const [result] = await db.execute(sql, [name, type, id]);
        return result.affectedRows;
    }

    // שיטה למחיקת קטגוריה (לשימוש אדמין)
    static async delete(id) {
        const sql = `DELETE FROM categories WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }
}

module.exports = Category;