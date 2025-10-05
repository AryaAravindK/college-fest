/**
 * backend/middlewares/event_middleware.js
 *
 * Event Middleware
 * - Fully aligned with event_model.js and event_util.js
 * - Handles:
 *   - Preloading event
 *   - Role-based management checks
 *   - Soft delete checks
 *   - Integration with utils
 */

const Event = require('../models/event_model');
const eventUtil = require('../utils/event_util');
const { validationResult } = require('express-validator');

/**
 * preloadEventBySlug
 * - Loads event by slug from params and attaches to req.event
 * - Excludes soft-deleted events
 */
async function preloadEventBySlug(req, res, next) {
  try {
    const slug = req.params.slug;
    const event = await eventUtil.getEventBySlug(slug);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * preloadEventById
 * - Loads event by Mongo ID from params and attaches to req.event
 * - Excludes soft-deleted events
 */
async function preloadEventById(req, res, next) {
  try {
    const id = req.params.id;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await Event.findOne({ _id: id, deleted: { $ne: true } })
      .populate('organizer coordinators volunteers judges');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * checkEventOwnership
 * - Checks if req.user can manage req.event
 * - Uses Event model's canBeManagedBy()
 */
function checkEventOwnership(req, res, next) {
  const user = req.user;
  const event = req.event;

  if (!user || !event) {
    return res.status(400).json({ message: 'User or Event missing in request' });
  }

  if (!eventUtil.isUserAllowedToManage(event, user)) {
    return res.status(403).json({ message: 'Forbidden: You are not allowed to manage this event' });
  }

  next();
}

/**
 * checkEventNotDeleted
 * - Prevents operations on soft-deleted events
 */
function checkEventNotDeleted(req, res, next) {
  const event = req.event;
  if (!event) return res.status(400).json({ message: 'Event missing in request' });

  if (event.deleted) {
    return res.status(410).json({ message: 'Event has been deleted' });
  }

  next();
}

/**
 * validateEventRequest
 * - Runs validation from event_validator.js
 */
function validateEventRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
}

/**
 * ensureAdminOrOrganizer
 * - Middleware to allow only admin or organizer of event
 */
function ensureAdminOrOrganizer(req, res, next) {
  const user = req.user;
  const event = req.event;

  if (!user || !event) return res.status(400).json({ message: 'User or event missing' });

  if (user.role === 'admin') return next();

  if (user.role === 'organizer' && event.organizer && event.organizer._id.toString() === user._id.toString()) {
    return next();
  }

  return res.status(403).json({ message: 'Forbidden: Admin or Organizer access required' });
}

/**
 * preloadEventAndCheckOwnership
 * - Combined middleware for convenience
 */
const preloadEventAndCheckOwnership = [
  preloadEventBySlug,
  checkEventOwnership,
  checkEventNotDeleted
];

module.exports = {
  preloadEventBySlug,
  preloadEventById,
  checkEventOwnership,
  checkEventNotDeleted,
  validateEventRequest,
  ensureAdminOrOrganizer,
  preloadEventAndCheckOwnership
};
