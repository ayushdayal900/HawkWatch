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
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('VerificationSession', VerificationSessionSchema);
