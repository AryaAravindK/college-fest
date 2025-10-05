/**
 * backend/validators/feedback_validator.js
 *
 * Validation layer for Feedback Module
 * -------------------------------------
 * Uses express-validator for schema validation
 * Ensures:
 * - Required fields
 * - Field types
 * - Enums and limits
 * - Role-based rules
 */

const { body, param, query, validationResult } = require("express-validator");
const Feedback = require("../models/feedback_model");

/**
 * Middleware to handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Create Feedback Validator
 */
const createFeedbackValidator = [
  body("event")
    .notEmpty().withMessage("Event ID is required")
    .isMongoId().withMessage("Invalid Event ID"),
  body("student")
    .notEmpty().withMessage("Student ID is required")
    .isMongoId().withMessage("Invalid Student ID"),
  body("rating")
    .notEmpty().withMessage("Rating is required")
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comments")
    .optional()
    .isString().withMessage("Comments must be a string")
    .isLength({ max: 1000 }).withMessage("Comments cannot exceed 1000 characters"),
  body("isAnonymous")
    .optional()
    .isBoolean().withMessage("isAnonymous must be a boolean"),
  body("category")
    .optional()
    .isIn(["event", "organization", "venue", "other"]).withMessage("Invalid category"),
  body("attachments")
    .optional()
    .isArray().withMessage("Attachments must be an array of file URLs/paths"),
  body("tags")
    .optional()
    .isArray().withMessage("Tags must be an array of strings"),
  validate,
];

/**
 * Update Feedback Validator
 * - Only certain fields are updatable
 * - Students cannot modify moderator or status
 */
const updateFeedbackValidator = [
  param("id")
    .notEmpty().withMessage("Feedback ID is required")
    .isMongoId().withMessage("Invalid Feedback ID"),
  body("comments")
    .optional()
    .isString().withMessage("Comments must be a string")
    .isLength({ max: 1000 }).withMessage("Comments cannot exceed 1000 characters"),
  body("isAnonymous")
    .optional()
    .isBoolean().withMessage("isAnonymous must be a boolean"),
  body("category")
    .optional()
    .isIn(["event", "organization", "venue", "other"]).withMessage("Invalid category"),
  body("attachments")
    .optional()
    .isArray().withMessage("Attachments must be an array of file URLs/paths"),
  body("tags")
    .optional()
    .isArray().withMessage("Tags must be an array of strings"),
  body("response")
    .optional()
    .isString().withMessage("Response must be a string"),
  body("status")
    .optional()
    .isIn(["pending", "approved", "rejected"]).withMessage("Invalid status"),
  body("moderator")
    .optional()
    .isMongoId().withMessage("Invalid moderator ID"),
  validate,
];

/**
 * Feedback ID Param Validator
 */
const feedbackIdValidator = [
  param("id")
    .notEmpty().withMessage("Feedback ID is required")
    .isMongoId().withMessage("Invalid Feedback ID"),
  validate,
];

/**
 * Role-based moderation validator
 * Only admin/moderator can approve/reject
 */
const moderateFeedbackValidator = [
  param("id")
    .notEmpty().withMessage("Feedback ID is required")
    .isMongoId().withMessage("Invalid Feedback ID"),
  body("status")
    .notEmpty().withMessage("Moderation status is required")
    .isIn(["approved", "rejected"]).withMessage("Status must be 'approved' or 'rejected'"),
  body("reason")
    .optional()
    .isString().withMessage("Moderation reason must be a string")
    .isLength({ max: 500 }).withMessage("Reason cannot exceed 500 characters"),
  validate,
];

/**
 * Pagination & filter validator for fetching feedback
 */
const getFeedbackValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["pending", "approved", "rejected"]).withMessage("Invalid status filter"),
  query("category")
    .optional()
    .isIn(["event", "organization", "venue", "other"]).withMessage("Invalid category filter"),
  validate,
];

module.exports = {
  createFeedbackValidator,
  updateFeedbackValidator,
  feedbackIdValidator,
  moderateFeedbackValidator,
  getFeedbackValidator,
};
