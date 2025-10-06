/**
 * backend/services/user_service.js
 * Fully Optimized User Service with Bulk Operations
 */

const crypto = require('crypto');
const User = require('../models/user_model');
const {
  createUserValidator,
  updateUserValidator,
  filterUserValidator,
  USER_FILTER_FIELDS,
} = require('../validators/user_validator');
const ApiError = require('../utils/apiError');
const { isValidObjectId, handleDuplicateKeyError } = require('../utils/dbUtils');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { getPagination, getSortOptions } = require('../utils/pagination');
const { pickAllowedFields } = require('../utils/filter');
const { ROLES, STATUSES } = require('../utils/constants');
const { setCache, getCache, invalidateCache } = require('../utils/cache');
const { emitToUser } = require('../utils/socket');

// ======================
// User CRUD Operations
// ======================

async function registerUser(userData) {
  const { error, value } = createUserValidator.validate(userData);
  if (error) throw new ApiError(error.details[0].message, 422);

  value.email = value.email.toLowerCase();
  value.password = await hashPassword(value.password);
  value.isVerified = false;

  let user;
  try {
    user = await User.create(value);
  } catch (err) {
    handleDuplicateKeyError(err);
  }

  setCache(user._id.toString(), user);
  emitToUser(user._id, 'userCreated', { userId: user._id });
  await sendVerificationEmail(user);

  return { success: true, data: user };
}

async function updateUser(userId, updateData, currentUser = null) {
  if (!isValidObjectId(userId)) throw new ApiError('Invalid user ID', 400);

  const { error, value } = updateUserValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404);

  if (value.password) {
    if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
      if (!updateData.oldPassword) throw new ApiError('Old password required', 400);
      const validOld = await comparePassword(updateData.oldPassword, user.password);
      if (!validOld) throw new ApiError('Old password incorrect', 400);
    }
    value.password = await hashPassword(value.password);
  }

  const safeFields = pickAllowedFields(value, Object.keys(User.schema.obj));
  Object.assign(user, safeFields);

  try {
    await user.save();
  } catch (err) {
    handleDuplicateKeyError(err);
  }

  setCache(user._id.toString(), user);
  emitToUser(user._id, 'userUpdated', { userId: user._id });

  return { success: true, data: user };
}

async function deleteUser(userId, currentUser) {
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role))
    throw new ApiError('Unauthorized', 403);

  const user = await User.findByIdAndUpdate(userId, { status: 'deleted' }, { new: true });
  if (!user) throw new ApiError('User not found', 404);

  setCache(user._id.toString(), user);
  emitToUser(user._id, 'userDeleted', { userId: user._id });

  return { success: true, data: user };
}

async function removeUser(userId, currentUser) {
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role))
    throw new ApiError('Unauthorized', 403);

  const result = await User.findByIdAndDelete(userId);
  if (!result) throw new ApiError('User not found', 404);

  invalidateCache(userId);
  emitToUser(userId, 'userRemoved', { userId });

  return { success: true, data: result };
}

// ======================
// Get / Auth
// ======================

async function getUserById(userId) {
  if (!isValidObjectId(userId)) throw new ApiError('Invalid user ID', 400);

  const cached = getCache(userId);
  if (cached) return { success: true, data: cached };

  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404);

  setCache(userId, user);
  return { success: true, data: user };
}

async function getUserByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError('User not found', 404);

  return { success: true, data: user };
}

async function loginUser(email, password) {
  const { data: user } = await getUserByEmail(email);

  if (user.status !== 'active') throw new ApiError('User account is not active', 403);
  if (!user.isVerified) throw new ApiError('Email not verified', 403);

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new ApiError('Invalid credentials', 401);

  user.lastLogin = new Date();
  await user.save();
  setCache(user._id.toString(), user);

  return {
    success: true,
    data: {
      user,
      token: generateToken({ id: user._id, role: user.role, email: user.email }),
    },
  };
}

// ======================
// Password Reset
// ======================

async function requestPasswordReset(email) {
  const { data: user } = await getUserByEmail(email);
  return await sendPasswordResetEmail(user);
}

async function resetPassword(token, newPassword) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError('Invalid or expired token', 400);

  user.password = await hashPassword(newPassword);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();
  setCache(user._id.toString(), user);

  return { success: true, data: user };
}

// ======================
// Email Verification
// ======================

async function verifyUserEmail(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError('Invalid or expired token', 400);

  user.isVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;

  await user.save();
  setCache(user._id.toString(), user);
  emitToUser(user._id, 'userVerified', { userId: user._id });

  return { success: true, data: user };
}

// ======================
// Listing & Filters (Optimized)
// ======================

async function listUsers({ filter = {}, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  const { error, value: validFilter } = filterUserValidator.validate(filter);
  if (error) throw new ApiError('Invalid filter field: ' + error.details[0].message, 400);

  const filtered = pickAllowedFields(validFilter, USER_FILTER_FIELDS);
  if (filtered.role) filtered.role = filtered.role.toLowerCase();
  if (filtered.status) filtered.status = filtered.status.toLowerCase();

  const { skip, limit: limitNum } = getPagination(page, limit);
  const sortOptions = getSortOptions(sortBy, sortOrder);

  const users = await User.find(filtered)
    .skip(skip)
    .limit(limitNum)
    .sort(sortOptions);

  const total = await User.countDocuments(filtered);
  users.forEach(u => setCache(u._id.toString(), u));

  return { success: true, data: { users, total, page, totalPages: Math.ceil(total / limitNum) } };
}

async function searchUsers(query, limit = 50) {
  if (!query) return { success: true, data: [] };

  const users = await User.find({
    $or: [
      { firstName: { $regex: query, $options: 'i' } },
      { lastName: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ],
  })
    .limit(limit);

  users.forEach(u => setCache(u._id.toString(), u));
  return { success: true, data: users };
}

// ======================
// Bulk Operations
// ======================

async function bulkUpdateUserRole(userIds = [], role, currentUser) {
  role = role.toLowerCase();
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role))
    throw new ApiError('Unauthorized', 403);
  if (!ROLES.includes(role)) throw new ApiError('Invalid role', 400);

  const users = await User.find({ _id: { $in: userIds } });
  const successes = [];
  const failures = [];

  for (const user of users) {
    try {
      const updated = await changeUserRole(user._id, role, currentUser);
      successes.push(updated.data);
    } catch (err) {
      failures.push({ error: err.message, userId: user._id });
    }
  }

  const foundIds = users.map(u => u._id.toString());
  userIds.forEach(id => {
    if (!foundIds.includes(id.toString())) failures.push({ error: 'User not found', userId: id });
  });

  return { success: true, data: { successes, failures } };
}

async function bulkUpdateUserStatus(userIds = [], status, currentUser) {
  status = status.toLowerCase();
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role))
    throw new ApiError('Unauthorized', 403);
  if (!STATUSES.includes(status)) throw new ApiError('Invalid status', 400);

  const users = await User.find({ _id: { $in: userIds } });
  const successes = [];
  const failures = [];

  for (const user of users) {
    try {
      const updated = await setUserStatus(user._id, status, currentUser);
      successes.push(updated.data);
    } catch (err) {
      failures.push({ error: err.message, userId: user._id });
    }
  }

  const foundIds = users.map(u => u._id.toString());
  userIds.forEach(id => {
    if (!foundIds.includes(id.toString())) failures.push({ error: 'User not found', userId: id });
  });

  return { success: true, data: { successes, failures } };
}

async function bulkDeleteUsers(userIds = [], currentUser) {
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role))
    throw new ApiError('Unauthorized', 403);

  const users = await User.find({ _id: { $in: userIds } });
  const successes = [];
  const failures = [];

  for (const user of users) {
    try {
      await deleteUser(user._id, currentUser);
      successes.push(user._id);
    } catch (err) {
      failures.push({ error: err.message, userId: user._id });
    }
  }

  const foundIds = users.map(u => u._id.toString());
  userIds.forEach(id => {
    if (!foundIds.includes(id.toString())) failures.push({ error: 'User not found', userId: id });
  });

  return { success: true, data: { successes, failures } };
}

// ======================
// Role & Status Management
// ======================

async function changeUserRole(userId, role, currentUser) {
  role = role.toLowerCase();
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role))
    throw new ApiError('Unauthorized', 403);
  if (!ROLES.includes(role)) throw new ApiError('Invalid role', 400);

  const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
  if (!user) throw new ApiError('User not found', 404);

  setCache(user._id.toString(), user);
  emitToUser(user._id, 'roleChanged', { userId: user._id, role });

  return { success: true, data: user };
}

async function setUserStatus(userId, status, currentUser) {
  status = status.toLowerCase();
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role))
    throw new ApiError('Unauthorized', 403);
  if (!STATUSES.includes(status)) throw new ApiError('Invalid status', 400);

  const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
  if (!user) throw new ApiError('User not found', 404);

  setCache(user._id.toString(), user);
  emitToUser(user._id, 'statusChanged', { userId: user._id, status });

  return { success: true, data: user };
}

// ======================
// Dashboard / Utilities
// ======================

async function getUsersByRole(role) {
  role = role.toLowerCase();
  if (!ROLES.includes(role)) throw new ApiError('Invalid role', 400);

  const users = await User.find({ role });
  users.forEach(u => setCache(u._id.toString(), u));
  return { success: true, data: users };
}

async function getUserStats() {
  const stats = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return { success: true, data: stats };
}

async function getRecentlyRegisteredUsers(limit = 5) {
  const cacheKey = `recentUsers_${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return { success: true, data: cached };

  const users = await User.find().sort({ createdAt: -1 }).limit(limit);
  setCache(cacheKey, users);
  return { success: true, data: users };
}

// ======================
// Module Exports
// ======================

module.exports = {
  registerUser,
  updateUser,
  deleteUser,
  removeUser,
  getUserById,
  getUserByEmail,
  loginUser,
  requestPasswordReset,
  resetPassword,
  verifyUserEmail,
  listUsers,
  searchUsers,
  bulkUpdateUserRole,
  bulkUpdateUserStatus,
  bulkDeleteUsers,
  changeUserRole,
  setUserStatus,
  getUsersByRole,
  getUserStats,
  getRecentlyRegisteredUsers,
};
