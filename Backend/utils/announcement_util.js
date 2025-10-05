/**
 * backend/utils/announcement_util.js
 *
 * Utility functions for Announcement operations
 * ------------------------------------------------
 * Features:
 * - Create / Update / Delete / Fetch
 * - Role-based filtering
 * - Audience filters (departments, years, clubs)
 * - Priority & scheduled announcements handling
 * - Notifications mock (email & SMS)
 * - Read tracking
 * - Audit logging
 */

const Announcement = require("../models/announcement_model");
const validator = require("validator");
const crypto = require("crypto");

// Helper to generate a slug
const generateSlug = (title) => {
  if (!title) return crypto.randomBytes(6).toString("hex");
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
};

/**
 * 🔹 Create Announcement
 */
const createAnnouncement = async (data, userId) => {
  if (!data.title || !data.description) {
    throw new Error("Title and description are required");
  }

  if (data.attachmentUrl && !validator.isURL(data.attachmentUrl)) {
    throw new Error("Invalid attachment URL");
  }

  const slug = data.slug || generateSlug(data.title);

  const announcement = await Announcement.create({
    title: data.title,
    description: data.description,
    event: data.event || null,
    createdBy: userId,
    isPublic: data.isPublic ?? true,
    roles: data.roles || ["public", "student", "faculty", "organizer", "admin"],
    priority: data.priority || "normal",
    attachmentUrl: data.attachmentUrl || "",
    departments: data.departments || [],
    years: data.years || [],
    clubs: data.clubs || [],
    notifyEmail: data.notifyEmail || false,
    notifySms: data.notifySms || false,
    validFrom: data.validFrom || new Date(),
    validTo: data.validTo || null,
    slug,
    auditLogs: [
      {
        action: "created",
        performedBy: userId,
        notes: `Announcement created by user ${userId}`,
      },
    ],
  });

  return announcement;
};

/**
 * 🔹 Update Announcement
 */
const updateAnnouncement = async (announcementId, data, userId) => {
  const announcement = await Announcement.findById(announcementId);
  if (!announcement) throw new Error("Announcement not found");

  Object.keys(data).forEach((key) => {
    if (key !== "auditLogs" && key !== "createdBy") {
      announcement[key] = data[key];
    }
  });

  // Update slug if title changed
  if (data.title) announcement.slug = generateSlug(data.title);

  announcement.auditLogs.push({
    action: "updated",
    performedBy: userId,
    notes: `Announcement updated by user ${userId}`,
  });

  await announcement.save();
  return announcement;
};

/**
 * 🔹 Delete Announcement (Soft Delete)
 */
const deleteAnnouncement = async (announcementId, userId) => {
  const announcement = await Announcement.findById(announcementId);
  if (!announcement) throw new Error("Announcement not found");

  announcement.auditLogs.push({
    action: "deleted",
    performedBy: userId,
    notes: `Announcement deleted by user ${userId}`,
  });

  await announcement.delete(); // uses mongoose-delete plugin
  return { message: "Announcement deleted successfully" };
};

/**
 * 🔹 Fetch Announcements by Role
 */
const fetchAnnouncements = async (role, eventIds = [], userContext = {}) => {
  const announcements = await Announcement.getAnnouncementsByRole(role, eventIds, userContext);

  // Filter expired announcements
  const now = new Date();
  return announcements.filter((a) => !a.validTo || a.validTo >= now);
};

/**
 * 🔹 Mark Announcement as Read
 */
const markAnnouncementRead = async (announcementId, userId) => {
  const announcement = await Announcement.findById(announcementId);
  if (!announcement) throw new Error("Announcement not found");

  await announcement.markRead(userId);
  return announcement;
};

/**
 * 🔹 Batch operations (admin)
 */
const batchUpdatePriority = async (announcementIds, priority, userId) => {
  if (!["low", "normal", "high", "urgent"].includes(priority)) {
    throw new Error("Invalid priority value");
  }

  const result = await Announcement.updateMany(
    { _id: { $in: announcementIds } },
    {
      $set: { priority },
      $push: {
        auditLogs: {
          action: "priority updated",
          performedBy: userId,
          notes: `Priority changed to ${priority}`,
        },
      },
    }
  );

  return result;
};

/**
 * 🔹 Mock Notifications (for email & SMS)
 */
const sendNotifications = async (announcement) => {
  if (announcement.notifyEmail) {
    console.log(`[Email] Announcement: ${announcement.title} sent`);
  }
  if (announcement.notifySms) {
    console.log(`[SMS] Announcement: ${announcement.title} sent`);
  }
};

module.exports = {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  markAnnouncementRead,
  batchUpdatePriority,
  sendNotifications,
};
