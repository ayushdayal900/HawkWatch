const Organization = require('../models/Organization');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// @route  POST /api/organizations
// @access Private (Admin)
const createOrganization = asyncHandler(async (req, res) => {
    const { name, code } = req.body;

    if (!['admin', 'examiner'].includes(req.user.role)) {
        throw new AppError('Only admins and examiners can create organizations', 403, 'ACCESS_DENIED');
    }

    const existing = await Organization.findOne({ name });
    if (existing) {
        throw new AppError('Organization name already exists', 400, 'ORG_EXISTS');
    }

    const org = await Organization.create({
        name,
        code,
        createdBy: req.user._id,
    });

    logger.info(`Organization created: ${org.name} by Admin ${req.user._id}`);
    res.status(201).json({ success: true, data: org });
});

// @route  GET /api/organizations
// @access Public (for registration dropdown)
const getOrganizations = asyncHandler(async (req, res) => {
    const orgs = await Organization.find({ isActive: true }).select('name code');
    res.status(200).json({ success: true, count: orgs.length, data: orgs });
});

module.exports = {
    createOrganization,
    getOrganizations,
};
