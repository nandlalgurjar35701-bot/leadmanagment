const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

exports.getLogin = (req, res) => {
  // If already logged in, redirect to home
  if (req.cookies && req.cookies.token) {
    try {
      jwt.verify(req.cookies.token, JWT_SECRET);
      return res.redirect('/');
    } catch (err) {
      // Clear invalid token
      res.clearCookie('token');
    }
  }
  res.render('login', { title: 'Login' });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    if (!email || !password) {
      req.session.error_msg = 'Please provide both email and password';
      return res.redirect('/auth/login');
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      req.session.error_msg = 'Invalid email or password';
      return res.redirect('/auth/login');
    }

    if (!user.isActive) {
      req.session.error_msg = 'Your account has been deactivated';
      return res.redirect('/auth/login');
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: '24h'
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    req.session.success_msg = `Welcome back, ${user.name}!`;
    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    req.session.error_msg = 'An error occurred during login. Please try again.';
    res.redirect('/auth/login');
  }
};

exports.getRegister = (req, res) => {
  if (req.cookies && req.cookies.token) {
    return res.redirect('/');
  }
  res.render('register', { title: 'Register' });
};

exports.postRegister = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  try {
    if (!name || !email || !password || !confirmPassword) {
      req.session.error_msg = 'All fields are required';
      return res.redirect('/auth/register');
    }

    if (password !== confirmPassword) {
      req.session.error_msg = 'Passwords do not match';
      return res.redirect('/auth/register');
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      req.session.error_msg = 'Email is already registered';
      return res.redirect('/auth/register');
    }

    // Register user default as Sales User
    const user = new User({
      name,
      email,
      password,
      role: 'Sales User'
    });

    await user.save();

    req.session.success_msg = 'Registration successful! You can now log in.';
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.session.error_msg = error.message || 'An error occurred during registration.';
    res.redirect('/auth/register');
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  req.session.success_msg = 'You have logged out successfully';
  res.redirect('/auth/login');
};
