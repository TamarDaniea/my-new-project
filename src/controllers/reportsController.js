const Report = require('../models/Report'); // נייבא את המודל, ניצור אחר כך

const createReport = async (req, res) => {
  try {
    const user_id = req.user.firebase_uid; // מזהה המשתמש מהמידלוואר
    const { item_type, item_id, reason } = req.body;

    if (!item_type || !item_id || !reason) {
      return res.status(400).json({ message: 'Missing required fields: item_type, item_id, reason' });
    }

    if (!['post', 'location'].includes(item_type)) {
      return res.status(400).json({ message: 'Invalid item_type, must be "post" or "location"' });
    }

    const reportId = await Report.create({ item_type, item_id, user_id, reason });
    return res.status(201).json({ message: 'Report created successfully', reportId });
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getReports = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: admin only' });
    }

    const reports = await Report.getAll();
    return res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createReport,
  getReports,
};
