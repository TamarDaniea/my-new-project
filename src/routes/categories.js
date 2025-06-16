// src/routes/categories.js
const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');

// GET all categories
router.get('/', categoriesController.getAllCategories);
// POST create a new category (Admin only)
router.post('/', categoriesController.createCategory);
// GET category by ID
router.get('/:id', categoriesController.getCategoryById);
// PUT update category by ID (Admin only)
router.put('/:id', categoriesController.updateCategory);
// DELETE category by ID (Admin only)
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;