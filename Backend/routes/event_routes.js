/**
 * backend/routes/event_routes.js
 *
 * Event Routes
 * - Fully connected with controllers, middleware, and validators
 * - Supports:
 *   - CRUD operations
 *   - Soft delete
 *   - Status changes
 *   - Pagination
 *   - Interested users management
 *   - Seat availability
 */

const express = require('express');
const router = express.Router();

const eventController = require('../controllers/event_controller');
const eventMiddleware = require('../middlewares/event_middleware');
const eventValidator = require('../validators/event_validator');
const authMiddleware = require('../middlewares/auth_middleware'); // JWT auth
const roleMiddleware = require('../middlewares/role_middleware'); // Role checks

// --------------------------
// CREATE EVENT
// POST /events
// Only organizer/admin can create
// --------------------------
router.post(
  '/',
  authMiddleware.protect,
  roleMiddleware(['admin', 'organizer']),
  eventValidator.validateEventFields,
  eventController.createEvent
);

// --------------------------
// UPDATE EVENT
// PUT /events/:slug
// Only allowed if user can manage event
// --------------------------
router.put(
  '/:slug',
  authMiddleware.protect,
  eventMiddleware.preloadEventAndCheckOwnership,
  eventValidator.validateEventFields,
  eventController.updateEvent
);

// --------------------------
// DELETE EVENT (soft delete)
// DELETE /events/:slug
// Only allowed if user can manage event
// --------------------------
router.delete(
  '/:slug',
  authMiddleware.protect,
  eventMiddleware.preloadEventAndCheckOwnership,
  eventController.deleteEvent
);

// --------------------------
// CHANGE STATUS
// PATCH /events/:slug/status
// Only allowed if user can manage event
// --------------------------
router.patch(
  '/:slug/status',
  authMiddleware.protect,
  eventMiddleware.preloadEventAndCheckOwnership,
  eventValidator.validateEventFields, // validates status field
  eventController.changeEventStatus
);

// --------------------------
// GET EVENT DETAILS
// GET /events/:slug
// Public endpoint
// --------------------------
router.get(
  '/:slug',
  eventMiddleware.preloadEventBySlug,
  eventController.getEventBySlug
);

// --------------------------
// LIST UPCOMING EVENTS
// GET /events
// Public endpoint with pagination & filters
// --------------------------
router.get(
  '/',
  eventValidator.validatePaginationQuery,
  eventController.listUpcomingEvents
);

// --------------------------
// INTERESTED USERS MANAGEMENT
// POST /events/:slug/interested
// DELETE /events/:slug/interested
// --------------------------
router.post(
  '/:slug/interested',
  authMiddleware.protect,
  eventMiddleware.preloadEventBySlug,
  eventController.addInterested
);

router.delete(
  '/:slug/interested',
  authMiddleware.protect,
  eventMiddleware.preloadEventBySlug,
  eventController.removeInterested
);

// --------------------------
// GET AVAILABLE SEATS
// GET /events/:slug/seats
// --------------------------
router.get(
  '/:slug/seats',
  eventMiddleware.preloadEventBySlug,
  eventController.getSeats
);

module.exports = router;
