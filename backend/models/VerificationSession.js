const mongoose = require('mongoose');

const VerificationSessionSchema = new mongoose.Schema({
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
    idVerified: {
        type: Boolean,
        default: false,
    },
    faceMatched: {
        type: Boolean,
        default: false,
    },
    livenessPassed: {
        type: Boolean,
        default: false,
    },
    environmentSafe: {
        type: Boolean,
        default: false,
    },
    faceEmbedding: {
        type: [Number], // array of floats
        default: [],
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 mins from creation
        expires: 0 // Deletes automatically when expiresAt is reached
    }
});

// Index to ensure we can look up by student/exam quickly
VerificationSessionSchema.index({ studentId: 1, examId: 1 });

module.exports = mongoose.model('VerificationSession', VerificationSessionSchema);
