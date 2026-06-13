const Category = require('../models/Category');

// View categories list
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.render('admin/categories', {
      title: 'Website Categories',
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    req.session.error_msg = 'Failed to load categories';
    res.redirect('/');
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  const { name } = req.body;

  try {
    if (!name || !name.trim()) {
      req.session.error_msg = 'Category name cannot be empty';
      return res.redirect('/admin/categories');
    }

    const trimmedName = name.trim();
    const exists = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    
    if (exists) {
      req.session.error_msg = `Category "${trimmedName}" already exists`;
      return res.redirect('/admin/categories');
    }

    const category = new Category({ name: trimmedName });
    await category.save();

    req.session.success_msg = `Category "${trimmedName}" created successfully!`;
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error creating category:', error);
    req.session.error_msg = 'Failed to create category';
    res.redirect('/admin/categories');
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);
    if (!category) {
      req.session.error_msg = 'Category not found';
      return res.redirect('/admin/categories');
    }

    await Category.findByIdAndDelete(id);
    req.session.success_msg = `Category "${category.name}" deleted successfully.`;
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error deleting category:', error);
    req.session.error_msg = 'Failed to delete category';
    res.redirect('/admin/categories');
  }
};

// Add a demo/reference URL to a category (Admin Privilege)
exports.addCategoryUrl = async (req, res) => {
  const { id } = req.params;
  const { title, link } = req.body;

  try {
    if (!link || !link.trim()) {
      req.session.error_msg = 'URL link is required';
      return res.redirect('/admin/categories');
    }

    const category = await Category.findById(id);
    if (!category) {
      req.session.error_msg = 'Category not found';
      return res.redirect('/admin/categories');
    }

    category.urls.push({
      title: title ? title.trim() : 'Demo Website',
      link: link.trim()
    });

    await category.save();
    req.session.success_msg = `Reference link added to "${category.name}" successfully!`;
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error adding category URL:', error);
    req.session.error_msg = error.message || 'Failed to add demo URL';
    res.redirect('/admin/categories');
  }
};

// Delete a demo/reference URL from a category (Admin Privilege)
exports.deleteCategoryUrl = async (req, res) => {
  const { id, urlId } = req.params;

  try {
    const category = await Category.findById(id);
    if (!category) {
      req.session.error_msg = 'Category not found';
      return res.redirect('/admin/categories');
    }

    // Filter out the URL
    category.urls = category.urls.filter(u => u._id.toString() !== urlId);
    await category.save();

    req.session.success_msg = 'Reference link removed successfully.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error deleting category URL:', error);
    req.session.error_msg = 'Failed to delete demo URL';
    res.redirect('/admin/categories');
  }
};

// Toggle Category Status (Active/Inactive)
exports.toggleCategoryStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);
    if (!category) {
      req.session.error_msg = 'Category not found';
      return res.redirect('/admin/categories');
    }

    // Toggle status
    category.isActive = category.isActive === undefined ? false : !category.isActive;
    await category.save();

    req.session.success_msg = `Category "${category.name}" is now ${category.isActive ? 'Active' : 'Inactive'}.`;
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error toggling category status:', error);
    req.session.error_msg = 'Failed to update category status';
    res.redirect('/admin/categories');
  }
};
