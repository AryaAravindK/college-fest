/**
 * backend/utils/notification_util.js
 *
 * Utility functions for Notification model
 * Features covered:
 * - Create notifications (general, event, result, payment, OTP)
 * - Mark as read
 * - Soft delete
 * - Fetch by role
 * - Bulk operations
 * - OTP generation and validation
 * - Email/SMS placeholders for delivery
 */

const Notification = require("../models/notification_model");
const crypto = require("crypto");

// Generate random OTP
const generateOTP = (length = 6) => {
  return crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
};

// Create a notification
const createNotification = async ({
  title,
  description = "",
  event = null,
  result = null,
  feedback = null,
  payment = null,
  recipient = null,
  roles = [],
  sender,
  priority = "normal",
  type = "general",
  attachments = [],
  tags = [],
  actionLink = "",
  expireAt = null,
  repeat = {},
}) => {
  const notification = new Notification({
    title,
    description,
    event,
    result,
    feedback,
    payment,
    recipient,
    roles,
    sender,
    priority,
    type,
    attachments,
    tags,
    actionLink,
    expireAt,
    repeat,
  });

  await notification.save();
  return notification;
};

// Create OTP notification
const createOTPNotification = async ({ recipient, sender, otpLength = 6, ttlMinutes = 5 }) => {
  const otp = generateOTP(otpLength);
  const otpValidUntil = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const notification = await createNotification({
    title: "OTP Verification",
    description: `Your OTP is ${otp}. It will expire in ${ttlMinutes} minutes.`,
    recipient,
    sender,
    type: "otp",
    otp,
    otpValidUntil,
  });

  return notification;
};

// Mark notification as read
const markAsRead = async (notificationId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new Error("Notification not found");
  return notification.markAsRead();
};

// Soft delete notification
const softDeleteNotification = async (notificationId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new Error("Notification not found");
  return notification.softDelete();
};

// Fetch notifications by role and user
const getNotificationsForUser = async ({ role, userId, eventIds = [] }) => {
  return Notification.getNotificationsByRole(role, userId, eventIds);
};

// Bulk mark as read
const markMultipleAsRead = async (notificationIds) => {
  const notifications = await Notification.find({ _id: { $in: notificationIds } });
  return Promise.all(notifications.map((n) => n.markAsRead()));
};

// Bulk soft delete
const softDeleteMultiple = async (notificationIds) => {
  const notifications = await Notification.find({ _id: { $in: notificationIds } });
  return Promise.all(notifications.map((n) => n.softDelete()));
};

// Placeholder for sending email (to integrate real email service)
const sendEmailNotification = async ({ notification, email }) => {
  console.log(`Sending email to ${email}: ${notification.title}`);
  notification.deliveredEmail = true;
  await notification.save();
};

// Placeholder for sending SMS (to integrate Twilio or other service)
const sendSMSNotification = async ({ notification, phoneNumber }) => {
  console.log(`Sending SMS to ${phoneNumber}: ${notification.title}`);
  notification.deliveredSMS = true;
  await notification.save();
};

// Validate OTP
const validateOTP = async ({ notificationId, otp }) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new Error("Notification not found");
  if (notification.type !== "otp") throw new Error("Not an OTP notification");
  if (!notification.otpValidUntil || new Date() > notification.otpValidUntil) throw new Error("OTP expired");
  if (notification.otp !== otp) throw new Error("Invalid OTP");
  notification.read = true;
  await notification.save();
  return notification;
};

module.exports = {
  createNotification,
  createOTPNotification,
  markAsRead,
  softDeleteNotification,
  getNotificationsForUser,
  markMultipleAsRead,
  softDeleteMultiple,
  sendEmailNotification,
  sendSMSNotification,
  validateOTP,
  generateOTP,
};
