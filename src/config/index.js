require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ADMIN_UID: process.env.ADMIN_UID
    },
    
};

module.exports = config;