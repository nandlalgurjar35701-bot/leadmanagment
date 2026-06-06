const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all admin routes and authorize only Admins
router.use(protect);
router.use(authorize('Admin'));

// User Management Routes
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.post('/users/toggle/:id', adminController.toggleUserStatus);

module.exports = router;
