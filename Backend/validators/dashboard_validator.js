/**
 * backend/validators/dashboard_validator.js
 *
 * Validation layer for role-based dashboards
 * Covers query params: limit, startDate, endDate, refreshToken
 * Matches backend/controllers/dashboard_controller.js usage
 */

const { query } = require('express-validator');
const mongoose = require('mongoose');

/* -------------------------
   Common reusable validators
------------------------- */

// limit (positive int, max 100)
const limitValidator = query('limit')
  .optional()
  .isInt({ min: 1, max: 100 })
  .withMessage('Limit must be an integer between 1 and 100');

// startDate and endDate (ISO8601 dates)
const startDateValidator = query('startDate')
  .optional()
  .isISO8601()
  .toDate()
  .withMessage('startDate must be a valid ISO8601 date');

const endDateValidator = query('endDate')
  .optional()
  .isISO8601()
  .toDate()
  .withMessage('endDate must be a valid ISO8601 date');

// refreshToken (boolean flag: 0/1/true/false)
const refreshTokenValidator = query('refreshToken')
  .optional()
  .isIn(['0', '1', 'true', 'false'])
  .withMessage('refreshToken must be 0/1/true/false');

/* -------------------------
   Role-based validator groups
------------------------- */

/**
 * Student dashboard
 * Query params: limit, startDate, endDate, refreshToken
 */
const studentDashboardValidators = [
  limitValidator,
  startDateValidator,
  endDateValidator,
  refreshTokenValidator
];

/**
 * Organizer dashboard
 * Query params: limit, startDate, endDate
 */
const organizerDashboardValidators = [
  limitValidator,
  startDateValidator,
  endDateValidator
];

/**
 * Faculty dashboard
 * Query params: limit
 */
const facultyDashboardValidators = [
  limitValidator
];

/**
 * Admin dashboard
 * Query params: limit
 */
const adminDashboardValidators = [
  limitValidator
];

/* -------------------------
   Export all validator groups
------------------------- */
module.exports = {
  studentDashboardValidators,
  organizerDashboardValidators,
  facultyDashboardValidators,
  adminDashboardValidators
};
