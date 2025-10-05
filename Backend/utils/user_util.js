/**
 * backend/utils/user_util.js
 * Utility functions for user operations: fetching, filtering, updating, role checks
 */

const User = require('../models/user_model');
const crypto = require('crypto');

/**
 * Fetch user by ID with optional population
 * @param {String} id - User ID
 * @param {Array} populateFields - Array of fields to autopopulate
 */
const getUserById = async (id, populateFields = []) => {
  let query = User.findById(id);
  populateFields.forEach(field => query = query.populate(field));
  return await query.exec();
};

/**
 * Fetch user by email
 * @param {String} email - User email
 */
const getUserByEmail = async (email) => {
  return await User.findByEmail(email);
};

/**
 * Filter users based on role, department, year, etc.
 * @param {Object} filters
 */
const filterUsers = async (filters = {}) => {
  const query = {};

  if (filters.role) query.role = filters.role;
  if (filters.department) query.department = filters.department;
  if (filters.year) query.year = filters.year;
  if (filters.club) query.club = filters.club;
  if (filters.status) query.status = filters.status;

  return await User.find(query);
};

/**
 * Update user fields
 * @param {String} userId
 * @param {Object} updateData
 */
const updateUser = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  Object.keys(updateData).forEach(key => {
    user[key] = updateData[key];
  });

  await user.save();
  return user;
};

/**
 * Check if a user has admin role
 */
const isAdmin = (user) => user.role === 'admin';

/**
 * Check if a user has organizer role
 */
const isOrganizer = (user) => user.role === 'organizer';

/**
 * Check if a user has faculty role
 */
const isFaculty = (user) => user.role === 'faculty';

/**
 * Check if a user has student role
 */
const isStudent = (user) => user.role === 'student';

/**
 * Lock user account for failed login attempts
 */
const lockUserAccount = async (user) => {
  user.accountLockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins
  await user.save();
};

/**
 * Increment login attempts and optionally lock
 */
const handleFailedLogin = async (user) => {
  user.loginAttempts += 1;
  if (user.loginAttempts >= 5) await lockUserAccount(user);
  await user.save();
};

/**
 * Reset login attempts after successful login
 */
const resetLoginAttempts = async (user) => {
  user.loginAttempts = 0;
  user.accountLockedUntil = null;
  await user.save();
};

/**
 * Revoke all JWT tokens for the user
 * @param {Object} user
 * @param {String} reason
 * @param {String} byUserId
 */
const revokeTokens = async (user, reason, byUserId) => {
  user.tokenVersion += 1;
  user.auditLogs.push({ action: 'Token Revoked', by: byUserId, reason });
  await user.save();
};

module.exports = {
  getUserById,
  getUserByEmail,
  filterUsers,
  updateUser,
  isAdmin,
  isOrganizer,
  isFaculty,
  isStudent,
  handleFailedLogin,
  resetLoginAttempts,
  revokeTokens
};
