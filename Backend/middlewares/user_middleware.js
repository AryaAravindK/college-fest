/**
 * backend/middlewares/user_middleware.js
 * Middleware for user-specific checks
 */

const User = require('../models/user_model');

/**
 * Check if user exists by ID in params
 */
const checkUserExists = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.targetUser = user; // attach the target user for further usage
    next();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid user ID', error: err.message });
  }
};

module.exports = { checkUserExists };
