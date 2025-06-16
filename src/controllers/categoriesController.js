// src/controllers/categoriesController.js
const Category = require('../models/Category');

const categoriesController = {
    // קבלת כל הקטגוריות
    getAllCategories: async (req, res) => {
        try {
            const categories = await Category.getAll();
            res.status(200).json(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ message: 'Error fetching categories', error: error.message });
        }
    },

    // יצירת קטגוריה חדשה (לשימוש אדמין)
    createCategory: async (req, res) => {
        try {
            const newCategory = await Category.create(req.body);
            res.status(201).json({ message: 'Category created successfully', category: newCategory });
        } catch (error) {
            console.error('Error creating category:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Category with this name already exists' });
            }
            res.status(500).json({ message: 'Error creating category', error: error.message });
        }
    },

    // קבלת קטגוריה לפי ID
    getCategoryById: async (req, res) => {
        try {
            const category = await Category.getById(req.params.id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            res.status(200).json(category);
        } catch (error) {
            console.error('Error fetching category by ID:', error);
            res.status(500).json({ message: 'Error fetching category', error: error.message });
        }
    },

    // עדכון קטגוריה (לשימוש אדמין)
    updateCategory: async (req, res) => {
        try {
            const affectedRows = await Category.update(req.params.id, req.body);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Category not found or no changes made' });
            }
            res.status(200).json({ message: 'Category updated successfully' });
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({ message: 'Error updating category', error: error.message });
        }
    },

    // מחיקת קטגוריה (לשימוש אדמין)
    deleteCategory: async (req, res) => {
        try {
            const affectedRows = await Category.delete(req.params.id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Category not found' });
            }
            res.status(200).json({ message: 'Category deleted successfully' });
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ message: 'Error deleting category', error: error.message });
        }
    }
};

module.exports = categoriesController;