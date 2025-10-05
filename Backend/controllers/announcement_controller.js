/**
 * backend/controllers/announcement_controller.js
 *
 * Controller for Announcement routes
 * ------------------------------------------------
 * Features:
 * - Create / Read / Update / Delete
 * - Batch operations (priority updates, notifications)
 * - Read/unread marking
 * - Role-based filtering
 * - Slug and scheduled/expired announcement handling
 */

const Announcement = require("../models/announcement_model");
const {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  markAnnouncementRead,
  batchUpdatePriority,
  sendNotifications,
} = require("../utils/announcement_util");

/**
 * 🔹 Create Announcement
 */
const createAnnouncementController = async (req, res) => {
  try {
    const userId = req.user._id;
    const data = req.body;

    const announcement = await createAnnouncement(data, userId);

    // Send notifications if requested
    await sendNotifications(announcement);

    res.status(201).json({ success: true, announcement });
  } catch (err) {
    console.error("Error creating announcement:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔹 Get all announcements (filtered by role + context)
 */
const getAnnouncementsController = async (req, res) => {
  try {
    const user = req.user;
    const role = user ? user.role : "public";
    const userContext = {
      department: user?.department,
      year: user?.year,
      club: user?.club,
    };
    const eventIds = req.query.event ? [req.query.event] : [];

    const announcements = await fetchAnnouncements(role, eventIds, userContext);

    res.status(200).json({ success: true, announcements });
  } catch (err) {
    console.error("Error fetching announcements:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔹 Get single announcement by ID
 */
const getAnnouncementByIdController = async (req, res) => {
  try {
    const announcement = req.announcement; // from middleware canViewAnnouncement
    res.status(200).json({ success: true, announcement });
  } catch (err) {
    console.error("Error fetching announcement:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔹 Update Announcement
 */
const updateAnnouncementController = async (req, res) => {
  try {
    const userId = req.user._id;
    const announcementId = req.params.id;
    const data = req.body;

    const announcement = await updateAnnouncement(announcementId, data, userId);
    res.status(200).json({ success: true, announcement });
  } catch (err) {
    console.error("Error updating announcement:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔹 Delete Announcement
 */
const deleteAnnouncementController = async (req, res) => {
  try {
    const userId = req.user._id;
    const announcementId = req.params.id;

    const result = await deleteAnnouncement(announcementId, userId);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error deleting announcement:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔹 Mark Announcement as Read (manual endpoint, optional)
 */
const markReadController = async (req, res) => {
  try {
    const userId = req.user._id;
    const announcementId = req.params.id;

    const announcement = await markAnnouncementRead(announcementId, userId);
    res.status(200).json({ success: true, announcement });
  } catch (err) {
    console.error("Error marking announcement as read:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔹 Batch Update Priority (Admin only)
 */
const batchUpdatePriorityController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { announcementIds, priority } = req.body;

    if (!Array.isArray(announcementIds) || announcementIds.length === 0) {
      return res.status(400).json({ error: "announcementIds must be a non-empty array" });
    }

    const result = await batchUpdatePriority(announcementIds, priority, userId);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error batch updating priority:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createAnnouncementController,
  getAnnouncementsController,
  getAnnouncementByIdController,
  updateAnnouncementController,
  deleteAnnouncementController,
  markReadController,
  batchUpdatePriorityController,
};
