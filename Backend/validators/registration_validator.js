/**
 * backend/validators/registration_validator.js
 *
 * Registration Validator
 * ----------------------
 * - Validates individual, team, guest registrations
 * - Payment details validation
 * - Document URLs validation
 * - Status & type enums validation
 * - Ensures consistency before hitting controllers
 */

const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const validator = require('validator');
const Registration = require('../models/registration_model');

// Allowed enums
const REG_STATUSES = ['pending', 'confirmed', 'waitlisted', 'cancelled', 'refunded', 'rejected'];
const PAYMENT_STATUSES = ['not-required', 'pending', 'completed', 'failed', 'refunded'];
const REG_TYPES = ['individual', 'team', 'guest'];
const PAYMENT_MODES = ['online', 'offline'];

// ----------------------------
// Helper: check ObjectId
// ----------------------------
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ----------------------------
// Middleware to handle validation results
// ----------------------------
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ----------------------------
// Registration creation validators
// ----------------------------
const createRegistrationValidator = [
  body('registrationType')
    .exists().withMessage('registrationType is required')
    .isIn(REG_TYPES).withMessage(`registrationType must be one of ${REG_TYPES.join(', ')}`),

  // Event ID required and valid
  body('event')
    .exists().withMessage('event is required')
    .custom(isValidObjectId).withMessage('Invalid event ID'),

  // Conditional validation based on registration type
  body('student')
    .if(body('registrationType').equals('individual'))
    .exists().withMessage('student ID is required for individual registration')
    .custom(isValidObjectId).withMessage('Invalid student ID'),

  body('team')
    .if(body('registrationType').equals('team'))
    .exists().withMessage('team ID is required for team registration')
    .custom(isValidObjectId).withMessage('Invalid team ID'),

  body('guestInfo')
    .if(body('registrationType').equals('guest'))
    .exists().withMessage('guestInfo is required for guest registration')
    .custom((value) => {
      if (!value.name || typeof value.name !== 'string') throw new Error('guestInfo.name is required');
      if (value.email && !validator.isEmail(value.email)) throw new Error('guestInfo.email must be valid');
      if (value.phone && typeof value.phone !== 'string') throw new Error('guestInfo.phone must be string');
      return true;
    }),

  // Optional: idProof and extraDocs
  body('idProof')
    .optional()
    .custom(v => !v || validator.isURL(v)).withMessage('idProof must be a valid URL'),

  body('extraDocs')
    .optional()
    .isArray().withMessage('extraDocs must be an array')
    .custom((docs) => {
      for (const doc of docs) {
        if (doc && !validator.isURL(doc)) throw new Error('Each extraDoc must be a valid URL');
      }
      return true;
    }),

  // Payment object validation
  body('payment')
    .optional()
    .custom((payment) => {
      if (payment.status && !PAYMENT_STATUSES.includes(payment.status)) throw new Error(`payment.status must be one of ${PAYMENT_STATUSES.join(', ')}`);
      if (payment.amount && typeof payment.amount !== 'number') throw new Error('payment.amount must be a number');
      if (payment.paymentMode && !PAYMENT_MODES.includes(payment.paymentMode)) throw new Error(`payment.paymentMode must be one of ${PAYMENT_MODES.join(', ')}`);
      return true;
    }),

  handleValidation
];

// ----------------------------
// Registration update validators
// ----------------------------
const updateRegistrationValidator = [
  param('id')
    .exists().withMessage('registration ID is required')
    .custom(isValidObjectId).withMessage('Invalid registration ID'),

  body('status')
    .optional()
    .isIn(REG_STATUSES).withMessage(`status must be one of ${REG_STATUSES.join(', ')}`),

  body('registrationType')
    .optional()
    .isIn(REG_TYPES).withMessage(`registrationType must be one of ${REG_TYPES.join(', ')}`),

  body('student')
    .optional()
    .custom(isValidObjectId).withMessage('Invalid student ID'),

  body('team')
    .optional()
    .custom(isValidObjectId).withMessage('Invalid team ID'),

  body('guestInfo')
    .optional()
    .custom((value) => {
      if (value.name && typeof value.name !== 'string') throw new Error('guestInfo.name must be string');
      if (value.email && !validator.isEmail(value.email)) throw new Error('guestInfo.email must be valid');
      if (value.phone && typeof value.phone !== 'string') throw new Error('guestInfo.phone must be string');
      return true;
    }),

  body('payment')
    .optional()
    .custom((payment) => {
      if (payment.status && !PAYMENT_STATUSES.includes(payment.status)) throw new Error(`payment.status must be one of ${PAYMENT_STATUSES.join(', ')}`);
      if (payment.amount && typeof payment.amount !== 'number') throw new Error('payment.amount must be a number');
      if (payment.paymentMode && !PAYMENT_MODES.includes(payment.paymentMode)) throw new Error(`payment.paymentMode must be one of ${PAYMENT_MODES.join(', ')}`);
      return true;
    }),

  body('idProof')
    .optional()
    .custom(v => !v || validator.isURL(v)).withMessage('idProof must be a valid URL'),

  body('extraDocs')
    .optional()
    .isArray().withMessage('extraDocs must be an array')
    .custom((docs) => {
      for (const doc of docs) {
        if (doc && !validator.isURL(doc)) throw new Error('Each extraDoc must be a valid URL');
      }
      return true;
    }),

  handleValidation
];

// ----------------------------
// Param validator for registration ID
// ----------------------------
const registrationIdParamValidator = [
  param('id')
    .exists().withMessage('registration ID is required')
    .custom(isValidObjectId).withMessage('Invalid registration ID'),
  handleValidation
];

// ----------------------------
// Query validators for listing
// ----------------------------
const listRegistrationQueryValidator = [
  query('status')
    .optional()
    .isIn(REG_STATUSES).withMessage(`status must be one of ${REG_STATUSES.join(', ')}`),

  query('type')
    .optional()
    .isIn(REG_TYPES).withMessage(`type must be one of ${REG_TYPES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be integer between 1 and 100'),

  handleValidation
];

module.exports = {
  createRegistrationValidator,
  updateRegistrationValidator,
  registrationIdParamValidator,
  listRegistrationQueryValidator
};
