const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    question: mongoose.Schema.Types.ObjectId,
    answer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    pointsAwarded: { type: Number, default: 0 },
    timeTaken: Number, // seconds
});

const examAttemptSchema = new mongoose.Schema(
    {
        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        proctoringSession: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProctoringSession',
        },
        answers: [answerSchema],
        score: {
            type: Number,
            default: 0,
        },
        percentage: {
            type: Number,
            default: 0,
        },
        passed: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['in-progress', 'submitted', 'auto-submitted', 'terminated', 'under-review'],
            default: 'in-progress',
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        submittedAt: Date,
        tabSwitchCount: { type: Number, default: 0 },
        fullscreenExitCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Auto-compute percentage on save
examAttemptSchema.pre('save', async function (next) {
    if (this.submittedAt) {
        const exam = await mongoose.model('Exam').findById(this.exam).select('totalMarks passingMarks');
        if (exam && exam.totalMarks > 0) {
            this.percentage = parseFloat(((this.score / exam.totalMarks) * 100).toFixed(2));
            this.passed = this.score >= exam.passingMarks;
        }
    }
    next();
});

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
