/**
 * backend/validators/event_validator.js
 *
 * Event Validator
 * - Fully aligns with event_model.js
 * - Uses express-validator style helpers
 * - Can be used in routes as middleware
 */

const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');
const mongoose = require('mongoose');
const Event = require('../models/event_model');

const EVENT_TYPES = ['inter-college', 'intra-college'];
const EVENT_STATUS = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
const EVENT_MODE = ['offline', 'online', 'hybrid'];

/**
 * validateEventFields
 * - Middleware array to validate event creation/updation
 */
const validateEventFields = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),

  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string'),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().toDate().withMessage('Start date must be a valid ISO8601 date'),

  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().toDate().withMessage('End date must be a valid ISO8601 date')
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date cannot be before start date');
      }
      return true;
    }),

  body('registrationDeadline')
    .notEmpty().withMessage('Registration deadline is required')
    .isISO8601().toDate().withMessage('Registration deadline must be a valid date')
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) > new Date(req.body.startDate)) {
        throw new Error('Registration deadline must be before start date');
      }
      return true;
    }),

  body('type')
    .notEmpty().withMessage('Event type is required')
    .isIn(EVENT_TYPES).withMessage(`Event type must be one of: ${EVENT_TYPES.join(', ')}`),

  body('mode')
    .optional()
    .isIn(EVENT_MODE).withMessage(`Event mode must be one of: ${EVENT_MODE.join(', ')}`),

  body('meetingLink')
    .optional({ nullable: true })
    .custom((value) => {
      if (value && !validator.isURL(value, { require_protocol: true })) {
        throw new Error('meetingLink must be a valid URL with protocol');
      }
      return true;
    }),

  body('capacity')
    .notEmpty().withMessage('Capacity is required')
    .isInt({ min: 0 }).withMessage('Capacity cannot be negative'),

  body('isPaid')
    .optional()
    .isBoolean().withMessage('isPaid must be boolean'),

  body('fee')
    .optional()
    .custom((value, { req }) => {
      if (req.body.isPaid && (value === undefined || value <= 0)) {
        throw new Error('Paid events must have a positive fee');
      }
      return true;
    }),

  body('venues')
    .optional()
    .isArray().withMessage('venues must be an array of strings'),

  body('venue')
    .optional()
    .isString().withMessage('venue must be a string'),

  body('category')
    .optional()
    .isString().withMessage('Category must be a string'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array of strings'),

  body('attachments')
    .optional()
    .isArray().withMessage('Attachments must be an array of valid URLs')
    .custom((arr) => {
      arr.forEach(url => {
        if (url && !validator.isURL(url)) {
          throw new Error('All attachments must be valid URLs');
        }
      });
      return true;
    }),

  body('coordinators')
    .optional()
    .isArray().withMessage('Coordinators must be an array of user IDs')
    .custom((arr) => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid coordinator IDs'),

  body('volunteers')
    .optional()
    .isArray().withMessage('Volunteers must be an array of user IDs')
    .custom((arr) => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid volunteer IDs'),

  body('judges')
    .optional()
    .isArray().withMessage('Judges must be an array of user IDs')
    .custom((arr) => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid judge IDs'),

  body('sessions')
    .optional()
    .isArray().withMessage('Sessions must be an array')
    .custom((arr) => {
      arr.forEach(session => {
        if (!session.title || !session.startDate || !session.endDate) {
          throw new Error('Each session must have title, startDate and endDate');
        }
        if (new Date(session.endDate) < new Date(session.startDate)) {
          throw new Error('Session endDate cannot be before startDate');
        }
      });
      return true;
    }),

  // status is optional, defaults handled in model
  body('status')
    .optional()
    .isIn(EVENT_STATUS).withMessage(`Status must be one of: ${EVENT_STATUS.join(', ')}`),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * validateSlugParam
 * - Used for routes like /events/:slug
 */
const validateSlugParam = [
  param('slug')
    .notEmpty().withMessage('Slug is required')
    .isString().withMessage('Slug must be a string'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    next();
  }
];

/**
 * validatePaginationQuery
 * - For listing events with pagination
 */
const validatePaginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    next();
  }
];

module.exports = {
  validateEventFields,
  validateSlugParam,
  validatePaginationQuery
};
