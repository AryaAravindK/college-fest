/**
 * backend/middlewares/notification_middleware.js
 *
 * Middleware for Notification routes
 * ------------------------------------------------------
 * - JWT authentication check
 * - Role-based access control
 * - Permission check for sender/admin
 * - Soft-delete protection
 * - OTP validation middleware
 * - Event-based filtering for student/faculty/organizer
 */

const jwt = require("jsonwebtoken");
const Notification = require("../models/notification_model");
const User = require("../models/user_model");
const { JWT_SECRET } = process.env;

// -------------------- JWT AUTHENTICATION --------------------
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing or invalid" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, email, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// -------------------- ROLE CHECK --------------------
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient permissions" });
  }
  next();
};

// -------------------- SENDER OR ADMIN CHECK --------------------
const senderOrAdmin = async (req, res, next) => {
  const notificationId = req.params.notificationId;
  const notification = await Notification.findById(notificationId);
  if (!notification) return res.status(404).json({ message: "Notification not found" });

  if (notification.sender.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "You are not allowed to perform this action" });
  }
  req.notification = notification;
  next();
};

// -------------------- SOFT DELETE PROTECTION --------------------
const checkActiveNotification = async (req, res, next) => {
  const notificationId = req.params.notificationId;
  const notification = await Notification.findById(notificationId);
  if (!notification || !notification.isActive) {
    return res.status(404).json({ message: "Notification not found or inactive" });
  }
  req.notification = notification;
  next();
};

// -------------------- OTP SPECIFIC MIDDLEWARE --------------------
const validateOTPAccess = async (req, res, next) => {
  const { notificationId } = req.params;
  const { otp } = req.body;

  const notification = await Notification.findById(notificationId);
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  if (notification.type !== "otp") return res.status(400).json({ message: "Not an OTP notification" });
  if (!notification.recipient || notification.recipient.toString() !== req.user.id) {
    return res.status(403).json({ message: "You are not the recipient of this OTP" });
  }

  if (!notification.otpValidUntil || new Date() > notification.otpValidUntil) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  if (notification.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  req.notification = notification;
  next();
};

// -------------------- EVENT-BASED NOTIFICATION FILTER --------------------
const filterNotificationsForRole = async (req, res, next) => {
  const role = req.user.role;
  let eventIds = [];

  // If student/organizer/faculty, fetch their relevant events
  if (role === "student") {
    // TODO: replace with actual registration lookup if needed
    eventIds = []; // populate with student's event IDs
  } else if (role === "organizer") {
    // TODO: fetch events organized by this user
    eventIds = []; // populate with organizer's event IDs
  } else if (role === "faculty") {
    // TODO: fetch events assigned to this faculty
    eventIds = [];
  }

  req.eventIds = eventIds;
  next();
};

module.exports = {
  authenticateJWT,
  authorizeRoles,
  senderOrAdmin,
  checkActiveNotification,
  validateOTPAccess,
  filterNotificationsForRole,
};
