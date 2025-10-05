/**
 * backend/utils/event_util.js
 *
 * Event Utility Functions
 * - Fully aligned with event_model.js
 * - Handles: creation, update, deletion, status changes, seat management
 * - Role-based management checks
 * - Soft delete + audit logging
 * - Advanced query helpers
 */

const Event = require('../models/event_model');
const Registration = require('../models/registration_model');
const User = require('../models/user_model');

/**
 * createEvent
 * - Creates a new event with audit logging
 * @param {Object} data - Event data
 * @param {Object} user - Creator (organizer/admin)
 * @returns {Promise<Event>}
 */
async function createEvent(data, user) {
  const event = new Event({
    ...data,
    createdBy: user._id,
    updatedBy: user._id,
    organizer: data.organizer || user._id
  });

  // Save event (pre-save hooks handle slug, validations)
  await event.save();

  return event;
}

/**
 * updateEvent
 * - Updates an existing event
 * - Logs updates in auditLogs
 * @param {Event} event
 * @param {Object} updates
 * @param {Object} user - Actor
 * @returns {Promise<Event>}
 */
async function updateEvent(event, updates, user) {
  const allowedFields = [
    'title', 'description', 'startDate', 'endDate', 'sessions', 'registrationDeadline',
    'type', 'venues', 'venue', 'mode', 'meetingLink', 'capacity', 'isPaid', 'fee',
    'coordinators', 'volunteers', 'judges', 'category', 'tags', 'attachments',
    'isHighlighted', 'notes'
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      event[field] = updates[field];
    }
  });

  event.updatedBy = user._id;
  event.auditLogs = event.auditLogs || [];
  event.auditLogs.push({
    action: 'update',
    performedBy: user._id,
    notes: `Event updated by ${user.name || user._id}`
  });

  await event.save();
  return event;
}

/**
 * softDeleteEvent
 * - Soft deletes an event using model method
 * @param {Event} event
 * @param {Object} user - Actor
 * @param {String} reason
 * @returns {Promise<Event>}
 */
async function softDeleteEvent(event, user, reason = 'Soft delete requested') {
  return event.softDelete(user._id, reason);
}

/**
 * changeEventStatus
 * - Changes event status and logs audit entry
 * @param {Event} event
 * @param {String} newStatus
 * @param {Object} user
 * @param {String} reason
 * @returns {Promise<Event>}
 */
async function changeEventStatus(event, newStatus, user, reason = '') {
  return event.changeStatus(newStatus, reason, user._id);
}

/**
 * getEventBySlug
 * - Finds event by slug, excluding soft deleted
 * @param {String} slug
 * @returns {Promise<Event>}
 */
async function getEventBySlug(slug) {
  return Event.findBySlug(slug);
}

/**
 * getAvailableSeats
 * - Returns number of seats left for the event
 * @param {Event} event
 * @returns {Promise<Number>}
 */
async function getAvailableSeats(event) {
  return event.availableSeats();
}

/**
 * isUserAllowedToManage
 * - Checks if a user can manage event (role-based)
 * @param {Event} event
 * @param {Object} user
 * @returns {Boolean}
 */
function isUserAllowedToManage(event, user) {
  return event.canBeManagedBy(user);
}

/**
 * paginateUpcomingEvents
 * - Returns paginated upcoming events
 * @param {Object} options - { limit, page, extraQuery }
 * @returns {Promise<Object>}
 */
async function paginateUpcomingEvents(options = {}) {
  return Event.paginateUpcoming(options);
}

/**
 * addInterestedUser
 * - Adds a user to interestedUsers array if not exists
 * @param {Event} event
 * @param {ObjectId} userId
 * @returns {Promise<Event>}
 */
async function addInterestedUser(event, userId) {
  if (!event.interestedUsers) event.interestedUsers = [];
  if (!event.interestedUsers.some(u => u.toString() === userId.toString())) {
    event.interestedUsers.push(userId);
    await event.save();
  }
  return event;
}

/**
 * removeInterestedUser
 * - Removes a user from interestedUsers array
 * @param {Event} event
 * @param {ObjectId} userId
 * @returns {Promise<Event>}
 */
async function removeInterestedUser(event, userId) {
  if (event.interestedUsers && event.interestedUsers.length > 0) {
    event.interestedUsers = event.interestedUsers.filter(u => u.toString() !== userId.toString());
    await event.save();
  }
  return event;
}

module.exports = {
  createEvent,
  updateEvent,
  softDeleteEvent,
  changeEventStatus,
  getEventBySlug,
  getAvailableSeats,
  isUserAllowedToManage,
  paginateUpcomingEvents,
  addInterestedUser,
  removeInterestedUser
};
