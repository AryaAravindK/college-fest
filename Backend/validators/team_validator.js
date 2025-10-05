/**
 * team_validator.js
 * -----------------------
 * Validation for Team-related operations.
 * Uses express-validator for request validation.
 * Validates:
 * - Create/Update team
 * - Member addition/removal
 * - Coordinator addition/removal
 * - Leader assignment
 * - Status change
 */

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

const TEAM_STATUS = ['active', 'disbanded', 'suspended'];

module.exports = {
  createTeam: [
    body('name')
      .trim()
      .notEmpty().withMessage('Team name is required')
      .isLength({ min: 2, max: 120 }).withMessage('Team name must be 2-120 characters'),

    body('event')
      .notEmpty().withMessage('Associated event is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid event ID'),

    body('leader')
      .optional()
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid leader ID'),

    body('members')
      .optional()
      .isArray().withMessage('Members must be an array')
      .custom(arr => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid member IDs'),

    body('coordinators')
      .optional()
      .isArray().withMessage('Coordinators must be an array')
      .custom(arr => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid coordinator IDs'),

    body('volunteers')
      .optional()
      .isArray().withMessage('Volunteers must be an array')
      .custom(arr => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid volunteer IDs'),

    body('minMembers')
      .optional()
      .isInt({ min: 1 }).withMessage('minMembers must be at least 1'),

    body('maxMembers')
      .optional()
      .custom(value => value === null || (Number.isInteger(value) && value > 0)).withMessage('maxMembers must be null or a positive integer'),

    body('attachments')
      .optional()
      .isArray().withMessage('Attachments must be an array')
      .custom(arr => arr.every(url => !url || typeof url === 'string')).withMessage('Attachments must be valid URLs'),

    body('status')
      .optional()
      .isIn(TEAM_STATUS).withMessage(`Status must be one of: ${TEAM_STATUS.join(', ')}`),

    body('statusReason')
      .optional()
      .isString().withMessage('Status reason must be a string'),

    body('notes')
      .optional()
      .isString().withMessage('Notes must be a string')
  ],

  updateTeam: [
    param('teamId')
      .notEmpty().withMessage('Team ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid team ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 120 }).withMessage('Team name must be 2-120 characters'),

    body('leader')
      .optional()
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid leader ID'),

    body('members')
      .optional()
      .isArray().withMessage('Members must be an array')
      .custom(arr => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid member IDs'),

    body('coordinators')
      .optional()
      .isArray().withMessage('Coordinators must be an array')
      .custom(arr => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid coordinator IDs'),

    body('volunteers')
      .optional()
      .isArray().withMessage('Volunteers must be an array')
      .custom(arr => arr.every(id => mongoose.Types.ObjectId.isValid(id))).withMessage('Invalid volunteer IDs'),

    body('minMembers')
      .optional()
      .isInt({ min: 1 }).withMessage('minMembers must be at least 1'),

    body('maxMembers')
      .optional()
      .custom(value => value === null || (Number.isInteger(value) && value > 0)).withMessage('maxMembers must be null or a positive integer'),

    body('attachments')
      .optional()
      .isArray().withMessage('Attachments must be an array')
      .custom(arr => arr.every(url => !url || typeof url === 'string')).withMessage('Attachments must be valid URLs'),

    body('status')
      .optional()
      .isIn(TEAM_STATUS).withMessage(`Status must be one of: ${TEAM_STATUS.join(', ')}`),

    body('statusReason')
      .optional()
      .isString().withMessage('Status reason must be a string'),

    body('notes')
      .optional()
      .isString().withMessage('Notes must be a string')
  ],

  memberAction: [
    param('teamId')
      .notEmpty().withMessage('Team ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid team ID'),

    body('userId')
      .notEmpty().withMessage('User ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid user ID')
  ],

  coordinatorAction: [
    param('teamId')
      .notEmpty().withMessage('Team ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid team ID'),

    body('userId')
      .notEmpty().withMessage('User ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid user ID')
  ],

  leaderAction: [
    param('teamId')
      .notEmpty().withMessage('Team ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid team ID'),

    body('leaderId')
      .notEmpty().withMessage('Leader ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid leader ID')
  ],

  changeStatus: [
    param('teamId')
      .notEmpty().withMessage('Team ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid team ID'),

    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(TEAM_STATUS).withMessage(`Status must be one of: ${TEAM_STATUS.join(', ')}`),

    body('reason')
      .optional()
      .isString().withMessage('Reason must be a string')
  ],

  getTeam: [
    param('teamId')
      .notEmpty().withMessage('Team ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid team ID')
  ],

  listTeams: [
    query('event')
      .optional()
      .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid event ID'),

    query('status')
      .optional()
      .isIn(TEAM_STATUS).withMessage(`Status must be one of: ${TEAM_STATUS.join(', ')}`),

    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be integer >= 1'),

    query('limit')
      .optional()
      .isInt({ min: 1 }).withMessage('Limit must be integer >= 1')
  ]
};
