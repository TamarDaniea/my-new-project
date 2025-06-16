// src/controllers/locationsController.js
const Location = require('../models/Location');

const locationsController = {
    getAllLocations: async (req, res) => {
        try {
            const locations = await Location.getAll();
            res.json(locations);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving locations', error: error.message });
        }
    },

    createLocation: async (req, res) => {
        try {
            // In a real application, you'd add validation and possibly authentication/authorization here
            const newLocationId = await Location.create(req.body);
            res.status(201).json({ message: 'Location created successfully', id: newLocationId });
        } catch (error) {
            res.status(500).json({ message: 'Error creating location', error: error.message });
        }
    }
    // You will add more controller methods here
};

module.exports = locationsController;