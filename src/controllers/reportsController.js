const Report = require('../models/Report');
const logEvent = require('../utils/logEvent');
const UserActions = require('../utils/UserActions');



const createReport = async (req, res) => {
  try {
    const user_id = req.user.firebase_uid;
    const { item_type, item_id, reason, category_id } = req.body;

    if (!item_type || !item_id || !reason) {
      return res.status(400).json({ message: req.t('reports.missing_fields') });
    }

    if (!['post', 'location'].includes(item_type)) {
      return res.status(400).json({ message: req.t('reports.invalid_item_type') });
    }

    const reportId = await Report.create({ item_type, item_id, user_id, reason , category_id});
    await logEvent(
      'CREATE',
      `User ${user_id} reported ${item_type} ${item_id} - reason: "${reason}"`,
      user_id
    );
    await UserActions.trackAction(
      req.user.firebase_uid,
      `report_${item_type}`, // post / location
      item_type,
      item_id
    );


    return res.status(201).json({ message: req.t('reports.create_success'), reportId });
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({ message: req.t('reports.create_error'), error: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: req.t('reports.access_denied') });
    }

    const reports = await Report.getAll();
    return res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ message: req.t('reports.fetch_error'), error: error.message });
  }
};

module.exports = {
  createReport,
  getReports,
};
