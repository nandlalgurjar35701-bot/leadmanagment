const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Helper to format date as YYYY-MM-DD using server local timezone
const getLocalDateString = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Render Main Attendance Dashboard Page
exports.getAttendancePage = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // 1. Fetch current logged-in user's log for today
    const todayLog = await Attendance.findOne({
      user: req.user._id,
      dateString: todayStr
    });

    // 2. Fetch history for current user (past 30 logs)
    const history = await Attendance.find({ user: req.user._id })
      .sort({ dateString: -1 })
      .limit(30);

    // 3. For Admins, fetch additional info
    let adminLogs = [];
    let allUsers = [];
    let selectedDate = req.query.date || todayStr;
    let selectedUserId = req.query.userId || '';
    let adminStats = null;

    if (req.user.role === 'Admin') {
      // Get all active users to populate filter dropdown
      allUsers = await User.find({ isActive: true }).sort({ name: 1 });

      // Construct Admin filters
      let adminQuery = {};
      
      // If a specific user is filtered, we might want to see their history, otherwise we default to date filter
      if (selectedUserId) {
        adminQuery.user = selectedUserId;
      }
      
      // If date is filtered (or we default to today and no user filter)
      if (selectedDate && !selectedUserId) {
        adminQuery.dateString = selectedDate;
      } else if (selectedDate && selectedUserId) {
        // If both are provided
        adminQuery.dateString = selectedDate;
      }

      adminLogs = await Attendance.find(adminQuery)
        .populate('user', 'name email role')
        .sort({ clockIn: -1 });

      // Calculate Stats for Today
      const totalActiveEmployees = await User.countDocuments({ isActive: true });
      const presentLogsToday = await Attendance.find({ dateString: todayStr }).populate('user');
      const presentTodayCount = presentLogsToday.length;
      
      const currentlyWorkingCount = presentLogsToday.filter(log => !log.clockOut).length;
      const clockedOutCount = presentLogsToday.filter(log => log.clockOut).length;
      const absentCount = Math.max(0, totalActiveEmployees - presentTodayCount);

      adminStats = {
        totalEmployees: totalActiveEmployees,
        present: presentTodayCount,
        working: currentlyWorkingCount,
        clockedOut: clockedOutCount,
        absent: absentCount
      };
    }

    res.render('attendance', {
      title: 'Attendance Management',
      user: req.user,
      todayLog,
      history,
      adminLogs,
      allUsers,
      selectedDate,
      selectedUserId,
      todayStr,
      adminStats
    });
  } catch (error) {
    console.error('Error loading attendance page:', error);
    req.session.error_msg = 'Error loading attendance details. Please try again.';
    res.redirect('/');
  }
};

// Clock In Action
exports.clockIn = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Check if already clocked in today
    const existingLog = await Attendance.findOne({
      user: req.user._id,
      dateString: todayStr
    });

    if (existingLog) {
      req.session.error_msg = 'You have already clocked in for today!';
      return res.redirect(req.get('referrer') || '/attendance');
    }

    // Capture client IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const newLog = new Attendance({
      user: req.user._id,
      dateString: todayStr,
      clockIn: now,
      clockInIp: clientIp,
      status: 'Present'
    });

    await newLog.save();
    req.session.success_msg = `Clocked in successfully at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}!`;
    res.redirect(req.get('referrer') || '/attendance');
  } catch (error) {
    console.error('Clock in error:', error);
    req.session.error_msg = 'Failed to clock in. Please try again.';
    res.redirect(req.get('referrer') || '/attendance');
  }
};

// Clock Out Action
exports.clockOut = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Find today's log
    const log = await Attendance.findOne({
      user: req.user._id,
      dateString: todayStr
    });

    if (!log) {
      req.session.error_msg = 'You have not clocked in today yet!';
      return res.redirect(req.get('referrer') || '/attendance');
    }

    if (log.clockOut) {
      req.session.error_msg = 'You have already clocked out for today!';
      return res.redirect(req.get('referrer') || '/attendance');
    }

    // Capture IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    // Calculate duration in minutes
    const diffMs = now - log.clockIn;
    const durationMins = Math.round(diffMs / 60000);

    log.clockOut = now;
    log.clockOutIp = clientIp;
    log.duration = durationMins;

    // Optional status update based on working hours (e.g. < 4 hours is half day)
    if (durationMins < 240) {
      log.status = 'Half Day';
    } else {
      log.status = 'Present';
    }

    await log.save();
    req.session.success_msg = `Clocked out successfully at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}! Total duration: ${Math.floor(durationMins / 60)}h ${durationMins % 60}m.`;
    res.redirect(req.get('referrer') || '/attendance');
  } catch (error) {
    console.error('Clock out error:', error);
    req.session.error_msg = 'Failed to clock out. Please try again.';
    res.redirect(req.get('referrer') || '/attendance');
  }
};

// Export Attendance to CSV (Admin Only)
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { date, userId } = req.query;
    let query = {};

    if (date) {
      query.dateString = date;
    }
    if (userId) {
      query.user = userId;
    }

    const logs = await Attendance.find(query)
      .populate('user', 'name email role')
      .sort({ dateString: -1, clockIn: -1 });

    let csv = 'Employee Name,Email,Role,Date,Clock In,Clock Out,Duration (Mins),Duration (Hours),Status,Clock In IP,Clock Out IP\n';

    logs.forEach(log => {
      const name = `"${log.user ? log.user.name.replace(/"/g, '""') : 'Deleted User'}"`;
      const email = `"${log.user ? log.user.email.replace(/"/g, '""') : 'N/A'}"`;
      const role = `"${log.user ? log.user.role : 'N/A'}"`;
      const dateStr = log.dateString;
      const clockInTime = log.clockIn ? new Date(log.clockIn).toLocaleTimeString('en-US') : 'N/A';
      const clockOutTime = log.clockOut ? new Date(log.clockOut).toLocaleTimeString('en-US') : 'N/A';
      const duration = log.duration || 0;
      const hours = (duration / 60).toFixed(2);
      const status = log.status;
      const inIp = log.clockInIp ? `"${log.clockInIp}"` : 'N/A';
      const outIp = log.clockOutIp ? `"${log.clockOutIp}"` : 'N/A';

      csv += `${name},${email},${role},${dateStr},${clockInTime},${clockOutTime},${duration},${hours},${status},${inIp},${outIp}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Attendance_Report_${date || 'All'}_${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    req.session.error_msg = 'Failed to export CSV report';
    res.redirect('/attendance');
  }
};
