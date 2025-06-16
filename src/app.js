
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { connectToDatabase } = require('./utils/db');
const locationsRouter = require('./routes/locations'); // Import locations router

const app = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies

// Connect to database
connectToDatabase();

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Shalom Platform Backend is running!');
});

// Routes
app.use('/api/locations', locationsRouter); // Use the locations router for /api/locations

// Start the server
app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});