const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceSchema = new Schema({
    date: { type: Date, required: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true }, // Add this line
    records: [{
        student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
        status: { type: String, enum: ['Present', 'Absent'], default: 'Present' },
        remarks: { type: String, default: '' }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);