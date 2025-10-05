/**
 * backend/controllers/result_controller.js
 *
 * Controller for Result Model
 * ---------------------------
 * Features:
 * - CRUD operations
 * - Approve/Reject workflow
 * - Role-based fetching
 * - Leaderboard generation
 * - Attach certificates and media
 * - Full audit log support
 */

const Result = require("../models/result_model");
const {
  fetchResultsByRole,
  createResult,
  updateResult,
  approveResult,
  rejectResult,
  getLeaderboard,
  attachCertificates,
  attachMedia,
  addAuditLog,
} = require("../utils/result_util");

/**
 * 🔹 Create a new result
 */
async function createResultController(req, res) {
  try {
    const userId = req.user.id;
    const result = await createResult(req.body, userId);
    return res.status(201).json({ message: "Result created successfully", result });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create result", error: error.message });
  }
}

/**
 * 🔹 Update a result
 */
async function updateResultController(req, res) {
  try {
    const userId = req.user.id;
    const resultId = req.params.id;

    const result = await updateResult(resultId, req.body, userId);
    return res.status(200).json({ message: "Result updated successfully", result });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update result", error: error.message });
  }
}

/**
 * 🔹 Delete a result
 */
async function deleteResultController(req, res) {
  try {
    const resultId = req.params.id;
    await Result.findByIdAndDelete(resultId);
    return res.status(200).json({ message: "Result deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete result", error: error.message });
  }
}

/**
 * 🔹 Fetch results based on user role
 */
async function fetchResultsController(req, res) {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    // For organizers/faculty, you may pass the list of event IDs they manage
    let eventIds = [];
    if (role === "organizer" || role === "faculty") {
      if (req.query.eventIds) {
        eventIds = req.query.eventIds.split(",").map((id) => id.trim());
      }
    }

    const results = await fetchResultsByRole(role, userId, eventIds);
    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch results", error: error.message });
  }
}

/**
 * 🔹 Approve a result
 */
async function approveResultController(req, res) {
  try {
    const userId = req.user.id;
    const resultId = req.params.id;

    const approved = await approveResult(resultId, userId);
    return res.status(200).json({ message: "Result approved successfully", result: approved });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve result", error: error.message });
  }
}

/**
 * 🔹 Reject a result
 */
async function rejectResultController(req, res) {
  try {
    const userId = req.user.id;
    const resultId = req.params.id;
    const reason = req.body.reason || "";

    const rejected = await rejectResult(resultId, userId, reason);
    return res.status(200).json({ message: "Result rejected successfully", result: rejected });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject result", error: error.message });
  }
}

/**
 * 🔹 Generate leaderboard for an event
 */
async function getLeaderboardController(req, res) {
  try {
    const eventId = req.params.eventId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const category = req.query.category || null;

    const leaderboard = await getLeaderboard(eventId, limit, category);
    return res.status(200).json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch leaderboard", error: error.message });
  }
}

/**
 * 🔹 Attach certificates to a result
 */
async function attachCertificatesController(req, res) {
  try {
    const resultId = req.params.id;
    const userId = req.user.id;
    const certificates = req.body.certificates || [];

    const updated = await attachCertificates(resultId, certificates, userId);
    return res.status(200).json({ message: "Certificates attached successfully", result: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to attach certificates", error: error.message });
  }
}

/**
 * 🔹 Attach media files to a result
 */
async function attachMediaController(req, res) {
  try {
    const resultId = req.params.id;
    const userId = req.user.id;
    const mediaObj = {
      scoreSheets: req.body.scoreSheets || [],
      media: req.body.media || [],
    };

    const updated = await attachMedia(resultId, mediaObj, userId);
    return res.status(200).json({ message: "Media attached successfully", result: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to attach media", error: error.message });
  }
}

module.exports = {
  createResultController,
  updateResultController,
  deleteResultController,
  fetchResultsController,
  approveResultController,
  rejectResultController,
  getLeaderboardController,
  attachCertificatesController,
  attachMediaController,
};
