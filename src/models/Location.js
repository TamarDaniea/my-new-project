
const { pool } = require('../utils/db');

class Location {
    static async getAll() {
        try {
            const [rows] = await pool.query('SELECT * FROM locations');
            return rows;
        } catch (error) {
            console.error('Error fetching locations:', error);
            throw error;
        }
    }

    static async create(locationData) {
        try {
            const { name, category_id, lat, lng, description, images, user_id } = locationData;
            const [result] = await pool.execute(
                'INSERT INTO locations (name, category_id, lat, lng, description, images, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [name, category_id, lat, lng, description, images, user_id]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating location:', error);
            throw error;
        }
    }
    // You will add more methods here (e.g., getById, update, delete)
}

module.exports = Location;