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

// Reports & Export Routes (Phase 2 & 12)
router.get('/reports', adminController.getReports);
router.get('/export/csv', adminController.exportLeadsCSV);

module.exports = router;
