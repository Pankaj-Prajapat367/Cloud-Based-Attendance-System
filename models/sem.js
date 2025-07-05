



// attendance.js
const attendanceSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true 
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject', 
    required: true 
  },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher', 
    required: true 
  },
  records: [{
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student', 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['Present', 'Absent', 'Late', 'Excused'], 
      default: 'Present' 
    },
    remarks: String
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound index for quick lookups
attendanceSchema.index({ date: 1, subject: 1, teacher: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);