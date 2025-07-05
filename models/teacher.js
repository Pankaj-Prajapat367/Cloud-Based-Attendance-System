const mongoose = require('mongoose');
const fs = require('fs');

// teachers.js
const teacherSchema = new mongoose.Schema({
    name: { 
      type: String, 
      required: true 
    },
    position: {
        type: String,
        required: true
     },
    email: { 
      type: String, 
      required: true, 
      unique: true 
    },
    subjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }],

  });
  
  module.exports = mongoose.model('Teacher', teacherSchema);