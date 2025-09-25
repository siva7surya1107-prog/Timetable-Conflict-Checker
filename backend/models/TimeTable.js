const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true
    },
    teacher: {
        type: String,
        required: true,
        trim: true
    },
    day: {
        type: String,
        required: true,
        enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    },
    section: {
        type: String,
        required: true,
        enum: ['B', 'D']
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    timeSlotLabel: {
        type: String,
        required: true
    },
    startMinutes: {
        type: Number,
        required: true
    },
    endMinutes: {
        type: Number,
        required: true
    }
});

const timetableSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scheduleItems: [timeSlotSchema],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
timetableSchema.index({ user: 1 });

module.exports = mongoose.model('TimeTable', timetableSchema);