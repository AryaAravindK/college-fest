/**
 * backend/services/schedule_service.js
 *
 * Schedule services for College Fest Website
 *
 * Features:
 *  - create/update/delete schedules with validation
 *  - prevent time overlaps at same venue/date
 *  - ensure schedule date sits inside event date range
 *  - use venue availability (and venue_service.bookVenueForEvent / releaseBookingForEvent)
 *  - populate eventId and venueId on reads
 *  - list/filter/paginate schedules
 *  - helpers for intra/inter-college upcoming schedules
 *  - analytics/dashboard helpers
 *  - CSV export
 *  - batch operations
 *  - optional socket notifications
 *  - filter schedules by time-of-day slots (morning/afternoon/evening)
 */

const mongoose = require('mongoose');
const Schedule = require('../models/schedule_model');
const Event = require('../models/event_model');
const Venue = require('../models/venue_model');
const { createScheduleValidator, updateScheduleValidator } = require('../validators/schedule_validator');
const venueService = require('./venue_service'); // expects exported functions bookVenueForEvent & releaseBookingForEvent
const { Parser } = require('json2csv');

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ----------------------
// Socket for real-time notifications
// ----------------------
let io;
function initSocket(socketIoInstance) {
  io = socketIoInstance;
}
async function notifyScheduleCreated(schedule) { if (io) io.emit('scheduleCreated', schedule); }
async function notifyScheduleUpdated(schedule) { if (io) io.emit('scheduleUpdated', schedule); }
async function notifyScheduleDeleted(scheduleId) { if (io) io.emit('scheduleDeleted', { scheduleId }); }

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

function isoDateString(d) {
  return normalizeDateToUTC(d).toISOString();
}

function parseTimeToMinutes(timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number);
  return hh * 60 + mm;
}

function timesOverlap(startA, endA, startB, endB) {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

// Map time-of-day slots
const TIME_SLOTS = {
  morning: { start: 6 * 60, end: 12 * 60 },      // 06:00-12:00
  afternoon: { start: 12 * 60, end: 17 * 60 },   // 12:00-17:00
  evening: { start: 17 * 60, end: 21 * 60 },     // 17:00-21:00
};

// Check for schedule time conflicts at the same venue on same date
async function findVenueScheduleConflict(venueId, date, startTime, endTime, scheduleIdToIgnore = null) {
  validateObjectId(venueId, 'venueId');
  const dateNorm = normalizeDateToUTC(date);
  const query = { venueId: mongoose.Types.ObjectId(venueId), date: dateNorm };
  if (scheduleIdToIgnore) query._id = { $ne: mongoose.Types.ObjectId(scheduleIdToIgnore) };

  const existing = await Schedule.find(query);
  const newStart = parseTimeToMinutes(startTime);
  const newEnd = parseTimeToMinutes(endTime);

  for (const s of existing) {
    const sStart = parseTimeToMinutes(s.startTime);
    const sEnd = parseTimeToMinutes(s.endTime);
    if (timesOverlap(newStart, newEnd, sStart, sEnd)) return s;
  }
  return null;
}

// Ensure venue availability for a single date
async function ensureVenueAvailableForDate(venueId, date, eventId) {
  validateObjectId(venueId, 'venueId');
  validateObjectId(eventId, 'eventId');

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const key = isoDateString(date);
  const av = (venue.availability || []).find(a => isoDateString(a.date) === key);
  if (!av) throw new ApiError(`Venue has no availability entry for ${key}`, 400);

  if (!av.isBooked) return true;

  const existingSchedules = await Schedule.find({ eventId: mongoose.Types.ObjectId(eventId), venueId: mongoose.Types.ObjectId(venueId) });
  if (existingSchedules && existingSchedules.length > 0) return true;

  throw new ApiError(`Venue already booked on ${key}`, 409);
}

// Check if no other schedules exist for event at venue (before releasing booking)
async function noOtherSchedulesForEventAtVenue(eventId, venueId, excludeScheduleId = null) {
  const query = { eventId: mongoose.Types.ObjectId(eventId), venueId: mongoose.Types.ObjectId(venueId) };
  if (excludeScheduleId) query._id = { $ne: mongoose.Types.ObjectId(excludeScheduleId) };
  const count = await Schedule.countDocuments(query);
  return count === 0;
}

// ----------------------
// Core Services
// ----------------------
async function createSchedule(scheduleData) {
  const { error, value } = createScheduleValidator.validate(scheduleData);
  if (error) throw new ApiError(error.details[0].message, 422);

  validateObjectId(value.eventId, 'eventId');
  validateObjectId(value.venueId, 'venueId');

  const event = await Event.findById(value.eventId);
  if (!event) throw new ApiError('Event not found', 404);

  const venue = await Venue.findById(value.venueId);
  if (!venue) throw new ApiError('Venue not found', 404);

  const dateNorm = normalizeDateToUTC(value.date);
  const evStart = normalizeDateToUTC(event.startDate);
  const evEnd = normalizeDateToUTC(event.endDate);
  if (dateNorm < evStart || dateNorm > evEnd) throw new ApiError('Schedule date must lie between event startDate and endDate', 400);

  const startMinutes = parseTimeToMinutes(value.startTime);
  const endMinutes = parseTimeToMinutes(value.endTime);
  if (startMinutes >= endMinutes) throw new ApiError('startTime must be earlier than endTime', 400);

  const conflict = await findVenueScheduleConflict(value.venueId, dateNorm, value.startTime, value.endTime);
  if (conflict) throw new ApiError(`Schedule conflict with schedule ${conflict._id} (start: ${conflict.startTime}, end: ${conflict.endTime})`, 409);

  await ensureVenueAvailableForDate(value.venueId, dateNorm, value.eventId);

  const schedule = await Schedule.create({
    eventId: mongoose.Types.ObjectId(value.eventId),
    venueId: mongoose.Types.ObjectId(value.venueId),
    date: dateNorm,
    startTime: value.startTime,
    endTime: value.endTime,
    description: value.description || '',
    isPublic: value.isPublic !== undefined ? !!value.isPublic : true,
  });

  const existingCount = await Schedule.countDocuments({ eventId: mongoose.Types.ObjectId(value.eventId), venueId: mongoose.Types.ObjectId(value.venueId), _id: { $ne: schedule._id } });
  if (existingCount === 0) {
    await venueService.bookVenueForEvent(value.venueId, value.eventId);
  }

  await notifyScheduleCreated(schedule);
  return schedule.populate(['eventId', 'venueId']);
}

async function updateSchedule(scheduleId, updateData) {
  validateObjectId(scheduleId, 'scheduleId');
  const { error, value } = updateScheduleValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) throw new ApiError('Schedule not found', 404);

  const newEventId = value.eventId ? value.eventId.toString() : schedule.eventId.toString();
  const newVenueId = value.venueId ? value.venueId.toString() : schedule.venueId.toString();
  const newDate = value.date ? normalizeDateToUTC(value.date) : normalizeDateToUTC(schedule.date);
  const newStart = value.startTime || schedule.startTime;
  const newEnd = value.endTime || schedule.endTime;

  if (value.eventId) {
    validateObjectId(value.eventId, 'eventId');
    if (!(await Event.findById(value.eventId))) throw new ApiError('Target event not found', 404);
  }
  if (value.venueId) {
    validateObjectId(value.venueId, 'venueId');
    if (!(await Venue.findById(value.venueId))) throw new ApiError('Target venue not found', 404);
  }

  const startMinutes = parseTimeToMinutes(newStart);
  const endMinutes = parseTimeToMinutes(newEnd);
  if (startMinutes >= endMinutes) throw new ApiError('startTime must be earlier than endTime', 400);

  const event = await Event.findById(newEventId);
  const evStart = normalizeDateToUTC(event.startDate);
  const evEnd = normalizeDateToUTC(event.endDate);
  if (newDate < evStart || newDate > evEnd) throw new ApiError('Schedule date must lie between event startDate and endDate', 400);

  const conflict = await findVenueScheduleConflict(newVenueId, newDate, newStart, newEnd, scheduleId);
  if (conflict) throw new ApiError(`Schedule conflict with schedule ${conflict._id} (start: ${conflict.startTime}, end: ${conflict.endTime})`, 409);

  await ensureVenueAvailableForDate(newVenueId, newDate, newEventId);

  const prevVenueId = schedule.venueId.toString();
  const prevEventId = schedule.eventId.toString();

  if (value.eventId) schedule.eventId = mongoose.Types.ObjectId(value.eventId);
  if (value.venueId) schedule.venueId = mongoose.Types.ObjectId(value.venueId);
  if (value.date) schedule.date = newDate;
  if (value.startTime) schedule.startTime = value.startTime;
  if (value.endTime) schedule.endTime = value.endTime;
  if (value.description !== undefined) schedule.description = value.description;
  if (value.isPublic !== undefined) schedule.isPublic = !!value.isPublic;

  await schedule.save();

  const isNewLink = (await Schedule.countDocuments({ eventId: schedule.eventId, venueId: schedule.venueId, _id: { $ne: schedule._id } })) === 0;
  if (isNewLink) await venueService.bookVenueForEvent(schedule.venueId.toString(), schedule.eventId.toString());

  const noOthersPrev = await noOtherSchedulesForEventAtVenue(prevEventId, prevVenueId, scheduleId);
  if (noOthersPrev) await venueService.releaseBookingForEvent(prevVenueId, prevEventId);

  await notifyScheduleUpdated(schedule);
  return schedule.populate(['eventId', 'venueId']);
}

async function deleteSchedule(scheduleId) {
  validateObjectId(scheduleId, 'scheduleId');
  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) throw new ApiError('Schedule not found', 404);

  const eventId = schedule.eventId.toString();
  const venueId = schedule.venueId.toString();

  await Schedule.findByIdAndDelete(scheduleId);

  const noOthers = await noOtherSchedulesForEventAtVenue(eventId, venueId);
  if (noOthers) await venueService.releaseBookingForEvent(venueId, eventId);

  await notifyScheduleDeleted(scheduleId);
  return { message: 'Schedule deleted', scheduleId };
}

async function getScheduleById(scheduleId) {
  validateObjectId(scheduleId, 'scheduleId');
  const schedule = await Schedule.findById(scheduleId).populate(['eventId', 'venueId']);
  if (!schedule) throw new ApiError('Schedule not found', 404);
  return schedule;
}

// ----------------------
// Listing / Filters / Pagination
// ----------------------
async function listSchedules(options = {}) {
  const { page = 1, limit = 10, eventId, venueId, date, from, to, isPublic, sortBy = 'date', sortDir = 'asc', timeSlot } = options;
  const filter = {};

  if (eventId) { validateObjectId(eventId, 'eventId'); filter.eventId = mongoose.Types.ObjectId(eventId); }
  if (venueId) { validateObjectId(venueId, 'venueId'); filter.venueId = mongoose.Types.ObjectId(venueId); }
  if (date) filter.date = normalizeDateToUTC(date);
  else if (from || to) {
    const fromN = from ? normalizeDateToUTC(from) : new Date(0);
    const toN = to ? normalizeDateToUTC(to) : new Date('9999-12-31');
    filter.date = { $gte: fromN, $lte: toN };
  }
  if (typeof isPublic === 'boolean') filter.isPublic = !!isPublic;

  const sortObj = { [sortBy]: sortDir === 'asc' ? 1 : -1 };
  let schedules = await Schedule.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sortObj)
    .populate(['eventId', 'venueId']);

  // Filter by time-of-day slot
  if (timeSlot && TIME_SLOTS[timeSlot]) {
    const { start, end } = TIME_SLOTS[timeSlot];
    schedules = schedules.filter(s => {
      const schedStart = parseTimeToMinutes(s.startTime);
      return schedStart >= start && schedStart < end;
    });
  }

  const total = schedules.length;
  return { schedules, total, page: Number(page), limit: Number(limit) };
}

// ----------------------
// Helpers for common queries
// ----------------------
async function getSchedulesByEvent(eventId, options = {}) { validateObjectId(eventId, 'eventId'); return listSchedules({ ...options, eventId }); }
async function getSchedulesByVenue(venueId, options = {}) { validateObjectId(venueId, 'venueId'); return listSchedules({ ...options, venueId }); }
async function getSchedulesByDateRange(from, to, options = {}) { return listSchedules({ ...options, from, to }); }

// ----------------------
// Batch creation for event date range
// ----------------------
async function createSchedulesForEventRange(eventId, venueId, startTime, endTime, options = {}) {
  validateObjectId(eventId, 'eventId');
  validateObjectId(venueId, 'venueId');

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);

  const dates = [];
  const start = normalizeDateToUTC(event.startDate);
  const end = normalizeDateToUTC(event.endDate);
  let cur = new Date(start);
  while (cur <= end) { dates.push(new Date(cur)); cur.setUTCDate(cur.getUTCDate() + 1); }

  const created = [];
  const skipped = [];

  for (const d of dates) {
    try {
      const sched = await createSchedule({
        eventId,
        venueId,
        date: d,
        startTime,
        endTime,
        description: options.description || '',
        isPublic: typeof options.isPublic === 'boolean' ? options.isPublic : true,
      });
      created.push(sched);
    } catch (err) {
      skipped.push({ date: isoDateString(d), reason: err.message || String(err) });
    }
  }

  return { created, skipped };
}

// ----------------------
// Upcoming inter/intra-college schedules
// ----------------------
async function getUpcomingInterCollegeSchedules({ from = new Date(), limit = 50 } = {}) {
  const fromN = normalizeDateToUTC(from);
  const schedules = await Schedule.find({ date: { $gte: fromN } }).populate(['eventId', 'venueId']).sort({ date: 1 }).limit(limit);
  return schedules.filter(s => s.eventId && s.eventId.interCollege);
}
async function getUpcomingIntraCollegeSchedules({ from = new Date(), limit = 50 } = {}) {
  const fromN = normalizeDateToUTC(from);
  const schedules = await Schedule.find({ date: { $gte: fromN } }).populate(['eventId', 'venueId']).sort({ date: 1 }).limit(limit);
  return schedules.filter(s => s.eventId && !s.eventId.interCollege);
}

// ----------------------
// Analytics / Dashboard helpers
// ----------------------
async function getTotalSchedulesForEvent(eventId) { validateObjectId(eventId, 'eventId'); const total = await Schedule.countDocuments({ eventId }); return { eventId, total }; }
async function getSchedulesCountByVenue() { return Schedule.aggregate([{ $group: { _id: '$venueId', totalSchedules: { $sum: 1 } } }]); }
async function getTopBusyVenues(limit = 5) { return Schedule.aggregate([{ $group: { _id: '$venueId', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: limit }]); }
async function getRecentlyAddedSchedules(limit = 5) { return Schedule.find().sort({ createdAt: -1 }).limit(limit).populate(['eventId', 'venueId']); }

// ----------------------
// CSV Export
// ----------------------
async function exportSchedulesCSV(filter = {}) {
  const schedules = await Schedule.find(filter).populate(['eventId', 'venueId']);
  const parser = new Parser({ fields: ['_id', 'eventId.title', 'venueId.name', 'date', 'startTime', 'endTime', 'description', 'isPublic'] });
  return parser.parse(schedules);
}

// ----------------------
// Batch Delete
// ----------------------
async function deleteSchedulesByEvent(eventId) {
  validateObjectId(eventId, 'eventId');
  const schedules = await Schedule.find({ eventId });
  const deleted = [];
  for (const s of schedules) { await deleteSchedule(s._id); deleted.push(s._id); }
  return { deleted };
}

// ----------------------
// Search helper
// ----------------------
async function searchSchedulesByDescription(keyword, options = {}) {
  if (!keyword || typeof keyword !== 'string') throw new ApiError('Keyword required', 400);
  const { page = 1, limit = 10 } = options;
  const filter = { description: { $regex: keyword, $options: 'i' } };
  const schedules = await Schedule.find(filter).skip((page - 1) * limit).limit(limit).populate(['eventId', 'venueId']);
  const total = await Schedule.countDocuments(filter);
  return { schedules, total, page, limit };
}

// ----------------------
// Exports
// ----------------------
module.exports = {
  ApiError,
  initSocket,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleById,
  listSchedules,
  getSchedulesByEvent,
  getSchedulesByVenue,
  getSchedulesByDateRange,
  createSchedulesForEventRange,
  getUpcomingInterCollegeSchedules,
  getUpcomingIntraCollegeSchedules,
  getTotalSchedulesForEvent,
  getSchedulesCountByVenue,
  getTopBusyVenues,
  getRecentlyAddedSchedules,
  exportSchedulesCSV,
  deleteSchedulesByEvent,
  searchSchedulesByDescription,
};
