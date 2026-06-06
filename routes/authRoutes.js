const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Login Routes
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Register Routes
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

const { protect } = require('../middleware/authMiddleware');

// Logout Route
router.get('/logout', authController.logout);

// Change Own Password Route
router.post('/change-password', protect, authController.changePassword);

module.exports = router;
