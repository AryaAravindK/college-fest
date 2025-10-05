/**
 * backend/middlewares/announcement_middleware.js
 *
 * Middleware for Announcement routes
 * ------------------------------------------------
 * Features:
 * - Role-based access control
 * - Admin-only actions (create/update/delete)
 * - Read permission checks
 * - Soft-delete protection
 * - Integration with announcement_util.js for markRead
 */

const Announcement = require("../models/announcement_model");
const { fetchAnnouncements, markAnnouncementRead } = require("../utils/announcement_util");

/**
 * 🔹 Check if user can view the announcement
 */
const canViewAnnouncement = async (req, res, next) => {
  const user = req.user; // Populated by auth_middleware
  const announcementId = req.params.id;

  if (!announcementId) return res.status(400).json({ error: "Announcement ID required" });

  const announcement = await Announcement.findById(announcementId);
  if (!announcement || announcement.deleted) return res.status(404).json({ error: "Announcement not found" });

  const userContext = {
    department: user.department || null,
    year: user.year || null,
    club: user.club || null,
  };

  if (!announcement.canView(user.role, userContext)) {
    return res.status(403).json({ error: "You do not have permission to view this announcement" });
  }

  // Mark as read automatically if applicable
  await markAnnouncementRead(announcement._id, user._id);

  // Attach announcement to request for controller use
  req.announcement = announcement;
  next();
};

/**
 * 🔹 Admin-only access for create/update/delete
 */
const adminOnly = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * 🔹 Role-based creation access
 * Only admin or organizer can create announcements
 */
const canCreateAnnouncement = (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  if (user.role !== "admin" && user.role !== "organizer") {
    return res.status(403).json({ error: "Only admin or organizer can create announcements" });
  }

  next();
};

/**
 * 🔹 Role-based update access
 * Admin can update any, Organizer can update own announcements
 */
const canUpdateAnnouncement = async (req, res, next) => {
  const user = req.user;
  const announcementId = req.params.id;
  const announcement = await Announcement.findById(announcementId);

  if (!announcement || announcement.deleted) return res.status(404).json({ error: "Announcement not found" });

  if (user.role === "admin") return next();

  if (user.role === "organizer" && announcement.createdBy.toString() === user._id.toString()) {
    return next();
  }

  return res.status(403).json({ error: "You do not have permission to update this announcement" });
};

/**
 * 🔹 Role-based delete access
 * Admin can delete any, Organizer can delete own announcements
 */
const canDeleteAnnouncement = async (req, res, next) => {
  const user = req.user;
  const announcementId = req.params.id;
  const announcement = await Announcement.findById(announcementId);

  if (!announcement || announcement.deleted) return res.status(404).json({ error: "Announcement not found" });

  if (user.role === "admin") return next();

  if (user.role === "organizer" && announcement.createdBy.toString() === user._id.toString()) {
    return next();
  }

  return res.status(403).json({ error: "You do not have permission to delete this announcement" });
};

/**
 * 🔹 Filter announcements list by role + context
 */
const filterAnnouncements = async (req, res, next) => {
  const user = req.user;
  const role = user ? user.role : "public";

  const userContext = {
    department: user?.department,
    year: user?.year,
    club: user?.club,
  };

  const eventIds = req.query.event ? [req.query.event] : [];

  const announcements = await fetchAnnouncements(role, eventIds, userContext);
  req.announcements = announcements; // Attach for controller use
  next();
};

module.exports = {
  canViewAnnouncement,
  adminOnly,
  canCreateAnnouncement,
  canUpdateAnnouncement,
  canDeleteAnnouncement,
  filterAnnouncements,
};
