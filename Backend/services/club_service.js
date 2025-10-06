/**
 * backend/services/club_service.js
 *
 * Club services for College Fest Website
 */

const mongoose = require('mongoose');
const Club = require('../models/club_model');
const User = require('../models/user_model');
const Event = require('../models/event_model');
const Result = require('../models/result_model');
const { createClubValidator, updateClubValidator } = require('../validators/club_validator');
const { Parser } = require('json2csv');

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const INTRA_COLLEGE_NAME = process.env.INTRA_COLLEGE_NAME || 'SURANA COLLEGE AUTONOMOUS';

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(String(id))) throw new ApiError(`Invalid ${name}`, 400);
}

async function findUserOrThrow(userId) {
  validateObjectId(userId, 'userId');
  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404);
  return user;
}

async function findEventOrThrow(eventId) {
  validateObjectId(eventId, 'eventId');
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);
  return event;
}

async function ensureUsersExist(userIds = []) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const uniq = [...new Set(userIds.map(String))];
  uniq.forEach(id => validateObjectId(id, 'userId'));
  const found = await User.find({ _id: { $in: uniq } }).select('_id');
  if (found.length !== uniq.length) {
    const foundIds = found.map(f => f._id.toString());
    const missing = uniq.filter(id => !foundIds.includes(id));
    throw new ApiError(`User(s) not found: ${missing.join(', ')}`, 404);
  }
  return uniq.map(id => mongoose.Types.ObjectId(id));
}

async function ensureEventsExist(eventIds = []) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return [];
  const uniq = [...new Set(eventIds.map(String))];
  uniq.forEach(id => validateObjectId(id, 'eventId'));
  const found = await Event.find({ _id: { $in: uniq } }).select('_id interCollege title');
  if (found.length !== uniq.length) {
    const foundIds = found.map(f => f._id.toString());
    const missing = uniq.filter(id => !foundIds.includes(id));
    throw new ApiError(`Event(s) not found: ${missing.join(', ')}`, 404);
  }
  return uniq.map(id => mongoose.Types.ObjectId(id));
}

async function populateClub(clubDoc) {
  if (!clubDoc) return null;
  return clubDoc.populate(['headId', 'memberIds', 'eventIds']);
}

// ----------------------
// Core Services
// ----------------------

/**
 * Create a new club
 * - Validates input
 * - Ensures head exists
 * - Ensures memberIds exist (auto-adds head to members if missing)
 * - Validates eventIds exist (does NOT reassign event.clubId unless addEventsToClub called)
 */
async function createClub(clubData) {
  const { error, value } = createClubValidator.validate(clubData);
  if (error) throw new ApiError(error.details[0].message, 422);

  // Validate head
  await findUserOrThrow(value.headId);

  // Validate members if provided
  const memberIds = value.memberIds ? await ensureUsersExist(value.memberIds) : [];
  const headIdStr = String(value.headId);
  // Ensure head is in members list
  if (!memberIds.map(id => id.toString()).includes(headIdStr)) {
    memberIds.push(mongoose.Types.ObjectId(headIdStr));
  }

  // Validate events if provided (only ensure existence; do not force reassign)
  const eventIds = value.eventIds ? await ensureEventsExist(value.eventIds) : [];

  const club = await Club.create({
    name: value.name.trim(),
    description: value.description.trim(),
    headId: mongoose.Types.ObjectId(value.headId),
    memberIds,
    eventIds,
    logo: value.logo || null,
    isPublic: value.isPublic !== undefined ? !!value.isPublic : true,
  });

  return populateClub(club);
}

/**
 * Update club (partial updates allowed)
 * - If headId changes: ensure user exists and add them to members if missing
 * - If memberIds provided: validate and dedupe; ensure head remains in members
 * - If eventIds provided: validate events exist (does not change event.clubId by default)
 */
async function updateClub(clubId, updateData) {
  validateObjectId(clubId, 'clubId');
  const { error, value } = updateClubValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError('Club not found', 404);

  if (value.headId) {
    await findUserOrThrow(value.headId);
    club.headId = mongoose.Types.ObjectId(value.headId);
  }

  if (value.memberIds) {
    const validatedMembers = await ensureUsersExist(value.memberIds);
    // Ensure head present
    const headStr = club.headId ? club.headId.toString() : (value.headId ? String(value.headId) : null);
    if (headStr && !validatedMembers.map(id => id.toString()).includes(headStr)) {
      validatedMembers.push(mongoose.Types.ObjectId(headStr));
    }
    club.memberIds = validatedMembers;
  } else {
    // if head changed but members not provided ensure head in memberIds
    if (value.headId) {
      const headStr = String(value.headId);
      if (!club.memberIds.map(id => id.toString()).includes(headStr)) {
        club.memberIds.push(mongoose.Types.ObjectId(headStr));
      }
    }
  }

  if (value.name) club.name = value.name.trim();
  if (value.description) club.description = value.description.trim();
  if (value.logo !== undefined) club.logo = value.logo || null;
  if (value.isPublic !== undefined) club.isPublic = !!value.isPublic;

  if (value.eventIds) {
    // Validate event existence but do NOT modify event.clubId automatically
    const validatedEvents = await ensureEventsExist(value.eventIds);
    club.eventIds = validatedEvents;
  }

  await club.save();
  return populateClub(club);
}

/**
 * Delete a club
 * - By default prevents deletion if there are events that reference the club (to avoid orphaning events)
 * - options: { force: boolean, cascade: boolean }
 *    * force=false & events present => error
 *    * force=true & cascade=false => error (must reassign or delete events)
 *    * force=true & cascade=true => delete all events referencing club (use carefully)
 */
async function deleteClub(clubId, options = { force: false, cascade: false }) {
  validateObjectId(clubId, 'clubId');
  const { force, cascade } = options;

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError('Club not found', 404);

  const referencingEvents = await Event.find({ clubId: club._id });
  if (referencingEvents.length > 0) {
    if (!force) {
      throw new ApiError('Cannot delete club: there are events assigned to this club. Reassign or delete those events first or use force+cascade.', 400);
    }
    if (!cascade) {
      throw new ApiError('Force delete requested but cascade=false. To delete club and its events, set cascade=true.', 400);
    }
    // cascade delete events
    await Event.deleteMany({ clubId: club._id });
  }

  await Club.findByIdAndDelete(clubId);
  return { message: 'Club deleted', clubId };
}

/**
 * Get club by ID (populated)
 */
async function getClubById(clubId) {
  validateObjectId(clubId, 'clubId');
  const club = await Club.findById(clubId).populate(['headId', 'memberIds', 'eventIds']);
  if (!club) throw new ApiError('Club not found', 404);
  return club;
}

/**
 * List clubs with filters, pagination, sorting
 * options: { page, limit, search, hasEvents, isPublic, sortBy, sortDir }
 */
async function listClubs(options = {}) {
  const {
    page = 1,
    limit = 10,
    search,
    hasEvents,
    isPublic,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = options;

  const filter = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (typeof isPublic === 'boolean') filter.isPublic = !!isPublic;
  if (typeof hasEvents === 'boolean') {
    filter.eventIds = hasEvents ? { $exists: true, $not: { $size: 0 } } : { $size: 0 };
  }

  const sortObj = {};
  sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const clubs = await Club.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sortObj)
    .populate(['headId', 'memberIds', 'eventIds']);

  const total = await Club.countDocuments(filter);
  return { clubs, total, page: Number(page), limit: Number(limit) };
}

/**
 * Add members to a club (idempotent)
 * - Validates users exist and are not already members
 * - Auto-adds duplicates only once
 */
async function addMembers(clubId, userIds = []) {
  validateObjectId(clubId, 'clubId');
  if (!Array.isArray(userIds) || userIds.length === 0) throw new ApiError('userIds array required', 400);

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError('Club not found', 404);

  const validated = await ensureUsersExist(userIds);
  const existing = new Set(club.memberIds.map(m => m.toString()));
  for (const uid of validated) {
    if (!existing.has(uid.toString())) {
      club.memberIds.push(mongoose.Types.ObjectId(uid));
    }
  }
  await club.save();
  return populateClub(club);
}

/**
 * Remove members from a club
 * - Does not allow removing the head as a member; to change head use setHead first
 */
async function removeMembers(clubId, userIds = []) {
  validateObjectId(clubId, 'clubId');
  if (!Array.isArray(userIds) || userIds.length === 0) throw new ApiError('userIds array required', 400);

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError('Club not found', 404);

  const headStr = club.headId ? club.headId.toString() : null;
  for (const uidRaw of userIds) {
    validateObjectId(uidRaw, 'userId');
    const uid = String(uidRaw);
    if (headStr && uid === headStr) {
      throw new ApiError('Cannot remove club head from members. Transfer head before removing.', 400);
    }
  }

  club.memberIds = club.memberIds.filter(m => !userIds.map(String).includes(m.toString()));
  await club.save();
  return populateClub(club);
}

/**
 * Change club head
 * - Ensures new head exists and is a member (auto-add if not present)
 */
async function setHead(clubId, newHeadId) {
  validateObjectId(clubId, 'clubId');
  validateObjectId(newHeadId, 'userId');

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError('Club not found', 404);

  const user = await findUserOrThrow(newHeadId);
  const newHeadStr = String(newHeadId);
  if (!club.memberIds.map(m => m.toString()).includes(newHeadStr)) {
    club.memberIds.push(mongoose.Types.ObjectId(newHeadId));
  }
  club.headId = mongoose.Types.ObjectId(newHeadId);
  await club.save();
  return populateClub(club);
}

/**
 * Add events to a club
 * - Validates event existence
 * - By default DOES NOT reassign event.clubId (safe)
 * - options: { force: boolean } — if force=true, reassign event.clubId to this club (overwrites previous)
 * - When adding an event that is intra-college (interCollege === false) we ensure the club head belongs to INTRA_COLLEGE_NAME
 */
async function addEventsToClub(clubId, eventIds = [], options = { force: false }) {
  validateObjectId(clubId, 'clubId');
  if (!Array.isArray(eventIds) || eventIds.length === 0) throw new ApiError('eventIds array required', 400);

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError('Club not found', 404);

  const validatedEventIds = await ensureEventsExist(eventIds);
  const existingEventSet = new Set(club.eventIds.map(e => e.toString()));
  const head = await findUserOrThrow(club.headId);

  for (const evIdObj of validatedEventIds) {
    const evIdStr = evIdObj.toString();
    const ev = await Event.findById(evIdObj);
    // Intra-college event check: ensure club head belongs to intra-college
    if (ev && ev.interCollege === false) {
      const headCollege = (head.college || '').trim().toLowerCase();
      if (headCollege !== INTRA_COLLEGE_NAME.trim().toLowerCase()) {
        throw new ApiError(`Cannot link intra-college event "${ev.title}" to a club whose head is not from ${INTRA_COLLEGE_NAME}`, 400);
      }
    }

    if (!existingEventSet.has(evIdStr)) {
      // If event already has a different club and force=true -> reassign event.clubId to this club
      if (ev.clubId && ev.clubId.toString() !== club._id.toString()) {
        if (!options.force) {
          throw new ApiError(`Event ${ev._id} is already assigned to another club. Use force=true to reassign`, 400);
        }
        // reassign event.clubId
        ev.clubId = mongoose.Types.ObjectId(club._id);
        await ev.save();
      } else if (!ev.clubId) {
        // If event.clubId not set, we can set it safely
        if (options.force) {
          ev.clubId = mongoose.Types.ObjectId(club._id);
          await ev.save();
        }
      }
      club.eventIds.push(mongoose.Types.ObjectId(evIdObj));
    }
  }

  await club.save();
  return populateClub(club);
}

/**
 * Remove events from a club
 * - By default prevents removing events that have event.clubId === club._id (to avoid orphaning)
 * - options: { force: boolean, cascadeDeleteEvent: boolean }
 *    * force=false: will only remove events from club.eventIds if event.clubId !== club._id
 *    * force=true & cascadeDeleteEvent=false: reassign required before removal (error)
 *    * force=true & cascadeDeleteEvent=true: delete the events that belong to this club (use carefully)
 */
async function removeEventsFromClub(clubId, eventIds = [], options = { force: false, cascadeDeleteEvent: false }) {
  validateObjectId(clubId, 'clubId');
  if (!Array.isArray(eventIds) || eventIds.length === 0) throw new ApiError('eventIds array required', 400);

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError('Club not found', 404);

  const evIdStrs = eventIds.map(String);
  for (const rawId of evIdStrs) validateObjectId(rawId, 'eventId');

  for (const evRaw of evIdStrs) {
    const ev = await Event.findById(evRaw);
    if (!ev) {
      // if event not found, simply ensure it's removed from club.eventIds if present
      club.eventIds = club.eventIds.filter(e => e.toString() !== evRaw);
      continue;
    }
    if (ev.clubId && ev.clubId.toString() === club._id.toString()) {
      if (!options.force) {
        throw new ApiError(`Event ${ev._id} is assigned to this club. Use force=true to remove (or reassign).`, 400);
      }
      if (options.cascadeDeleteEvent) {
        await Event.findByIdAndDelete(ev._id);
        // ensure removed from club.eventIds
        club.eventIds = club.eventIds.filter(e => e.toString() !== evRaw);
        continue;
      } else {
        // force true but cascadeDeleteEvent false -> cannot orphan; require reassign
        throw new ApiError(`Event ${ev._id} is assigned to this club. Reassign event.clubId before removing or set cascadeDeleteEvent=true to delete it.`, 400);
      }
    } else {
      // safe to remove
      club.eventIds = club.eventIds.filter(e => e.toString() !== evRaw);
    }
  }

  await club.save();
  return populateClub(club);
}

/**
 * Reassign events from one club to another
 * - useful for admin tasks before deleting a club
 */
async function reassignEventsToClub(fromClubId, toClubId, eventIds = []) {
  validateObjectId(fromClubId, 'fromClubId');
  validateObjectId(toClubId, 'toClubId');
  if (fromClubId === toClubId) throw new ApiError('Source and destination club must differ', 400);

  const fromClub = await Club.findById(fromClubId);
  const toClub = await Club.findById(toClubId);
  if (!fromClub) throw new ApiError('Source club not found', 404);
  if (!toClub) throw new ApiError('Destination club not found', 404);

  const evs = eventIds && eventIds.length > 0 ? eventIds.map(String) : fromClub.eventIds.map(e => e.toString());
  for (const evId of evs) {
    validateObjectId(evId, 'eventId');
    const ev = await Event.findById(evId);
    if (!ev) throw new ApiError(`Event not found: ${evId}`, 404);
    // reassign event.clubId
    ev.clubId = mongoose.Types.ObjectId(toClubId);
    await ev.save();

    // update both clubs' event lists
    fromClub.eventIds = fromClub.eventIds.filter(e => e.toString() !== evId);
    if (!toClub.eventIds.map(e => e.toString()).includes(evId)) {
      toClub.eventIds.push(mongoose.Types.ObjectId(evId));
    }
  }

  await fromClub.save();
  await toClub.save();

  return { fromClub: await populateClub(fromClub), toClub: await populateClub(toClub) };
}

/**
 * Get clubs that include a specific event
 */
async function getClubsByEvent(eventId) {
  validateObjectId(eventId, 'eventId');
  const clubs = await Club.find({ eventIds: mongoose.Types.ObjectId(eventId) }).populate(['headId', 'memberIds', 'eventIds']);
  return clubs;
}

/**
 * Get clubs a user belongs to (as member or head)
 */
async function getClubsByMember(userId) {
  validateObjectId(userId, 'userId');
  const clubs = await Club.find({
    $or: [{ headId: mongoose.Types.ObjectId(userId) }, { memberIds: mongoose.Types.ObjectId(userId) }],
  }).populate(['headId', 'memberIds', 'eventIds']);
  return clubs;
}

/**
 * Remove a given eventId from all clubs (useful when deleting an event)
 */
async function removeEventFromAllClubs(eventId) {
  validateObjectId(eventId, 'eventId');
  await Club.updateMany(
    { eventIds: mongoose.Types.ObjectId(eventId) },
    { $pull: { eventIds: mongoose.Types.ObjectId(eventId) } }
  );
  return { message: 'Event removed from clubs' };
}

/**
 * Club statistics for admin dashboard
 * returns:
 *  - totalClubs
 *  - totalMembers (sum of unique members across clubs)
 *  - clubsByEventCount: top clubs ordered by number of events
 *  - clubsWithMostMembers
 */
async function getClubStatistics({ top = 5 } = {}) {
  const totalClubs = await Club.countDocuments();
  const allClubs = await Club.find({}).select('memberIds eventIds name').lean();

  // unique members across clubs
  const memberSet = new Set();
  for (const c of allClubs) {
    for (const mid of (c.memberIds || [])) memberSet.add(String(mid));
  }

  // clubs by event count
  const clubsByEventCount = allClubs
    .map(c => ({ clubId: c._id, name: c.name, eventCount: (c.eventIds || []).length }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, top);

  // clubs by member count
  const clubsByMemberCount = allClubs
    .map(c => ({ clubId: c._id, name: c.name, memberCount: (c.memberIds || []).length }))
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, top);

  return {
    totalClubs,
    totalUniqueMembers: memberSet.size,
    clubsByEventCount,
    clubsByMemberCount,
  };
}

// ----------------------
// Extended Features
// ----------------------

/**
 * Club Leaderboard (based on medals/results)
 */
async function getClubLeaderboard(top = 10) {
  const pipeline = [
    { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    { $match: { 'event.clubId': { $ne: null } } },
    {
      $group: {
        _id: '$event.clubId',
        gold: { $sum: { $cond: [{ $eq: ['$rank', 1] }, 1, 0] } },
        silver: { $sum: { $cond: [{ $eq: ['$rank', 2] }, 1, 0] } },
        bronze: { $sum: { $cond: [{ $eq: ['$rank', 3] }, 1, 0] } },
      },
    },
    { $project: { gold: 1, silver: 1, bronze: 1, points: { $add: ['$gold', '$silver', '$bronze'] } } },
    { $sort: { points: -1, gold: -1 } },
    { $limit: top },
  ];

  const leaderboard = await Result.aggregate(pipeline);
  const clubs = await Club.find({ _id: { $in: leaderboard.map(l => l._id) } }).select('name logo');
  return leaderboard.map(l => ({
    club: clubs.find(c => String(c._id) === String(l._id)),
    ...l,
  }));
}

/**
 * Club Member Activity (all events their members registered in)
 */
async function getClubMemberActivity(clubId) {
  validateObjectId(clubId, 'clubId');
  const club = await Club.findById(clubId).populate('memberIds');
  if (!club) throw new ApiError('Club not found', 404);

  const memberIds = club.memberIds.map(m => m._id);
  const events = await Event.find({ registrations: { $in: memberIds } }).select('title date isPublic');
  return { club: club.name, events };
}

/**
 * Club Growth Over Time (analytics)
 */
async function getClubGrowth(clubId) {
  validateObjectId(clubId, 'clubId');
  const club = await Club.findById(clubId).select('createdAt updatedAt memberIds');
  if (!club) throw new ApiError('Club not found', 404);

  return {
    clubId,
    createdAt: club.createdAt,
    updatedAt: club.updatedAt,
    memberCount: club.memberIds.length,
  };
}

/**
 * Club Event Performance Summary
 */
async function getClubEventPerformance(clubId) {
  validateObjectId(clubId, 'clubId');
  const events = await Event.find({ clubId }).select('_id title');
  if (!events.length) return { message: 'No events linked to this club' };

  const eventIds = events.map(e => e._id);
  const results = await Result.find({ eventId: { $in: eventIds } }).populate('userId teamId');

  return {
    clubId,
    events: events.length,
    results: results.length,
    winners: results.filter(r => r.rank <= 3).length,
  };
}

/**
 * Export Clubs to CSV
 */
async function exportClubsCSV(filter = {}) {
  const clubs = await Club.find(filter).populate(['headId', 'memberIds', 'eventIds']).lean();
  const fields = ['name', 'description', 'headId.firstName', 'memberIds.length', 'eventIds.length'];
  const parser = new Parser({ fields });
  return parser.parse(clubs);
}

// ----------------------
// Exports
// ----------------------
module.exports = {
  ApiError,
  createClub,
  updateClub,
  deleteClub,
  getClubById,
  listClubs,
  addMembers,
  removeMembers,
  setHead,
  addEventsToClub,
  removeEventsFromClub,
  reassignEventsToClub,
  getClubsByEvent,
  getClubsByMember,
  removeEventFromAllClubs,
  getClubStatistics,

  // New exports
  getClubLeaderboard,
  getClubMemberActivity,
  getClubGrowth,
  getClubEventPerformance,
  exportClubsCSV,
};
