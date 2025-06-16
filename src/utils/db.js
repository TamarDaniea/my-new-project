const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function connectToDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database!');
        connection.release();
        return pool;
    } catch (error) {
        console.error('Error connecting to database:', error);
        // process.exit(1); // Consider exiting only if critical, otherwise handle gracefully
    }
}

module.exports = {
    connectToDatabase,
    pool
};