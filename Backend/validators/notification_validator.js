/**
 * backend/validators/notification_validator.js
 *
 * Validation layer for Notification model
 * ------------------------------------------------------
 * - Ensures all required fields are present
 * - Validates enums (roles, type, priority)
 * - Validates references (user, event, result, feedback, payment)
 * - Validates optional fields: attachments, tags, actionLink, repeat, expireAt
 * - Validates OTP creation rules
 * - Can be used as middleware in routes
 */

const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Allowed enums
const ROLE_ENUM = ["public", "student", "organizer", "faculty", "admin"];
const TYPE_ENUM = ["general", "event", "payment", "result", "otp"];
const PRIORITY_ENUM = ["low", "normal", "high"];

// Helper to check ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Middleware to handle validation result
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

// -------------------- CREATE / UPDATE NOTIFICATION --------------------
const createNotificationValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").optional().isString().withMessage("Description must be a string"),
  body("sender")
    .notEmpty()
    .withMessage("Sender is required")
    .custom((value) => isValidObjectId(value))
    .withMessage("Sender must be a valid ObjectId"),
  body("recipient")
    .optional()
    .custom((value) => !value || isValidObjectId(value))
    .withMessage("Recipient must be a valid ObjectId or null"),
  body("roles")
    .optional()
    .isArray()
    .withMessage("Roles must be an array")
    .custom((roles) => roles.every((r) => ROLE_ENUM.includes(r)))
    .withMessage(`Roles must be one of ${ROLE_ENUM.join(", ")}`),
  body("priority")
    .optional()
    .isIn(PRIORITY_ENUM)
    .withMessage(`Priority must be one of ${PRIORITY_ENUM.join(", ")}`),
  body("type")
    .optional()
    .isIn(TYPE_ENUM)
    .withMessage(`Type must be one of ${TYPE_ENUM.join(", ")}`),
  body("event").optional().custom((id) => !id || isValidObjectId(id)).withMessage("Invalid Event ID"),
  body("result").optional().custom((id) => !id || isValidObjectId(id)).withMessage("Invalid Result ID"),
  body("feedback").optional().custom((id) => !id || isValidObjectId(id)).withMessage("Invalid Feedback ID"),
  body("payment").optional().custom((id) => !id || isValidObjectId(id)).withMessage("Invalid Payment ID"),
  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array of URLs")
    .custom((arr) => arr.every((url) => typeof url === "string"))
    .withMessage("Attachments must be strings"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array of strings")
    .custom((arr) => arr.every((t) => typeof t === "string")),
  body("actionLink").optional().isString().withMessage("Action link must be a string"),
  body("expireAt").optional().isISO8601().toDate().withMessage("expireAt must be a valid date"),
  body("repeat").optional().custom((repeat) => {
    if (typeof repeat !== "object") return false;
    const { frequency, interval, endDate } = repeat;
    const FREQUENCIES = ["daily", "weekly", "monthly"];
    if (frequency && !FREQUENCIES.includes(frequency)) return false;
    if (interval && (typeof interval !== "number" || interval < 1)) return false;
    if (endDate && isNaN(Date.parse(endDate))) return false;
    return true;
  }).withMessage("Invalid repeat object"),
  handleValidationErrors,
];

// -------------------- OTP VALIDATION --------------------
const validateOTPValidator = [
  param("notificationId")
    .notEmpty()
    .withMessage("Notification ID is required")
    .custom((value) => isValidObjectId(value))
    .withMessage("Notification ID must be a valid ObjectId"),
  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isString()
    .withMessage("OTP must be a string"),
  handleValidationErrors,
];

// -------------------- PARAM VALIDATION --------------------
const notificationIdValidator = [
  param("notificationId")
    .notEmpty()
    .withMessage("Notification ID is required")
    .custom((value) => isValidObjectId(value))
    .withMessage("Notification ID must be a valid ObjectId"),
  handleValidationErrors,
];

module.exports = {
  createNotificationValidator,
  validateOTPValidator,
  notificationIdValidator,
};
