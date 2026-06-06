require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const connectDB = require('./config/db');

const app = express();

// Connect to Database
connectDB().then(() => {
  seedAdminUser();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'crm_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Session message & User middleware
app.use((req, res, next) => {
  // Pass success/error messages to all templates
  res.locals.success_msg = req.session.success_msg || null;
  res.locals.error_msg = req.session.error_msg || null;
  // Clear them after reading
  delete req.session.success_msg;
  delete req.session.error_msg;
  
  // Pass logged-in user info (filled by auth middleware)
  res.locals.user = req.user || null;
  next();
});

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/indexRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/admin', require('./routes/adminRoutes'));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found', user: req.user || null });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Server Error', error: err.message, user: req.user || null });
});

// Seed default Admin user if none exists
async function seedAdminUser() {
  try {
    const User = require('./models/User');
    const adminExists = await User.findOne({ role: 'Admin' });
    if (!adminExists) {
      const admin = new User({
        name: 'System Admin',
        email: 'admin@crm.com',
        password: 'admin123', // will be hashed automatically by userSchema pre-save hook
        role: 'Admin',
        isActive: true
      });
      await admin.save();
      console.log('Default admin user seeded: admin@crm.com / admin123');
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
