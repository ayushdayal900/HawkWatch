const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Fallback: check cookie
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized. No token provided.',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated.' });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.warn(`JWT verification failed: ${error.message}`);
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

/**
 * Role-based access control
 * @param {...string} roles - allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized for this resource.`,
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
