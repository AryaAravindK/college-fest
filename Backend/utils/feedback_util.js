/**
 * backend/utils/feedback_util.js
 *
 * Utilities for Feedback Module
 * ---------------------------------
 * Covers:
 * - Creating feedback
 * - Updating feedback
 * - Deleting (soft delete)
 * - Adding/removing likes
 * - Adding organizer response
 * - Moderation actions
 * - Fetching feedback based on role
 * - Audit log management
 * - Pagination & filtering
 */

const Feedback = require("../models/feedback_model");

/**
 * Create new feedback
 * @param {Object} feedbackData - All fields needed for feedback creation
 * @param {ObjectId} userId - User who creates the feedback
 * @returns {Promise<Feedback>}
 */
async function createFeedback(feedbackData, userId) {
  feedbackData.createdBy = userId;
  feedbackData.updatedBy = userId;

  const feedback = new Feedback(feedbackData);
  await feedback.save();
  return feedback;
}

/**
 * Update feedback
 * @param {ObjectId} feedbackId
 * @param {Object} updateData
 * @param {ObjectId} userId - User performing the update
 * @returns {Promise<Feedback>}
 */
async function updateFeedback(feedbackId, updateData, userId) {
  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new Error("Feedback not found");

  Object.assign(feedback, updateData);
  feedback.updatedBy = userId;
  await feedback.save();
  return feedback;
}

/**
 * Soft delete feedback
 * @param {ObjectId} feedbackId
 * @returns {Promise<Feedback>}
 */
async function deleteFeedback(feedbackId) {
  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new Error("Feedback not found");

  await feedback.delete(); // Uses mongoose-delete plugin
  return feedback;
}

/**
 * Add like to feedback
 * @param {ObjectId} feedbackId
 * @param {ObjectId} userId
 * @returns {Promise<Feedback>}
 */
async function addLike(feedbackId, userId) {
  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new Error("Feedback not found");
  await feedback.addLike(userId);
  return feedback;
}

/**
 * Remove like from feedback
 * @param {ObjectId} feedbackId
 * @param {ObjectId} userId
 * @returns {Promise<Feedback>}
 */
async function removeLike(feedbackId, userId) {
  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new Error("Feedback not found");
  await feedback.removeLike(userId);
  return feedback;
}

/**
 * Add organizer/faculty response
 * @param {ObjectId} feedbackId
 * @param {String} responseText
 * @param {ObjectId} userId
 * @returns {Promise<Feedback>}
 */
async function addResponse(feedbackId, responseText, userId) {
  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new Error("Feedback not found");
  await feedback.addResponse(responseText, userId);
  return feedback;
}

/**
 * Moderate feedback
 * @param {ObjectId} feedbackId
 * @param {String} status - "approved" | "rejected"
 * @param {ObjectId} moderatorId
 * @param {String} reason - Optional moderation reason
 * @returns {Promise<Feedback>}
 */
async function moderateFeedback(feedbackId, status, moderatorId, reason = "") {
  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new Error("Feedback not found");

  feedback.status = status;
  feedback.moderator = moderatorId;
  feedback.moderationReason = reason;

  // Add audit log
  feedback.auditLogs.push({
    action: `Feedback ${status}`,
    performedBy: moderatorId,
    notes: reason,
  });

  feedback.updatedBy = moderatorId;

  await feedback.save();
  return feedback;
}

/**
 * Get feedback by role
 * @param {String} role - "public" | "student" | "organizer" | "faculty" | "admin"
 * @param {ObjectId} userId
 * @param {Array<ObjectId>} eventIds - Optional event IDs for organizer/faculty
 * @returns {Promise<Feedback[]>}
 */
async function getFeedbackByRole(role, userId, eventIds = []) {
  return await Feedback.getFeedbackByRole(role, userId, eventIds);
}

/**
 * Search / filter feedback with pagination
 * @param {Object} filter - MongoDB query filter
 * @param {Object} options - { page, limit, sort }
 * @returns {Promise<Object>} - { docs, totalDocs, totalPages, page, limit }
 */
async function paginateFeedback(filter = {}, options = { page: 1, limit: 10, sort: { createdAt: -1 } }) {
  const result = await Feedback.paginate(filter, options);
  return result;
}

module.exports = {
  createFeedback,
  updateFeedback,
  deleteFeedback,
  addLike,
  removeLike,
  addResponse,
  moderateFeedback,
  getFeedbackByRole,
  paginateFeedback,
};
