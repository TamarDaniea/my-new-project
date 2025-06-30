// db/run-migrations.js
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const migrationsDir = path.join(__dirname, 'migrations'); // ✔️ מצביע על db/migrations

async function runMigrations() {
    console.log('Starting migrations...');

    try {
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log('Found migration files:', files); // ✔️ לראות אילו קבצים נמצאו

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running migration: ${file}`);
            await db.query(sql); 
            console.log(`Successfully ran ${file}`);
        }

        console.log('All migrations completed successfully.');
    } catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    } finally {
        if (db.end) {
            await db.end();
            console.log('Database connection closed.');
        }
    }
}

runMigrations();
