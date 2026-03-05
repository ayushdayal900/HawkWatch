const mongoose = require('mongoose');

const flagEventSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'face_not_detected',
            'multiple_faces',
            'face_mismatch',
            'deepfake_detected',
            'gaze_deviation',
            'head_pose_violation',
            'audio_anomaly',
            'tab_switch',
            'copy_paste',
            'keyboard_shortcut',
            'fullscreen_exit',
            'behavioral_anomaly',
            'phone_detected',
            'person_absent',
        ],
        required: true,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    screenshotUrl: String,     // S3 URL of snapshot at time of flag
    frameData: String,         // Base64 thumbnail (optional fallback)
    details: {
        type: mongoose.Schema.Types.Mixed,
    },
});

const proctoringSessionSchema = new mongoose.Schema(
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
        examAttempt: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExamAttempt',
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'completed', 'terminated', 'flagged'],
            default: 'pending',
        },
        startedAt: Date,
        endedAt: Date,

        // Video recording
        videoRecordingUrl: String,     // S3 URL for full session recording
        videoChunks: [String],         // Chunked upload segments

        // AI detection results per frame batch
        frameAnalysisSummary: {
            totalFramesAnalyzed: { type: Number, default: 0 },
            faceDetectedFrames: { type: Number, default: 0 },
            multipleFacesFrames: { type: Number, default: 0 },
            faceAbsentFrames: { type: Number, default: 0 },
            averageFaceConfidence: { type: Number, default: 0 },
            deepfakeScores: [Number],    // per-batch deepfake scores
            avgDeepfakeScore: { type: Number, default: 0 },
            gazeDeviations: { type: Number, default: 0 },
        },

        // Behavioral biometrics
        behavioralMetrics: {
            typingRhythm: {
                avgDwellTime: Number,
                avgFlightTime: Number,
                anomalyScore: { type: Number, default: 0 },
            },
            mouseDynamics: {
                avgSpeed: Number,
                curvatureIndex: Number,
                anomalyScore: { type: Number, default: 0 },
            },
            overallAnomalyScore: { type: Number, default: 0 },
        },

        // Flags raised during session
        flags: [flagEventSchema],
        flagCount: { type: Number, default: 0 },

        // Composite risk score (0–100)
        riskScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'low',
        },

        // Termination reason
        terminationReason: String,
        reviewNotes: String,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Auto-compute risk level from score
proctoringSessionSchema.pre('save', function (next) {
    const score = this.riskScore;
    if (score >= 75) this.riskLevel = 'critical';
    else if (score >= 50) this.riskLevel = 'high';
    else if (score >= 25) this.riskLevel = 'medium';
    else this.riskLevel = 'low';
    next();
});

// Virtual: session duration in seconds
proctoringSessionSchema.virtual('durationSeconds').get(function () {
    if (this.startedAt && this.endedAt) {
        return Math.round((this.endedAt - this.startedAt) / 1000);
    }
    return null;
});

module.exports = mongoose.model('ProctoringSession', proctoringSessionSchema);
