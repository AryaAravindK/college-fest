/**
 * backend/utils/registration_util.js
 *
 * Registration Utilities
 * ----------------------
 * - Provides reusable helpers for Registration model
 * - Handles payments, cancellations, refunds
 * - Role-based access checks
 * - Event capacity & validation helpers
 */

const Registration = require('../models/registration_model');
const Event = require('../models/event_model');
const Team = require('../models/team_model');
const mongoose = require('mongoose');

module.exports = {

  /**
   * Get registration by ID
   * @param {String} id - Registration ID
   * @param {Object} options - populate options
   */
  async getRegistrationById(id, options = { populate: true }) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid registration ID');

    let query = Registration.findById(id);
    if (options.populate) {
      query = query.populate(['student', 'team', 'event', 'certificate', 'notifications']);
    }
    const registration = await query.exec();
    if (!registration) throw new Error('Registration not found');
    return registration;
  },

  /**
   * List registrations for an event
   * @param {String} eventId
   * @param {Object} opts - { status, type, page, limit }
   */
  async listRegistrationsForEvent(eventId, opts = {}) {
    return Registration.getRegistrationsForEvent(eventId, opts);
  },

  /**
   * List registrations for a student
   * @param {String} studentId
   * @param {Object} opts - { status, page, limit }
   */
  async listRegistrationsForStudent(studentId, opts = {}) {
    return Registration.getRegistrationsForStudent(studentId, opts);
  },

  /**
   * Confirm payment
   * @param {Registration} registration
   * @param {Object} paymentPayload - { provider, transactionId, amount, paidAt, paymentMode, offlineReceiptNumber, meta, performedBy }
   */
  async confirmPayment(registration, paymentPayload = {}) {
    return registration.confirmPayment(paymentPayload);
  },

  /**
   * Mark failed payment
   * @param {Registration} registration
   * @param {String} reason
   * @param {String} performedBy
   */
  async failPayment(registration, reason, performedBy = null) {
    return registration.markFailedPayment(reason, performedBy);
  },

  /**
   * Refund payment
   * @param {Registration} registration
   * @param {String} reason
   * @param {String} performedBy
   */
  async refundPayment(registration, reason = '', performedBy = null) {
    return registration.refundPayment(reason, performedBy);
  },

  /**
   * Cancel registration
   * @param {Registration} registration
   * @param {String} reason
   */
  async cancelRegistration(registration, reason = '') {
    return registration.cancel(reason);
  },

  /**
   * Soft delete registration
   * @param {Registration} registration
   * @param {String} actor - User performing deletion
   * @param {String} reason
   */
  async softDeleteRegistration(registration, actor = null, reason = '') {
    return registration.softDelete(actor, reason);
  },

  /**
   * Register individual student
   */
  async registerStudent({ eventId, studentId, session = null }) {
    return Registration.registerStudent({ eventId, studentId, session });
  },

  /**
   * Register team
   */
  async registerTeam({ eventId, teamId, session = null }) {
    return Registration.registerTeam({ eventId, teamId, session });
  },

  /**
   * Register guest
   */
  async registerGuest({ eventId, guestInfo, session = null }) {
    return Registration.registerGuest({ eventId, guestInfo, session });
  },

  /**
   * Check if student can view registration
   */
  canStudentView(registration, studentId) {
    return registration.canStudentView(studentId);
  },

  /**
   * Check if organizer can view registration
   */
  canOrganizerView(registration, organizerEventIds = []) {
    return registration.canOrganizerView(organizerEventIds);
  },

  /**
   * Check if faculty can view registration
   */
  canFacultyView(registration, facultyEventIds = []) {
    return registration.canFacultyView(facultyEventIds);
  },

  /**
   * Check if admin can view registration
   */
  canAdminView(registration) {
    return registration.canAdminView();
  },

  /**
   * Validate if event has capacity for new registration
   * Returns { canRegister: boolean, status: 'confirmed'|'waitlisted' }
   */
  async checkEventCapacity(eventId) {
    const event = await Event.findById(eventId).select('capacity status').lean();
    if (!event) throw new Error('Event not found');
    if (['cancelled', 'completed'].includes(event.status)) throw new Error('Cannot register for this event');

    const occupied = await Registration.countDocuments({
      event: eventId,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (event.capacity && occupied >= event.capacity) return { canRegister: false, status: 'waitlisted' };
    return { canRegister: true, status: 'confirmed' };
  },

  /**
   * Format registration for frontend
   */
  formatRegistration(reg) {
    if (!reg) return null;
    const obj = reg.toJSON();
    obj.isPaid = reg.isPaid();
    return obj;
  }

};
