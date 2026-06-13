const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  urls: [
    {
      title: { type: String, trim: true },
      link: { type: String, required: [true, 'Demo link is required'], trim: true }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
