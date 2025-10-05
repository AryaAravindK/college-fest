/**
 * backend/utils/payment_util.js
 *
 * Payment Utilities for College Fest Management System
 * ---------------------------------------------------
 * - Provides centralized logic for creating, updating, fetching, and managing payments
 * - Aligns 100% with payment_model.js, including audit logs, role-based access, soft delete
 * - Includes email payload generation and mock notifications
 */

"use strict";

const Payment = require("../models/payment_model");
const Registration = require("../models/registration_model");
const Event = require("../models/event_model");
const User = require("../models/user_model");

/**
 * 🔹 Create a new payment
 * @param {Object} paymentData - { registration, student, event, amount, paymentMode, offlineReceiptNumber, bankName, notes, mockPaymentLink }
 * @returns {Promise<Payment>}
 */
async function createPayment(paymentData) {
  try {
    const payment = new Payment(paymentData);
    await payment.save();
    return payment;
  } catch (error) {
    throw new Error(`Payment creation failed: ${error.message}`);
  }
}

/**
 * 🔹 Mark payment as success
 * @param {String} paymentId
 * @param {String} performedBy - User ID who processed
 * @returns {Promise<Payment>}
 */
async function markPaymentSuccess(paymentId, performedBy) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");
  return payment.markSuccess(performedBy);
}

/**
 * 🔹 Mark payment as failed
 * @param {String} paymentId
 * @param {String} performedBy - User ID who processed
 * @param {String} reason
 * @returns {Promise<Payment>}
 */
async function markPaymentFailed(paymentId, performedBy, reason) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");
  return payment.markFailed(performedBy, reason);
}

/**
 * 🔹 Mark payment as refunded
 * @param {String} paymentId
 * @param {String} performedBy - User ID who processed
 * @param {String} reason
 * @returns {Promise<Payment>}
 */
async function markPaymentRefunded(paymentId, performedBy, reason) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");
  return payment.markRefunded(performedBy, reason);
}

/**
 * 🔹 Soft delete a payment
 * @param {String} paymentId
 * @param {String} performedBy
 * @returns {Promise<Payment>}
 */
async function softDeletePayment(paymentId, performedBy) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");
  return payment.softDelete(performedBy);
}

/**
 * 🔹 Fetch payments for a student
 * @param {String} studentId
 * @returns {Promise<Payment[]>}
 */
async function getPaymentsByStudent(studentId) {
  return Payment.findByStudent(studentId);
}

/**
 * 🔹 Fetch payments for an event
 * @param {String} eventId
 * @returns {Promise<Payment[]>}
 */
async function getPaymentsByEvent(eventId) {
  return Payment.findByEvent(eventId);
}

/**
 * 🔹 Fetch a single payment by ID with optional role-based access
 * @param {String} paymentId
 * @param {Object} user - { id, role, eventIds: [] }
 * @returns {Promise<Payment>}
 */
async function getPaymentById(paymentId, user) {
  const payment = await Payment.findById(paymentId)
    .populate("student event registration processedBy")
    .lean();
  if (!payment || payment.deleted) throw new Error("Payment not found");

  // Role-based access checks
  switch (user.role) {
    case "student":
      if (!payment.student._id.equals(user.id))
        throw new Error("Access denied: Not your payment");
      break;
    case "organizer":
      if (!user.eventIds.includes(payment.event._id.toString()))
        throw new Error("Access denied: Not your event payment");
      break;
    case "faculty":
      if (!user.eventIds.includes(payment.event._id.toString()))
        throw new Error("Access denied: Not your event payment");
      break;
    case "admin":
      break; // full access
    default:
      throw new Error("Access denied: Unknown role");
  }

  return payment;
}

/**
 * 🔹 Generate email payload for a payment
 * @param {Payment} payment
 * @returns {Object} email payload
 */
function generatePaymentEmail(payment) {
  return payment.generateEmailPayload();
}

/**
 * 🔹 Utility: check if user can view a payment
 * @param {Payment} payment
 * @param {Object} user - { id, role, eventIds }
 * @returns {Boolean}
 */
function canUserViewPayment(payment, user) {
  switch (user.role) {
    case "student":
      return payment.canStudentView(user.id);
    case "organizer":
      return payment.canOrganizerView(user.eventIds || []);
    case "faculty":
      return payment.canFacultyView(user.eventIds || []);
    case "admin":
      return payment.canAdminView();
    default:
      return false;
  }
}

/**
 * 🔹 Mock function: send email (replace with real email logic)
 * @param {Object} payload
 */
async function sendMockEmail(payload) {
  console.log(`Sending email to ${payload.to}:`);
  console.log(payload.subject);
  console.log(payload.text);
  return true;
}

module.exports = {
  createPayment,
  markPaymentSuccess,
  markPaymentFailed,
  markPaymentRefunded,
  softDeletePayment,
  getPaymentsByStudent,
  getPaymentsByEvent,
  getPaymentById,
  generatePaymentEmail,
  canUserViewPayment,
  sendMockEmail,
};
