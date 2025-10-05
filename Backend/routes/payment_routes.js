/**
 * backend/routes/payment_routes.js
 *
 * Payment Routes for College Fest Management System
 * --------------------------------------------------
 * - Fully integrated with controllers, middleware, and validators
 * - Handles CRUD, status updates, soft delete, email generation
 */

"use strict";

const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment_controller");
const paymentValidator = require("../validators/payment_validator");
const paymentMiddleware = require("../middlewares/payment_middleware");

// 🔹 Create Payment
// Access: Student (pay for own registration), Admin
router.post(
  "/",
  paymentMiddleware.authenticateJWT,
  paymentMiddleware.authorizeRoles(["student", "admin"]),
  paymentValidator.validateCreatePayment,
  paymentValidator.handleValidationErrors,
  paymentController.createPayment
);

// 🔹 Get All Payments (role-based access)
// Access: Student (own), Organizer (their events), Faculty (assigned events), Admin (all)
router.get(
  "/",
  paymentMiddleware.authenticateJWT,
  paymentMiddleware.filterDeletedPayments,
  paymentController.getPayments
);

// 🔹 Get Single Payment by ID
// Access: Student (own), Organizer (their events), Faculty (assigned events), Admin (all)
router.get(
  "/:paymentId",
  paymentMiddleware.authenticateJWT,
  paymentValidator.validatePaymentIdParam,
  paymentValidator.handleValidationErrors,
  paymentMiddleware.preloadPayment,
  paymentMiddleware.canViewPayment,
  paymentController.getPaymentById
);

// 🔹 Update Payment Status
// Access: Organizer (their events), Admin
router.put(
  "/:paymentId/status",
  paymentMiddleware.authenticateJWT,
  paymentMiddleware.preloadPayment,
  paymentMiddleware.canModifyPayment,
  paymentValidator.validateUpdatePaymentStatus,
  paymentValidator.handleValidationErrors,
  paymentController.updatePaymentStatus
);

// 🔹 Soft Delete Payment
// Access: Admin only
router.delete(
  "/:paymentId",
  paymentMiddleware.authenticateJWT,
  paymentMiddleware.preloadPayment,
  paymentMiddleware.authorizeRoles(["admin"]),
  paymentValidator.validateSoftDelete,
  paymentValidator.handleValidationErrors,
  paymentController.softDeletePayment
);

// 🔹 Generate Email Payload
// Access: Admin, Organizer, Student (own)
router.get(
  "/:paymentId/email",
  paymentMiddleware.authenticateJWT,
  paymentMiddleware.preloadPayment,
  paymentMiddleware.canViewPayment,
  paymentController.generatePaymentEmail
);

module.exports = router;
