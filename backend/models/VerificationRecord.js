const mongoose = require('mongoose');

const verificationRecordSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VerificationSession',
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        step: {
            type: String,
            enum: ['id', 'liveness', 'face', 'environment'],
            required: true,
        },
        passed: {
            type: Boolean,
            required: true,
        },
        confidence: {
            type: Number, // Percentage 0-100 or 0-1 scalar depending on step
            default: 0,
        },
        details: {
            type: mongoose.Schema.Types.Mixed, // flexible object for step-specific metadata
            default: {},
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('VerificationRecord', verificationRecordSchema);
