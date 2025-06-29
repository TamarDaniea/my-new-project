// db/run-migrations.js
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db'); // שינוי כאן // ודא/י שהנתיב לקובץ ה-db config נכון

const migrationsDir = __dirname; // תיקיית המגרציות היא התיקייה הנוכחית (db)

async function runMigrations() {
    try {
        console.log('Starting migrations...');

        const files = fs.readdirSync(migrationsDir)
                        .filter(file => file.endsWith('.sql'))
                        .sort(); // ודא/י שהקבצים מסודרים לפי שם (שכולל תאריך)

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running migration: ${file}`);
            await db.query(sql); // db.query יכול להריץ מספר פקודות בבת אחת אם הן מופרדות בנקודה-פסיק
            console.log(`Successfully ran ${file}`);
        }

        console.log('All migrations completed successfully.');
    } catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1); // צאי עם שגיאה אם משהו השתבש
    } finally {
        if (db.end) { // סגור את החיבור למסד הנתונים אם יש פונקציה כזו
            db.end();
        }
    }
}

runMigrations();