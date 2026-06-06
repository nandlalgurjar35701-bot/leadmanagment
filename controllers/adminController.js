const User = require('../models/User');
const Lead = require('../models/Lead');

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // default 5 items per page
    const search = req.query.q || '';
    
    // Construct search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const count = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('admin/users', {
      title: 'User Management',
      users,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      limit,
      searchQuery: search,
      totalCount: count
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    req.session.error_msg = 'Error loading users. Please try again.';
    res.redirect('/');
  }
};

exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password || !role) {
      req.session.error_msg = 'All fields are required';
      return res.redirect('/admin/users');
    }

    if (password.length < 6) {
      req.session.error_msg = 'Password must be at least 6 characters long';
      return res.redirect('/admin/users');
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      req.session.error_msg = 'User with this email already exists';
      return res.redirect('/admin/users');
    }

    const newUser = new User({
      name,
      email,
      password,
      role,
      isActive: true
    });

    await newUser.save();
    req.session.success_msg = `User ${name} (${role}) has been successfully created!`;
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    req.session.error_msg = error.message || 'Failed to create user';
    res.redirect('/admin/users');
  }
};

exports.toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  
  try {
    const user = await User.findById(id);
    if (!user) {
      req.session.error_msg = 'User not found';
      return res.redirect('/admin/users');
    }

    // Prevent deactivating own account
    if (user._id.toString() === req.user._id.toString()) {
      req.session.error_msg = 'You cannot deactivate your own admin account';
      return res.redirect('/admin/users');
    }

    user.isActive = !user.isActive;
    await user.save();
    req.session.success_msg = `User ${user.name} is now ${user.isActive ? 'Active' : 'Inactive'}.`;
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error toggling user status:', error);
    req.session.error_msg = 'Failed to toggle user status';
    res.redirect('/admin/users');
  }
};

// Render Admin Reports View (Phase 2 & 12)
exports.getReports = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const wonLeads = await Lead.countDocuments({ status: 'Won' });
    const lostLeads = await Lead.countDocuments({ status: 'Lost' });
    
    // Total revenue from Won deals
    const revenueStats = await Lead.aggregate([
      { $match: { status: 'Won' } },
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]);
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;

    // Status breakdown counts
    const statusBreakdown = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Source breakdown counts
    const sourceBreakdown = await Lead.aggregate([
      { $group: { _id: '$leadSource', count: { $sum: 1 } } }
    ]);

    // Category breakdown counts
    const categoryBreakdown = await Lead.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Agent Sales Performance
    const performanceStats = await Lead.aggregate([
      {
        $group: {
          _id: '$assignedTo',
          totalLeads: { $sum: 1 },
          wonLeads: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          lostLeads: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, '$budget', 0] } }
        }
      }
    ]);

    const populatedPerformance = await Promise.all(
      performanceStats.map(async (stat) => {
        if (!stat._id) return { name: 'Unassigned', email: 'N/A', ...stat };
        const user = await User.findById(stat._id).select('name email');
        return {
          name: user ? user.name : 'Unknown',
          email: user ? user.email : '',
          totalLeads: stat.totalLeads,
          wonLeads: stat.wonLeads,
          lostLeads: stat.lostLeads,
          revenue: stat.revenue
        };
      })
    );

    res.render('admin/reports', {
      title: 'CRM Reports & Analytics',
      stats: {
        totalLeads,
        wonLeads,
        lostLeads,
        totalRevenue
      },
      statusBreakdown,
      sourceBreakdown,
      categoryBreakdown,
      performance: populatedPerformance
    });
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    req.session.error_msg = 'Failed to load report analytics';
    res.redirect('/');
  }
};

// Generate and export all leads as CSV file (Phase 12)
exports.exportLeadsCSV = async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Header column labels
    let csv = 'Customer Name,Email,Mobile Numbers,Store Name,Website Categories,Budget,Status,Priority,Lead Source,Owner (Assigned To),Created By,Next Followup Date,Expected Closing Date,Created At\n';

    // Build rows
    leads.forEach(lead => {
      const name = `"${lead.name.replace(/"/g, '""')}"`;
      const email = lead.email ? `"${lead.email.replace(/"/g, '""')}"` : '""';
      const mobiles = `"${lead.mobileNumbers.map(m => m.number).join(' | ')}"`;
      const storeName = lead.storeName ? `"${lead.storeName.replace(/"/g, '""')}"` : '""';
      const categories = `"${lead.categories.join(' | ')}"`;
      const budget = lead.budget;
      const status = `"${lead.status}"`;
      const priority = `"${lead.priority}"`;
      const source = `"${lead.leadSource}"`;
      const owner = lead.assignedTo ? `"${lead.assignedTo.name.replace(/"/g, '""')}"` : '"Unassigned"';
      const creator = lead.createdBy ? `"${lead.createdBy.name.replace(/"/g, '""')}"` : '"System"';
      
      const nextFollow = lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toISOString().split('T')[0] : 'None';
      const expectedClose = lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toISOString().split('T')[0] : 'None';
      const createdAt = new Date(lead.createdAt).toISOString().split('T')[0];

      csv += `${name},${email},${mobiles},${storeName},${categories},${budget},${status},${priority},${source},${owner},${creator},${nextFollow},${expectedClose},${createdAt}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="CRM_Leads_Report_' + Date.now() + '.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    req.session.error_msg = 'Failed to download Excel/CSV export';
    res.redirect('/admin/reports');
  }
};

// Reset sales/agent user password (Admin Privilege)
exports.resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword, confirmPassword } = req.body;

  try {
    if (!newPassword || !confirmPassword) {
      req.session.error_msg = 'All password fields are required';
      return res.redirect('/admin/users');
    }

    if (newPassword !== confirmPassword) {
      req.session.error_msg = 'Passwords do not match';
      return res.redirect('/admin/users');
    }

    if (newPassword.length < 6) {
      req.session.error_msg = 'Password must be at least 6 characters long';
      return res.redirect('/admin/users');
    }

    const user = await User.findById(id);
    if (!user) {
      req.session.error_msg = 'User not found';
      return res.redirect('/admin/users');
    }

    // Force update password (triggers pre-save hashing)
    user.password = newPassword;
    await user.save();

    req.session.success_msg = `Password for user "${user.name}" has been successfully reset!`;
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Admin password reset error:', error);
    req.session.error_msg = 'Failed to reset user password';
    res.redirect('/admin/users');
  }
};
