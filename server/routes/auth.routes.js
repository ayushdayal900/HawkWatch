const express = require('express');
const router = express.Router();
const { register, login, refreshToken, getMe, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

const validateRegister = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
    body('role').optional().isIn(['student', 'examiner', 'admin']),
];

const validateLogin = [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
