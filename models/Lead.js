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
    required: false
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

leadSchema.virtual('score').get(function() {
  let pts = 0;
  if (this.budget > 100000) {
    pts += 40;
  } else if (this.budget > 50000) {
    pts += 20;
  }
  
  if (this.status === 'Interested') {
    pts += 20;
  } else if (this.status === 'Demo Scheduled') {
    pts += 20;
  } else if (this.status === 'Proposal Sent') {
    pts += 30;
  } else if (this.status === 'Ready To Buy') {
    pts += 50;
  }
  
  return pts;
});

leadSchema.virtual('scoreCategory').get(function() {
  const s = this.score;
  if (s >= 70) {
    return { name: 'Hot Lead', emoji: '🔥', class: 'bg-danger text-white' };
  }
  if (s >= 30) {
    return { name: 'Warm Lead', emoji: '🟡', class: 'bg-warning text-dark' };
  }
  return { name: 'Cold Lead', emoji: '❄️', class: 'bg-info bg-opacity-10 text-info border border-info' };
});

module.exports = mongoose.model('Lead', leadSchema);
