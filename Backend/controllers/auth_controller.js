/**
 * backend/controllers/auth_controller.js
 * Authentication controller: register, login, logout, email verification, password reset, phone OTP
 */
require('../models/sponsor_model'); 
const User = require('../models/user_model');
const Club = require('../models/club_model');
const { validationResult } = require('express-validator');
const {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPhoneOtp
} = require('../utils/auth_util');

/**
 * Register new user
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { firstName, email, password, role, department, year, rollNumber, designation, club, phone } = req.body;

    const user = new User({
      firstName,
      email,
      password,
      role,
      department,
      year,
      rollNumber,
      designation,
      club,
      phone
    });

    await user.save();

    // Send email verification if provider is local
    if (user.provider === 'local') {
      await sendVerificationEmail(user);
    }

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.getPublicProfile(),
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
      return res.status(403).json({ message: 'Account locked due to multiple failed login attempts' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await user.resetLoginAttempts();

    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      user: user.getPublicProfile(),
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    req.user.revokeTokens('User logged out', req.user._id);
    await req.user.save();
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Logout failed', error: err.message });
  }
};
const getExistingClubs = async (req, res) => {
  try {
    const clubs = await Club.find();
    res.status(200).json({ message: 'exsisting Clubs fetched sucessfully ', "clubs": clubs});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'error', error: err.message });
  }
};
const createClub = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existingClub = await Club.findOne({ name });
    if (existingClub) {
      return res.status(400).json({ message: 'Club already exists' });
    } 
    const club = new Club({ name, description });
    await club.save();
    res.status(201).json({ message: 'Club created successfully', club });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'error', error: err.message });
  }
};

/**
 * Verify email
 */
const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Verification token missing' });

  try {
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Token invalid or expired' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Email verification failed', error: err.message });
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await sendPasswordResetEmail(user);

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Request failed', error: err.message });
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { token, password } = req.body;
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Token invalid or expired' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Password reset failed', error: err.message });
  }
};

/**
 * Send phone OTP
 */
const sendOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await sendPhoneOtp(user);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

/**
 * Verify phone OTP
 */
const verifyOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isValid = user.verifyPhoneOtp(otp);
    if (!isValid) return res.status(400).json({ message: 'Invalid or expired OTP' });

    await user.save();

    res.status(200).json({ message: 'Phone verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  sendOtp,
  verifyOtp,
  getExistingClubs,
  createClub
};
