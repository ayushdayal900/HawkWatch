const express = require('express');
const { createOrganization, getOrganizations } = require('../controllers/organization.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public route for registration dropdown
router.get('/', getOrganizations);

// Protected routes
router.use(protect);
router.post('/', createOrganization);

module.exports = router;
