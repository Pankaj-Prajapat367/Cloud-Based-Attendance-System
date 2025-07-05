const mongoose = require('mongoose');
const fs = require('fs');

const studentSchema = new mongoose.Schema({
    er_number: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  enrolledSubjects: [{
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    enrollmentDate: { type: Date, default: Date.now }
}]
});



const student = mongoose.model('Student',studentSchema );
module.exports = student ;