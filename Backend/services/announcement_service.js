/**
 * backend/services/announcement_service.js
 *
 * Service layer for Announcements
 * Features:
 * - CRUD
 * - Filters: public/target audience/date range
 * - Bulk upload with batched notifications
 * - Media linking
 * - Advanced helpers: stats, dashboard, search, CSV export, cleanup
 * - Real-time sockets
 * - Notifications
 */

const Announcement = require('../models/announcement_model');
const Media = require('../models/media_model');
const ApiError = require('../utils/ApiError');
const { validateObjectId } = require('../utils/validators');
const { Parser } = require('json2csv');
const notificationService = require('./notification_service');

let io; // socket reference

// ----------------------
// Socket Init
// ----------------------
function initSocket(socketInstance) {
  io = socketInstance;
}

// ----------------------
// Create
// ----------------------
async function createAnnouncement(data) {
  const ann = new Announcement(data);
  await ann.save();

  if (io) io.emit('announcementCreated', ann);

  notificationService.sendNotification({
    title: 'New Announcement',
    message: ann.title,
    audience: ann.targetAudience,
    referenceId: ann._id,
    type: 'announcement'
  });

  return ann;
}

// ----------------------
// Read
// ----------------------
async function getAnnouncementById(id, populate = false) {
  validateObjectId(id, 'announcementId');
  const query = Announcement.findById(id);
  if (populate) query.populate('media');
  const ann = await query;
  if (!ann) throw new ApiError('Announcement not found', 404);
  return ann;
}

async function listAnnouncements(filter = {}, options = {}) {
  const { page = 1, limit = 10, sort = { createdAt: -1 }, populate = true } = options;
  const query = Announcement.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
  if (populate) query.populate('media');
  const announcements = await query;
  const total = await Announcement.countDocuments(filter);
  return { announcements, total, page, limit };
}

// ----------------------
// Update
// ----------------------
async function updateAnnouncement(id, data) {
  validateObjectId(id, 'announcementId');
  const ann = await Announcement.findByIdAndUpdate(id, data, { new: true }).populate('media');
  if (!ann) throw new ApiError('Announcement not found', 404);

  if (io) io.emit('announcementUpdated', ann);

  notificationService.sendNotification({
    title: 'Announcement Updated',
    message: ann.title,
    audience: ann.targetAudience,
    referenceId: ann._id,
    type: 'announcement'
  });

  return ann;
}

// ----------------------
// Delete
// ----------------------
async function deleteAnnouncement(id) {
  validateObjectId(id, 'announcementId');
  const ann = await Announcement.findByIdAndDelete(id);
  if (!ann) throw new ApiError('Announcement not found', 404);

  if (io) io.emit('announcementDeleted', { id });

  notificationService.sendNotification({
    title: 'Announcement Deleted',
    message: ann.title,
    audience: ann.targetAudience,
    referenceId: ann._id,
    type: 'announcement'
  });

  return ann;
}

// ----------------------
// Bulk Upload (batched notifications)
// ----------------------
async function bulkCreateAnnouncements(list, batchSize = 20) {
  if (!Array.isArray(list) || list.length === 0) throw new ApiError('List must be a non-empty array', 400);
  const created = await Announcement.insertMany(list);

  if (io) io.emit('announcementsBulkCreated', created);

  // Send notifications in batches
  for (let i = 0; i < created.length; i += batchSize) {
    const batch = created.slice(i, i + batchSize);
    const notifications = batch.map(ann => ({
      title: 'New Announcement',
      message: ann.title,
      audience: ann.targetAudience,
      referenceId: ann._id,
      type: 'announcement'
    }));
    await notificationService.sendBulkNotifications(notifications);
  }

  return created;
}

// ----------------------
// Media linking / unlinking
// ----------------------
async function linkMedia(announcementId, mediaIds) {
  validateObjectId(announcementId, 'announcementId');
  const ann = await Announcement.findById(announcementId);
  if (!ann) throw new ApiError('Announcement not found', 404);

  for (const m of mediaIds) {
    validateObjectId(m, 'mediaId');
    const media = await Media.findById(m);
    if (!media) throw new ApiError(`Media not found: ${m}`, 404);
  }

  ann.media = mediaIds;
  await ann.save();

  if (io) io.emit('announcementMediaLinked', ann);

  notificationService.sendNotification({
    title: 'Announcement Media Updated',
    message: ann.title,
    audience: ann.targetAudience,
    referenceId: ann._id,
    type: 'announcement'
  });

  return ann.populate('media');
}

async function removeMediaFromAnnouncement(announcementId, mediaIdsToRemove) {
  validateObjectId(announcementId, 'announcementId');
  const ann = await Announcement.findById(announcementId);
  if (!ann) throw new ApiError('Announcement not found', 404);

  ann.media = ann.media.filter(m => !mediaIdsToRemove.includes(m.toString()));
  await ann.save();

  if (io) io.emit('announcementMediaRemoved', ann);

  notificationService.sendNotification({
    title: 'Announcement Media Removed',
    message: ann.title,
    audience: ann.targetAudience,
    referenceId: ann._id,
    type: 'announcement'
  });

  return ann.populate('media');
}

// ----------------------
// Toggle public/private
// ----------------------
async function toggleAnnouncementPublicStatus(id) {
  validateObjectId(id, 'announcementId');
  const ann = await Announcement.findById(id);
  if (!ann) throw new ApiError('Announcement not found', 404);

  ann.isPublic = !ann.isPublic;
  await ann.save();

  if (io) io.emit('announcementPublicToggled', ann);

  notificationService.sendNotification({
    title: ann.isPublic ? 'Announcement Published' : 'Announcement Unpublished',
    message: ann.title,
    audience: ann.targetAudience,
    referenceId: ann._id,
    type: 'announcement'
  });

  return ann;
}

// ----------------------
// Public/target audience filters
// ----------------------
async function getPublicAnnouncements(options = {}) {
  return listAnnouncements({ isPublic: true }, options);
}

async function getAnnouncementsForAudience(audience, options = {}) {
  return listAnnouncements({ targetAudience: audience }, options);
}

async function getAnnouncementsByDateRange(from, to, options = {}) {
  return listAnnouncements({ startDate: { $gte: from }, endDate: { $lte: to } }, options);
}

// ----------------------
// Advanced Helpers
// ----------------------
async function getAnnouncementStats() {
  const now = new Date();
  const total = await Announcement.countDocuments();
  const active = await Announcement.countDocuments({
    startDate: { $lte: now },
    endDate: { $gte: now }
  });
  const upcoming = await Announcement.countDocuments({ startDate: { $gt: now } });
  const expired = await Announcement.countDocuments({ endDate: { $lt: now } });
  return { total, active, upcoming, expired };
}

async function getRecentlyAddedAnnouncements(limit = 5) {
  return Announcement.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('media');
}

async function getAnnouncementsByAudience(audience, options = {}) {
  const { page = 1, limit = 10 } = options;
  const announcements = await Announcement.find({ targetAudience: audience })
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ startDate: -1 })
    .populate('media');
  const total = await Announcement.countDocuments({ targetAudience: audience });
  return { announcements, total, page, limit };
}

async function exportAnnouncementsCSV(filter = {}) {
  const announcements = await Announcement.find(filter).populate('media').lean();
  const fields = ['_id', 'title', 'description', 'targetAudience', 'startDate', 'endDate', 'isPublic'];
  const parser = new Parser({ fields });
  return parser.parse(announcements);
}

async function deleteExpiredAnnouncements(now = new Date()) {
  const result = await Announcement.deleteMany({ endDate: { $lt: now } });

  if (io && result.deletedCount > 0) {
    io.emit('announcementsExpiredDeleted', { deletedCount: result.deletedCount });
  }

  return { deletedCount: result.deletedCount };
}

// ----------------------
// Search helper
// ----------------------
async function searchAnnouncements(keyword, options = {}) {
  if (!keyword || typeof keyword !== 'string') throw new ApiError('Keyword required', 400);
  const { page = 1, limit = 10 } = options;
  const filter = { title: { $regex: keyword, $options: 'i' } };
  const announcements = await Announcement.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('media');
  const total = await Announcement.countDocuments(filter);
  return { announcements, total, page, limit };
}

// ----------------------
// Audience-Aware Dashboard Summary
// ----------------------
async function getDashboardForAudience(audience, recentLimit = 5, upcomingLimit = 5) {
  const now = new Date();

  // Filter for this audience (including public)
  const filter = { $or: [{ targetAudience: audience }, { isPublic: true }] };

  // Overall stats for this audience
  const total = await Announcement.countDocuments(filter);
  const active = await Announcement.countDocuments({ ...filter, startDate: { $lte: now }, endDate: { $gte: now } });
  const upcoming = await Announcement.countDocuments({ ...filter, startDate: { $gt: now } });
  const expired = await Announcement.countDocuments({ ...filter, endDate: { $lt: now } });

  const stats = { total, active, upcoming, expired };

  // Recently added announcements
  const recent = await Announcement.find(filter)
    .sort({ createdAt: -1 })
    .limit(recentLimit)
    .populate('media');

  // Upcoming announcements
  const upcomingAnnouncements = await Announcement.find({ ...filter, startDate: { $gt: now } })
    .sort({ startDate: 1 })
    .limit(upcomingLimit)
    .populate('media');

  return { stats, recent, upcoming: upcomingAnnouncements };
}

module.exports = {
  initSocket,
  createAnnouncement,
  getAnnouncementById,
  listAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  bulkCreateAnnouncements,
  linkMedia,
  removeMediaFromAnnouncement,
  toggleAnnouncementPublicStatus,
  getPublicAnnouncements,
  getAnnouncementsForAudience,
  getAnnouncementsByDateRange,
  getAnnouncementStats,
  getRecentlyAddedAnnouncements,
  getAnnouncementsByAudience,
  exportAnnouncementsCSV,
  deleteExpiredAnnouncements,
  searchAnnouncements,
  getDashboardForAudience,  // added here
};
