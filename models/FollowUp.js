const mongoose = require('mongoose');

const followupSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  followupDate: {
    type: Date,
    default: Date.now
  },
  discussion: {
    type: String,
    required: true
  },
  nextAction: {
    type: String
  },
  nextFollowupDate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FollowUp', followupSchema);
