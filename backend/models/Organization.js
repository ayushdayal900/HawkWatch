const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Organization name is required'],
            trim: true,
            unique: true,
        },
        code: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Organization', organizationSchema);
