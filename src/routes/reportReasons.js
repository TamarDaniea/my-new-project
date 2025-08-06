const express = require('express');
const router = express.Router();
const { getAllReportReasons } = require('../controllers/reportReasonController');

router.get('/', getAllReportReasons); // GET /report-reasons

module.exports = router;
