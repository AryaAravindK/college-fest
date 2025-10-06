/**
 * backend/services/venue_service.js
 *
 * Venue services for College Fest Website
 *
 * Extended version:
 * - CRUD + availability + booking + filtering + pagination (original)
 * - Added:
 *    * Analytics: occupancy, utilization
 *    * Quick queries: next available dates, booked dates, max capacity venues
 *    * Bulk availability updates
 *    * Availability checks across multiple venues
 *    * Optional Socket.IO events for real-time updates
 */

const mongoose = require('mongoose');
const Venue = require('../models/venue_model');
const Event = require('../models/event_model');
const { createVenueValidator, updateVenueValidator } = require('../validators/venue_validator');

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ----------------------
// Socket.IO support
// ----------------------
let io = null;
function initSocket(ioInstance) {
  io = ioInstance;
}
function emitEvent(event, payload) {
  if (io) io.emit(event, payload);
}

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(`Invalid ${name}`, 400);
}

function normalizeDateToUTC(dateInput) {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function getDateRangeArray(startDate, endDate) {
  const start = normalizeDateToUTC(startDate);
  const end = normalizeDateToUTC(endDate);
  if (end < start) throw new ApiError('End date must be after or same as start date', 400);

  const dates = [];
  let cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function isoDateString(d) {
  return d.toISOString();
}

async function getEventsForVenue(venueId) {
  validateObjectId(venueId, 'venueId');
  const events = await Event.find({ venueId }).populate('clubId').populate('venueId');
  return events;
}

// ----------------------
// Core Services (CRUD + Booking)
// ----------------------
async function createVenue(venueData) {
  const { error, value } = createVenueValidator.validate(venueData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const availability = (value.availability || []).map(a => ({
    date: normalizeDateToUTC(a.date),
    isBooked: !!a.isBooked,
  }));

  const venue = await Venue.create({
    name: value.name.trim(),
    location: value.location.trim(),
    capacity: value.capacity,
    availability,
    description: value.description || '',
    isPublic: value.isPublic !== undefined ? !!value.isPublic : true,
  });

  emitEvent('venueCreated', venue);
  return venue;
}

async function updateVenue(venueId, updateData) {
  validateObjectId(venueId, 'venueId');
  const { error, value } = updateVenueValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  if (value.name) venue.name = value.name.trim();
  if (value.location) venue.location = value.location.trim();
  if (value.capacity) {
    if (value.capacity < venue.capacity) {
      const upcoming = await Event.find({
        venueId: venue._id,
        startDate: { $gte: new Date() },
        status: { $ne: 'cancelled' },
      });
      for (const ev of upcoming) {
        if (ev.maxParticipants && ev.maxParticipants > value.capacity) {
          throw new ApiError(
            `Cannot reduce capacity: event "${ev.title}" requires >= ${ev.maxParticipants}`,
            400
          );
        }
      }
    }
    venue.capacity = value.capacity;
  }
  if (value.description !== undefined) venue.description = value.description;
  if (value.isPublic !== undefined) venue.isPublic = !!value.isPublic;

  if (Array.isArray(value.availability)) {
    const newDates = value.availability.map(a => isoDateString(normalizeDateToUTC(a.date)));
    const currentlyBooked = (venue.availability || []).filter(av => av.isBooked).map(av => isoDateString(normalizeDateToUTC(av.date)));
    for (const b of currentlyBooked) {
      if (!newDates.includes(b)) throw new ApiError('Cannot remove availability that is already booked', 400);
    }
    venue.availability = value.availability.map(a => ({
      date: normalizeDateToUTC(a.date),
      isBooked: !!a.isBooked,
    }));
  }

  await venue.save();
  emitEvent('venueUpdated', venue);
  return venue;
}

async function getVenueById(venueId, options = { includeEvents: false }) {
  validateObjectId(venueId, 'venueId');
  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  if (options.includeEvents) {
    const events = await getEventsForVenue(venueId);
    return { venue, events };
  }
  return { venue };
}

async function listVenues(options = {}) {
  const {
    page = 1,
    limit = 10,
    location,
    minCapacity,
    isPublic,
    availableOn,
    sortBy = 'capacity',
    sortDir = 'desc',
  } = options;

  const filter = {};
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (minCapacity) filter.capacity = { $gte: Number(minCapacity) };
  if (typeof isPublic === 'boolean') filter.isPublic = !!isPublic;

  if (availableOn) {
    const d = normalizeDateToUTC(availableOn);
    filter.availability = { $elemMatch: { date: d, isBooked: false } };
  }

  const sortObj = {};
  sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const venues = await Venue.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sortObj);

  const total = await Venue.countDocuments(filter);
  return { venues, total, page: Number(page), limit: Number(limit) };
}

async function addAvailability(venueId, dates = []) {
  validateObjectId(venueId, 'venueId');
  if (!Array.isArray(dates) || dates.length === 0) throw new ApiError('Dates array is required', 400);

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const existingSet = new Set((venue.availability || []).map(a => isoDateString(normalizeDateToUTC(a.date))));
  const toAdd = [];

  for (const d of dates) {
    const nd = normalizeDateToUTC(d);
    const key = isoDateString(nd);
    if (!existingSet.has(key)) {
      toAdd.push({ date: nd, isBooked: false });
      existingSet.add(key);
    }
  }

  if (toAdd.length === 0) return venue;
  venue.availability = venue.availability.concat(toAdd).sort((a, b) => a.date - b.date);
  await venue.save();
  emitEvent('availabilityAdded', { venueId, dates: toAdd.map(d => d.date) });
  return venue;
}

async function removeAvailability(venueId, dates = []) {
  validateObjectId(venueId, 'venueId');
  if (!Array.isArray(dates) || dates.length === 0) throw new ApiError('Dates array is required', 400);

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const removeSet = new Set(dates.map(d => isoDateString(normalizeDateToUTC(d))));
  const bookedConflict = (venue.availability || []).find(av => av.isBooked && removeSet.has(isoDateString(normalizeDateToUTC(av.date))));
  if (bookedConflict) throw new ApiError('Cannot remove availability that is already booked', 400);

  venue.availability = (venue.availability || []).filter(av => !removeSet.has(isoDateString(normalizeDateToUTC(av.date))));
  await venue.save();
  emitEvent('availabilityRemoved', { venueId, dates });
  return venue;
}

async function isVenueFreeForRange(venueId, startDate, endDate) {
  validateObjectId(venueId, 'venueId');
  const dates = getDateRangeArray(startDate, endDate);
  const andConditions = dates.map(d => ({ availability: { $elemMatch: { date: d, isBooked: false } } }));
  const venue = await Venue.findOne({ _id: venueId, $and: andConditions });
  return !!venue;
}

async function bookVenueForEvent(venueId, eventId) {
  validateObjectId(venueId, 'venueId');
  validateObjectId(eventId, 'eventId');

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);

  if (event.maxParticipants && venue.capacity < event.maxParticipants) {
    throw new ApiError(`Venue capacity (${venue.capacity}) < event maxParticipants (${event.maxParticipants})`, 400);
  }

  const dates = getDateRangeArray(event.startDate, event.endDate);
  const availabilityMap = new Map((venue.availability || []).map(av => [isoDateString(normalizeDateToUTC(av.date)), av]));
  for (const d of dates) {
    const key = isoDateString(d);
    const av = availabilityMap.get(key);
    if (!av) throw new ApiError(`Venue not available on ${key}`, 400);
    if (av.isBooked) throw new ApiError(`Venue already booked on ${key}`, 409);
  }

  for (let av of venue.availability) {
    const key = isoDateString(normalizeDateToUTC(av.date));
    if (dates.find(d => isoDateString(d) === key)) av.isBooked = true;
  }

  await venue.save();
  emitEvent('venueBooked', { venueId, eventId, dates });
  return venue;
}

async function releaseBookingForEvent(venueId, eventId) {
  validateObjectId(venueId, 'venueId');
  validateObjectId(eventId, 'eventId');

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);

  const dates = getDateRangeArray(event.startDate, event.endDate);
  for (let av of venue.availability) {
    const key = isoDateString(normalizeDateToUTC(av.date));
    if (dates.find(d => isoDateString(d) === key)) av.isBooked = false;
  }

  await venue.save();
  emitEvent('venueBookingReleased', { venueId, eventId, dates });
  return venue;
}

async function findAvailableVenues(options = {}) {
  const {
    startDate,
    endDate = startDate,
    minCapacity,
    location,
    isPublic,
    page = 1,
    limit = 10,
    sortBy = 'capacity',
    sortDir = 'desc',
  } = options;

  if (!startDate) throw new ApiError('startDate is required', 400);
  const dates = getDateRangeArray(startDate, endDate);

  const filter = {};
  if (minCapacity) filter.capacity = { $gte: Number(minCapacity) };
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (typeof isPublic === 'boolean') filter.isPublic = !!isPublic;
  filter.$and = dates.map(d => ({ availability: { $elemMatch: { date: d, isBooked: false } } }));

  const sortObj = {};
  sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const venues = await Venue.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sortObj);

  const total = await Venue.countDocuments(filter);
  return { venues, total, page, limit };
}

async function getVenueSchedule(venueId, from, to) {
  validateObjectId(venueId, 'venueId');
  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  from = from ? normalizeDateToUTC(from) : new Date(0);
  to = to ? normalizeDateToUTC(to) : new Date('9999-12-31');

  const schedule = (venue.availability || []).filter(av => {
    const d = normalizeDateToUTC(av.date);
    return d >= from && d <= to;
  }).map(av => ({ date: normalizeDateToUTC(av.date), isBooked: !!av.isBooked }));

  return { venueId: venue._id, schedule };
}

async function deleteVenue(venueId, options = { force: false, cascade: false }) {
  validateObjectId(venueId, 'venueId');
  const { force, cascade } = options;

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const referencingEvents = await Event.find({ venueId: venue._id });

  if (referencingEvents.length > 0) {
    if (!force) throw new ApiError('Cannot delete venue: events exist. Use force+cascade to delete.', 400);
    if (!cascade) throw new ApiError('Force delete requested but cascade=false.', 400);
    await Event.deleteMany({ venueId: venue._id });
  }

  await Venue.findByIdAndDelete(venueId);
  emitEvent('venueDeleted', { venueId });
  return { message: 'Venue deleted', venueId };
}

// ----------------------
// Extended Helper Functions
// ----------------------

// Analytics
async function getVenueOccupancyStats(venueId) {
  validateObjectId(venueId, 'venueId');
  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const totalDays = venue.availability.length;
  const bookedDays = venue.availability.filter(av => av.isBooked).length;
  const availableDays = totalDays - bookedDays;

  return { totalDays, bookedDays, availableDays, occupancyPercent: totalDays ? (bookedDays / totalDays) * 100 : 0 };
}

// Quick queries
async function getNextAvailableDates(venueId, count = 5) {
  validateObjectId(venueId, 'venueId');
  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const today = normalizeDateToUTC(new Date());
  const availableDates = venue.availability
    .filter(av => !av.isBooked && normalizeDateToUTC(av.date) >= today)
    .sort((a, b) => a.date - b.date)
    .slice(0, count)
    .map(av => normalizeDateToUTC(av.date));

  return availableDates;
}

async function getBookedDatesForVenue(venueId) {
  validateObjectId(venueId, 'venueId');
  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  return venue.availability.filter(av => av.isBooked).map(av => normalizeDateToUTC(av.date));
}

// Bulk availability
async function addAvailabilityForMultipleVenues(venueIds, dates) {
  const results = [];
  for (const id of venueIds) results.push(await addAvailability(id, dates));
  return results;
}

async function removeAvailabilityForMultipleVenues(venueIds, dates) {
  const results = [];
  for (const id of venueIds) results.push(await removeAvailability(id, dates));
  return results;
}

// Availability across multiple venues
async function findVenuesFreeForAllDates(venueIds, startDate, endDate) {
  const freeVenues = [];
  for (const id of venueIds) {
    const free = await isVenueFreeForRange(id, startDate, endDate);
    if (free) freeVenues.push(id);
  }
  return freeVenues;
}

// ----------------------
// Export
// ----------------------
module.exports = {
  ApiError,
  initSocket,
  createVenue,
  updateVenue,
  getVenueById,
  listVenues,
  addAvailability,
  removeAvailability,
  addAvailabilityForMultipleVenues,
  removeAvailabilityForMultipleVenues,
  isVenueFreeForRange,
  bookVenueForEvent,
  releaseBookingForEvent,
  findAvailableVenues,
  getVenueSchedule,
  deleteVenue,
  getEventsForVenue,
  getVenueOccupancyStats,
  getNextAvailableDates,
  getBookedDatesForVenue,
  findVenuesFreeForAllDates,
};
