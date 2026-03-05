const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        stem: {
            type: String,
            required: [true, 'Question stem is required'],
        },
        type: {
            type: String,
            enum: ['mcq', 'multi-select', 'short-answer', 'code'],
            default: 'mcq',
        },
        options: [
            {
                label: String,
                text: String,
            },
        ],
        correctAnswer: {
            type: mongoose.Schema.Types.Mixed, // string for mcq, array for multi-select
        },
        points: {
            type: Number,
            default: 1,
        },
        explanation: String,
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
        tags: [String],
    },
    { timestamps: true }
);

const examSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Exam title is required'],
            trim: true,
        },
        description: String,
        instructions: [String],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        duration: {
            type: Number, // minutes
            required: [true, 'Duration is required'],
            min: [5, 'Minimum duration is 5 minutes'],
        },
        totalMarks: {
            type: Number,
            default: 0,
        },
        passingMarks: {
            type: Number,
            default: 0,
        },
        questions: [questionSchema],
        status: {
            type: String,
            enum: ['draft', 'published', 'active', 'completed', 'archived'],
            default: 'draft',
        },
        scheduledStart: Date,
        scheduledEnd: Date,
        allowedAttempts: {
            type: Number,
            default: 1,
        },
        proctoring: {
            enabled: { type: Boolean, default: true },
            webcamRequired: { type: Boolean, default: true },
            fullscreenRequired: { type: Boolean, default: true },
            faceDetection: { type: Boolean, default: true },
            deepfakeDetection: { type: Boolean, default: true },
            behavioralBiometrics: { type: Boolean, default: true },
            tabSwitchLimit: { type: Number, default: 3 },
            flagThreshold: { type: Number, default: 5 }, // auto-terminate after N flags
        },
        allowedStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        tags: [String],
        category: String,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Auto-compute totalMarks before save
examSchema.pre('save', function (next) {
    if (this.questions && this.questions.length > 0) {
        this.totalMarks = this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    }
    next();
});

module.exports = mongoose.model('Exam', examSchema);
