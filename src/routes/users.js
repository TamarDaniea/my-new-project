// src/routes/users.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

// GET all users (Admin only route, requires auth middleware)
router.get('/', usersController.getAllUsers);
// POST create a new user (usually called by auth system after Firebase registration)
router.post('/', usersController.createUser);
// GET user profile by firebase_uid
router.get('/:firebaseUid', usersController.getUserProfile);
// PUT update user profile by firebase_uid
router.put('/:firebaseUid', usersController.updateUserProfile);
// DELETE user by firebase_uid (Admin only route)
router.delete('/:firebaseUid', usersController.deleteUser);

module.exports = router;