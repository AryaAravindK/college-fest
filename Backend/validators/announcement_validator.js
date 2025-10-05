/**
 * backend/validators/announcement_validator.js
 *
 * Validator for Announcement requests
 * ------------------------------------------------
 * Uses express-validator style for:
 * - Create / Update Announcement
 * - All fields aligned with announcement_model.js
 */

const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Announcement = require("../models/announcement_model");
const validator = require("validator");

/**
 * 🔹 Custom ObjectId check
 */
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * 🔹 Create Announcement Validator
 */
const createAnnouncementValidator = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("event")
    .optional()
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid Event ID"),

  body("isPublic").optional().isBoolean().withMessage("isPublic must be a boolean"),

  body("roles")
    .optional()
    .isArray()
    .withMessage("Roles must be an array")
    .custom((roles) => {
      const allowedRoles = ["public", "student", "faculty", "organizer", "admin"];
      return roles.every((r) => allowedRoles.includes(r));
    })
    .withMessage("Invalid roles array"),

  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Priority must be one of: low, normal, high, urgent"),

  body("attachmentUrl")
    .optional()
    .isString()
    .withMessage("attachmentUrl must be a string")
    .custom((url) => !url || validator.isURL(url))
    .withMessage("attachmentUrl must be a valid URL"),

  body("departments").optional().isArray().withMessage("departments must be an array of strings"),
  body("years").optional().isArray().withMessage("years must be an array of strings"),
  body("clubs").optional().isArray().withMessage("clubs must be an array of strings"),

  body("notifyEmail").optional().isBoolean().withMessage("notifyEmail must be boolean"),
  body("notifySms").optional().isBoolean().withMessage("notifySms must be boolean"),

  body("validFrom")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("validFrom must be a valid date"),
  body("validTo")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("validTo must be a valid date"),

  body("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string")
    .custom(async (slug) => {
      const existing = await Announcement.findOne({ slug });
      if (existing) throw new Error("Slug must be unique");
      return true;
    }),

  // Handle validation result
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

/**
 * 🔹 Update Announcement Validator
 * Similar to create, but all fields optional
 */
const updateAnnouncementValidator = [
  body("title").optional().isString().isLength({ max: 150 }),
  body("description").optional().isString().isLength({ max: 2000 }),
  body("event").optional().custom((value) => isValidObjectId(value)),
  body("isPublic").optional().isBoolean(),
  body("roles")
    .optional()
    .isArray()
    .custom((roles) => roles.every((r) => ["public", "student", "faculty", "organizer", "admin"].includes(r))),
  body("priority").optional().isIn(["low", "normal", "high", "urgent"]),
  body("attachmentUrl").optional().custom((url) => !url || validator.isURL(url)),
  body("departments").optional().isArray(),
  body("years").optional().isArray(),
  body("clubs").optional().isArray(),
  body("notifyEmail").optional().isBoolean(),
  body("notifySms").optional().isBoolean(),
  body("validFrom").optional().isISO8601().toDate(),
  body("validTo").optional().isISO8601().toDate(),
  body("slug")
    .optional()
    .isString()
    .custom(async (slug, { req }) => {
      const existing = await Announcement.findOne({ slug });
      if (existing && existing._id.toString() !== req.params.id) {
        throw new Error("Slug must be unique");
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
];

/**
 * 🔹 Params Validator (for ID)
 */
const announcementIdValidator = [
  param("id")
    .notEmpty()
    .withMessage("Announcement ID is required")
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid Announcement ID"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
];

/**
 * 🔹 Query Validator (for filtering)
 */
const announcementQueryValidator = [
  query("role").optional().isIn(["public", "student", "faculty", "organizer", "admin"]),
  query("department").optional().isString(),
  query("year").optional().isString(),
  query("club").optional().isString(),
  query("event").optional().custom((value) => isValidObjectId(value)),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
];

module.exports = {
  createAnnouncementValidator,
  updateAnnouncementValidator,
  announcementIdValidator,
  announcementQueryValidator,
};
