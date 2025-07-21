// src/controllers/statsController.js
const Stats = require('../models/Stats'); // ודא שנתיב זה נכון לקובץ המודל שלך

const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await Stats.getTotalUsers();
        const totalLocations = await Stats.getTotalLocations();
        const totalPosts = await Stats.getTotalPosts();
        const totalDrafts = await Stats.getTotalDrafts();
        const totalLogs = await Stats.getTotalLogs();
        const totalUserActions = await Stats.getTotalUserActions();

        const locationsByCategory = await Stats.getLocationsByCategory();
        const postsByCategory = await Stats.getPostsByCategory();
        const reportsByStatus = await Stats.getReportsByStatus();
        const actionsByType = await Stats.getActionsByType();
        
        res.status(200).json({
            totalUsers,
            totalLocations,
            totalPosts,
            totalDrafts,
            totalLogs,
            totalUserActions,
            locationsByCategory,
            postsByCategory,
            reportsByStatus,
            actionsByType
        });

    } catch (error) {
        console.error('Error fetching admin statistics:', error);
        res.status(500).json({ error: 'Failed to retrieve statistics.' });
    }
};

module.exports = {
    getAdminStats
};