const mongoose = require('mongoose');
const fs = require('fs');




// subjects.js
const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  credit: { type: Number, required: true },
  type: { type: String, enum: ['Core', 'Elective'], required: true },
  enrolledStudents: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    enrollmentDate: { type: Date, default: Date.now }
  }]
});


module.exports = mongoose.model('Subject', subjectSchema);
