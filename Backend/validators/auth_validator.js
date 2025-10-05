/**
 * backend/validators/auth_validator.js
 * Validation for authentication routes: register, login, password reset, email verification, phone OTP
 */

const { body, param, query } = require('express-validator');
const User = require('../models/user_model');

const registerValidator = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 120 }).withMessage('Name must be between 2 and 120 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email')
    .custom(async (email) => {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) throw new Error('Email already in use');
      return true;
    }),
  
  body('password')
    .if(body('provider').equals('local').exists())
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['public', 'student', 'organizer', 'faculty', 'admin']).withMessage('Invalid role'),

  body('department')
    .if(body('role').equals('student'))
    .notEmpty().withMessage('Department is required for students'),

  body('year')
    .if(body('role').equals('student'))
    .notEmpty().withMessage('Year is required for students'),

  body('rollNumber')
    .if(body('role').equals('student'))
    .notEmpty().withMessage('Roll number is required for students'),

  body('designation')
    .if(body('role').equals('faculty'))
    .notEmpty().withMessage('Designation is required for faculty'),

  body('club')
    .if(body('role').equals('organizer'))
    .notEmpty().withMessage('Club is required for organizers'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any').withMessage('Invalid phone number')
    .custom(async (phone) => {
      if (!phone) return true;
      const existing = await User.findOne({ phone });
      if (existing) throw new Error('Phone number already in use');
      return true;
    })
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email'),

  body('password')
    .notEmpty().withMessage('Password is required')
];

const emailVerificationValidator = [
  query('token')
    .notEmpty().withMessage('Verification token is required')
];

const passwordResetRequestValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email')
];

const passwordResetValidator = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const phoneOtpValidator = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone('any').withMessage('Invalid phone number'),

  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

module.exports = {
  registerValidator,
  loginValidator,
  emailVerificationValidator,
  passwordResetRequestValidator,
  passwordResetValidator,
  phoneOtpValidator
};

