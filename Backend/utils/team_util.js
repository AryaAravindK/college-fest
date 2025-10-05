/**
 * backend/utils/team_util.js
 * -----------------------
 * Utility functions for Team management.
 * Covers advanced operations like:
 * - member/coordinator/volunteer management
 * - status change notifications
 * - leader assignment
 * - team size validation
 * - audit log helpers
 * - slug generation helpers
 */

const Team = require('../models/team_model');
const User = require('../models/user_model');
const slugify = require('slugify');
const mongoose = require('mongoose');

/**
 * Generate a unique slug for a team
 * @param {String} name 
 * @param {String} eventId 
 * @returns {String} slug
 */
const generateTeamSlug = (name, eventId) => {
  return `${slugify(name, { lower: true, strict: true })}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
};

/**
 * Normalize array of ObjectIds
 * - removes duplicates, nulls, ensures ObjectId type
 * @param {Array} arr
 * @returns {Array<ObjectId>}
 */
const normalizeIdArray = (arr) => {
  return Array.from(new Set((arr || []).filter(Boolean).map(x => x.toString())))
    .map(id => mongoose.Types.ObjectId(id));
};

/**
 * Check if a team has capacity to add more members
 * @param {Team} team
 * @param {Number} additional
 * @returns {Boolean}
 */
const canAddMembers = (team, additional = 1) => {
  if (!team) return false;
  if (team.maxMembers === null) return true;
  return (team.members.length + additional) <= team.maxMembers;
};

/**
 * Add member to a team
 * @param {Team} team
 * @param {String|ObjectId} userId
 * @param {String|ObjectId} actor optional for audit logs
 */
const addMemberToTeam = async (team, userId, actor = null) => {
  if (!userId) throw new Error('userId required');
  if (team.members.some(m => m.toString() === userId.toString())) return team;

  if (!canAddMembers(team)) throw new Error('Team is full');

  team.members.push(mongoose.Types.ObjectId(userId));
  team.auditLogs.push({
    action: 'addMember',
    performedBy: actor,
    notes: `Added member ${userId}`
  });
  await team.save();
  return team;
};

/**
 * Remove member from team
 * @param {Team} team
 * @param {String|ObjectId} userId
 * @param {String|ObjectId} actor
 */
const removeMemberFromTeam = async (team, userId, actor = null) => {
  if (!userId) throw new Error('userId required');
  const uid = userId.toString();

  team.members = (team.members || []).filter(m => m.toString() !== uid);

  // If leader removed, unset leader
  if (team.leader && team.leader.toString() === uid) {
    team.leader = null;
  }

  team.auditLogs.push({
    action: 'removeMember',
    performedBy: actor,
    notes: `Removed member ${userId}`
  });

  await team.save();
  return team;
};

/**
 * Assign a coordinator
 * @param {Team} team
 * @param {String|ObjectId} userId
 * @param {String|ObjectId} actor
 */
const addCoordinatorToTeam = async (team, userId, actor = null) => {
  if (!userId) throw new Error('userId required');
  if (team.coordinators.some(c => c.toString() === userId.toString())) return team;

  if (!team.members.some(m => m.toString() === userId.toString())) {
    team.members.push(mongoose.Types.ObjectId(userId));
  }
  team.coordinators.push(mongoose.Types.ObjectId(userId));
  team.auditLogs.push({
    action: 'addCoordinator',
    performedBy: actor,
    notes: `Added coordinator ${userId}`
  });

  await team.save();
  return team;
};

/**
 * Remove a coordinator
 * @param {Team} team
 * @param {String|ObjectId} userId
 * @param {String|ObjectId} actor
 */
const removeCoordinatorFromTeam = async (team, userId, actor = null) => {
  if (!userId) throw new Error('userId required');
  const uid = userId.toString();

  team.coordinators = (team.coordinators || []).filter(c => c.toString() !== uid);

  team.auditLogs.push({
    action: 'removeCoordinator',
    performedBy: actor,
    notes: `Removed coordinator ${userId}`
  });

  await team.save();
  return team;
};

/**
 * Set a team leader
 * @param {Team} team
 * @param {String|ObjectId} userId
 * @param {String|ObjectId} actor
 */
const setTeamLeader = async (team, userId, actor = null) => {
  if (!userId) throw new Error('userId required');

  team.leader = mongoose.Types.ObjectId(userId);
  if (!team.members.some(m => m.toString() === userId.toString())) {
    team.members.push(team.leader);
  }

  team.auditLogs.push({
    action: 'setLeader',
    performedBy: actor,
    notes: `Leader set to ${userId}`
  });

  await team.save();
  return team;
};

/**
 * Change team status with reason
 * @param {Team} team
 * @param {String} newStatus
 * @param {String} reason
 * @param {String|ObjectId} actor
 */
const changeTeamStatus = async (team, newStatus, reason = '', actor = null) => {
  const TEAM_STATUS = ['active', 'disbanded', 'suspended'];
  if (!TEAM_STATUS.includes(newStatus)) throw new Error('Invalid status');
  if (team.status === newStatus) return team;

  const oldStatus = team.status;
  team.status = newStatus;
  team.statusReason = reason || '';

  team.auditLogs.push({
    action: 'changeStatus',
    performedBy: actor,
    notes: `Status changed from ${oldStatus} to ${newStatus}. Reason: ${reason || 'N/A'}`
  });

  await team.save();
  return team;
};

/**
 * Check if a user can manage the team
 * @param {Team} team
 * @param {User} user
 * @returns Boolean
 */
const canUserManageTeam = async (team, user) => {
  if (!user || team.deleted) return false;
  if (user.role === 'admin') return true;
  if (team.coordinators.some(c => c.toString() === user._id.toString())) return true;

  if (team.event && team.event.organizer) {
    const organizerId = (team.event.organizer._id || team.event.organizer).toString();
    if (organizerId === user._id.toString()) return true;
  } else {
    const Event = require('../models/event_model');
    const ev = await Event.findById(team.event).select('organizer status').lean();
    if (ev && ev.organizer && ev.organizer.toString() === user._id.toString()) {
      if (ev.status === 'cancelled' || ev.status === 'completed') return false;
      return true;
    }
  }

  return false;
};

module.exports = {
  generateTeamSlug,
  normalizeIdArray,
  canAddMembers,
  addMemberToTeam,
  removeMemberFromTeam,
  addCoordinatorToTeam,
  removeCoordinatorFromTeam,
  setTeamLeader,
  changeTeamStatus,
  canUserManageTeam
};
