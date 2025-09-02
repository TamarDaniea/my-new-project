const db = require('../config/db');

class Category {
    static async getAll(type) {
        let sql = `SELECT * FROM categories`;
        const params = [];

        if (type) { // טיפול בפילטרציה
            sql += ` WHERE type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY name ASC`;
        const [rows] = await db.execute(sql, params);
        return rows;
    }

    // שאר הפונקציות נשארות כפי שהן
    static async getById(id) {
        const sql = `SELECT * FROM categories WHERE id = ?`;
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }

    static async create(categoryData) {
        const { name, type } = categoryData; // שינוי: קליטה רק של name ו-type, כפי שנדרש בקוד הלקוח
        const sql = `INSERT INTO categories (name, type) VALUES (?, ?)`;
        const [result] = await db.execute(sql, [name, type]);
        return {
            id: result.insertId,
            name,
            type
        };
    }

    static async update(id, categoryData) {
        const { name, type } = categoryData; // שינוי: קליטה רק של name ו-type
        const sql = `UPDATE categories SET name = ?, type = ? WHERE id = ?`;
        const [result] = await db.execute(sql, [name, type, id]);
        return result.affectedRows;
    }

    static async delete(id) {
        const sql = `DELETE FROM categories WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }
}

module.exports = Category;