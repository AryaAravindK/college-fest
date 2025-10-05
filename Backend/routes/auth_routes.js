/**
 * backend/routes/auth_routes.js
 * Routes for authentication: register, login, logout, email verification, password reset, phone OTP
 */

const express = require('express');
const router = express.Router();
const { register, login, logout, verifyEmail, requestPasswordReset, resetPassword, sendOtp, verifyOtp,getExistingClubs,createClub } = require('../controllers/auth_controller');
const { registerValidator, loginValidator, emailVerificationValidator, passwordResetRequestValidator, passwordResetValidator, phoneOtpValidator } = require('../validators/auth_validator');
const {protect} = require('../middlewares/auth_middleware');

// Register new user
router.post('/register', registerValidator, register);

// Login user
router.post('/login', loginValidator, login);

// Logout user (requires authentication)
router.post('/logout', protect, logout);

// Email verification
router.get('/verify-email', emailVerificationValidator, verifyEmail);

// Request password reset
router.post('/password-reset-request', passwordResetRequestValidator, requestPasswordReset);

// Reset password
router.post('/password-reset', passwordResetValidator, resetPassword);

// Send phone OTP
router.post('/phone-otp', phoneOtpValidator, sendOtp);

// Verify phone OTP
router.post('/verify-otp', phoneOtpValidator, verifyOtp);


// club routes
router.get('/clubs', getExistingClubs);
router.post('/create-club', createClub);

module.exports = router;
