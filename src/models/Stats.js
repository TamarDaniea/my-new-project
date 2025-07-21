// src/models/Stats.js
const db = require('../config/db'); // ודא שנתיב זה נכון לקובץ הגדרות ה-DB שלך

class Stats {
    static async getTotalUsers() {
        const [rows] = await db.query('SELECT COUNT(*) AS totalUsers FROM users;');
        return rows[0].totalUsers;
    }

    static async getTotalLocations() {
        const [rows] = await db.query('SELECT COUNT(*) AS totalLocations FROM locations WHERE is_deleted = FALSE;');
        return rows[0].totalLocations;
    }

    static async getTotalPosts() {
        const [rows] = await db.query('SELECT COUNT(*) AS totalPosts FROM posts WHERE is_deleted = FALSE;');
        return rows[0].totalPosts;
    }

    static async getTotalDrafts() {
        const [rows] = await db.query('SELECT COUNT(*) AS totalDrafts FROM drafts;');
        return rows[0].totalDrafts;
    }

    static async getTotalLogs() {
        const [rows] = await db.query('SELECT COUNT(*) AS totalLogs FROM logs;');
        return rows[0].totalLogs;
    }

    static async getTotalUserActions() {
        const [rows] = await db.query('SELECT COUNT(*) AS totalUserActions FROM user_actions;');
        return rows[0].totalUserActions;
    }

    static async getLocationsByCategory() {
        const [rows] = await db.query(`
            SELECT c.name AS categoryName, COUNT(l.id) AS count
            FROM locations l
            JOIN categories c ON l.category_id = c.id
            WHERE l.is_deleted = FALSE
            GROUP BY c.name
            ORDER BY count DESC;
        `);
        return rows;
    }

    static async getPostsByCategory() {
        const [rows] = await db.query(`
            SELECT c.name AS categoryName, COUNT(p.id) AS count
            FROM posts p
            JOIN categories c ON p.category_id = c.id
            WHERE p.is_deleted = FALSE
            GROUP BY c.name
            ORDER BY count DESC;
        `);
        return rows;
    }

    static async getReportsByStatus() {
        const [rows] = await db.query(`
            SELECT status, COUNT(*) AS count
            FROM reports
            GROUP BY status;
        `);
        // עיבוד לפורמט נוח יותר
        return rows.reduce((acc, row) => {
            acc[row.status] = row.count;
            return acc;
        }, { open: 0, closed: 0, rejected: 0 });
    }

    static async getActionsByType() {
        const [rows] = await db.query(`
            SELECT action, COUNT(*) AS count
            FROM user_actions
            GROUP BY action
            ORDER BY count DESC;
        `);
        return rows;
    }
}

module.exports = Stats;