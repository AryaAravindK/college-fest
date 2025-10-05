/**
 * backend/routes/registration_routes.js
 *
 * Registration Routes
 * -------------------
 * - Fully integrated with validators, middleware, controllers
 * - Covers CRUD, payments, cancellations, refunds, listings
 * - Role-based access enforced via middleware
 */

const express = require('express');
const router = express.Router();

const registrationController = require('../controllers/registration_controller');
const registrationValidator = require('../validators/registration_validator');
const registrationMiddleware = require('../middlewares/registration_middleware');
const authMiddleware = require('../middlewares/auth_middleware'); // JWT auth
const roleMiddleware = require('../middlewares/role_middleware'); // role checks

/**
 * Create registration
 * - Roles: student, organizer, admin
 */
router.post(
  '/',
  authMiddleware.protect,
  roleMiddleware(['student', 'organizer', 'admin']),
  registrationValidator.createRegistrationValidator,
  registrationMiddleware.checkEventCapacity,
  registrationController.createRegistration
);

/**
 * Get single registration
 * - Roles: student (own), organizer (event), faculty (event), admin (all)
 */
router.get(
  '/:id',
  authMiddleware.protect,
  registrationMiddleware.registrationLoader,
  registrationMiddleware.notDeleted,
  registrationMiddleware.canViewRegistration(['student', 'organizer', 'faculty', 'admin']),
  registrationController.getRegistration
);

/**
 * Update registration
 * - Roles: organizer (event), admin
 */
router.put(
  '/:id',
  authMiddleware.protect,
  registrationMiddleware.registrationLoader,
  registrationMiddleware.notDeleted,
  registrationMiddleware.canModifyRegistration(['organizer', 'admin']),
  registrationValidator.updateRegistrationValidator,
  registrationController.updateRegistration
);

/**
 * Delete (soft-delete) registration
 * - Roles: organizer (event), admin
 */
router.delete(
  '/:id',
  authMiddleware.protect,
  registrationMiddleware.registrationLoader,
  registrationMiddleware.notDeleted,
  registrationMiddleware.canModifyRegistration(['organizer', 'admin']),
  registrationController.deleteRegistration
);

/**
 * Cancel registration
 * - Roles: student (own), organizer (event), admin
 */
router.post(
  '/:id/cancel',
  authMiddleware.protect,
  registrationMiddleware.registrationLoader,
  registrationMiddleware.notDeleted,
  registrationMiddleware.canModifyRegistration(['student', 'organizer', 'admin']),
  registrationController.cancelRegistration
);

/**
 * Confirm payment
 * - Roles: organizer (event), admin
 */
router.post(
  '/:id/payment/confirm',
  authMiddleware.protect,
  registrationMiddleware.registrationLoader,
  registrationMiddleware.notDeleted,
  registrationMiddleware.canModifyRegistration(['organizer', 'admin']),
  registrationController.confirmPayment
);

/**
 * Fail payment
 * - Roles: organizer (event), admin
 */
router.post(
  '/:id/payment/fail',
  authMiddleware.protect,
  registrationMiddleware.registrationLoader,
  registrationMiddleware.notDeleted,
  registrationMiddleware.canModifyRegistration(['organizer', 'admin']),
  registrationController.failPayment
);

/**
 * Refund payment
 * - Roles: organizer (event), admin
 */
router.post(
  '/:id/payment/refund',
  authMiddleware.protect,
  registrationMiddleware.registrationLoader,
  registrationMiddleware.notDeleted,
  registrationMiddleware.canModifyRegistration(['organizer', 'admin']),
  registrationController.refundPayment
);

/**
 * List registrations for an event
 * - Roles: organizer (event), faculty (event), admin
 */
router.get(
  '/event/:eventId',
  authMiddleware.protect,
  roleMiddleware(['organizer', 'faculty', 'admin']),
  registrationValidator.listRegistrationQueryValidator,
  registrationController.listRegistrationsForEvent
);

/**
 * List registrations for a student
 * - Roles: student (own), admin
 */
router.get(
  '/student/:studentId',
  authMiddleware.protect,
  roleMiddleware(['student', 'admin']),
  registrationValidator.listRegistrationQueryValidator,
  registrationController.listRegistrationsForStudent
);

module.exports = router;
