/**
 * backend/middlewares/payment_middleware.js
 *
 * Payment Middleware for College Fest Management System
 * ------------------------------------------------------
 * - Handles authentication, role-based access, soft deletes
 * - Preloads payment by ID for controllers
 * - Validates if user can view/update payment based on role
 */

"use strict";

const jwt = require("jsonwebtoken");
const Payment = require("../models/payment_model");
const User = require("../models/user_model");

const { JWT_SECRET } = process.env;

/**
 * 🔹 JWT Authentication Middleware
 * Adds user info to req.user if token is valid
 */
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

/**
 * 🔹 Role-based Access Middleware
 * @param {Array} roles - Allowed roles
 */
const authorizeRoles = (roles = []) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
  }
  next();
};

/**
 * 🔹 Preload Payment by ID Middleware
 * Attaches payment to req.payment
 */
const preloadPayment = async (req, res, next) => {
  const { paymentId } = req.params;
  try {
    const payment = await Payment.findById(paymentId)
      .populate("student event registration processedBy")
      .lean();

    if (!payment || payment.deleted) {
      return res.status(404).json({ success: false, message: "Payment not found or deleted" });
    }

    req.payment = payment;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching payment", error: err.message });
  }
};

/**
 * 🔹 Check if user can view the payment
 */
const canViewPayment = (req, res, next) => {
  const payment = req.payment;
  const user = req.user;

  switch (user.role) {
    case "student":
      if (!payment.student._id.equals(user._id)) {
        return res.status(403).json({ success: false, message: "Access denied: Not your payment" });
      }
      break;

    case "organizer":
      if (!user.eventIds.includes(payment.event._id.toString())) {
        return res.status(403).json({ success: false, message: "Access denied: Not your event payment" });
      }
      break;

    case "faculty":
      if (!user.eventIds.includes(payment.event._id.toString())) {
        return res.status(403).json({ success: false, message: "Access denied: Not your event payment" });
      }
      break;

    case "admin":
      break; // Admin has full access

    default:
      return res.status(403).json({ success: false, message: "Access denied: Unknown role" });
  }

  next();
};

/**
 * 🔹 Check if user can modify/update the payment
 */
const canModifyPayment = (req, res, next) => {
  const payment = req.payment;
  const user = req.user;

  // Only admin or organizer of the event can modify payment
  if (user.role === "admin") return next();

  if (user.role === "organizer" && user.eventIds.includes(payment.event._id.toString())) {
    return next();
  }

  return res.status(403).json({ success: false, message: "Access denied: Cannot modify payment" });
};

/**
 * 🔹 Filter out soft-deleted payments in query results
 */
const filterDeletedPayments = (req, res, next) => {
  req.query.deleted = false;
  next();
};

module.exports = {
  authenticateJWT,
  authorizeRoles,
  preloadPayment,
  canViewPayment,
  canModifyPayment,
  filterDeletedPayments,
};
