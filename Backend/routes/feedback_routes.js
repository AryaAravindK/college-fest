/**
 * backend/routes/feedback_routes.js
 *
 * Routes for Feedback Module
 * ---------------------------
 * Fully integrated with:
 * - Validators
 * - Middleware
 * - Controller
 * - Role-based access
 */

const express = require("express");
const router = express.Router();

// Controllers
const feedbackController = require("../controllers/feedback_controller");

// Validators
const {
  createFeedbackValidator,
  updateFeedbackValidator,
  feedbackIdValidator,
  moderateFeedbackValidator,
  getFeedbackValidator,
} = require("../validators/feedback_validator");

// Middleware
const {
  canViewFeedback,
  canModifyFeedback,
  canModerateFeedback,
  canRespondFeedback,
} = require("../middlewares/feedback_middleware");

// Auth Middleware (JWT)
const { protect } = require("../middlewares/auth_middleware");

// ---------------------------
// Routes
// ---------------------------

// 1️⃣ Create new feedback
router.post(
  "/",
  protect,
  createFeedbackValidator,
  feedbackController.createFeedback
);

// 2️⃣ Update feedback
router.put(
  "/:id",
  protect,
  updateFeedbackValidator,
  canModifyFeedback,
  feedbackController.updateFeedback
);

// 3️⃣ Delete feedback (soft delete)
router.delete(
  "/:id",
  protect,
  feedbackIdValidator,
  canModifyFeedback,
  feedbackController.deleteFeedback
);

// 4️⃣ Like feedback
router.post(
  "/:id/like",
  protect,
  feedbackIdValidator,
  canViewFeedback,
  feedbackController.likeFeedback
);

// 5️⃣ Unlike feedback
router.post(
  "/:id/unlike",
  protect,
  feedbackIdValidator,
  canViewFeedback,
  feedbackController.unlikeFeedback
);

// 6️⃣ Add response by organizer/faculty/admin
router.post(
  "/:id/respond",
  protect,
  feedbackIdValidator,
  canRespondFeedback,
  feedbackController.respondFeedback
);

// 7️⃣ Moderate feedback (approve/reject)
router.post(
  "/:id/moderate",
  protect,
  moderateFeedbackValidator,
  canModerateFeedback,
  feedbackController.moderateFeedback
);

// 8️⃣ Get feedback (role-based + filters + pagination)
router.get(
  "/",
  protect,
  getFeedbackValidator,
  canViewFeedback,
  feedbackController.getFeedback
);

module.exports = router;
