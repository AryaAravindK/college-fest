/**
 * backend/routes/user_routes.js
 * Routes for user management: profile, CRUD, filter, token revocation
 */

const express = require('express');
const router = express.Router();
const {protect} = require('../middlewares/auth_middleware');
const roleMiddleware = require('../middlewares/role_middleware');
const { checkUserExists } = require('../middlewares/user_middleware');
const { updateUserValidator, filterUsersValidator } = require('../validators/user_validator');
const { getProfile, getUser, updateUserProfile, deleteUser, getUsers, revokeUserTokens } = require('../controllers/user_controller');

// Get logged-in user's profile
router.get('/profile', protect, getProfile);

// Get user by ID (admin only)
router.get('/:id', protect, roleMiddleware(['admin']), checkUserExists, getUser);

// Update user profile
router.put('/:id', protect, roleMiddleware(['admin']), checkUserExists, updateUserValidator, updateUserProfile);

// Delete user (soft delete)
router.delete('/:id', protect, roleMiddleware(['admin']), checkUserExists, deleteUser);

// Filter users
router.get('/', protect, roleMiddleware(['admin']), filterUsersValidator, getUsers);

// Revoke user tokens (admin action)
router.post('/:id/revoke-tokens', protect, roleMiddleware(['admin']), checkUserExists, revokeUserTokens);

module.exports = router;
