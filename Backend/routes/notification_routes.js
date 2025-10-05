/**
 * backend/routes/notification_routes.js
 *
 * Routes for Notification module
 * ------------------------------------------------------
 * Features:
 * - Create notification (general, event, payment, result)
 * - Create OTP notification
 * - Get notifications by role/user
 * - Mark as read (single & bulk)
 * - Soft delete (single & bulk)
 * - Validate OTP
 * - Role-based and sender/admin access
 */

const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification_controller");
const notificationValidator = require("../validators/notification_validator");
const notificationMiddleware = require("../middlewares/notification_middleware");

// -------------------- CREATE NOTIFICATION --------------------
router.post(
  "/",
  notificationMiddleware.authenticateJWT,
  notificationMiddleware.authorizeRoles("admin", "faculty", "organizer"),
  notificationValidator.createNotificationValidator,
  notificationController.createNotification
);

// -------------------- CREATE OTP NOTIFICATION --------------------
router.post(
  "/otp",
  notificationMiddleware.authenticateJWT,
  notificationMiddleware.authorizeRoles("admin", "faculty"),
  notificationController.createOTPNotification
);

// -------------------- GET NOTIFICATIONS FOR USER/ROLE --------------------
router.get(
  "/",
  notificationMiddleware.authenticateJWT,
  notificationMiddleware.filterNotificationsForRole,
  notificationController.getNotifications
);

// -------------------- MARK AS READ --------------------
router.put(
  "/:notificationId/read",
  notificationMiddleware.authenticateJWT,
  notificationMiddleware.checkActiveNotification,
  notificationMiddleware.senderOrAdmin, // Allow sender/admin or recipient to mark
  notificationValidator.notificationIdValidator,
  notificationController.markAsRead
);

// -------------------- BULK MARK AS READ --------------------
router.put(
  "/bulk/read",
  notificationMiddleware.authenticateJWT,
  notificationController.markMultipleAsRead
);

// -------------------- SOFT DELETE --------------------
router.delete(
  "/:notificationId",
  notificationMiddleware.authenticateJWT,
  notificationMiddleware.senderOrAdmin, // Only sender/admin can delete
  notificationValidator.notificationIdValidator,
  notificationController.softDelete
);

// -------------------- BULK SOFT DELETE --------------------
router.delete(
  "/bulk",
  notificationMiddleware.authenticateJWT,
  notificationMiddleware.authorizeRoles("admin"),
  notificationController.softDeleteMultiple
);

// -------------------- VALIDATE OTP --------------------
router.post(
  "/:notificationId/validate-otp",
  notificationMiddleware.authenticateJWT,
  notificationMiddleware.validateOTPAccess,
  notificationValidator.validateOTPValidator,
  notificationController.validateOTP
);

module.exports = router;
