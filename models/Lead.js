const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  mobileNumbers: [
    {
      number: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true
      }
    }
  ],
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  storeName: {
    type: String,
    trim: true
  },
  categories: [
    {
      type: String,
      trim: true
    }
  ],
  budget: {
    type: Number,
    default: 0
  },
  leadSource: {
    type: String,
    enum: {
      values: ["Cold Calling", "Facebook", "Instagram", "WhatsApp", "Reference", "Website"],
      message: '{VALUE} is not a valid lead source'
    },
    default: "Cold Calling"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: [
      "New Lead",
      "Contacted",
      "Interested",
      "Demo Scheduled",
      "Proposal Sent",
      "Negotiation",
      "Ready To Buy",
      "Won",
      "Lost",
      "Not Interested",
      "Follow-up Required"
    ],
    default: "New Lead"
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium"
  },
  nextFollowupDate: {
    type: Date
  },
  expectedClosingDate: {
    type: Date
  },
  notes: {
    type: String
  },
  timeline: [
    {
      action: {
        type: String,
        required: true
      },
      detail: {
        type: String
      },
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
