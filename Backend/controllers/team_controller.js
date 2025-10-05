/**
 * team_controller.js
 * -----------------------
 * Controller for Team module.
 * Responsibilities:
 * - CRUD operations for Team
 * - Member/Coordinator/Leader management
 * - Status changes
 * - Audit logs and notifications
 * - Pagination and filtering
 */

const Team = require('../models/team_model');
const User = require('../models/user_model');
const Notification = require('../models/notification_model');
const {
  generateTeamSlug,
  addMemberToTeam,
  removeMemberFromTeam,
  addCoordinatorToTeam,
  removeCoordinatorFromTeam,
  setTeamLeader,
  changeTeamStatus,
  canUserManageTeam
} = require('../utils/team_util');

/* -------------------------
   Create Team
------------------------- */
const createTeam = async (req, res) => {
  try {
    const {
      name,
      event,
      leader,
      members = [],
      coordinators = [],
      volunteers = [],
      minMembers = 1,
      maxMembers = null,
      attachments = [],
      status = 'active',
      notes = ''
    } = req.body;

    const slug = generateTeamSlug(name, event);

    const team = await Team.create({
      name,
      slug,
      event,
      leader: leader || null,
      members,
      coordinators,
      volunteers,
      minMembers,
      maxMembers,
      attachments,
      status,
      notes,
      auditLogs: [{
        action: 'createTeam',
        performedBy: req.user._id,
        notes: `Team created by ${req.user.name}`
      }]
    });

    res.status(201).json({ success: true, data: team });
  } catch (err) {
    console.error('createTeam error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Update Team
------------------------- */
const updateTeam = async (req, res) => {
  try {
    const { team } = req; // from canManageTeam middleware
    const updates = req.body;

    Object.keys(updates).forEach(key => {
      team[key] = updates[key];
    });

    // Regenerate slug if name or event changes
    if (updates.name || updates.event) {
      team.slug = generateTeamSlug(team.name, team.event);
    }

    // Save audit log
    team.auditLogs.push({
      action: 'updateTeam',
      performedBy: req.user._id,
      notes: `Team updated by ${req.user.name}`
    });

    await team.save();
    res.json({ success: true, data: team });
  } catch (err) {
    console.error('updateTeam error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Get Team Details
------------------------- */
const getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId)
      .populate('members coordinators volunteers leader event notifications approvedBy')
      .lean();

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    res.json({ success: true, data: team });
  } catch (err) {
    console.error('getTeam error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   List Teams with filters & pagination
------------------------- */
const listTeams = async (req, res) => {
  try {
    const { event, status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (event) query.event = event;
    if (status) query.status = status;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      populate: 'members coordinators volunteers leader event'
    };

    const teams = await Team.paginate(query, options);
    res.json({ success: true, data: teams });
  } catch (err) {
    console.error('listTeams error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Add Member
------------------------- */
const addMember = async (req, res) => {
  try {
    const { team } = req;
    const { userId } = req.body;

    await addMemberToTeam(team, userId, req.user._id);

    res.json({ success: true, message: 'Member added successfully', data: team });
  } catch (err) {
    console.error('addMember error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Remove Member
------------------------- */
const removeMember = async (req, res) => {
  try {
    const { team } = req;
    const { userId } = req.body;

    await removeMemberFromTeam(team, userId, req.user._id);
    res.json({ success: true, message: 'Member removed successfully', data: team });
  } catch (err) {
    console.error('removeMember error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Add Coordinator
------------------------- */
const addCoordinator = async (req, res) => {
  try {
    const { team } = req;
    const { userId } = req.body;

    await addCoordinatorToTeam(team, userId, req.user._id);
    res.json({ success: true, message: 'Coordinator added successfully', data: team });
  } catch (err) {
    console.error('addCoordinator error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Remove Coordinator
------------------------- */
const removeCoordinator = async (req, res) => {
  try {
    const { team } = req;
    const { userId } = req.body;

    await removeCoordinatorFromTeam(team, userId, req.user._id);
    res.json({ success: true, message: 'Coordinator removed successfully', data: team });
  } catch (err) {
    console.error('removeCoordinator error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Set Leader
------------------------- */
const setLeader = async (req, res) => {
  try {
    const { team } = req;
    const { leaderId } = req.body;

    await setTeamLeader(team, leaderId, req.user._id);
    res.json({ success: true, message: 'Leader assigned successfully', data: team });
  } catch (err) {
    console.error('setLeader error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Change Status
------------------------- */
const changeStatus = async (req, res) => {
  try {
    const { team } = req;
    const { status, reason } = req.body;

    await changeTeamStatus(team, status, reason, req.user._id);
    res.json({ success: true, message: 'Status changed successfully', data: team });
  } catch (err) {
    console.error('changeStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Delete Team (soft-delete)
------------------------- */
const deleteTeam = async (req, res) => {
  try {
    const { team } = req;

    await team.delete();
    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (err) {
    console.error('deleteTeam error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
   Export all handlers
------------------------- */
module.exports = {
  createTeam,
  updateTeam,
  getTeam,
  listTeams,
  addMember,
  removeMember,
  addCoordinator,
  removeCoordinator,
  setLeader,
  changeStatus,
  deleteTeam
};
