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
