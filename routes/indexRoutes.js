const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Get Main Dashboard Home
router.get('/', protect, (req, res) => {
  res.render('index', { 
    title: 'Dashboard Home'
  });
});

module.exports = router;
