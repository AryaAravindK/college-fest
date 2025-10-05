/**
 * backend/middlewares/registration_middleware.js
 *
 * Registration Middleware
 * ------------------------
 * - Role-based access (student, organizer, faculty, admin)
 * - Soft-delete and existence checks
 * - Event ownership validation
 * - Auto-load registration for routes with :id
 */

const Registration = require('../models/registration_model');
const mongoose = require('mongoose');
const { isValidObjectId } = mongoose;

/**
 * Middleware to load registration by ID
 * Attaches registration object to req.registration
 */
const loadRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid registration ID' });

    const registration = await Registration.findById(id)
      .populate(['student', 'team', 'event', 'certificate', 'notifications'])
      .exec();

    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    req.registration = registration;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Ensure user can view registration
 * Roles supported: student, organizer, faculty, admin
 */
const canViewRegistration = (roles = ['student', 'organizer', 'faculty', 'admin']) => {
  return (req, res, next) => {
    const { user, registration } = req;
    if (!registration) return res.status(500).json({ message: 'Registration not loaded' });

    let allowed = false;

    if (roles.includes('admin') && user.role === 'admin') allowed = registration.canAdminView();
    else if (roles.includes('faculty') && user.role === 'faculty') allowed = registration.canFacultyView(user.eventsManaged || []);
    else if (roles.includes('organizer') && user.role === 'organizer') allowed = registration.canOrganizerView(user.eventsManaged || []);
    else if (roles.includes('student') && user.role === 'student') allowed = registration.canStudentView(user._id);

    if (!allowed) return res.status(403).json({ message: 'Forbidden: You do not have access to this registration' });
    next();
  };
};

/**
 * Middleware: Ensure user can modify registration
 * Only admins or organizers can modify
 */
const canModifyRegistration = (roles = ['organizer', 'admin']) => {
  return (req, res, next) => {
    const { user, registration } = req;
    if (!registration) return res.status(500).json({ message: 'Registration not loaded' });

    let allowed = false;
    if (roles.includes('admin') && user.role === 'admin') allowed = true;
    else if (roles.includes('organizer') && user.role === 'organizer') {
      allowed = registration.canOrganizerView(user.eventsManaged || []);
    }

    if (!allowed) return res.status(403).json({ message: 'Forbidden: You cannot modify this registration' });
    next();
  };
};

/**
 * Middleware: Check if registration is soft-deleted
 */
const notDeleted = (req, res, next) => {
  const { registration } = req;
  if (!registration) return res.status(500).json({ message: 'Registration not loaded' });

  if (registration.deleted) return res.status(410).json({ message: 'This registration has been deleted' });
  next();
};

/**
 * Middleware: Check event capacity before creating registration
 * Uses registration model capacity logic
 */
const checkEventCapacity = async (req, res, next) => {
  try {
    const { event } = req.body;
    if (!event) return res.status(400).json({ message: 'Event ID required to check capacity' });

    const { canRegister, status } = await Registration.checkEventCapacity(event);
    req.body.status = status;
    req.body.waitlisted = !canRegister;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Attach current registration to req if using :id param
 */
const registrationLoader = async (req, res, next) => {
  if (!req.params.id) return next();
  await loadRegistration(req, res, next);
};

module.exports = {
  loadRegistration,
  canViewRegistration,
  canModifyRegistration,
  notDeleted,
  checkEventCapacity,
  registrationLoader
};
