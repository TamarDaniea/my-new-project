const Location = require('../models/Location');
const Comment = require('../models/Comment'); // נצטרך את זה לטובת תגובות למיקומים אם יתווסף
// ניתן להוסיף את express-validator לולידציה חזקה יותר:
const { validationResult } = require('express-validator');
const db = require('../config/db'); // זה נשאר כי הוא בשימוש

const locationsController = {
    // קבלת כל המיקומים וגם ביצוע חיפוש מיקומים
    // הפונקציה הזו תשרת את הראוט GET /locations
    searchLocations: async (req, res) => {
        try {
            const { name, category, lat, lng, radius } = req.query;

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
            const locations = await Location.findLocations({ name, category, lat, lng, radius });

            res.status(200).json(locations);
        } catch (error) {
            console.error('Error fetching or searching locations:', error);
            res.status(500).json({ message: req.t('locations.fetch_error'), error: error.message }); // נבחר בגרסת התרגום
        }
    },

    // יצירת מיקום חדש
    createLocation: async (req, res) => {
        try {
            const locationData = req.body;
            // הוספת user_id (מזהה משתמש) מהטוקן המאומת אם קיים middleware אימות
            // נניח ש-req.user.firebase_uid זמין אם משתמש מאומת.
            // ה-API מאפשר למשתמשים לתרום מיקומים ופוסטים קהילתיים.

            if (!req.user || !req.user.firebase_uid) {
                return res.status(401).json({ message: req.t('locations.unauthorized') });
            }

            locationData.user_id = req.user.firebase_uid;

            const { name, lat, lng, category_id } = locationData;
            if (!name || !lat || !lng || !category_id) {
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

    // עדכון מיקום
    updateLocation: async (req, res) => {
        try {
            const affectedRows = await Location.update(req.params.id, req.body);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('locations.not_found') });
            }

            res.status(200).json({ message: req.t('locations.update_success') });
        } catch (error) {
            console.error('Error updating location:', error);
            res.status(500).json({ message: req.t('locations.update_error'), error: error.message });
        }
    },

    // מחיקת מיקום
    deleteLocation: async (req, res) => {
        try {
            const affectedRows = await Location.delete(req.params.id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('locations.not_found') });
            }
            res.status(200).json({ message: req.t('locations.delete_success') });
        } catch (error) {
            console.error('Error deleting location:', error);
            res.status(500).json({ message: req.t('locations.delete_error'), error: error.message }); // נבחר בגרסת התרגום
        }
    },

    // הוספת לייק למיקום (מעדכן מונה בלבד)
    addLikeToLocation: async (req, res) => {
        try {
            const { locationId } = req.params;
            const affectedRows = await Location.incrementLikeCount(locationId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('locations.not_found') });
            }
            res.status(200).json({ message: req.t('locations.like_added') });
        } catch (error) {
            console.error('Error adding like to location:', error);
            res.status(500).json({ message: req.t('locations.like_add_error'), error: error.message });
        }
    },

    // הסרת לייק ממיקום (מעדכן מונה בלבד)
    removeLikeFromLocation: async (req, res) => {
        try {
            const { locationId } = req.params;
            const affectedRows = await Location.decrementLikeCount(locationId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('locations.like_remove_error') });
            }
            res.status(200).json({ message: req.t('locations.like_removed') });
        } catch (error) {
            console.error('Error removing like from location:', error);
            res.status(500).json({ message: req.t('locations.like_remove_error'), error: error.message });
        }
    }
};

module.exports = locationsController;