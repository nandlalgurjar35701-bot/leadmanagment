const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateString: {
    type: String, // YYYY-MM-DD format (representing the user's local date)
    required: true
  },
  clockIn: {
    type: Date,
    required: true
  },
  clockOut: {
    type: Date
  },
  duration: {
    type: Number, // Duration in minutes
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Half Day', 'Absent'],
    default: 'Present'
  },
  clockInIp: {
    type: String
  },
  clockOutIp: {
    type: String
  }
}, {
  timestamps: true
});

// A user can only have one attendance log per day
attendanceSchema.index({ user: 1, dateString: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
