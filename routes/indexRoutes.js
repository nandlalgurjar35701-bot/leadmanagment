const express = require('express');
const router = express.Router();
const { protect, loadUserContext } = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Category = require('../models/Category');

const getLocalDateString = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Get Main Dashboard Home
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query.assignedTo = req.user._id;
    }

    const todayStr = getLocalDateString(new Date());
    const todayAttendance = await Attendance.findOne({ user: req.user._id, dateString: todayStr });

    // Date calculations for reminders
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    // 1. Alert Reminders
    const overdueFollowupsList = await Lead.find({
      ...query,
      nextFollowupDate: { $lt: startOfToday },
      status: { $nin: ['Won', 'Lost', 'Not Interested'] }
    }).populate('assignedTo', 'name');

    const todaysFollowupsList = await Lead.find({
      ...query,
      nextFollowupDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $nin: ['Won', 'Lost', 'Not Interested'] }
    }).populate('assignedTo', 'name');

    const dealsClosingTodayList = await Lead.find({
      ...query,
      expectedClosingDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $nin: ['Won', 'Lost', 'Not Interested'] }
    }).populate('assignedTo', 'name');

    // 2. Metrics Cards Stats
    const totalLeads = await Lead.countDocuments(query);
    const todaysFollowupsCount = todaysFollowupsList.length;
    const interestedLeads = await Lead.countDocuments({ ...query, status: 'Interested' });
    const readyToBuyLeads = await Lead.countDocuments({ ...query, status: 'Ready To Buy' });
    const wonLeads = await Lead.countDocuments({ ...query, status: 'Won' });
    const lostLeads = await Lead.countDocuments({ ...query, status: 'Lost' });

    // Revenue calculations (Won leads)
    const revenueStats = await Lead.aggregate([
      { $match: { ...query, status: 'Won' } },
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]);
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;

    // This month revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const thisMonthRevenueStats = await Lead.aggregate([
      { 
        $match: { 
          ...query, 
          status: 'Won',
          updatedAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]);
    const thisMonthRevenue = thisMonthRevenueStats.length > 0 ? thisMonthRevenueStats[0].total : 0;

    // 3. Charts Aggregations
    // Status Distribution
    const statusStats = await Lead.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly Growth (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);
    const growthStats = await Lead.aggregate([
      { $match: { ...query, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Sales User Performance
    const performanceStats = await Lead.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } }
        }
      }
    ]);
    const populatedPerformance = await Promise.all(
      performanceStats.map(async (stat) => {
        if (!stat._id) return { name: 'Unassigned', total: stat.total, won: stat.won };
        const user = await User.findById(stat._id).select('name');
        return { name: user ? user.name : 'Unknown', total: stat.total, won: stat.won };
      })
    );

    res.render('index', { 
      title: 'Dashboard Home',
      todayAttendance,
      stats: {
        totalLeads,
        todaysFollowups: todaysFollowupsCount,
        interestedLeads,
        readyToBuyLeads,
        wonLeads,
        lostLeads,
        totalRevenue,
        thisMonthRevenue
      },
      reminders: {
        overdue: overdueFollowupsList,
        today: todaysFollowupsList,
        closingToday: dealsClosingTodayList
      },
      charts: {
        statusStats,
        growthStats,
        performanceStats: populatedPerformance
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.render('index', {
      title: 'Dashboard Home',
      todayAttendance: null,
      stats: {
        totalLeads: 0,
        todaysFollowups: 0,
        interestedLeads: 0,
        readyToBuyLeads: 0,
        wonLeads: 0,
        lostLeads: 0,
        totalRevenue: 0,
        thisMonthRevenue: 0
      },
      reminders: {
        overdue: [],
        today: [],
        closingToday: []
      },
      charts: {
        statusStats: [],
        growthStats: [],
        performanceStats: []
      }
    });
  }
});

// GET /register-lead - Public Form Page
router.get('/register-lead', loadUserContext, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: { $ne: false } }).sort({ name: 1 });
    // Source parameter from URL
    const sourceParam = req.query.source || '';
    
    // Map URL parameter to CRM valid source name
    let leadSource = 'Website';
    if (sourceParam) {
      const paramLower = sourceParam.toLowerCase();
      if (paramLower === 'facebook' || paramLower === 'fb') leadSource = 'Facebook';
      else if (paramLower === 'instagram' || paramLower === 'ig') leadSource = 'Instagram';
      else if (paramLower === 'whatsapp' || paramLower === 'wa') leadSource = 'WhatsApp';
    }

    res.render('register-lead', {
      title: 'Register Lead',
      categories,
      leadSource,
      user: req.user || null
    });
  } catch (error) {
    console.error('Error loading public lead page:', error);
    res.status(500).render('error', { 
      title: 'Server Error', 
      error: 'Failed to load registration page', 
      user: req.user || null 
    });
  }
});

// POST /register-lead - Submit Lead Form
router.post('/register-lead', async (req, res) => {
  const { name, email, mobileNumber, storeName, address, city, country, categories, notes, leadSource, websiteType } = req.body;

  try {
    if (!name || !mobileNumber) {
      req.session.error_msg = 'Name and Mobile Number are required';
      return res.redirect(`/register-lead?source=${leadSource || 'Website'}`);
    }

    // Format mobile number
    const formattedNumbers = [{ number: mobileNumber.trim() }];

    // Parse categories (comes as array or single string)
    let leadCategories = [];
    if (categories) {
      leadCategories = Array.isArray(categories) ? categories : [categories];
    }

    // Store custom notes / requirements
    let leadNotes = notes || '';
    if (websiteType) {
      leadNotes = `Website Requirement: ${websiteType}\n\n${leadNotes}`.trim();
    }

    // Validate lead source parameter against Lead schema enum values
    const validSources = ["Cold Calling", "Facebook", "Instagram", "WhatsApp", "Reference", "Website"];
    let source = leadSource || 'Website';
    if (!validSources.includes(source)) {
      source = 'Website';
    }

    const newLead = new Lead({
      name,
      email: email || undefined,
      mobileNumbers: formattedNumbers,
      address,
      city,
      country,
      storeName,
      categories: leadCategories,
      budget: 0,
      leadSource: source,
      assignedTo: undefined, // unassigned
      createdBy: undefined, // anonymous submission
      status: 'New Lead',
      priority: 'Medium',
      notes: leadNotes,
      timeline: [
        {
          action: 'Lead Registered',
          detail: `Lead registered via Public Ads Form (Source: ${source}).`
        }
      ]
    });

    await newLead.save();
    
    req.session.success_msg = 'Thank you! Your details have been submitted successfully. Our team will contact you shortly.';
    res.redirect(`/register-lead?source=${source}`);
  } catch (error) {
    console.error('Error submitting public lead:', error);
    req.session.error_msg = error.message || 'Failed to submit details. Please try again.';
    res.redirect(`/register-lead?source=${leadSource || 'Website'}`);
  }
});

module.exports = router;
