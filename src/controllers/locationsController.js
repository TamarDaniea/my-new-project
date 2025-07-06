const Location = require('../models/Location');
const Comment = require('../models/Comment');
const db = require('../config/db');
const User = require('../models/User');
const { validationResult } = require('express-validator');


const locationsController = {
    // קבלת כל המיקומים וגם ביצוע חיפוש מיקומים
    // הפונקציה הזו תשרת את הראוט GET /locations
    searchLocations: async (req, res) => {
        try {
            // NEW: Added country, area, city to destructuring
            const { name, category, lat, lng, radius, country, area, city } = req.query;

            // בדיקת ולידציה בסיסית (ניתן להרחיב עם express-validator)
            if (radius && (!lat || !lng)) {
                return res.status(400).json({ message: 'Latitude and longitude are required when radius is provided.' });
            }
            if (radius && (isNaN(parseFloat(radius)) || parseFloat(radius) <= 0)) {
                return res.status(400).json({ message: 'Radius must be a positive number.' });
            }
            if ((lat || lng) && (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng)))) {
                return res.status(400).json({ message: 'Latitude and longitude must be valid numbers.' });
            }

            // קריאה לפונקציית החיפוש במודל Location
            // אם אין פרמטרים, findLocations תחזיר את הכל
            // NEW: Pass country, area, city to findLocations
            const locations = await Location.findLocations({ name, category, lat, lng, radius, country, area, city });

            res.status(200).json(locations);
        } catch (error) {
            console.error('Error fetching or searching locations:', error);
            res.status(500).json({ message: req.t('locations.fetch_error'), error: error.message });
        }
    },

    // יצירת מיקום חדש
    createLocation: async (req, res) => {
        try {
            const locationData = req.body;
            if (!req.user || !req.user.firebase_uid) {
                return res.status(401).json({ message: req.t('locations.unauthorized') });
            }

            locationData.user_id = req.user.firebase_uid;

            // NEW: Validate country, area, city if they are mandatory
            const { name, lat, lng, category_id, country, area, city } = locationData;
            if (!name || !lat || !lng || !category_id) { // Consider making country, area, city mandatory if needed
                return res.status(400).json({ message: req.t('locations.missing_fields') });
            }

            const [rows] = await db.query('SELECT id FROM categories WHERE id = ?', [category_id]);
            if (rows.length === 0) {
                return res.status(400).json({ message: req.t('locations.category_not_found') });
            }

            const newLocation = await Location.create(locationData);
            console.log(req.language)
            res.status(201).json({ message: req.t('locations.create_success'), location: newLocation });
        } catch (error) {
            console.error('Error creating location:', error);
            res.status(500).json({ message: req.t('locations.create_error'), error: error.message });
        }
    },

    // קבלת מיקום לפי ID
    getLocationById: async (req, res) => {
        try {
            const location = await Location.getById(req.params.id);
            if (!location) {
                return res.status(404).json({ message: req.t('locations.not_found') });
            }
            res.status(200).json(location);
        } catch (error) {
            console.error('Error fetching location by ID:', error);
            res.status(500).json({ message: req.t('locations.fetch_error'), error: error.message });
        }
    },
    getLocationsByDate: async (req, res) => {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ message: 'Missing start or end date' });
        }

        try {
            const locations = await Location.getLocationsByDate(start, end);
            res.status(200).json(locations);
        } catch (error) {
            console.error('Error fetching locations by date:', error);
            console.log('Error details:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // עדכון מיקום
    updateLocation: async (req, res) => {
        try {
            const locationId = req.params.id;
            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('locations.unauthorized') });
            }

            const user = await User.getById(userId);
            const isAdmin = user && user.role === 'admin';

            const isOwner = await Location.isOwner(locationId, userId);

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: req.t('locations.forbidden_update') });
            }

            const affectedRows = await Location.update(locationId, req.body);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('locations.not_found') });
            }

            res.status(200).json({ message: req.t('locations.update_success') });
        } catch (error) {
            console.error('Error updating location:', error);
            res.status(500).json({ message: req.t('locations.update_error'), error: error.message });
        }
    },

    deleteLocation: async (req, res) => {
        try {
            const locationId = req.params.id;
            const userId = req.user ? req.user.firebase_uid : null;

            if (!userId) {
                return res.status(401).json({ message: req.t('locations.unauthorized') });
            }

            const user = await User.getById(userId);
            const isAdmin = user && user.role === 'admin';
            const isOwner = await Location.isOwner(locationId, userId);

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: req.t('locations.forbidden_delete') });
            }

            let affectedRows;

            if (isAdmin) {
                affectedRows = await Location.softDelete(locationId);
            } else {
                affectedRows = await Location.delete(locationId);
            }

            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('locations.not_found') });
            }

            res.status(200).json({ message: req.t('locations.delete_success') });

        } catch (error) {
            console.error('Error deleting location:', error);
            res.status(500).json({ message: req.t('locations.delete_error'), error: error.message });
        }
    },
};

module.exports = locationsController;