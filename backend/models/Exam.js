const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        stem: {
            type: String,
        },
        questionText: {
            type: String,
            required: [true, 'Question text is required'],
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
        startTime: Date,
        endTime: Date,
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
        accessType: {
            type: String,
            enum: ['public', 'organization'],
            default: 'public',
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Auto-compute totalMarks before save
examSchema.pre('save', function (next) {
    this.totalMarks = (this.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);
    next();
});

/**
 * Aggregate exam counts for the dashboard stats card.
 *
 * @param {import('mongoose').Types.ObjectId|null} examinerId
 *   When provided, counts are scoped to this examiner.
 *   When null/undefined, returns platform-wide totals (admin view).
 * @returns {Promise<{ total: number, published: number, draft: number, active: number }>}
 */
examSchema.statics.getStats = async function (examinerId) {
    const match = examinerId ? { createdBy: examinerId } : {};

    const [result] = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id:       null,
                total:     { $sum: 1 },
                published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
                draft:     { $sum: { $cond: [{ $eq: ['$status', 'draft']      }, 1, 0] } },
                active:    { $sum: { $cond: [{ $eq: ['$status', 'active']    }, 1, 0] } },
            },
        },
    ]);

    return result
        ? { total: result.total, published: result.published, draft: result.draft, active: result.active }
        : { total: 0, published: 0, draft: 0, active: 0 };
};

module.exports = mongoose.model('Exam', examSchema);
