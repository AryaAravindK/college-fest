/**
 * backend/utils/result_util.js
 *
 * Utility functions for Result Model
 * ----------------------------------
 * Provides advanced helper functions to:
 * - Fetch results by role
 * - Approve/reject results
 * - Generate leaderboard
 * - Manage media/certificates
 * - Add audit logs
 */

const Result = require("../models/result_model");
const Event = require("../models/event_model");
const mongoose = require("mongoose");

/**
 * 🔹 Fetch results by user role
 * @param {String} role - user role (public/student/organizer/faculty/admin)
 * @param {String} userId - current user ID
 * @param {Array} eventIds - events for organizer/faculty
 * @returns {Array} results
 */
async function fetchResultsByRole(role, userId, eventIds = []) {
  try {
    const results = await Result.getResultsByRole(role, userId, eventIds);
    return results;
  } catch (error) {
    throw new Error(`Error fetching results by role: ${error.message}`);
  }
}

/**
 * 🔹 Create a new result
 * @param {Object} data - result data
 * @param {String} createdBy - user ID who is creating
 */
async function createResult(data, createdBy) {
  try {
    const result = new Result({
      ...data,
      createdBy,
      updatedBy: createdBy,
      auditLogs: [{ action: "created", performedBy: createdBy }],
    });
    await result.save();
    return result;
  } catch (error) {
    throw new Error(`Error creating result: ${error.message}`);
  }
}

/**
 * 🔹 Update a result
 * @param {String} resultId - Result ID
 * @param {Object} updates - fields to update
 * @param {String} updatedBy - user ID
 */
async function updateResult(resultId, updates, updatedBy) {
  try {
    const result = await Result.findById(resultId);
    if (!result) throw new Error("Result not found");

    Object.assign(result, updates);
    result.updatedBy = updatedBy;
    result.auditLogs.push({ action: "updated", performedBy: updatedBy });

    await result.save();
    return result;
  } catch (error) {
    throw new Error(`Error updating result: ${error.message}`);
  }
}

/**
 * 🔹 Approve a result
 * @param {String} resultId
 * @param {String} facultyId
 */
async function approveResult(resultId, facultyId) {
  try {
    const result = await Result.findById(resultId);
    if (!result) throw new Error("Result not found");

    const approved = await result.approve(facultyId);
    return approved;
  } catch (error) {
    throw new Error(`Error approving result: ${error.message}`);
  }
}

/**
 * 🔹 Reject a result
 * @param {String} resultId
 * @param {String} facultyId
 * @param {String} reason
 */
async function rejectResult(resultId, facultyId, reason = "") {
  try {
    const result = await Result.findById(resultId);
    if (!result) throw new Error("Result not found");

    const rejected = await result.reject(facultyId, reason);
    return rejected;
  } catch (error) {
    throw new Error(`Error rejecting result: ${error.message}`);
  }
}

/**
 * 🔹 Generate leaderboard for an event
 * @param {String} eventId
 * @param {Number} limit
 * @param {String} category
 */
async function getLeaderboard(eventId, limit = 10, category = null) {
  try {
    const leaderboard = await Result.getLeaderboard(eventId, limit, category);
    return leaderboard;
  } catch (error) {
    throw new Error(`Error generating leaderboard: ${error.message}`);
  }
}

/**
 * 🔹 Attach certificates to a result
 * @param {String} resultId
 * @param {Array} certificates
 * @param {String} updatedBy
 */
async function attachCertificates(resultId, certificates = [], updatedBy) {
  try {
    const result = await Result.findById(resultId);
    if (!result) throw new Error("Result not found");

    result.certificates.push(...certificates);
    result.updatedBy = updatedBy;
    result.auditLogs.push({ action: "certificates_added", performedBy: updatedBy });

    await result.save();
    return result;
  } catch (error) {
    throw new Error(`Error attaching certificates: ${error.message}`);
  }
}

/**
 * 🔹 Attach media files (scoreSheets/images/videos)
 * @param {String} resultId
 * @param {Object} mediaObj - { scoreSheets: [], media: [] }
 * @param {String} updatedBy
 */
async function attachMedia(resultId, mediaObj = {}, updatedBy) {
  try {
    const result = await Result.findById(resultId);
    if (!result) throw new Error("Result not found");

    if (mediaObj.scoreSheets) result.scoreSheets.push(...mediaObj.scoreSheets);
    if (mediaObj.media) result.media.push(...mediaObj.media);

    result.updatedBy = updatedBy;
    result.auditLogs.push({ action: "media_added", performedBy: updatedBy });

    await result.save();
    return result;
  } catch (error) {
    throw new Error(`Error attaching media: ${error.message}`);
  }
}

/**
 * 🔹 Add audit log manually
 * @param {String} resultId
 * @param {String} action
 * @param {String} userId
 * @param {String} notes
 */
async function addAuditLog(resultId, action, userId, notes = "") {
  try {
    const result = await Result.findById(resultId);
    if (!result) throw new Error("Result not found");

    result.auditLogs.push({ action, performedBy: userId, notes });
    await result.save();
    return result;
  } catch (error) {
    throw new Error(`Error adding audit log: ${error.message}`);
  }
}

module.exports = {
  fetchResultsByRole,
  createResult,
  updateResult,
  approveResult,
  rejectResult,
  getLeaderboard,
  attachCertificates,
  attachMedia,
  addAuditLog,
};
