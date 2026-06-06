const User = require('../models/User');

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
