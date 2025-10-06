/** 
 * backend/services/result_service.js
 *
 * Result services for College Fest Website
 *
 * - Matches result_model.js and validators/result_validator.js
 * - Populates eventId, userId, teamId on read
 * - Enforces:
 *     * For event.type === 'solo' -> require userId (no teamId)
 *     * For event.type === 'team' -> prefer teamId; if userId supplied, ensure user is part of a team for that event
 *     * For intra-college events (event.interCollege === false) -> ensure participant's college matches INTRA_COLLEGE_NAME (env) or default
 *     * Unique rank per event (no two results with same rank for same event)
 *     * A user/team cannot have multiple results for the same event
 * - Exposes: createResult, updateResult, deleteResult, getResultById, listResults, bulkUploadResults,
 *            getLeaderboard, getMedalTally, getTopResults, removeResultsForEvent
 * - Extended helpers: getCollegeLeaderboard, getParticipantResults, getEventStats, getRankDistribution, exportResultsCSV, getDashboardSummary
 */

const mongoose = require('mongoose');
const Result = require('../models/result_model');
const Event = require('../models/event_model');
const User = require('../models/user_model');
const Team = require('../models/team_model');
const { createResultValidator, updateResultValidator } = require('../validators/result_validator');
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
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(`Invalid ${name}`, 400);
}

async function findEventOrThrow(eventId) {
  validateObjectId(eventId, 'eventId');
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);
  return event;
}

async function findUserOrThrow(userId) {
  validateObjectId(userId, 'userId');
  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404);
  return user;
}

async function findTeamOrThrow(teamId) {
  validateObjectId(teamId, 'teamId');
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);
  return team;
}

async function userTeamForEvent(userId, eventId) {
  validateObjectId(userId, 'userId');
  validateObjectId(eventId, 'eventId');
  const team = await Team.findOne({
    eventId: mongoose.Types.ObjectId(eventId),
    $or: [{ leaderId: mongoose.Types.ObjectId(userId) }, { memberIds: mongoose.Types.ObjectId(userId) }],
  });
  return team;
}

async function ensureUniqueRank(eventId, rank, excludeResultId = null) {
  const q = { eventId: mongoose.Types.ObjectId(eventId), rank: Number(rank) };
  if (excludeResultId) q._id = { $ne: mongoose.Types.ObjectId(excludeResultId) };
  const existing = await Result.findOne(q);
  if (existing) throw new ApiError(`Rank ${rank} already assigned for this event (resultId: ${existing._id})`, 409);
}

async function ensureNoDuplicateParticipantResult(eventId, { userId = null, teamId = null }, excludeResultId = null) {
  if (userId) {
    const q = { eventId: mongoose.Types.ObjectId(eventId), userId: mongoose.Types.ObjectId(userId) };
    if (excludeResultId) q._id = { $ne: mongoose.Types.ObjectId(excludeResultId) };
    const existing = await Result.findOne(q);
    if (existing) throw new ApiError('This user already has a result for this event', 409);
  }
  if (teamId) {
    const q = { eventId: mongoose.Types.ObjectId(eventId), teamId: mongoose.Types.ObjectId(teamId) };
    if (excludeResultId) q._id = { $ne: mongoose.Types.ObjectId(excludeResultId) };
    const existing = await Result.findOne(q);
    if (existing) throw new ApiError('This team already has a result for this event', 409);
  }
}

function getCollegeFromPopulated(resultDoc) {
  if (resultDoc.userId && resultDoc.userId.college) return resultDoc.userId.college;
  if (resultDoc.teamId && resultDoc.teamId.college) return resultDoc.teamId.college;
  return 'Unknown';
}

async function populateResult(result) {
  if (!result) return null;
  return result.populate(['eventId', 'userId', 'teamId']);
}

// ----------------------
// Core Services
// ----------------------

// ----- Create Result -----
async function createResult(resultData) {
  const { error, value } = createResultValidator.validate(resultData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const event = await findEventOrThrow(value.eventId);

  if (value.userId) validateObjectId(value.userId, 'userId');
  if (value.teamId) validateObjectId(value.teamId, 'teamId');

  if (event.type === 'solo') {
    if (!value.userId) throw new ApiError('Solo event requires userId (individual result)', 400);
    if (value.teamId) throw new ApiError('Solo event cannot have a teamId', 400);

    const user = await findUserOrThrow(value.userId);
    if (!event.interCollege && (!user.college || user.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
      throw new ApiError('Participant must belong to the intra-college to have a result for this intra-college event', 400);
    }
  } else if (event.type === 'team') {
    if (value.teamId) {
      const team = await findTeamOrThrow(value.teamId);
      if (team.eventId.toString() !== value.eventId.toString()) {
        throw new ApiError('Provided team is not registered for the specified event', 400);
      }
      if (!event.interCollege && (!team.college || team.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
        throw new ApiError('Team must belong to the intra-college for this intra-college event', 400);
      }
    } else if (value.userId) {
      const user = await findUserOrThrow(value.userId);
      const team = await userTeamForEvent(value.userId, value.eventId);
      if (!team) throw new ApiError('User is not part of any team for this team-based event', 400);
      if (!event.interCollege && (!user.college || user.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
        throw new ApiError('Participant must belong to the intra-college to have a result for this intra-college event', 400);
      }
    } else {
      throw new ApiError('Team event requires either teamId or userId', 400);
    }
  }

  await ensureNoDuplicateParticipantResult(value.eventId, { userId: value.userId, teamId: value.teamId });
  await ensureUniqueRank(value.eventId, value.rank);

  const created = await Result.create({
    eventId: mongoose.Types.ObjectId(value.eventId),
    userId: value.userId ? mongoose.Types.ObjectId(value.userId) : null,
    teamId: value.teamId ? mongoose.Types.ObjectId(value.teamId) : null,
    rank: Number(value.rank),
    score: value.score !== undefined ? value.score : null,
    isPublic: value.isPublic !== undefined ? !!value.isPublic : true,
  });

  return populateResult(created);
}

// ----- Update Result -----
async function updateResult(resultId, updateData) {
  validateObjectId(resultId, 'resultId');
  const { error, value } = updateResultValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const result = await Result.findById(resultId);
  if (!result) throw new ApiError('Result not found', 404);

  const targetEventId = value.eventId ? value.eventId.toString() : result.eventId.toString();
  const event = await findEventOrThrow(targetEventId);

  if (value.userId !== undefined && value.userId) validateObjectId(value.userId, 'userId');
  if (value.teamId !== undefined && value.teamId) validateObjectId(value.teamId, 'teamId');

  const newUserId = value.userId !== undefined ? value.userId : (result.userId ? result.userId.toString() : null);
  const newTeamId = value.teamId !== undefined ? value.teamId : (result.teamId ? result.teamId.toString() : null);

  if (!newUserId && !newTeamId) throw new ApiError('Either userId or teamId must be present for a result', 400);

  if (event.type === 'solo') {
    if (!newUserId) throw new ApiError('Solo event requires userId', 400);
    if (newTeamId) throw new ApiError('Solo event cannot have a teamId', 400);
    const user = await findUserOrThrow(newUserId);
    if (!event.interCollege && (!user.college || user.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
      throw new ApiError('Participant must belong to the intra-college to have a result for this intra-college event', 400);
    }
  } else if (event.type === 'team') {
    if (newTeamId) {
      const team = await findTeamOrThrow(newTeamId);
      if (team.eventId.toString() !== targetEventId) {
        throw new ApiError('Provided team is not registered for the specified event', 400);
      }
      if (!event.interCollege && (!team.college || team.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
        throw new ApiError('Team must belong to the intra-college for this intra-college event', 400);
      }
    } else if (newUserId) {
      const user = await findUserOrThrow(newUserId);
      const team = await userTeamForEvent(newUserId, targetEventId);
      if (!team) throw new ApiError('User is not part of any team for this team-based event', 400);
      if (!event.interCollege && (!user.college || user.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
        throw new ApiError('Participant must belong to the intra-college to have a result for this intra-college event', 400);
      }
    }
  }

  if (value.rank !== undefined) await ensureUniqueRank(targetEventId, value.rank, resultId);
  await ensureNoDuplicateParticipantResult(targetEventId, { userId: newUserId, teamId: newTeamId }, resultId);

  if (value.eventId) result.eventId = mongoose.Types.ObjectId(value.eventId);
  if (value.userId !== undefined) result.userId = value.userId ? mongoose.Types.ObjectId(value.userId) : null;
  if (value.teamId !== undefined) result.teamId = value.teamId ? mongoose.Types.ObjectId(value.teamId) : null;
  if (value.rank !== undefined) result.rank = Number(value.rank);
  if (value.score !== undefined) result.score = value.score;
  if (value.isPublic !== undefined) result.isPublic = !!value.isPublic;

  await result.save();
  return populateResult(result);
}

// ----- Delete Result -----
async function deleteResult(resultId) {
  validateObjectId(resultId, 'resultId');
  const existing = await Result.findByIdAndDelete(resultId);
  if (!existing) throw new ApiError('Result not found', 404);
  return { message: 'Result deleted', resultId };
}

// ----- Get Result By ID -----
async function getResultById(resultId) {
  validateObjectId(resultId, 'resultId');
  const res = await Result.findById(resultId).populate(['eventId', 'userId', 'teamId']);
  if (!res) throw new ApiError('Result not found', 404);
  return res;
}

// ----- List Results -----
async function listResults(options = {}) {
  const {
    page = 1,
    limit = 10,
    eventId,
    userId,
    teamId,
    minRank,
    maxRank,
    isPublic,
    sortBy = 'rank',
    sortDir = 'asc',
  } = options;

  const filter = {};
  if (eventId) { validateObjectId(eventId, 'eventId'); filter.eventId = mongoose.Types.ObjectId(eventId); }
  if (userId) { validateObjectId(userId, 'userId'); filter.userId = mongoose.Types.ObjectId(userId); }
  if (teamId) { validateObjectId(teamId, 'teamId'); filter.teamId = mongoose.Types.ObjectId(teamId); }
  if (minRank !== undefined || maxRank !== undefined) {
    filter.rank = {};
    if (minRank !== undefined) filter.rank.$gte = Number(minRank);
    if (maxRank !== undefined) filter.rank.$lte = Number(maxRank);
  }
  if (typeof isPublic === 'boolean') filter.isPublic = !!isPublic;

  const sortObj = {}; sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const results = await Result.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sortObj)
    .populate(['eventId', 'userId', 'teamId']);

  const total = await Result.countDocuments(filter);
  return { results, total, page: Number(page), limit: Number(limit) };
}

// ----- Bulk Upload Results -----
async function bulkUploadResults(resultsArray) {
  if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
    throw new ApiError('resultsArray must be a non-empty array', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const created = [];
    for (let i = 0; i < resultsArray.length; i++) {
      const data = resultsArray[i];
      const { error } = createResultValidator.validate(data);
      if (error) throw new ApiError(`Row ${i}: ${error.details[0].message}`, 422);

      const event = await Event.findById(data.eventId).session(session);
      if (!event) throw new ApiError(`Row ${i}: Event not found`, 404);

      if (data.userId) validateObjectId(data.userId, `userId at row ${i}`);
      if (data.teamId) validateObjectId(data.teamId, `teamId at row ${i}`);

      if (event.type === 'solo') {
        if (!data.userId) throw new ApiError(`Row ${i}: Solo event requires userId`, 400);
        if (data.teamId) throw new ApiError(`Row ${i}: Solo event cannot have teamId`, 400);
        const user = await User.findById(data.userId).session(session);
        if (!user) throw new ApiError(`Row ${i}: User not found`, 404);
        if (!event.interCollege && (!user.college || user.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
          throw new ApiError(`Row ${i}: User college mismatch for intra-college event`, 400);
        }
      } else {
        if (data.teamId) {
          const team = await Team.findById(data.teamId).session(session);
          if (!team) throw new ApiError(`Row ${i}: Team not found`, 404);
          if (team.eventId.toString() !== data.eventId.toString()) throw new ApiError(`Row ${i}: Team not registered for event`, 400);
          if (!event.interCollege && (!team.college || team.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
            throw new ApiError(`Row ${i}: Team college mismatch for intra-college event`, 400);
          }
        } else if (data.userId) {
          const user = await User.findById(data.userId).session(session);
          if (!user) throw new ApiError(`Row ${i}: User not found`, 404);
          const team = await Team.findOne({
            eventId: mongoose.Types.ObjectId(data.eventId),
            $or: [{ leaderId: mongoose.Types.ObjectId(data.userId) }, { memberIds: mongoose.Types.ObjectId(data.userId) }],
          }).session(session);
          if (!team) throw new ApiError(`Row ${i}: User is not in any team for this event`, 400);
          if (!event.interCollege && (!user.college || user.college.trim().toLowerCase() !== INTRA_COLLEGE_NAME.trim().toLowerCase())) {
            throw new ApiError(`Row ${i}: User college mismatch for intra-college event`, 400);
          }
        } else {
          throw new ApiError(`Row ${i}: Team event requires teamId or userId`, 400);
        }
      }

      const dupParticipant = await Result.findOne({
        eventId: mongoose.Types.ObjectId(data.eventId),
        $or: [
          data.userId ? { userId: mongoose.Types.ObjectId(data.userId) } : null,
          data.teamId ? { teamId: mongoose.Types.ObjectId(data.teamId) } : null,
        ].filter(Boolean),
      }).session(session);
      if (dupParticipant) throw new ApiError(`Row ${i}: Participant already has a result for this event`, 409);

      const dupRank = await Result.findOne({
        eventId: mongoose.Types.ObjectId(data.eventId),
        rank: Number(data.rank),
      }).session(session);
      if (dupRank) throw new ApiError(`Row ${i}: Rank ${data.rank} already assigned for this event`, 409);

      const createdDoc = await Result.create(
        [
          {
            eventId: mongoose.Types.ObjectId(data.eventId),
            userId: data.userId ? mongoose.Types.ObjectId(data.userId) : null,
            teamId: data.teamId ? mongoose.Types.ObjectId(data.teamId) : null,
            rank: Number(data.rank),
            score: data.score !== undefined ? data.score : null,
            isPublic: data.isPublic !== undefined ? !!data.isPublic : true,
          },
        ],
        { session }
      );
      created.push(createdDoc[0]);
    }

    await session.commitTransaction();
    session.endSession();
    const populated = await Promise.all(created.map(r => populateResult(r)));
    return { created: populated };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

// ----- Leaderboard -----
async function getLeaderboard(eventId, options = { page: 1, limit: 50 }) {
  validateObjectId(eventId, 'eventId');
  const { page = 1, limit = 50 } = options;
  const results = await Result.find({ eventId: mongoose.Types.ObjectId(eventId), isPublic: true })
    .sort({ rank: 1, score: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate(['eventId', 'userId', 'teamId']);
  const total = await Result.countDocuments({ eventId: mongoose.Types.ObjectId(eventId), isPublic: true });
  return { results, total, page, limit };
}

// ----- Top Results -----
async function getTopResults(eventId, top = 3) {
  validateObjectId(eventId, 'eventId');
  const results = await Result.find({ eventId: mongoose.Types.ObjectId(eventId), isPublic: true })
    .sort({ rank: 1, score: -1 })
    .limit(Number(top))
    .populate(['eventId', 'userId', 'teamId']);
  return results;
}

// ----- Medal Tally -----
async function getMedalTally(eventId, options = { includePrivate: false }) {
  validateObjectId(eventId, 'eventId');
  const filter = { eventId: mongoose.Types.ObjectId(eventId), rank: { $in: [1, 2, 3] } };
  if (!options.includePrivate) filter.isPublic = true;
  const results = await Result.find(filter).populate(['userId', 'teamId']);

  const tally = {};
  for (const r of results) {
    const college = getCollegeFromPopulated(r) || 'Unknown';
    if (!tally[college]) tally[college] = { gold: 0, silver: 0, bronze: 0, total: 0 };
    if (r.rank === 1) tally[college].gold += 1;
    if (r.rank === 2) tally[college].silver += 1;
    if (r.rank === 3) tally[college].bronze += 1;
    tally[college].total += 1;
  }

  const summary = Object.entries(tally).map(([college, counts]) => ({ college, ...counts }));
  summary.sort((a, b) => b.gold !== a.gold ? b.gold - a.gold : b.total - a.total);

  return { tally: summary, raw: tally };
}

// ----- Remove Results for Event -----
async function removeResultsForEvent(eventId) {
  validateObjectId(eventId, 'eventId');
  const res = await Result.deleteMany({ eventId: mongoose.Types.ObjectId(eventId) });
  return { deletedCount: res.deletedCount || 0 };
}

// ----------------------
// Extended Helpers
// ----------------------

// College leaderboard sorted by gold, then total
async function getCollegeLeaderboard(eventId) {
  const { tally } = await getMedalTally(eventId);
  return tally.map((t, idx) => ({ ...t, rank: idx + 1 }));
}

// Participant result history
async function getParticipantResults(userId = null, teamId = null, options = { page: 1, limit: 20 }) {
  const filter = {};
  if (userId) filter.userId = mongoose.Types.ObjectId(userId);
  if (teamId) filter.teamId = mongoose.Types.ObjectId(teamId);
  const results = await Result.find(filter)
    .sort({ rank: 1 })
    .skip((options.page - 1) * options.limit)
    .limit(options.limit)
    .populate(['eventId', 'userId', 'teamId']);
  const total = await Result.countDocuments(filter);
  return { results, total, page: options.page, limit: options.limit };
}

// Event statistics
async function getEventStats(eventId) {
  validateObjectId(eventId, 'eventId');
  const totalResults = await Result.countDocuments({ eventId });
  const top3 = await getTopResults(eventId, 3);
  return { totalResults, top3 };
}

// Rank distribution
async function getRankDistribution(eventId) {
  validateObjectId(eventId, 'eventId');
  const dist = await Result.aggregate([
    { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
    { $group: { _id: '$rank', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return dist;
}

// Export results as CSV
async function exportResultsCSV(filter = {}) {
  const results = await Result.find(filter).populate(['eventId', 'userId', 'teamId']);
  const parser = new Parser({
    fields: ['_id', 'eventId.title', 'userId.firstName', 'userId.lastName', 'teamId.name', 'rank', 'score', 'isPublic'],
  });
  return parser.parse(results);
}

/**
 * Dashboard-ready summary
 * Combines medal tally, top results, and college leaderboard in one call
 */
async function getDashboardSummary(eventId, options = { top: 3, includePrivate: false }) {
  validateObjectId(eventId, 'eventId');

  const [medalData, topResults, collegeLeaderboard] = await Promise.all([
    getMedalTally(eventId, { includePrivate: options.includePrivate }),
    getTopResults(eventId, options.top),
    getCollegeLeaderboard(eventId),
  ]);

  return {
    medalTally: medalData.tally,
    topResults,
    collegeLeaderboard,
  };
}

module.exports = {
  ApiError,
  createResult,
  updateResult,
  deleteResult,
  getResultById,
  listResults,
  bulkUploadResults,
  getLeaderboard,
  getTopResults,
  getMedalTally,
  removeResultsForEvent,
  // Extended helpers
  getCollegeLeaderboard,
  getParticipantResults,
  getEventStats,
  getRankDistribution,
  exportResultsCSV,
  getDashboardSummary,
};
