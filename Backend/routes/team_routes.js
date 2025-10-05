/**
 * team_routes.js
 * -----------------------
 * Routes for Team module.
 * Fully connected with:
 * - Validator
 * - Middleware
 * - Controller
 */

const express = require('express');
const router = express.Router();

const teamValidator = require('../validators/team_validator');
const teamController = require('../controllers/team_controller');
const { authMiddleware, permitRoles, canManageTeam, handleValidationErrors } = require('../middlewares/team_middleware');

/* -------------------------
   Team CRUD
------------------------- */

// Create Team (admin or organizer)
router.post(
  '/',
  authMiddleware,
  permitRoles('admin', 'organizer'),
  teamValidator.createTeam,
  handleValidationErrors,
  teamController.createTeam
);

// Update Team (admin or team manager)
router.put(
  '/:teamId',
  authMiddleware,
  canManageTeam,
  teamValidator.updateTeam,
  handleValidationErrors,
  teamController.updateTeam
);

// Get Team details (any authenticated user)
router.get(
  '/:teamId',
  authMiddleware,
  teamValidator.getTeam,
  handleValidationErrors,
  teamController.getTeam
);

// List Teams (paginated & filterable)
router.get(
  '/',
  authMiddleware,
  teamValidator.listTeams,
  handleValidationErrors,
  teamController.listTeams
);

// Delete Team (soft delete, admin or team manager)
router.delete(
  '/:teamId',
  authMiddleware,
  canManageTeam,
  teamController.deleteTeam
);

/* -------------------------
   Member management
------------------------- */

// Add member
router.post(
  '/:teamId/members',
  authMiddleware,
  canManageTeam,
  teamValidator.memberAction,
  handleValidationErrors,
  teamController.addMember
);

// Remove member
router.delete(
  '/:teamId/members',
  authMiddleware,
  canManageTeam,
  teamValidator.memberAction,
  handleValidationErrors,
  teamController.removeMember
);

/* -------------------------
   Coordinator management
------------------------- */

// Add coordinator
router.post(
  '/:teamId/coordinators',
  authMiddleware,
  canManageTeam,
  teamValidator.coordinatorAction,
  handleValidationErrors,
  teamController.addCoordinator
);

// Remove coordinator
router.delete(
  '/:teamId/coordinators',
  authMiddleware,
  canManageTeam,
  teamValidator.coordinatorAction,
  handleValidationErrors,
  teamController.removeCoordinator
);

/* -------------------------
   Leader assignment
------------------------- */

router.put(
  '/:teamId/leader',
  authMiddleware,
  canManageTeam,
  teamValidator.leaderAction,
  handleValidationErrors,
  teamController.setLeader
);

/* -------------------------
   Status change
------------------------- */
router.put(
  '/:teamId/status',
  authMiddleware,
  canManageTeam,
  teamValidator.changeStatus,
  handleValidationErrors,
  teamController.changeStatus
);

module.exports = router;
