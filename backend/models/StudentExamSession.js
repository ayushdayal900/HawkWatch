const mongoose = require('mongoose');

const studentExamSessionSchema = new mongoose.Schema(
    {
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
        answers: [
            {
                questionId: String,
                answer: mongoose.Schema.Types.Mixed,
            },
        ],
        startTimestamp: {
            type: Date,
            default: Date.now,
        },
        endTimestamp: {
            type: Date,
        },

        // ── Session Linking (additive — all fields optional) ──────────────────
        // Allows cross-referencing with the AI proctoring session and exam attempt
        // without breaking any existing documents that lack these fields.
        proctoringSessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProctoringSession',
            default: null,
        },
        examAttemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExamAttempt',
            default: null,
        },
    },
    { timestamps: true }
);

// Virtual: unified sessionId (prefers proctoringSessionId, falls back to _id)
studentExamSessionSchema.virtual('sessionId').get(function () {
    return this.proctoringSessionId || this._id;
});

module.exports = mongoose.model('StudentExamSession', studentExamSessionSchema);

