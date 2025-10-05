/**
 * backend/controllers/payment_controller.js
 *
 * Payment Controller for College Fest Management System
 * ------------------------------------------------------
 * - Handles all CRUD operations, status updates, soft delete
 * - Fully integrates with payment_util, validators, and middleware
 * - Supports role-based access and audit logs
 * - Includes mock email notifications for success
 */

"use strict";

const Payment = require("../models/payment_model");
const paymentUtil = require("../utils/payment_util");
const { validationResult } = require("express-validator");

/**
 * 🔹 Create a new payment
 */
const createPayment = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const paymentData = req.body;
    const payment = await paymentUtil.createPayment(paymentData);

    // Optionally send mock email if status is success
    if (payment.status === "success") {
      await paymentUtil.sendMockEmail(payment.generateEmailPayload());
    }

    res.status(201).json({ success: true, message: "Payment created successfully", payment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Payment creation failed", error: err.message });
  }
};

/**
 * 🔹 Get all payments (role-based)
 */
const getPayments = async (req, res) => {
  try {
    const user = req.user;

    let payments = [];
    switch (user.role) {
      case "student":
        payments = await paymentUtil.getPaymentsByStudent(user._id);
        break;
      case "organizer":
        payments = await Payment.find({ event: { $in: user.eventIds }, deleted: false })
          .populate("student event registration processedBy");
        break;
      case "faculty":
        payments = await Payment.find({ event: { $in: user.eventIds }, deleted: false })
          .populate("student event registration processedBy");
        break;
      case "admin":
        payments = await Payment.find({ deleted: false })
          .populate("student event registration processedBy");
        break;
      default:
        return res.status(403).json({ success: false, message: "Access denied: Unknown role" });
    }

    res.status(200).json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch payments", error: err.message });
  }
};

/**
 * 🔹 Get single payment by ID
 */
const getPaymentById = async (req, res) => {
  try {
    const payment = req.payment; // preloaded by middleware
    res.status(200).json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch payment", error: err.message });
  }
};

/**
 * 🔹 Update payment status
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const paymentId = req.params.paymentId;
    const performedBy = req.user._id;

    let updatedPayment;
    switch (status) {
      case "success":
        updatedPayment = await paymentUtil.markPaymentSuccess(paymentId, performedBy);
        // Send email notification
        await paymentUtil.sendMockEmail(updatedPayment.generateEmailPayload());
        break;
      case "failed":
        updatedPayment = await paymentUtil.markPaymentFailed(paymentId, performedBy, reason);
        break;
      case "refunded":
        updatedPayment = await paymentUtil.markPaymentRefunded(paymentId, performedBy, reason);
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    res.status(200).json({ success: true, message: `Payment marked as ${status}`, payment: updatedPayment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update payment status", error: err.message });
  }
};

/**
 * 🔹 Soft delete a payment
 */
const softDeletePayment = async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const performedBy = req.user._id;

    const deletedPayment = await paymentUtil.softDeletePayment(paymentId, performedBy);
    res.status(200).json({ success: true, message: "Payment soft deleted successfully", payment: deletedPayment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete payment", error: err.message });
  }
};

/**
 * 🔹 Generate email payload for a payment
 */
const generatePaymentEmail = async (req, res) => {
  try {
    const payment = req.payment; // preloaded by middleware
    const emailPayload = paymentUtil.generatePaymentEmail(payment);
    res.status(200).json({ success: true, emailPayload });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to generate email payload", error: err.message });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
  softDeletePayment,
  generatePaymentEmail,
};
