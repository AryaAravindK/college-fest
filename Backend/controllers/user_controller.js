/**
 * backend/controllers/user_controller.js
 * User management: get profile, update, delete, filter, role assignment
 */

const User = require('../models/user_model');
const { validationResult } = require('express-validator');
const {
  getUserById,
  getUserByEmail,
  updateUser,
  filterUsers,
  revokeTokens
} = require('../utils/user_util');

/**
 * Get logged-in user's profile
 */
const getProfile = async (req, res) => {
  try {
    res.status(200).json({ user: req.user.getPublicProfile() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

/**
 * Get user by ID
 */
const getUser = async (req, res) => {
  try {
    const user = await getUserById(req.params.id, ['assignedEvents', 'teams', 'certificates', 'notifications']);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user: user.getPublicProfile() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
};

/**
 * Update user profile
 */
const updateUserProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const updated = await updateUser(req.params.id, req.body);
    res.status(200).json({ message: 'User updated successfully', user: updated.getPublicProfile() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

/**
 * Delete user (soft delete)
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.delete(); // using mongoose-delete plugin
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed', error: err.message });
  }
};

/**
 * Filter users
 */
const getUsers = async (req, res) => {
  try {
    const users = await filterUsers(req.query);
    res.status(200).json({ users: users.map(u => u.getPublicProfile()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

/**
 * Revoke user's tokens (admin action)
 */
const revokeUserTokens = async (req, res) => {
  try {
    const { reason } = req.body;
    await revokeTokens(req.targetUser, reason, req.user._id);
    res.status(200).json({ message: 'Tokens revoked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to revoke tokens', error: err.message });
  }
};

module.exports = {
  getProfile,
  getUser,
  updateUserProfile,
  deleteUser,
  getUsers,
  revokeUserTokens
};
