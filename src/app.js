
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { connectToDatabase } = require('./utils/db');
const locationsRouter = require('./routes/locations'); // Import locations router
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const categoriesRouter = require('./routes/categories');
const fakeAuth = require('./middlewares/fakeAuth');
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
app.use('/api/locations', fakeAuth, locationsRouter);
app.use('/api/locations', locationsRouter); // Use the locations router for /api/locations
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/categories', categoriesRouter);
// טיפול בשגיאות (אופציונלי, מומלץ - הוסף/י בסוף, לפני app.listen)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
// Start the server
app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});