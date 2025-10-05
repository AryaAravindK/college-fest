/**
 * backend/middlewares/auth_middleware.js
 * Middleware to protect routes and validate JWT tokens
 */

const jwt = require('jsonwebtoken');
const User = require('../models/user_model');
const { verifyToken } = require('../utils/auth_util');

/**
 * Middleware to authenticate user using JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Fetch user
    const user = await User.findById(decoded.id);
    if (!user || user.tokenVersion !== decoded.tokenVersion || user.status !== 'active') {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Authentication failed', error: err.message });
  }
};

// Export as object with `protect` so routes can use authMiddleware.protect
module.exports = {protect};
