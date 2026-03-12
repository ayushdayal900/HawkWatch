const mongoose = require('mongoose');

/**
 * VerificationRecord
 * Stores ID card images and face match results for each student per exam.
 * Images stored as base64 strings (or S3 URLs if you swap storage later).
 */
const verificationRecordSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            default: null,
        },

        /* ── ID Card ─────────────────────────────────────────────── */
        idImage: {
            type: String, // base64 data-URL or cloud storage key
            default: null,
        },
        idVerified: {
            type: Boolean,
            default: false,
        },
        idConfidence: {
            type: Number,
            default: null,  // 0–100
        },
        idVerifiedAt: {
            type: Date,
            default: null,
        },

        /* ── Face Match ──────────────────────────────────────────── */
        liveImage: {
            type: String,
            default: null,
        },
        faceMatched: {
            type: Boolean,
            default: false,
        },
        faceConfidence: {
            type: Number,
            default: null,  // 0–100 similarity score
        },
        faceMatchedAt: {
            type: Date,
            default: null,
        },

        /* ── Overall ─────────────────────────────────────────────── */
        allVerified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Compound index – one record per student per exam
verificationRecordSchema.index({ studentId: 1, examId: 1 }, { unique: false });

module.exports = mongoose.model('VerificationRecord', verificationRecordSchema);
