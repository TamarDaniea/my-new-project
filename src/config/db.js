// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

// Database connection configuration
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // שנה/י זאת לסיסמת מסד הנתונים שלך
    database: process.env.DB_NAME || 'shalom_platform_db', // שנה/י זאת לשם מסד הנתונים שלך
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

// Test the database connection
async function connectToDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to MySQL database!');
        connection.release(); // Release the connection back to the pool
    } catch (error) {
        console.error('Failed to connect to MySQL database:', error.message);
        // Optionally, exit the process if critical database connection fails
        // process.exit(1);
    }
}

// Call the function to connect to the database when this module is loaded
connectToDatabase();

module.exports = pool;