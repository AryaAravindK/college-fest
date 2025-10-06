/**
 * backend/services/event_service.js
 *
 * Event Service: Enhanced version with advanced features + real-time notifications + caching
 */

const mongoose = require('mongoose');
const Event = require('../models/event_model');
const Club = require('../models/club_model');
const Venue = require('../models/venue_model');
const Media = require('../models/media_model');
const User = require('../models/user_model'); // for club members
const { createEventValidator, updateEventValidator } = require('../validators/event_validator');
const { Parser } = require('json2csv'); // For CSV export
const { sendDemoEmail } = require('./user_service'); // reuse demo email

// For real-time notifications (socket)
let io;
function initSocket(socketIoInstance) {
  io = socketIoInstance;
}

// Custom Error
class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Validate ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Populate fields helper
const populateRefs = ['clubId', 'venueId', 'media'];

// --- In-memory cache ---
const eventCache = {};

// --- Helper to check existence ---
async function checkExistence(model, id, name) {
  if (!await model.exists({ _id: id })) {
    throw new ApiError(`${name} with ID ${id} does not exist`, 400);
  }
}

// --- Cache helper ---
function updateCache(event) {
  if (event && event._id) {
    eventCache[event._id.toString()] = event;
  }
}
function invalidateCache(eventId) {
  if (eventId) delete eventCache[eventId.toString()];
}

// --- CRUD Functions ---

async function createEvent(eventData) {
  const { error, value } = createEventValidator.validate(eventData);
  if (error) throw new ApiError(error.details[0].message, 422);

  value.clubId = mongoose.Types.ObjectId(value.clubId);
  value.venueId = mongoose.Types.ObjectId(value.venueId);
  if (value.media) value.media = value.media.map(id => mongoose.Types.ObjectId(id));

  await checkExistence(Club, value.clubId, 'Club');
  await checkExistence(Venue, value.venueId, 'Venue');
  if (value.media) for (const m of value.media) await checkExistence(Media, m, 'Media');

  // Ensure fee is a number
  if (value.fee !== undefined) {
    value.fee = Number(value.fee);
    if (isNaN(value.fee) || value.fee < 0) throw new ApiError('Invalid fee value', 400);
  }

  const event = await Event.create(value);
  const populatedEvent = await event.populate(populateRefs);

  updateCache(populatedEvent);

  await sendDemoEmail('New Event Created', `Event "${event.title}" has been created with fee ₹${value.fee || 0}.`);

  return populatedEvent;
}

async function updateEvent(eventId, updateData) {
  if (!isValidObjectId(eventId)) throw new ApiError('Invalid event ID', 400);
  const { error, value } = updateEventValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  if (value.clubId) value.clubId = mongoose.Types.ObjectId(value.clubId);
  if (value.venueId) value.venueId = mongoose.Types.ObjectId(value.venueId);
  if (value.media) value.media = value.media.map(id => mongoose.Types.ObjectId(id));

  if (value.clubId) await checkExistence(Club, value.clubId, 'Club');
  if (value.venueId) await checkExistence(Venue, value.venueId, 'Venue');
  if (value.media) for (const m of value.media) await checkExistence(Media, m, 'Media');

  // Ensure fee is valid
  if (value.fee !== undefined) {
    value.fee = Number(value.fee);
    if (isNaN(value.fee) || value.fee < 0) throw new ApiError('Invalid fee value', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);

  Object.assign(event, value);
  await event.save();

  const populatedEvent = await event.populate(populateRefs);
  updateCache(populatedEvent);

  await sendDemoEmail('Event Updated', `Event "${event.title}" has been updated. Fee: ₹${event.fee || 0}`);

  return populatedEvent;
}

async function deleteEvent(eventId) {
  if (!isValidObjectId(eventId)) throw new ApiError('Invalid event ID', 400);

  const event = await Event.findByIdAndUpdate(
    eventId,
    { status: 'cancelled', isPublic: false },
    { new: true }
  ).populate(populateRefs);

  if (!event) throw new ApiError('Event not found', 404);

  updateCache(event);

  await sendDemoEmail('Event Cancelled', `Event "${event.title}" has been cancelled.`);

  // Real-time notification
  const members = await User.find({ clubId: event.clubId._id });
  for (const member of members) {
    if (io) io.to(member._id.toString()).emit('statusUpdated', {
      eventId: event._id,
      newStatus: 'cancelled',
    });
  }

  return event;
}

async function removeEvent(eventId) {
  if (!isValidObjectId(eventId)) throw new ApiError('Invalid event ID', 400);
  const result = await Event.findByIdAndDelete(eventId);
  if (!result) throw new ApiError('Event not found', 404);
  invalidateCache(eventId);
  return result;
}

async function getEventById(eventId) {
  if (!isValidObjectId(eventId)) throw new ApiError('Invalid event ID', 400);
  if (eventCache[eventId]) return eventCache[eventId];

  const event = await Event.findById(eventId).populate(populateRefs);
  if (!event) throw new ApiError('Event not found', 404);

  updateCache(event);
  return event;
}

async function listEvents({
  page = 1,
  limit = 10,
  type,
  interCollege,
  status,
  clubId,
  venueId,
  isPublic,
  search,
  startDate,
  endDate,
  sortBy = 'startDate',
  sortOrder = 'asc',
  minFee,
  maxFee
} = {}) {
  const filter = {};
  if (type) filter.type = type;
  if (interCollege !== undefined) filter.interCollege = interCollege;
  if (status) filter.status = status;
  if (clubId) filter.clubId = clubId;
  if (venueId) filter.venueId = venueId;
  if (isPublic !== undefined) filter.isPublic = isPublic;
  if (startDate) filter.startDate = { $gte: new Date(startDate) };
  if (endDate) filter.endDate = { $lte: new Date(endDate) };
  if (minFee !== undefined || maxFee !== undefined) {
    filter.fee = {};
    if (minFee !== undefined) filter.fee.$gte = Number(minFee);
    if (maxFee !== undefined) filter.fee.$lte = Number(maxFee);
  }
  if (search) filter.$or = [
    { title: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } }
  ];

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const events = await Event.find(filter)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .sort(sortOptions)
    .populate(populateRefs);

  const total = await Event.countDocuments(filter);
  const totalPages = Math.ceil(total / limitNum);

  // Update cache for listed events
  events.forEach(e => updateCache(e));

  return { events, total, page: pageNum, totalPages };
}

async function updateEventStatus(eventId, status) {
  if (!['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
    throw new ApiError('Invalid event status', 400);
  }
  const event = await Event.findByIdAndUpdate(eventId, { status }, { new: true }).populate(populateRefs);
  if (!event) throw new ApiError('Event not found', 404);

  updateCache(event);

  await sendDemoEmail('Event Status Changed', `Event "${event.title}" status changed to "${status}".`);

  const members = await User.find({ clubId: event.clubId._id });
  for (const member of members) {
    if (io) io.to(member._id.toString()).emit('statusUpdated', {
      eventId: event._id,
      newStatus: status,
    });
  }

  return event;
}

async function autoUpdateEventStatus() {
  const now = new Date();

  const ongoingEvents = await Event.find({ startDate: { $lte: now }, endDate: { $gte: now }, status: 'scheduled' });
  for (const event of ongoingEvents) {
    event.status = 'ongoing';
    await event.save();
    updateCache(event);
    const members = await User.find({ clubId: event.clubId });
    for (const member of members) {
      if (io) io.to(member._id.toString()).emit('statusUpdated', {
        eventId: event._id,
        newStatus: 'ongoing',
      });
    }
  }

  const completedEvents = await Event.find({ endDate: { $lt: now }, status: { $in: ['scheduled', 'ongoing'] } });
  for (const event of completedEvents) {
    event.status = 'completed';
    await event.save();
    updateCache(event);
    const members = await User.find({ clubId: event.clubId });
    for (const member of members) {
      if (io) io.to(member._id.toString()).emit('statusUpdated', {
        eventId: event._id,
        newStatus: 'completed',
      });
    }
  }
}

async function addMediaToEvent(eventId, mediaIds = []) {
  if (!isValidObjectId(eventId)) throw new ApiError('Invalid event ID', 400);
  const event = await Event.findById(eventId).populate('clubId');
  if (!event) throw new ApiError('Event not found', 404);

  for (const id of mediaIds) await checkExistence(Media, id, 'Media');
  const mediaObjectIds = mediaIds.map(id => mongoose.Types.ObjectId(id));
  event.media = [...new Set([...event.media, ...mediaObjectIds])];
  await event.save();

  updateCache(event);

  const members = await User.find({ clubId: event.clubId._id });
  for (const member of members) {
    await sendDemoEmail(
      `New Media Added to Event "${event.title}"`,
      `Hi ${member.firstName}, new media has been added to the event "${event.title}".`
    );
    if (io) io.to(member._id.toString()).emit('mediaUpdated', {
      eventId: event._id,
      type: 'added',
      mediaIds,
    });
  }

  return await event.populate(populateRefs);
}

async function removeMediaFromEvent(eventId, mediaIds = []) {
  if (!isValidObjectId(eventId)) throw new ApiError('Invalid event ID', 400);
  const event = await Event.findById(eventId).populate('clubId');
  if (!event) throw new ApiError('Event not found', 404);

  const mediaObjectIds = mediaIds.map(id => id.toString());
  event.media = event.media.filter(id => !mediaObjectIds.includes(id.toString()));
  await event.save();

  updateCache(event);

  const members = await User.find({ clubId: event.clubId._id });
  for (const member of members) {
    await sendDemoEmail(
      `Media Removed from Event "${event.title}"`,
      `Hi ${member.firstName}, some media has been removed from the event "${event.title}".`
    );
    if (io) io.to(member._id.toString()).emit('mediaUpdated', {
      eventId: event._id,
      type: 'removed',
      mediaIds,
    });
  }

  return await event.populate(populateRefs);
}

async function getEventsByClub(clubId) {
  if (!isValidObjectId(clubId)) throw new ApiError('Invalid club ID', 400);
  const events = await Event.find({ clubId }).populate(populateRefs);
  events.forEach(e => updateCache(e));
  return events;
}

async function getUpcomingInterCollegeEvents() {
  const now = new Date();
  const events = await Event.find({ interCollege: true, startDate: { $gte: now }, status: 'scheduled' })
    .sort({ startDate: 1 }).populate(populateRefs);
  events.forEach(e => updateCache(e));
  return events;
}

async function getUpcomingIntraCollegeEvents() {
  const now = new Date();
  const events = await Event.find({ interCollege: false, startDate: { $gte: now }, status: 'scheduled' })
    .sort({ startDate: 1 }).populate(populateRefs);
  events.forEach(e => updateCache(e));
  return events;
}

async function getEventStats() {
  return await Event.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 }, totalFee: { $sum: "$fee" } } },
    { $sort: { count: -1 } }
  ]);
}

async function exportEventsCSV() {
  const events = await Event.find().populate(populateRefs);
  const fields = ['_id', 'title', 'description', 'type', 'status', 'interCollege', 'clubId', 'venueId', 'startDate', 'endDate', 'fee'];
  const parser = new Parser({ fields });
  return parser.parse(events);
}

async function getEventParticipationMetrics() {
  return [];
}

/* ------------------------ Additional Helpers (Extended) ------------------------ */

/**
 * Get participants of an event via club membership
 */
async function getEventParticipants(eventId) {
  if (!isValidObjectId(eventId)) throw new ApiError('Invalid event ID', 400);
  const event = await Event.findById(eventId).populate('clubId');
  if (!event) throw new ApiError('Event not found', 404);

  const participants = await User.find({ clubId: event.clubId._id });
  return participants;
}

/**
 * Check if venue is available for given event date range
 */
async function isVenueAvailableForEvent(venueId, startDate, endDate) {
  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (const av of venue.availability) {
    const date = new Date(av.date);
    if (date >= start && date <= end && av.isBooked) return false;
  }
  return true;
}

/**
 * Get a dashboard summary of upcoming events
 */
async function getEventDashboardSummary() {
  const interCollege = await getUpcomingInterCollegeEvents();
  const intraCollege = await getUpcomingIntraCollegeEvents();
  const stats = await getEventStats();
  const nextEvents = await Event.find({ startDate: { $gte: new Date() }, status: 'scheduled' })
    .sort({ startDate: 1 }).limit(5).populate(populateRefs);

  return { interCollege, intraCollege, stats, nextEvents };
}

/**
 * Bulk update status of multiple events
 */
async function bulkUpdateEventStatus(eventIds = [], status) {
  if (!['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) throw new ApiError('Invalid status', 400);
  const results = [];
  for (const id of eventIds) {
    const event = await updateEventStatus(id, status);
    results.push(event);
  }
  return results;
}

/**
 * Get events that have media attached
 */
async function getEventsWithMedia() {
  const events = await Event.find({ media: { $exists: true, $not: { $size: 0 } } }).populate(populateRefs);
  events.forEach(e => updateCache(e));
  return events;
}

/* ----------------------------------------------------------------------------- */

module.exports = {
  initSocket,
  createEvent,
  updateEvent,
  deleteEvent,
  removeEvent,
  getEventById,
  listEvents,
  updateEventStatus,
  autoUpdateEventStatus,
  addMediaToEvent,
  removeMediaFromEvent,
  getEventsByClub,
  getUpcomingInterCollegeEvents,
  getUpcomingIntraCollegeEvents,
  getEventStats,
  exportEventsCSV,
  getEventParticipationMetrics,
  // Extended helpers
  getEventParticipants,
  isVenueAvailableForEvent,
  getEventDashboardSummary,
  bulkUpdateEventStatus,
  getEventsWithMedia,
  ApiError,
};
