/**
 * backend/controllers/registration_controller.js
 *
 * Registration Controller
 * ------------------------
 * - CRUD operations
 * - Payment handling (confirm, fail, refund)
 * - Soft-delete, cancel, waitlist
 * - Role-based access enforcement
 * - Fully integrated with utils, validators, middleware
 */

const Registration = require('../models/registration_model');
const registrationUtil = require('../utils/registration_util');
const mongoose = require('mongoose');

/**
 * Create new registration (student/team/guest)
 */
const createRegistration = async (req, res, next) => {
  try {
    const { registrationType, event, student, team, guestInfo } = req.body;
    let registration;

    if (registrationType === 'individual') {
      registration = await registrationUtil.registerStudent({ eventId: event, studentId: student });
    } else if (registrationType === 'team') {
      registration = await registrationUtil.registerTeam({ eventId: event, teamId: team });
    } else if (registrationType === 'guest') {
      registration = await registrationUtil.registerGuest({ eventId: event, guestInfo });
    } else {
      return res.status(400).json({ message: 'Invalid registrationType' });
    }

    return res.status(201).json({ message: 'Registration created', registration: registrationUtil.formatRegistration(registration) });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single registration by ID
 */
const getRegistration = async (req, res, next) => {
  try {
    const { registration } = req;
    return res.status(200).json({ registration: registrationUtil.formatRegistration(registration) });
  } catch (err) {
    next(err);
  }
};

/**
 * Update registration
 * Admin or organizer only
 */
const updateRegistration = async (req, res, next) => {
  try {
    const { registration } = req;
    const updates = req.body;

    Object.keys(updates).forEach(key => {
      registration[key] = updates[key];
    });

    await registration.save();
    return res.status(200).json({ message: 'Registration updated', registration: registrationUtil.formatRegistration(registration) });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete registration (soft-delete)
 * Admin or organizer only
 */
const deleteRegistration = async (req, res, next) => {
  try {
    const { registration, user } = req;
    await registrationUtil.softDeleteRegistration(registration, user._id, 'Deleted by user');
    return res.status(200).json({ message: 'Registration deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel registration
 * Admin, organizer, or student
 */
const cancelRegistration = async (req, res, next) => {
  try {
    const { registration } = req;
    const reason = req.body.reason || 'Cancelled by user';
    await registrationUtil.cancelRegistration(registration, reason);
    return res.status(200).json({ message: 'Registration cancelled', registration: registrationUtil.formatRegistration(registration) });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm payment
 * Admin or organizer
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { registration } = req;
    const paymentPayload = req.body; // { provider, transactionId, amount, paidAt, paymentMode, offlineReceiptNumber, meta, performedBy }

    const updatedReg = await registrationUtil.confirmPayment(registration, paymentPayload);
    return res.status(200).json({ message: 'Payment confirmed', registration: registrationUtil.formatRegistration(updatedReg) });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark failed payment
 */
const failPayment = async (req, res, next) => {
  try {
    const { registration } = req;
    const { reason } = req.body;
    const updatedReg = await registrationUtil.failPayment(registration, reason, req.user._id);
    return res.status(200).json({ message: 'Payment marked as failed', registration: registrationUtil.formatRegistration(updatedReg) });
  } catch (err) {
    next(err);
  }
};

/**
 * Refund payment
 */
const refundPayment = async (req, res, next) => {
  try {
    const { registration } = req;
    const { reason } = req.body;
    const updatedReg = await registrationUtil.refundPayment(registration, reason, req.user._id);
    return res.status(200).json({ message: 'Payment refunded', registration: registrationUtil.formatRegistration(updatedReg) });
  } catch (err) {
    next(err);
  }
};

/**
 * List registrations for an event
 */
const listRegistrationsForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const options = {
      status: req.query.status,
      type: req.query.type,
      paginate: true,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const registrations = await registrationUtil.listRegistrationsForEvent(eventId, options);
    return res.status(200).json(registrations);
  } catch (err) {
    next(err);
  }
};

/**
 * List registrations for a student
 */
const listRegistrationsForStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const options = {
      status: req.query.status,
      paginate: true,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const registrations = await registrationUtil.listRegistrationsForStudent(studentId, options);
    return res.status(200).json(registrations);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRegistration,
  getRegistration,
  updateRegistration,
  deleteRegistration,
  cancelRegistration,
  confirmPayment,
  failPayment,
  refundPayment,
  listRegistrationsForEvent,
  listRegistrationsForStudent
};
