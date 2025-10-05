/**
 * backend/controllers/event_controller.js
 *
 * Event Controller
 * - Fully aligned with event_model.js, event_util.js, event_validator.js, and event_middleware.js
 * - Handles CRUD, soft-delete, status change, pagination, interested users
 * - Role-based access and audit logs fully integrated
 */

const Event = require('../models/event_model');
const eventUtil = require('../utils/event_util');
const { validationResult } = require('express-validator');

/**
 * createEvent
 * POST /events
 */
async function createEvent(req, res, next) {
  try {
    const user = req.user;
    const data = req.body;

    const event = await eventUtil.createEvent(data, user);
    return res.status(201).json({ message: 'Event created successfully', event });
  } catch (err) {
    next(err);
  }
}

/**
 * updateEvent
 * PUT /events/:slug
 */
async function updateEvent(req, res, next) {
  try {
    const user = req.user;
    const event = req.event;
    const updates = req.body;

    const updatedEvent = await eventUtil.updateEvent(event, updates, user);
    return res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
  } catch (err) {
    next(err);
  }
}

/**
 * deleteEvent (soft delete)
 * DELETE /events/:slug
 */
async function deleteEvent(req, res, next) {
  try {
    const user = req.user;
    const event = req.event;

    const deletedEvent = await eventUtil.softDeleteEvent(event, user, 'Deleted via API');
    return res.status(200).json({ message: 'Event soft-deleted successfully', event: deletedEvent });
  } catch (err) {
    next(err);
  }
}

/**
 * changeStatus
 * PATCH /events/:slug/status
 */
async function changeEventStatus(req, res, next) {
  try {
    const user = req.user;
    const event = req.event;
    const { status, reason } = req.body;

    const updatedEvent = await eventUtil.changeEventStatus(event, status, user, reason || '');
    return res.status(200).json({ message: `Event status changed to ${status}`, event: updatedEvent });
  } catch (err) {
    next(err);
  }
}

/**
 * getEventBySlug
 * GET /events/:slug
 */
async function getEventBySlug(req, res, next) {
  try {
    const event = req.event;
    return res.status(200).json({ event });
  } catch (err) {
    next(err);
  }
}

/**
 * listUpcomingEvents
 * GET /events
 * Supports pagination and filters
 */
async function listUpcomingEvents(req, res, next) {
  try {
    const { page = 1, limit = 10, type, mode, status } = req.query;
    const extraQuery = {};

    if (type) extraQuery.type = type;
    if (mode) extraQuery.mode = mode;
    if (status) extraQuery.status = status;

    const events = await eventUtil.paginateUpcomingEvents({
      page: parseInt(page),
      limit: parseInt(limit),
      extraQuery
    });

    return res.status(200).json(events);
  } catch (err) {
    next(err);
  }
}

/**
 * addInterestedUser
 * POST /events/:slug/interested
 */
async function addInterested(req, res, next) {
  try {
    const user = req.user;
    const event = req.event;

    const updatedEvent = await eventUtil.addInterestedUser(event, user._id);
    return res.status(200).json({ message: 'Marked as interested', event: updatedEvent });
  } catch (err) {
    next(err);
  }
}

/**
 * removeInterestedUser
 * DELETE /events/:slug/interested
 */
async function removeInterested(req, res, next) {
  try {
    const user = req.user;
    const event = req.event;

    const updatedEvent = await eventUtil.removeInterestedUser(event, user._id);
    return res.status(200).json({ message: 'Removed from interested', event: updatedEvent });
  } catch (err) {
    next(err);
  }
}

/**
 * getAvailableSeats
 * GET /events/:slug/seats
 */
async function getSeats(req, res, next) {
  try {
    const event = req.event;
    const seats = await eventUtil.getAvailableSeats(event);
    return res.status(200).json({ availableSeats: seats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  changeEventStatus,
  getEventBySlug,
  listUpcomingEvents,
  addInterested,
  removeInterested,
  getSeats
};
