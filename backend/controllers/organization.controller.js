const Organization = require('../models/Organization');
const logger = require('../utils/logger');

// @route  POST /api/organizations
// @access Private (Admin)
const createOrganization = async (req, res, next) => {
    try {
        const { name, code } = req.body;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admins can create organizations' });
        }

        const existing = await Organization.findOne({ name });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Organization name already exists' });
        }

        const org = await Organization.create({
            name,
            code,
            createdBy: req.user._id,
        });

        logger.info(`Organization created: ${org.name} by Admin ${req.user._id}`);
        res.status(201).json({ success: true, data: org });
    } catch (error) {
        next(error);
    }
};

// @route  GET /api/organizations
// @access Public (for registration dropdown)
const getOrganizations = async (req, res, next) => {
    try {
        const orgs = await Organization.find({ isActive: true }).select('name code');
        res.status(200).json({ success: true, count: orgs.length, data: orgs });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrganization,
    getOrganizations,
};
