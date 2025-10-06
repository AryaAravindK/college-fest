/**
 * backend/services/team_service.js
 * Team services for College Fest Website
 *
 * - Strictly follows team_model.js & team_validator.js
 * - Uses populate() on leaderId, memberIds, eventId
 * - Enforces:
 *    * event.type rules (solo/team)
 *    * event.maxParticipants
 *    * intra-college teams: all members must share same college (leader's college)
 *    * unique teamName per event
 *    * user not already part of another team for same event
 * - Supports live updates via Socket.IO
 * - Extended with analytics, bulk operations, and search filters
 */

const mongoose = require('mongoose');
const Team = require('../models/team_model');
const User = require('../models/user_model');
const Event = require('../models/event_model');
const { createTeamValidator, updateTeamValidator } = require('../validators/team_validator');

// Custom ApiError for consistent errors
class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ----------------------
// Socket support
// ----------------------
let io = null;
function initSocket(ioInstance) {
  io = ioInstance;
}

// Helper to emit socket events safely
function emitEvent(event, payload) {
  if (io) io.emit(event, payload);
}

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(`Invalid ${name}`, 400);
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

async function userInTeamForEvent(userId, eventId) {
  return await Team.findOne({
    eventId,
    $or: [{ leaderId: userId }, { memberIds: mongoose.Types.ObjectId(userId) }],
  });
}

function totalParticipantsCount(leaderId, memberIds = []) {
  return 1 + (memberIds ? memberIds.length : 0);
}

async function populateTeam(teamQuery) {
  if (!teamQuery) return null;
  if (Array.isArray(teamQuery)) {
    return Promise.all(teamQuery.map(t => Team.populate(t, ['leaderId', 'memberIds', 'eventId'])));
  }
  return Team.populate(teamQuery, ['leaderId', 'memberIds', 'eventId']);
}

// ----------------------
// Core Services
// ----------------------

async function createTeam(teamData, currentUser = null) {
  const { error, value } = createTeamValidator.validate(teamData);
  if (error) throw new ApiError(error.details[0].message, 422);

  validateObjectId(value.leaderId, 'leaderId');
  validateObjectId(value.eventId, 'eventId');

  const event = await findEventOrThrow(value.eventId);
  const leader = await findUserOrThrow(value.leaderId);

  if (!value.college || value.college === '') value.college = leader.college || null;

  if (event.type === 'solo' && value.memberIds && value.memberIds.length > 0) {
    throw new ApiError('Solo events cannot have additional team members', 400);
  }

  const existingTeamWithName = await Team.findOne({ eventId: event._id, teamName: value.teamName.trim() });
  if (existingTeamWithName) throw new ApiError('A team with this name already exists for the event', 409);

  let memberIds = (value.memberIds || []).filter(Boolean).map(id => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError('One or more memberIds are invalid', 400);
    return id.toString();
  });
  memberIds = [...new Set(memberIds)];
  memberIds = memberIds.filter(id => id !== value.leaderId.toString());

  const members = [];
  for (const mid of memberIds) {
    const u = await User.findById(mid);
    if (!u) throw new ApiError(`Member user not found: ${mid}`, 404);
    members.push(u);
  }

  if (!event.interCollege) {
    const leaderCollege = (leader.college || '').trim().toLowerCase();
    if (!leaderCollege) throw new ApiError('Leader does not have a college set; cannot create intra-college team', 400);
    for (const m of members) {
      if ((m.college || '').trim().toLowerCase() !== leaderCollege) {
        throw new ApiError('All team members must belong to the same college for intra-college events', 400);
      }
    }
    value.college = leader.college;
  }

  const identitiesToCheck = [value.leaderId.toString(), ...memberIds];
  for (const uid of identitiesToCheck) {
    const existing = await userInTeamForEvent(uid, event._id);
    if (existing) throw new ApiError(`User ${uid} is already part of a team for this event (team: ${existing._id})`, 409);
  }

  const totalParticipants = totalParticipantsCount(value.leaderId, memberIds);
  if (event.maxParticipants && event.maxParticipants > 0 && totalParticipants > event.maxParticipants) {
    throw new ApiError(`Team exceeds event max participants (${event.maxParticipants})`, 400);
  }

  const newTeam = await Team.create({
    teamName: value.teamName.trim(),
    leaderId: mongoose.Types.ObjectId(value.leaderId),
    memberIds: memberIds.map(m => mongoose.Types.ObjectId(m)),
    eventId: mongoose.Types.ObjectId(value.eventId),
    college: value.college || null,
    isPublic: !!value.isPublic,
  });

  const populatedTeam = await populateTeam(newTeam);
  emitEvent('teamCreated', populatedTeam);
  emitTeamAnalytics(populatedTeam);
  return populatedTeam;
}

async function updateTeam(teamId, updateData, currentUser = null) {
  validateObjectId(teamId, 'teamId');
  const { error, value } = updateTeamValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);

  if (currentUser && !['admin', 'superadmin'].includes(currentUser.role) && team.leaderId.toString() !== currentUser._id.toString()) {
    throw new ApiError('Only team leader or admin can update the team', 403);
  }

  // Leader or memberIds changes handled below
  if (value.leaderId) {
    validateObjectId(value.leaderId, 'leaderId');
    const newLeader = await findUserOrThrow(value.leaderId);
    const isMember = team.memberIds.map(m => m.toString()).includes(value.leaderId.toString());
    const existing = await userInTeamForEvent(value.leaderId, team.eventId);
    if (existing && existing._id.toString() !== team._id.toString()) throw new ApiError('New leader is already part of another team for this event', 409);

    if (isMember) team.memberIds = team.memberIds.filter(m => m.toString() !== value.leaderId.toString());
    else team.memberIds.push(team.leaderId);

    team.leaderId = mongoose.Types.ObjectId(value.leaderId);
    emitEvent('leadershipTransferred', await populateTeam(team));
  }

  if (value.memberIds) {
    let newMemberIds = value.memberIds.filter(Boolean).map(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError('One or more memberIds are invalid', 400);
      return id.toString();
    });
    newMemberIds = [...new Set(newMemberIds)];
    newMemberIds = newMemberIds.filter(id => id !== team.leaderId.toString());

    for (const uid of newMemberIds) {
      const u = await User.findById(uid);
      if (!u) throw new ApiError(`Member user not found: ${uid}`, 404);
      const existing = await userInTeamForEvent(uid, team.eventId);
      if (existing && existing._id.toString() !== team._id.toString()) throw new ApiError(`User ${uid} is already part of another team for this event`, 409);
    }

    const event = await findEventOrThrow(team.eventId);
    if (!event.interCollege) {
      const leaderUser = await findUserOrThrow(team.leaderId);
      const leaderCollege = (leaderUser.college || '').trim().toLowerCase();
      for (const uid of newMemberIds) {
        const u = await findUserOrThrow(uid);
        if ((u.college || '').trim().toLowerCase() !== leaderCollege) {
          throw new ApiError('All members must belong to the same college for intra-college events', 400);
        }
      }
      team.college = leaderUser.college;
    }

    const participants = totalParticipantsCount(team.leaderId, newMemberIds);
    if (event.maxParticipants && event.maxParticipants > 0 && participants > event.maxParticipants) {
      throw new ApiError('Updated members exceed event maxParticipants', 400);
    }

    team.memberIds = newMemberIds.map(id => mongoose.Types.ObjectId(id));
    emitEvent('teamMembersUpdated', await populateTeam(team));
  }

  if (value.teamName) {
    const already = await Team.findOne({
      _id: { $ne: team._id },
      eventId: team.eventId,
      teamName: value.teamName.trim(),
    });
    if (already) throw new ApiError('Another team with this name exists for the event', 409);
    team.teamName = value.teamName.trim();
  }
  if (value.college !== undefined) team.college = value.college || null;
  if (value.isPublic !== undefined) team.isPublic = !!value.isPublic;

  await team.save();
  const populated = await populateTeam(team);
  emitTeamAnalytics(populated);
  return populated;
}

// ----------------------
// Membership & Leadership
// ----------------------

async function addMember(teamId, memberId, currentUser = null) {
  validateObjectId(teamId, 'teamId');
  validateObjectId(memberId, 'memberId');

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);

  if (currentUser) {
    const isLeader = team.leaderId.toString() === currentUser._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(currentUser.role);
    const isSelf = memberId.toString() === currentUser._id.toString();
    if (!(isLeader || isAdmin || isSelf)) throw new ApiError('Only team leader or admin can add members (or the user may self-join)', 403);
  }

  const member = await findUserOrThrow(memberId);
  const event = await findEventOrThrow(team.eventId);

  if (event.type === 'solo') throw new ApiError('Cannot add members to a solo event team', 400);
  if (team.memberIds.map(m => m.toString()).includes(memberId.toString()) || team.leaderId.toString() === memberId.toString()) throw new ApiError('User is already part of this team', 409);
  const existingTeam = await userInTeamForEvent(memberId, team.eventId);
  if (existingTeam) throw new ApiError('User is already part of another team for this event', 409);

  if (!event.interCollege) {
    const leader = await findUserOrThrow(team.leaderId);
    if ((member.college || '').trim().toLowerCase() !== (leader.college || '').trim().toLowerCase()) {
      throw new ApiError('Member must belong to same college as leader for intra-college event', 400);
    }
  }

  const newParticipantCount = totalParticipantsCount(team.leaderId, [...team.memberIds.map(m => m.toString()), memberId.toString()]);
  if (event.maxParticipants && event.maxParticipants > 0 && newParticipantCount > event.maxParticipants) {
    throw new ApiError('Adding this member would exceed event maxParticipants', 400);
  }

  team.memberIds.push(mongoose.Types.ObjectId(memberId));
  await team.save();
  const populated = await populateTeam(team);
  emitEvent('memberAdded', { team: populated, memberId });
  emitTeamAnalytics(populated);
  return populated;
}

async function removeMember(teamId, memberId, currentUser = null) {
  validateObjectId(teamId, 'teamId');
  validateObjectId(memberId, 'memberId');

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);

  if (team.leaderId.toString() === memberId.toString()) throw new ApiError('Cannot remove team leader. Transfer leadership or disband team instead', 400);

  if (currentUser) {
    const isLeader = team.leaderId.toString() === currentUser._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(currentUser.role);
    const isSelf = memberId.toString() === currentUser._id.toString();
    if (!(isLeader || isAdmin || isSelf)) throw new ApiError('Only team leader, admin, or the member themselves can remove a member', 403);
  }

  const memberIndex = team.memberIds.map(m => m.toString()).indexOf(memberId.toString());
  if (memberIndex === -1) throw new ApiError('Member not in team', 404);

  team.memberIds.splice(memberIndex, 1);
  await team.save();
  const populated = await populateTeam(team);
  emitEvent('memberRemoved', { team: populated, memberId });
  emitTeamAnalytics(populated);
  return populated;
}

// ----------------------
// Team Analytics & Helpers
// ----------------------

function emitTeamAnalytics(team) {
  const total = totalParticipantsCount(team.leaderId, team.memberIds);
  if (io) io.emit('teamAnalyticsUpdated', { teamId: team._id, totalParticipants: total });
}

async function getTeamSize(teamId) {
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);
  return totalParticipantsCount(team.leaderId, team.memberIds);
}

async function getEventTeamsStats(eventId) {
  validateObjectId(eventId, 'eventId');
  const teams = await Team.find({ eventId });
  const sizes = teams.map(t => totalParticipantsCount(t.leaderId, t.memberIds));
  const totalTeams = teams.length;
  const avgSize = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const minSize = sizes.length ? Math.min(...sizes) : 0;
  return { totalTeams, avgSize, maxSize, minSize };
}

async function getCollegeTeamsStats(college) {
  if (!college) throw new ApiError('College is required', 400);
  const teams = await Team.find({ college });
  const sizes = teams.map(t => totalParticipantsCount(t.leaderId, t.memberIds));
  const totalTeams = teams.length;
  const avgSize = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const minSize = sizes.length ? Math.min(...sizes) : 0;
  return { totalTeams, avgSize, maxSize, minSize };
}

async function isUserInAnyTeamForEvent(userId, eventId) {
  const team = await userInTeamForEvent(userId, eventId);
  return !!team;
}

async function getTeamMembersEmails(teamId) {
  const team = await Team.findById(teamId).populate('leaderId memberIds');
  if (!team) throw new ApiError('Team not found', 404);
  const emails = [team.leaderId.email, ...team.memberIds.map(m => m.email)];
  return emails;
}

async function listTeamsWithAvailableSlots(eventId) {
  validateObjectId(eventId, 'eventId');
  const event = await findEventOrThrow(eventId);
  const teams = await Team.find({ eventId });
  return teams.filter(t => totalParticipantsCount(t.leaderId, t.memberIds) < (event.maxParticipants || Infinity));
}

// ----------------------
// Bulk Operations
// ----------------------

async function addMembersBulk(teamId, memberIds, currentUser = null) {
  for (const mid of memberIds) {
    await addMember(teamId, mid, currentUser);
  }
  return populateTeam(await Team.findById(teamId));
}

async function removeMembersBulk(teamId, memberIds, currentUser = null) {
  for (const mid of memberIds) {
    await removeMember(teamId, mid, currentUser);
  }
  return populateTeam(await Team.findById(teamId));
}

// ----------------------
// Existing Services
// ----------------------

async function transferLeadership(teamId, newLeaderId, currentUser = null) {
  validateObjectId(teamId, 'teamId');
  validateObjectId(newLeaderId, 'newLeaderId');

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);

  if (currentUser) {
    const isLeader = team.leaderId.toString() === currentUser._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(currentUser.role);
    if (!(isLeader || isAdmin)) throw new ApiError('Only team leader or admin can transfer leadership', 403);
  }

  const memberIdx = team.memberIds.map(m => m.toString()).indexOf(newLeaderId.toString());
  if (memberIdx === -1) throw new ApiError('New leader must be an existing member of the team', 400);

  const oldLeaderId = team.leaderId.toString();
  team.memberIds.splice(memberIdx, 1);
  team.memberIds.push(mongoose.Types.ObjectId(oldLeaderId));
  team.leaderId = mongoose.Types.ObjectId(newLeaderId);

  await team.save();
  const populated = await populateTeam(team);
  emitEvent('leadershipTransferred', populated);
  emitTeamAnalytics(populated);
  return populated;
}

async function disbandTeam(teamId, currentUser = null) {
  validateObjectId(teamId, 'teamId');

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);

  if (currentUser) {
    const isLeader = team.leaderId.toString() === currentUser._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(currentUser.role);
    if (!(isLeader || isAdmin)) throw new ApiError('Only team leader or admin can disband the team', 403);
  }

  const removed = await Team.findByIdAndDelete(teamId);
  if (!removed) throw new ApiError('Failed to disband team', 500);

  emitEvent('teamDisbanded', removed);
  return removed;
}

async function getTeamById(teamId) {
  validateObjectId(teamId, 'teamId');
  const team = await Team.findById(teamId).populate(['leaderId', 'memberIds', 'eventId']);
  if (!team) throw new ApiError('Team not found', 404);
  return team;
}

async function listTeams(options = {}) {
  const {
    page = 1,
    limit = 10,
    eventId,
    college,
    isPublic,
    teamName,
    minSize,
    maxSize,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = options;

  const filter = {};
  if (eventId) {
    validateObjectId(eventId, 'eventId');
    filter.eventId = eventId;
  }
  if (college) filter.college = college;
  if (typeof isPublic === 'boolean') filter.isPublic = isPublic;
  if (teamName) filter.teamName = { $regex: teamName, $options: 'i' };

  let teams = await Team.find(filter).populate(['leaderId', 'memberIds', 'eventId']);

  if (minSize !== undefined || maxSize !== undefined) {
    teams = teams.filter(t => {
      const size = totalParticipantsCount(t.leaderId, t.memberIds);
      if (minSize !== undefined && size < minSize) return false;
      if (maxSize !== undefined && size > maxSize) return false;
      return true;
    });
  }

  const total = teams.length;
  const sortMultiplier = sortDir === 'asc' ? 1 : -1;
  teams.sort((a, b) => (a[sortBy] > b[sortBy] ? 1 * sortMultiplier : -1 * sortMultiplier));

  const paged = teams.slice((page - 1) * limit, page * limit);

  return { teams: paged, total, page, limit };
}

// ----------------------
// Quick User Queries
// ----------------------

async function getTeamsByEvent(eventId, { page = 1, limit = 50 } = {}) {
  validateObjectId(eventId, 'eventId');
  const filter = { eventId };
  const teams = await Team.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate(['leaderId', 'memberIds', 'eventId']);
  const total = await Team.countDocuments(filter);
  return { teams, total, page, limit };
}

async function getTeamsByCollege(college, { page = 1, limit = 50 } = {}) {
  if (!college) throw new ApiError('College is required', 400);
  const filter = { college };
  const teams = await Team.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate(['leaderId', 'memberIds', 'eventId']);
  const total = await Team.countDocuments(filter);
  return { teams, total, page, limit };
}

async function getTeamsForUser(userId) {
  validateObjectId(userId, 'userId');
  const teams = await Team.find({
    $or: [{ leaderId: userId }, { memberIds: mongoose.Types.ObjectId(userId) }],
  }).populate(['leaderId', 'memberIds', 'eventId']);
  return teams;
}

// ----------------------
// Module Exports
// ----------------------
module.exports = {
  ApiError,
  initSocket,
  createTeam,
  updateTeam,
  addMember,
  removeMember,
  addMembersBulk,
  removeMembersBulk,
  transferLeadership,
  disbandTeam,
  getTeamById,
  listTeams,
  getTeamsByEvent,
  getTeamsByCollege,
  getTeamsForUser,
  // Analytics & Helpers
  emitTeamAnalytics,
  getTeamSize,
  getEventTeamsStats,
  getCollegeTeamsStats,
  isUserInAnyTeamForEvent,
  getTeamMembersEmails,
  listTeamsWithAvailableSlots,
};
