const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Main page
router.get('/', attendanceController.getAttendancePage);

// Clock Actions
router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);

// Admin-only CSV export
router.get('/export', authorize('Admin'), attendanceController.exportAttendanceCSV);

module.exports = router;
