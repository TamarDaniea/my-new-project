const ReportReason = require('../models/ReportReason');

const getAllReportReasons = async (req, res) => {
  try {
    const reasons = await ReportReason.getAll();
    res.json({ reasons });
  } catch (error) {
    console.error('Error fetching report reasons:', error);
    res.status(500).json({ message: req.t('reports.fetch_reasons_error'), error: error.message });
  }
};

module.exports = {
  getAllReportReasons,
};
