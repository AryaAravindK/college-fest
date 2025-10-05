/**
 * backend/controllers/feedback_controller.js
 *
 * Feedback Controller
 * -------------------
 * Handles all operations for Feedback Module
 * - CRUD
 * - Likes
 * - Responses
 * - Moderation
 * - Role-based fetching
 * - Pagination & filtering
 */

const FeedbackUtil = require("../utils/feedback_util");

/**
 * Create new feedback
 */
const createFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    const feedbackData = req.body;

    const feedback = await FeedbackUtil.createFeedback(feedbackData, userId);

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update feedback
 */
const updateFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const updateData = req.body;
    const userId = req.user._id;

    const feedback = await FeedbackUtil.updateFeedback(feedbackId, updateData, userId);

    res.status(200).json({
      message: "Feedback updated successfully",
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete feedback (soft delete)
 */
const deleteFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;

    const feedback = await FeedbackUtil.deleteFeedback(feedbackId);

    res.status(200).json({
      message: "Feedback deleted successfully",
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Add like
 */
const likeFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const userId = req.user._id;

    const feedback = await FeedbackUtil.addLike(feedbackId, userId);

    res.status(200).json({
      message: "Feedback liked successfully",
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Remove like
 */
const unlikeFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const userId = req.user._id;

    const feedback = await FeedbackUtil.removeLike(feedbackId, userId);

    res.status(200).json({
      message: "Feedback unliked successfully",
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Add response by organizer/faculty/admin
 */
const respondFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const { response } = req.body;
    const userId = req.user._id;

    const feedback = await FeedbackUtil.addResponse(feedbackId, response, userId);

    res.status(200).json({
      message: "Response added successfully",
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Moderate feedback (approve/reject)
 */
const moderateFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const { status, reason } = req.body;
    const moderatorId = req.user._id;

    const feedback = await FeedbackUtil.moderateFeedback(feedbackId, status, moderatorId, reason);

    res.status(200).json({
      message: `Feedback ${status} successfully`,
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get feedback by role with optional filters & pagination
 */
const getFeedback = async (req, res) => {
  try {
    const { role, _id: userId } = req.user;
    const { page = 1, limit = 10, status, category } = req.query;

    // Build filter
    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Role-based filter
    const feedbacks = await FeedbackUtil.getFeedbackByRole(role, userId, req.eventIds);

    // Apply additional filters and pagination
    const filtered = feedbacks.filter(fb => {
      if (filter.status && fb.status !== filter.status) return false;
      if (filter.category && fb.category !== filter.category) return false;
      return true;
    });

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginated = filtered.slice(startIndex, endIndex);

    res.status(200).json({
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      feedbacks: paginated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createFeedback,
  updateFeedback,
  deleteFeedback,
  likeFeedback,
  unlikeFeedback,
  respondFeedback,
  moderateFeedback,
  getFeedback,
};
