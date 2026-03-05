const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Generate JWT tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d',
    });
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
    });
    return { accessToken, refreshToken };
};

// @route  POST /api/auth/register
// @access Public
const register = async (req, res, next) => {
    try {
        const { name, email, password, role, institution } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        const user = await User.create({ name, email, password, role, institution });
        const { accessToken, refreshToken } = generateTokens(user._id);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        logger.info(`New user registered: ${email} (${role})`);

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                institution: user.institution,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated.' });
        }

        const { accessToken, refreshToken } = generateTokens(user._id);
        user.refreshToken = refreshToken;
        user.lastLogin = Date.now();
        await user.save({ validateBeforeSave: false });

        logger.info(`User logged in: ${email}`);

        res.status(200).json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                institution: user.institution,
                profileImage: user.profileImage,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @route  POST /api/auth/refresh
// @access Public
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: incomingToken } = req.body;
        if (!incomingToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required.' });
        }

        const decoded = jwt.verify(incomingToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id).select('+refreshToken');

        if (!user || user.refreshToken !== incomingToken) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        next(error);
    }
};

// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
    res.status(200).json({ success: true, user: req.user });
};

// @route  POST /api/auth/logout
// @access Private
const logout = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        user.refreshToken = null;
        await user.save({ validateBeforeSave: false });
        res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, refreshToken, getMe, logout };
