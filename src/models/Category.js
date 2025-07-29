const db = require('../config/db');

class Category {
    static async getAll() {
        const sql = `SELECT * FROM categories ORDER BY name ASC`;
        const [rows] = await db.execute(sql);
        return rows;
    }

    static async getById(id) {
        const sql = `SELECT * FROM categories WHERE id = ?`;
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }

    static async create(categoryData) {
        const { name, name_he, image_url, type } = categoryData;
        const sql = `INSERT INTO categories (name, name_he, image_url, type) VALUES (?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [name, name_he, image_url, type]);
        return {
            id: result.insertId,
            name,
            name_he,
            image_url,
            type
        };
    }

    static async update(id, categoryData) {
        const { name, name_he, image_url, type } = categoryData;
        const sql = `UPDATE categories SET name = ?, name_he = ?, image_url = ?, type = ? WHERE id = ?`;
        const [result] = await db.execute(sql, [name, name_he, image_url, type, id]);
        return result.affectedRows;
    }

    static async delete(id) {
        const sql = `DELETE FROM categories WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }
}

module.exports = Category;
