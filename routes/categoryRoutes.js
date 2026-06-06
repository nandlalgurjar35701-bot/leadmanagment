const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Restrict all category routes to Admins
router.use(protect);
router.use(authorize('Admin'));

// Category CRUD
router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.post('/delete/:id', categoryController.deleteCategory);

// URL management routes (Admin only)
router.post('/add-url/:id', categoryController.addCategoryUrl);
router.post('/delete-url/:id/:urlId', categoryController.deleteCategoryUrl);

module.exports = router;
