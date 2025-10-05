/**
 * backend/middlewares/feedback_middleware.js
 *
 * Middleware for Feedback Module
 * --------------------------------
 * Responsibilities:
 * - Role-based access
 * - Ownership checks
 * - Moderation permission checks
 * - Pre-validation before controller execution
 */

const Feedback = require("../models/feedback_model");

/**
 * Check if user can view feedback
 * Roles:
 * - public → cannot view
 * - student → only their own feedback
 * - organizer/faculty → only feedback for their events
 * - admin → all feedback
 */
const canViewFeedback = async (req, res, next) => {
  const { role, _id: userId } = req.user;

  if (role === "public") {
    return res.status(403).json({ message: "Public users cannot view feedback" });
  }

  if (role === "student") {
    req.filter = { student: userId };
  } else if (role === "organizer" || role === "faculty") {
    // req.eventIds should be set by previous middleware (events user can access)
    if (!req.eventIds || req.eventIds.length === 0) {
      return res.status(403).json({ message: "No events assigned for feedback access" });
    }
    req.filter = { event: { $in: req.eventIds } };
  } else if (role === "admin") {
    req.filter = {}; // no filter, access all
  } else {
    return res.status(403).json({ message: "Invalid role" });
  }

  next();
};

/**
 * Check if user can modify a feedback (update/delete)
 * - Student → only their own feedback
 * - Organizer/Faculty → cannot modify student feedback
 * - Admin → full access
 */
const canModifyFeedback = async (req, res, next) => {
  const { role, _id: userId } = req.user;
  const feedbackId = req.params.id;

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) return res.status(404).json({ message: "Feedback not found" });

  if (role === "student" && feedback.student.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Students can only modify their own feedback" });
  }

  // Organizer/Faculty cannot modify feedback (only respond)
  if ((role === "organizer" || role === "faculty") && feedback.student.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Cannot modify feedback submitted by others" });
  }

  req.feedback = feedback;
  next();
};

/**
 * Check if user can moderate feedback
 * - Only admin or assigned moderator
 */
const canModerateFeedback = async (req, res, next) => {
  const { role, _id: userId } = req.user;
  const feedbackId = req.params.id;

  if (role !== "admin") {
    return res.status(403).json({ message: "Only admin can moderate feedback" });
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) return res.status(404).json({ message: "Feedback not found" });

  req.feedback = feedback;
  next();
};

/**
 * Check if user can add response
 * - Only organizer or faculty assigned to the event
 */
const canRespondFeedback = async (req, res, next) => {
  const { role, _id: userId } = req.user;
  const feedbackId = req.params.id;

  if (!(role === "organizer" || role === "faculty" || role === "admin")) {
    return res.status(403).json({ message: "Only organizer/faculty/admin can respond" });
  }

  const feedback = await Feedback.findById(feedbackId).populate("event");
  if (!feedback) return res.status(404).json({ message: "Feedback not found" });

  // Admin can respond to all
  if (role === "admin") {
    req.feedback = feedback;
    return next();
  }

  // Check if user is assigned to the event
  const userEventIds = req.eventIds || []; // set by previous middleware
  if (!userEventIds.includes(feedback.event._id.toString())) {
    return res.status(403).json({ message: "You are not assigned to this event" });
  }

  req.feedback = feedback;
  next();
};

module.exports = {
  canViewFeedback,
  canModifyFeedback,
  canModerateFeedback,
  canRespondFeedback,
};
