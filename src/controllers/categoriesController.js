const Category = require('../models/Category');

const categoriesController = {
    getAllCategories: async (req, res) => {
        try {
            const categories = await Category.getAll();
            res.status(200).json(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ message: req.t('category.fetchError'), error: error.message });
        }
    },

    createCategory: async (req, res) => {
        try {
            const newCategory = await Category.create(req.body);
            res.status(201).json({ message: req.t('category.created'), category: newCategory });
        } catch (error) {
            console.error('Error creating category:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: req.t('category.alreadyExists') });
            }
            res.status(500).json({ message: req.t('category.createError'), error: error.message });
        }
    },

    getCategoryById: async (req, res) => {
        try {
            const category = await Category.getById(req.params.id);
            if (!category) {
                return res.status(404).json({ message: req.t('category.notFound') });
            }
            res.status(200).json(category);
        } catch (error) {
            console.error('Error fetching category by ID:', error);
            res.status(500).json({ message: req.t('category.fetchError'), error: error.message });
        }
    },

    updateCategory: async (req, res) => {
        try {
            const affectedRows = await Category.update(req.params.id, req.body);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('category.updateError') });
            }
            res.status(200).json({ message: req.t('category.updated') });
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({ message: req.t('category.updateErrorGeneric'), error: error.message });
        }
    },

    deleteCategory: async (req, res) => {
        try {
            const affectedRows = await Category.delete(req.params.id);
            if (affectedRows === 0) {
                return res.status(404).json({ message: req.t('category.notFound') });
            }
            res.status(200).json({ message: req.t('category.deleted') });
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ message: req.t('category.deleteError'), error: error.message });
        }
    }
};

module.exports = categoriesController;
