const mongoose = require('mongoose');
const Student = require('./student'); // Make sure path is correct

// Define the Batch schema
const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  maxCapacity: {
    type: Number,
    default: 30,
    min: 1,
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});



const Batch = mongoose.model('Batch',batchSchema );
module.exports = Batch;
