/**
 * backend/routes/announcement_routes.js
 *
 * Routes for Announcement entity
 * ------------------------------------------------
 * Features:
 * - Create / Read / Update / Delete
 * - Read/unread marking
 * - Batch operations (priority updates)
 * - Role-based access control
 * - Validator & middleware integration
 */

const express = require("express");
const router = express.Router();

// Import controllers
const {
  createAnnouncementController,
  getAnnouncementsController,
  getAnnouncementByIdController,
  updateAnnouncementController,
  deleteAnnouncementController,
  markReadController,
  batchUpdatePriorityController,
} = require("../controllers/announcement_controller");

// Import validators
const {
  createAnnouncementValidator,
  updateAnnouncementValidator,
  announcementIdValidator,
  announcementQueryValidator,
} = require("../validators/announcement_validator");

// Import middleware
const {
  canViewAnnouncement,
  canCreateAnnouncement,
  canUpdateAnnouncement,
  canDeleteAnnouncement,
  filterAnnouncements,
  adminOnly,
} = require("../middlewares/announcement_middleware");

const { protect } = require("../middlewares/auth_middleware"); // JWT auth middleware

/**
 * 🔹 Routes
 */

// Create announcement - Admin or Organizer only
router.post(
  "/",
  protect,
  canCreateAnnouncement,
  createAnnouncementValidator,
  createAnnouncementController
);

// Get all announcements (filtered by role & context)
router.get("/", protect, announcementQueryValidator, filterAnnouncements, getAnnouncementsController);

// Get single announcement by ID
router.get("/:id", protect, announcementIdValidator, canViewAnnouncement, getAnnouncementByIdController);

// Update announcement - Admin or Organizer (own) only
router.put(
  "/:id",
  protect,
  announcementIdValidator,
  updateAnnouncementValidator,
  canUpdateAnnouncement,
  updateAnnouncementController
);

// Delete announcement - Admin or Organizer (own) only
router.delete("/:id", protect, announcementIdValidator, canDeleteAnnouncement, deleteAnnouncementController);

// Mark announcement as read (optional endpoint)
router.post("/:id/mark-read", protect, announcementIdValidator, canViewAnnouncement, markReadController);

// Batch update priority - Admin only
router.post("/batch/priority", protect, adminOnly, batchUpdatePriorityController);

module.exports = router;
