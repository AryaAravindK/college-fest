/**
 * backend/validators/result_validator.js
 *
 * Result Validator
 * ----------------
 * Validates request payloads for creating/updating results.
 * Covers all fields including nested arrays and audit logs.
 */

const Joi = require("joi");
const mongoose = require("mongoose");

/**
 * 🔹 Helper to validate Mongo ObjectId
 */
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message(`${value} is not a valid ObjectId`);
  }
  return value;
};

/**
 * 🔹 Base Result Schema (used for create/update)
 */
const baseResultSchema = Joi.object({
  event: Joi.string().required().custom(objectIdValidator, "ObjectId validation"),
  student: Joi.string().required().custom(objectIdValidator, "ObjectId validation"),
  team: Joi.string().optional().allow(null).custom(objectIdValidator, "ObjectId validation"),
  score: Joi.number().optional().allow(null).min(0),
  position: Joi.string().optional().allow(null, "").max(50),
  category: Joi.string().optional().trim().default("general").max(100),
  remarks: Joi.string().optional().trim().max(1000).allow(""),
  status: Joi.string().valid("pending", "approved", "rejected").optional().default("pending"),
  enteredBy: Joi.string().optional().allow(null).custom(objectIdValidator, "ObjectId validation"),
  approvedBy: Joi.string().optional().allow(null).custom(objectIdValidator, "ObjectId validation"),
  approvedAt: Joi.date().optional().allow(null),
  certificates: Joi.array().items(Joi.string().trim().max(500)).optional().default([]),
  scoreSheets: Joi.array().items(Joi.string().trim().max(500)).optional().default([]),
  media: Joi.array().items(Joi.string().trim().max(500)).optional().default([]),
  auditLogs: Joi.array()
    .items(
      Joi.object({
        action: Joi.string().required().max(50),
        performedBy: Joi.string().required().custom(objectIdValidator, "ObjectId validation"),
        date: Joi.date().optional().default(() => new Date()), // ✅ fixed here
        notes: Joi.string().trim().optional().allow("").max(1000),
      })
    )
    .optional()
    .default([]),
  createdBy: Joi.string().optional().allow(null).custom(objectIdValidator, "ObjectId validation"),
  updatedBy: Joi.string().optional().allow(null).custom(objectIdValidator, "ObjectId validation"),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional().default([]),
  isHighlighted: Joi.boolean().optional().default(false),
  points: Joi.number().optional().default(0),
  feedbackLink: Joi.string().trim().optional().allow(null, "").max(500),
  eventDate: Joi.date().optional().allow(null),
});

/**
 * 🔹 Validator for creating a result
 */
function validateCreateResult(data) {
  return baseResultSchema
    .fork(
      ["status", "enteredBy", "approvedBy", "approvedAt", "auditLogs", "createdBy", "updatedBy", "points"],
      (schema) => schema.forbidden()
    )
    .validateAsync(data, { abortEarly: false });
}

/**
 * 🔹 Validator for updating a result
 */
function validateUpdateResult(data) {
  return baseResultSchema
    .fork(["event", "student", "createdBy"], (schema) => schema.forbidden())
    .validateAsync(data, { abortEarly: false });
}

/**
 * 🔹 Validator for approving/rejecting a result
 */
const approveRejectSchema = Joi.object({
  reason: Joi.string().trim().optional().max(1000),
});

function validateApproveReject(data) {
  return approveRejectSchema.validateAsync(data, { abortEarly: false });
}

module.exports = {
  validateCreateResult,
  validateUpdateResult,
  validateApproveReject,
};
