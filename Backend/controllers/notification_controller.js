/**
 * backend/controllers/notification_controller.js
 *
 * Controller for Notifications
 * ------------------------------------------------------
 * Fully connected with:
 * - notification_model.js
 * - notification_util.js
 * - notification_validator.js
 * - notification_middleware.js
 *
 * Features:
 * - Create notification (general, event, payment, result, OTP)
 * - Get notifications by role/user
 * - Mark as read (single/bulk)
 * - Soft delete (single/bulk)
 * - Validate OTP
 * - Send email/SMS placeholders
 */

const Notification = require("../models/notification_model");
const notificationUtil = require("../utils/notification_util");

// -------------------- CREATE NOTIFICATION --------------------
const createNotification = async (req, res) => {
  try {
    const notificationData = {
      ...req.body,
      sender: req.user.id,
    };

    const notification = await notificationUtil.createNotification(notificationData);

    // Optional: trigger email/SMS here if needed
    // await notificationUtil.sendEmailNotification({ notification, email: recipientEmail });
    // await notificationUtil.sendSMSNotification({ notification, phoneNumber: recipientPhone });

    res.status(201).json({ message: "Notification created successfully", notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create notification", error: error.message });
  }
};

// -------------------- CREATE OTP NOTIFICATION --------------------
const createOTPNotification = async (req, res) => {
  try {
    const { recipient, otpLength, ttlMinutes } = req.body;
    if (!recipient) return res.status(400).json({ message: "Recipient is required for OTP" });

    const notification = await notificationUtil.createOTPNotification({
      recipient,
      sender: req.user.id,
      otpLength,
      ttlMinutes,
    });

    res.status(201).json({ message: "OTP Notification created", notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create OTP notification", error: error.message });
  }
};

// -------------------- GET NOTIFICATIONS FOR USER/ROLE --------------------
const getNotifications = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const eventIds = req.eventIds || [];

    const notifications = await notificationUtil.getNotificationsForUser({ role, userId, eventIds });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
};

// -------------------- MARK AS READ --------------------
const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    const notification = await notificationUtil.markAsRead(notificationId);

    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to mark as read", error: error.message });
  }
};

// -------------------- BULK MARK AS READ --------------------
const markMultipleAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: "notificationIds array is required" });
    }

    const notifications = await notificationUtil.markMultipleAsRead(notificationIds);
    res.status(200).json({ message: "Notifications marked as read", notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to mark notifications as read", error: error.message });
  }
};

// -------------------- SOFT DELETE --------------------
const softDelete = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    const notification = await notificationUtil.softDeleteNotification(notificationId);

    res.status(200).json({ message: "Notification soft-deleted", notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to soft delete", error: error.message });
  }
};

// -------------------- BULK SOFT DELETE --------------------
const softDeleteMultiple = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: "notificationIds array is required" });
    }

    const notifications = await notificationUtil.softDeleteMultiple(notificationIds);
    res.status(200).json({ message: "Notifications soft-deleted", notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to soft delete notifications", error: error.message });
  }
};

// -------------------- VALIDATE OTP --------------------
const validateOTP = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { otp } = req.body;

    const notification = await notificationUtil.validateOTP({ notificationId, otp });

    res.status(200).json({ message: "OTP validated successfully", notification });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createNotification,
  createOTPNotification,
  getNotifications,
  markAsRead,
  markMultipleAsRead,
  softDelete,
  softDeleteMultiple,
  validateOTP,
};
