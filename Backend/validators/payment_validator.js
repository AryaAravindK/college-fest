/**
 * backend/validators/payment_validator.js
 *
 * Payment Validation for College Fest Management System
 * -----------------------------------------------------
 * - Fully aligned with payment_model.js
 * - Uses express-validator for request validation
 * - Validates required fields, enums, number ranges, URLs, and optional notes
 */

"use strict";

const { body, param, query, validationResult } = require("express-validator");
const validator = require("validator");

/**
 * 🔹 Validate Payment Creation
 */
const validateCreatePayment = [
  body("registration")
    .notEmpty()
    .withMessage("Registration ID is required")
    .isMongoId()
    .withMessage("Invalid Registration ID"),
  body("student")
    .notEmpty()
    .withMessage("Student ID is required")
    .isMongoId()
    .withMessage("Invalid Student ID"),
  body("event")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Invalid Event ID"),
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a positive number"),
  body("paymentMode")
    .optional()
    .isIn(["online", "offline"])
    .withMessage("Payment mode must be either 'online' or 'offline'"),
  body("offlineReceiptNumber")
    .optional()
    .isString()
    .withMessage("Offline receipt must be a string"),
  body("bankName")
    .optional()
    .isString()
    .withMessage("Bank name must be a string"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string"),
  body("mockPaymentLink")
    .optional()
    .custom((value) => {
      if (!validator.isURL(value)) throw new Error("Invalid URL for mockPaymentLink");
      return true;
    }),
];

/**
 * 🔹 Validate Payment ID parameter
 */
const validatePaymentIdParam = [
  param("paymentId")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isMongoId()
    .withMessage("Invalid Payment ID"),
];

/**
 * 🔹 Validate Payment Status Update
 */
const validateUpdatePaymentStatus = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "success", "failed", "refunded"])
    .withMessage("Status must be one of pending, success, failed, refunded"),
  body("reason")
    .optional()
    .isString()
    .withMessage("Reason must be a string"),
  body("performedBy")
    .optional()
    .isMongoId()
    .withMessage("Invalid User ID for performedBy"),
];

/**
 * 🔹 Validate Soft Delete
 */
const validateSoftDelete = [
  body("performedBy")
    .optional()
    .isMongoId()
    .withMessage("Invalid User ID for performedBy"),
];

/**
 * 🔹 Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

module.exports = {
  validateCreatePayment,
  validatePaymentIdParam,
  validateUpdatePaymentStatus,
  validateSoftDelete,
  handleValidationErrors,
};
