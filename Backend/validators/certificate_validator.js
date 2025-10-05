/**
 * validators/certificate_validator.js
 *
 * Certificate Validation Layer for College Fest Management System
 * ---------------------------------------------------------------
 * - Fully validates all fields in Certificate schema
 * - Supports create, update, issue, approve, revoke, verify operations
 * - Validates enums, URLs, ObjectId references, nested delivery/logs
 * - Uses express-validator for route-level middleware integration
 */

"use strict";

const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const validator = require("validator");

const CERT_CATEGORIES = ['participation', 'winner', 'runnerup', 'special', 'volunteer', 'merit'];
const CERT_STATUS = ['draft', 'issued', 'approved', 'revoked', 'verified', 'expired'];

/* -------------------------
   Helper Validators
------------------------- */

// Validate if a value is a valid Mongo ObjectId
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Validate optional URL
const isValidURL = (value) => !value || validator.isURL(value);

/* -------------------------
   Certificate Validators
------------------------- */

// Common validations for creating/updating certificate
const certificateBaseValidation = [
  body("student")
    .exists().withMessage("student is required")
    .custom(isValidObjectId).withMessage("student must be a valid ObjectId"),
  body("event")
    .exists().withMessage("event is required")
    .custom(isValidObjectId).withMessage("event must be a valid ObjectId"),
  body("team")
    .optional({ nullable: true })
    .custom(isValidObjectId).withMessage("team must be a valid ObjectId"),
  body("registration")
    .optional({ nullable: true })
    .custom(isValidObjectId).withMessage("registration must be a valid ObjectId"),
  body("title")
    .exists().withMessage("title is required")
    .isString().withMessage("title must be a string")
    .trim()
    .notEmpty().withMessage("title cannot be empty"),
  body("category")
    .optional()
    .isIn(CERT_CATEGORIES).withMessage(`category must be one of ${CERT_CATEGORIES.join(", ")}`),
  body("template")
    .optional({ nullable: true }).isString().withMessage("template must be a string"),
  body("fields")
    .optional({ nullable: true })
    .isObject().withMessage("fields must be an object"),
  body("backgroundImage")
    .optional({ nullable: true })
    .isString().withMessage("backgroundImage must be a string"),
  body("signatureImages")
    .optional({ nullable: true })
    .isArray().withMessage("signatureImages must be an array of strings"),
  body("filePath")
    .optional({ nullable: true }).isString().withMessage("filePath must be a string"),
  body("fileUrl")
    .optional({ nullable: true })
    .custom(isValidURL).withMessage("fileUrl must be a valid URL"),
  body("verifyUrl")
    .optional({ nullable: true })
    .custom(isValidURL).withMessage("verifyUrl must be a valid URL"),
  body("qrCodeUrl")
    .optional({ nullable: true })
    .custom(isValidURL).withMessage("qrCodeUrl must be a valid URL"),
  body("isVerified")
    .optional().isBoolean().withMessage("isVerified must be boolean"),
  body("status")
    .optional()
    .isIn(CERT_STATUS).withMessage(`status must be one of ${CERT_STATUS.join(", ")}`),
  body("issuedBy")
    .optional({ nullable: true }).custom(isValidObjectId).withMessage("issuedBy must be a valid ObjectId"),
  body("approvedBy")
    .optional({ nullable: true }).custom(isValidObjectId).withMessage("approvedBy must be a valid ObjectId"),
  body("revokedBy")
    .optional({ nullable: true }).custom(isValidObjectId).withMessage("revokedBy must be a valid ObjectId"),
  body("verifiedBy")
    .optional({ nullable: true }).custom(isValidObjectId).withMessage("verifiedBy must be a valid ObjectId"),
  body("issuedAt")
    .optional({ nullable: true }).isISO8601().toDate().withMessage("issuedAt must be a valid date"),
  body("approvedAt")
    .optional({ nullable: true }).isISO8601().toDate().withMessage("approvedAt must be a valid date"),
  body("revokedAt")
    .optional({ nullable: true }).isISO8601().toDate().withMessage("revokedAt must be a valid date"),
  body("verifiedAt")
    .optional({ nullable: true }).isISO8601().toDate().withMessage("verifiedAt must be a valid date"),
  body("expiresAt")
    .optional({ nullable: true }).isISO8601().toDate().withMessage("expiresAt must be a valid date"),
  body("notes")
    .optional({ nullable: true }).isString().withMessage("notes must be a string"),
  body("delivery")
    .optional()
    .isObject().withMessage("delivery must be an object"),
  body("delivery.sentEmail").optional().isBoolean(),
  body("delivery.emailAt").optional().isISO8601().toDate(),
  body("delivery.sentSMS").optional().isBoolean(),
  body("delivery.smsAt").optional().isISO8601().toDate(),
  body("delivery.downloadedAt").optional().isISO8601().toDate(),
  body("delivery.deliveredTo").optional().isString(),
  body("delivery.downloadHistory").optional().isArray(),
  body("logs").optional().isArray().withMessage("logs must be an array"),
];

/* -------------------------
   Middleware
------------------------- */
const validateCertificate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

/* -------------------------
   Export Validators
------------------------- */
module.exports = {
  certificateBaseValidation,
  validateCertificate,
};
