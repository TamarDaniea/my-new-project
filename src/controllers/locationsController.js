const Location = require('../models/Location');
const Comment = require('../models/Comment'); // נצטרך את זה לטובת תגובות למיקומים אם יתווסף
// ניתן להוסיף את express-validator לולידציה חזקה יותר:
// const { validationResult } = require('express-validator'); 

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
            res.status(500).json({ message: 'Server error fetching or searching locations', error: error.message });
        }
    },

    // יצירת מיקום חדש
    createLocation: async (req, res) => {
        try {
            const locationData = req.body;
            // הוספת user_id (מזהה משתמש) מהטוקן המאומת אם קיים middleware אימות
            // נניח ש-req.user.firebase_uid זמין אם משתמש מאומת.
            // אם אין middleware אימות כרגע, ייתכן שתצטרכי להעביר user_id ב-body לצורך בדיקה.
            // יש לוודא ש-firebase_uid של המשתמש שמוסיף את המיקום אכן מגיע מהאימות.
            // ה-API מאפשר למשתמשים לתרום מיקומים ופוסטים קהילתיים.
            locationData.user_id = req.user ? req.user.firebase_uid : 'test_uid'; // TODO: replace 'test_uid' with actual authenticated user ID

            const newLocation = await Location.create(locationData);
            res.status(201).json({ message: 'Location created successfully', location: newLocation });
        } catch (error) {
            console.error('Error creating location:', error);
            res.status(500).json({ message: 'Error creating location', error: error.message });
        }
    },

    // קבלת מיקום לפי ID
    getLocationById: async (req, res) => {
        try {
            const location = await Location.getById(req.params.id);
            if (!location) {
                return res.status(404).json({ message: 'Location not found' });
            }
            res.status(200).json(location);
        } catch (error) {
            console.error('Error fetching location by ID:', error);
            res.status(500).json({ message: 'Error fetching location', error: error.message });
        }
    },

    // עדכון מיקום
    updateLocation: async (req, res) => {
        try {
            const affectedRows = await Location.update(req.params.id, req.body);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Location not found or no changes made' });
            }
            res.status(200).json({ message: 'Location updated successfully' });
        } catch (error) {
            console.error('Error updating location:', error);
            res.status(500).json({ message: 'Error updating location', error: error.message });
        }
    },

    // מחיקת מיקום
    deleteLocation: async (req, res) => {
        try {
            const affectedRows = await Location.delete(req.params.id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Location not found' });
            }
            res.status(200).json({ message: 'Location deleted successfully' });
        } catch (error) {
                console.error('Error deleting location:', error);
            res.status(500).json({ message: 'Error deleting location', error: error.message });
        }
    },

    // הוספת לייק למיקום (מעדכן מונה בלבד)
    addLikeToLocation: async (req, res) => {
        try {
            const { locationId } = req.params; // Get locationId from URL params
            const affectedRows = await Location.incrementLikeCount(locationId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Location not found' });
            }
            res.status(200).json({ message: 'Like added to location' });
        } catch (error) {
            console.error('Error adding like to location:', error);
            res.status(500).json({ message: 'Error adding like', error: error.message });
        }
    },

    // הסרת לייק ממיקום (מעדכן מונה בלבד)
    removeLikeFromLocation: async (req, res) => {
        try {
            const { locationId } = req.params;
            const affectedRows = await Location.decrementLikeCount(locationId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Location not found or like_count already 0' });
            }
            res.status(200).json({ message: 'Like removed from location' });
        } catch (error) {
            console.error('Error removing like from location:', error);
            res.status(500).json({ message: 'Error removing like', error: error.message });
        }
    }
};

module.exports = locationsController;