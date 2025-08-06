const db = require('../config/db');

class ReportReason {
  static async getAll() {
    const sql = 'SELECT reason_key, description_he FROM report_reasons ORDER BY id ASC';
    const [rows] = await db.execute(sql);
    return rows;
  }
}

module.exports = ReportReason;
