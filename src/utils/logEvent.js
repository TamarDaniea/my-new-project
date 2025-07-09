const Log = require('../models/logs'); // שימי לב למסלול לפי מיקום הקובץ שלך

/**
 * רישום לוג כללי
 * @param {string} type - סוג הפעולה (לדוג' 'DELETE', 'REPORT')
 * @param {string} description - תיאור של מה קרה
 * @param {string|null} userId - מזהה המשתמש שביצע את הפעולה
 */
async function logEvent(type, description, userId = null) {
  try {
    await Log.create(type, description, userId);
  } catch (err) {
    console.error('Failed to log event:', err);
  }
}

module.exports = logEvent;
