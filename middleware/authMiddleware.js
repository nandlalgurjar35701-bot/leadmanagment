const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

// Authenticate user token
exports.protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.session.error_msg = 'Please log in to access this page';
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.clearCookie('token');
      req.session.error_msg = 'Session expired. Please log in again.';
      return res.redirect('/auth/login');
    }

    if (!user.isActive) {
      res.clearCookie('token');
      req.session.error_msg = 'Your account has been deactivated.';
      return res.redirect('/auth/login');
    }

    // Grant access
    req.user = user;
    res.locals.user = user; // Accessible in all templates
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.clearCookie('token');
    req.session.error_msg = 'Invalid session. Please log in.';
    res.redirect('/auth/login');
  }
};

// Route access restriction to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.session.error_msg = 'You are not authorized to view this page';
      return res.redirect('/');
    }
    next();
  };
};

// Optional middleware for pages where login is optional, just to load user context
exports.loadUserContext = async (req, res, next) => {
  if (req.cookies && req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
        res.locals.user = user;
      }
    } catch (err) {
      // Ignore errors, just don't load user context
    }
  }
  next();
};
