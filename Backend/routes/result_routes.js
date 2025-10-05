/**
 * backend/routes/result_routes.js
 *
 * Routes for Result Management
 * ----------------------------
 * Features:
 * - CRUD endpoints
 * - Approve/Reject workflow
 * - Leaderboard endpoint
 * - Attach certificates and media
 * - Fully secured with JWT & role-based middleware
 */

const express = require("express");
const router = express.Router();

const {
  createResultController,
  updateResultController,
  deleteResultController,
  fetchResultsController,
  approveResultController,
  rejectResultController,
  getLeaderboardController,
  attachCertificatesController,
  attachMediaController,
} = require("../controllers/result_controller");

const {
  authenticateToken,
  authorizeRoles,
  validateCreate,
  validateUpdate,
  validateApproveRejectRequest,
  canModifyResult,
  canApproveRejectResult,
} = require("../middlewares/result_middleware");

/**
 * 🔹 Fetch results (role-based)
 * - GET /api/results
 */
router.get("/", authenticateToken, fetchResultsController);

/**
 * 🔹 Create result
 * - POST /api/results
 * - Roles: admin, organizer
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "organizer"),
  validateCreate,
  createResultController
);

/**
 * 🔹 Update result
 * - PUT /api/results/:id
 * - Roles: admin, organizer
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "organizer"),
  canModifyResult,
  validateUpdate,
  updateResultController
);

/**
 * 🔹 Delete result
 * - DELETE /api/results/:id
 * - Roles: admin, organizer
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "organizer"),
  canModifyResult,
  deleteResultController
);

/**
 * 🔹 Approve result
 * - POST /api/results/:id/approve
 * - Roles: faculty, admin
 */
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRoles("faculty", "admin"),
  canApproveRejectResult,
  approveResultController
);

/**
 * 🔹 Reject result
 * - POST /api/results/:id/reject
 * - Roles: faculty, admin
 */
router.post(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("faculty", "admin"),
  canApproveRejectResult,
  validateApproveRejectRequest,
  rejectResultController
);

/**
 * 🔹 Generate leaderboard
 * - GET /api/results/leaderboard/:eventId?limit=10&category=general
 */
router.get(
  "/leaderboard/:eventId",
  authenticateToken,
  authorizeRoles("student", "organizer", "faculty", "admin"),
  getLeaderboardController
);

/**
 * 🔹 Attach certificates
 * - POST /api/results/:id/certificates
 * - Roles: admin, organizer
 */
router.post(
  "/:id/certificates",
  authenticateToken,
  authorizeRoles("admin", "organizer"),
  canModifyResult,
  attachCertificatesController
);

/**
 * 🔹 Attach media
 * - POST /api/results/:id/media
 * - Roles: admin, organizer
 */
router.post(
  "/:id/media",
  authenticateToken,
  authorizeRoles("admin", "organizer"),
  canModifyResult,
  attachMediaController
);

module.exports = router;
