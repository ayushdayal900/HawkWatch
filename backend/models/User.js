const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },
        role: {
            type: String,
            enum: ['student', 'examiner', 'admin'],
            default: 'student',
        },
        profileImage: {
            type: String,
            default: null,
        },
        // Behavioral biometrics baseline (typing rhythm, mouse dynamics)
        biometricBaseline: {
            typingRhythm: { type: Object, default: null },
            mouseDynamics: { type: Object, default: null },
            capturedAt: { type: Date, default: null },
        },
        // Face embedding for identity verification
        faceEmbedding: {
            vector: { type: [Number], default: null },
            capturedAt: { type: Date, default: null },
        },
        institution: {
            type: String,
            trim: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
        refreshToken: {
            type: String,
            select: false,
        },
        passwordResetToken: String,
        passwordResetExpire: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Virtual: exam attempts count
userSchema.virtual('examAttempts', {
    ref: 'ExamAttempt',
    localField: '_id',
    foreignField: 'student',
    count: true,
});

module.exports = mongoose.model('User', userSchema);
