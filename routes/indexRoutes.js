const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');

// Get Main Dashboard Home
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query.assignedTo = req.user._id;
    }

    // Total leads
    const totalLeads = await Lead.countDocuments(query);

    // Today's Followups (from 00:00 to 23:59 today)
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);
    
    const todaysFollowups = await Lead.countDocuments({
      ...query,
      nextFollowupDate: { $gte: startOfToday, $lte: endOfToday }
    });

    // Interested leads
    const interestedLeads = await Lead.countDocuments({
      ...query,
      status: 'Interested'
    });

    // Won leads
    const wonLeads = await Lead.countDocuments({
      ...query,
      status: 'Won'
    });

    // Lost leads
    const lostLeads = await Lead.countDocuments({
      ...query,
      status: 'Lost'
    });

    // Revenue (Sum of budget for Won leads)
    const revenueStats = await Lead.aggregate([
      { $match: { ...query, status: 'Won' } },
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]);
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;

    res.render('index', { 
      title: 'Dashboard Home',
      stats: {
        totalLeads,
        todaysFollowups,
        interestedLeads,
        wonLeads,
        lostLeads,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.render('index', {
      title: 'Dashboard Home',
      stats: {
        totalLeads: 0,
        todaysFollowups: 0,
        interestedLeads: 0,
        wonLeads: 0,
        lostLeads: 0,
        totalRevenue: 0
      }
    });
  }
});

module.exports = router;
