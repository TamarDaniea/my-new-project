// src/models/Vote.js
const db = require('../config/db');

const Vote = {
    /**
     * פונקציית UPSERT לדירוג.
     * מטפלת בהוספה, עדכון או מחיקה של הצבעה, בהתאם לדרישות הספציפיות.
     *
     * @param {object} voteData - הנתונים של ההצבעה.
     * @param {string} voteData.user_id - מזהה המשתמש.
     * @param {string} voteData.item_type - 'post' או 'location'.
     * @param {number} voteData.item_id - ה-ID של הפריט.
     * @param {number} voteData.value - ערך ההצבעה (1 ללייק, -1 לדיסלייק, 0 לביטול).
     * @returns {Promise<{action: string, delta_like_count: number}>}
     */
    upsert: async (voteData) => {
        const { user_id, item_type, item_id, value } = voteData;
        let delta_like_count = 0; // השינוי במונה הלייקים של הפריט
        let action = 'no_action'; // ברירת מחדל: אין פעולה

        console.log(`[Vote.upsert] Called with: user_id=${user_id}, item_type=${item_type}, item_id=${item_id}, value=${value}`);

        // 1. ננסה למצוא הצבעה קיימת של המשתמש עבור הפריט
        const existingVote = await Vote.getByUserItem(user_id, item_type, item_id);
        console.log(`[Vote.upsert] Existing vote: ${existingVote ? JSON.stringify(existingVote) : 'None'}`);

        if (value === 0) {
            // תרחיש: המשתמש רוצה לבטל הצבעה קיימת (אם יש כזו)
            if (existingVote) {
                console.log(`[Vote.upsert] Value is 0 and existing vote (${existingVote.value}) found. Deleting vote.`);
                const deletedRows = await Vote.delete(user_id, item_type, item_id);
                if (deletedRows > 0) {
                    delta_like_count = -existingVote.value; // הפוך את הערך הקיים כדי להוריד אותו מהמונה
                    action = 'deleted';
                }
            } else {
                console.log(`[Vote.upsert] Value is 0, but no existing vote. No action.`);
                action = 'no_action'; // ניסיון לבטל הצבעה שאינה קיימת - אין מה לעשות
            }
        } else if (value === 1) {
            // תרחיש: המשתמש רוצה לייק
            if (existingVote) {
                if (existingVote.value === 1) {
                    // המשתמש לחץ שוב על לייק - ביטול הלייק הקיים
                    console.log(`[Vote.upsert] Existing vote is 1 (like) and new value is 1 (like). Deleting existing vote.`);
                    const deletedRows = await Vote.delete(user_id, item_type, item_id);
                    if (deletedRows > 0) {
                        delta_like_count = -1; // לייק בוטל, לכן נוריד 1 מהמונה
                        action = 'deleted';
                    }
                } else if (existingVote.value === -1) {
                    // המשתמש לחץ לייק כשיש דיסלייק - שינוי מדיסלייק ללייק
                    console.log(`[Vote.upsert] Existing vote is -1 (dislike) and new value is 1 (like). Updating to like.`);
                    const [updateResult] = await db.query(
                        'UPDATE votes SET value = ? WHERE user_id = ? AND item_type = ? AND item_id = ?',
                        [value, user_id, item_type, item_id]
                    );
                    if (updateResult.affectedRows > 0) {
                        delta_like_count = 2; // מ-(-1) ל-1, שינוי של 2
                        action = 'updated';
                    }
                }
            } else {
                // אין הצבעה קיימת - הוספת לייק חדש
                console.log(`[Vote.upsert] No existing vote, new value is 1 (like). Inserting new vote.`);
                const [insertResult] = await db.query(
                    'INSERT INTO votes (user_id, item_type, item_id, value) VALUES (?, ?, ?, ?)',
                    [user_id, item_type, item_id, value]
                );
                if (insertResult.insertId) {
                    delta_like_count = 1; // לייק חדש, המונה עולה ב-1
                    action = 'inserted';
                }
            }
        } else if (value === -1) {
            // תרחיש: המשתמש רוצה דיסלייק
            if (existingVote) {
                if (existingVote.value === -1) {
                    // המשתמש לחץ שוב על דיסלייק - ביטול הדיסלייק הקיים
                    console.log(`[Vote.upsert] Existing vote is -1 (dislike) and new value is -1 (dislike). Deleting existing vote.`);
                    const deletedRows = await Vote.delete(user_id, item_type, item_id);
                    if (deletedRows > 0) {
                        delta_like_count = 1; // דיסלייק בוטל, לכן נעלה 1 למונה
                        action = 'deleted';
                    }
                } else if (existingVote.value === 1) {
                    // המשתמש לחץ דיסלייק כשיש לייק - שינוי מלייק לדיסלייק
                    console.log(`[Vote.upsert] Existing vote is 1 (like) and new value is -1 (dislike). Updating to dislike.`);
                    const [updateResult] = await db.query(
                        'UPDATE votes SET value = ? WHERE user_id = ? AND item_type = ? AND item_id = ?',
                        [value, user_id, item_type, item_id]
                    );
                    if (updateResult.affectedRows > 0) {
                        delta_like_count = -2; // מ-1 ל-(-1), שינוי של -2
                        action = 'updated';
                    }
                }
            } else {
                // אין הצבעה קיימת - הוספת דיסלייק חדש
                console.log(`[Vote.upsert] No existing vote, new value is -1 (dislike). Inserting new vote.`);
                const [insertResult] = await db.query(
                    'INSERT INTO votes (user_id, item_type, item_id, value) VALUES (?, ?, ?, ?)',
                    [user_id, item_type, item_id, value]
                );
                if (insertResult.insertId) {
                    delta_like_count = -1; // דיסלייק חדש, המונה יורד ב-1
                    action = 'inserted';
                }
            }
        }
        
        console.log(`[Vote.upsert] Finished. Action: ${action}, Delta: ${delta_like_count}`);
        return { action, delta_like_count };
    },

    // פונקציה להסרת דירוג (נקראת מתוך upsert)
    delete: async (user_id, item_type, item_id) => {
        console.log(`[Vote.delete] Attempting to delete vote for user_id: ${user_id}, item_type: ${item_type}, item_id: ${item_id}`);
        const [result] = await db.query(
            'DELETE FROM votes WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [user_id, item_type, item_id]
        );
        console.log(`[Vote.delete] Delete operation affected rows: ${result.affectedRows}`);
        return result.affectedRows;
    },

    // פונקציה לקבלת דירוג קיים עבור משתמש ופריט ספציפיים
    getByUserItem: async (user_id, item_type, item_id) => {
        const [rows] = await db.query(
            'SELECT * FROM votes WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [user_id, item_type, item_id]
        );
        // console.log(`[Vote.getByUserItem] Result:`, rows[0]); // ניתן להפעיל לדיבוג במידת הצורך
        return rows[0];
    }
};

module.exports = Vote;