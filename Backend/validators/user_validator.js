/**
 * backend/validators/user_validator.js
 * Validation for user-related routes: update profile, role changes, filtering, etc.
 */

const { body, param, query } = require('express-validator');
const User = require('../models/user_model');

const updateUserValidator = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid User ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 }).withMessage('Name must be between 2 and 120 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email')
    .custom(async (email, { req }) => {
      const userId = req.params.id;
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existing) throw new Error('Email already in use');
      return true;
    }),

  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('role')
    .optional()
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
    .custom(async (phone, { req }) => {
      const userId = req.params.id;
      const existing = await User.findOne({ phone, _id: { $ne: userId } });
      if (existing) throw new Error('Phone number already in use');
      return true;
    }),

  body('status')
    .optional()
    .isIn(['active', 'suspended', 'deleted']).withMessage('Invalid status')
];

const filterUsersValidator = [
  query('role')
    .optional()
    .isIn(['public', 'student', 'organizer', 'faculty', 'admin']).withMessage('Invalid role'),

  query('department').optional().trim(),
  query('year').optional().trim(),
  query('club').optional().trim(),
  query('status')
    .optional()
    .isIn(['active', 'suspended', 'deleted']).withMessage('Invalid status')
];

module.exports = {
  updateUserValidator,
  filterUsersValidator
};
