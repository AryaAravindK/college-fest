/**
 * backend/services/notification_service.js
 *
 * Notification services for College Fest Website
 * - CRUD, bulk, real-time via socket.io, email (demo mode), CSV/JSON export
 */

const mongoose = require('mongoose');
const Notification = require('../models/notification_model');
const User = require('../models/user_model');
const Team = require('../models/team_model');
const {
  createNotificationValidator,
  updateNotificationValidator,
} = require('../validators/notification_validator');

const nodemailer = require('nodemailer');
const { Parser } = require('json2csv'); // CSV export

// Env configs
const EMAIL_USER = process.env.EMAIL_USER || null;
const EMAIL_PASS = process.env.EMAIL_PASS || null;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const DEMO_EMAIL = process.env.DEMO_EMAIL || null; // demo account for testing

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(String(id))) throw new ApiError(`Invalid ${name}`, 400);
}

async function ensureUserExists(userId) {
  validateObjectId(userId, 'userId');
  const user = await User.findById(userId).select('_id email firstName lastName role college');
  if (!user) throw new ApiError('User not found', 404);
  return user;
}

async function ensureTeamExists(teamId) {
  validateObjectId(teamId, 'teamId');
  const team = await Team.findById(teamId).select('_id teamName leaderId memberIds college');
  if (!team) throw new ApiError('Team not found', 404);
  return team;
}

async function populateNotification(doc) {
  if (!doc) return null;
  return await doc.populate('userId').populate('teamId');
}

// Nodemailer helper (with demo-email mode)
async function sendEmailToUser(user, subject, text) {
  if (!EMAIL_USER || !EMAIL_PASS) return { ok: false, reason: 'email_not_configured' };
  if (!user.email) return { ok: false, reason: 'no_email_on_user' };

  const recipient = DEMO_EMAIL || user.email;

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"College Fest" <${EMAIL_USER}>`,
    to: recipient,
    subject,
    text,
  });

  return { ok: true, sentTo: recipient };
}

// ----------------------
// Real-time via socket.io
// ----------------------
async function realtimeNotify(notificationDoc, { socketIo = null, pushService = null } = {}) {
  try {
    const pop = await populateNotification(notificationDoc);
    const recipientUser = pop.userId ? pop.userId._id.toString() : null;
    const teamId = pop.teamId ? pop.teamId._id.toString() : null;

    const payload = {
      id: pop._id.toString(),
      message: pop.message,
      type: pop.type,
      isRead: pop.isRead,
      createdAt: pop.createdAt,
      userId: recipientUser,
      teamId,
    };

    if (socketIo && recipientUser) socketIo.to(`user_${recipientUser}`).emit('notification', payload);
    if (socketIo && teamId) socketIo.to(`team_${teamId}`).emit('notification', payload);

    if (pushService && recipientUser && typeof pushService.sendToUser === 'function') {
      await pushService.sendToUser(recipientUser, payload);
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  }
}

// ----------------------
// Core Services
// ----------------------
async function createNotification(payload, options = {}) {
  const { error, value } = createNotificationValidator.validate(payload);
  if (error) throw new ApiError(error.details[0].message, 422);

  let user = null, team = null;
  if (value.userId) user = await ensureUserExists(value.userId);
  if (value.teamId) team = await ensureTeamExists(value.teamId);

  const doc = await Notification.create({
    userId: value.userId ? mongoose.Types.ObjectId(value.userId) : null,
    teamId: value.teamId ? mongoose.Types.ObjectId(value.teamId) : null,
    message: value.message.trim(),
    type: value.type || 'general',
    isRead: value.isRead !== undefined ? !!value.isRead : false,
  });

  const delivery = {};
  if (options.sendEmail && user) {
    try {
      const subject = options.emailSubject || `Notification: ${value.type || 'general'}`;
      const text = value.message;
      delivery.email = await sendEmailToUser(user, subject, text);
    } catch (err) {
      delivery.email = { ok: false, reason: err.message || String(err) };
    }
  }

  delivery.realtime = await realtimeNotify(doc, { socketIo: options.socketIo, pushService: options.pushService });

  return { notification: await populateNotification(doc), delivery };
}

async function bulkCreateNotifications(items = [], options = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError('items must be non-empty array', 400);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const docsToInsert = items.map((it, i) => {
      const { error } = createNotificationValidator.validate(it);
      if (error) throw new ApiError(`Row ${i}: ${error.details[0].message}`, 422);
      if (it.userId) validateObjectId(it.userId, 'userId');
      if (it.teamId) validateObjectId(it.teamId, 'teamId');
      return {
        userId: it.userId ? mongoose.Types.ObjectId(it.userId) : null,
        teamId: it.teamId ? mongoose.Types.ObjectId(it.teamId) : null,
        message: it.message.trim(),
        type: it.type || 'general',
        isRead: it.isRead !== undefined ? !!it.isRead : false,
      };
    });

    const inserted = await Notification.insertMany(docsToInsert, { session });
    await session.commitTransaction();
    session.endSession();

    for (const doc of inserted) await realtimeNotify(doc, { socketIo: options.socketIo, pushService: options.pushService });

    return { created: await Promise.all(inserted.map(populateNotification)) };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

// ----------------------
// Read/Unread Helpers
// ----------------------
async function markAsRead(notificationId) {
  validateObjectId(notificationId, 'notificationId');
  const notif = await Notification.findById(notificationId);
  if (!notif) throw new ApiError('Notification not found', 404);
  if (!notif.isRead) {
    notif.isRead = true;
    await notif.save();
  }
  return populateNotification(notif);
}

async function markAsUnread(notificationId) {
  validateObjectId(notificationId, 'notificationId');
  const notif = await Notification.findById(notificationId);
  if (!notif) throw new ApiError('Notification not found', 404);
  if (notif.isRead) {
    notif.isRead = false;
    await notif.save();
  }
  return populateNotification(notif);
}

async function markAllReadForUser(userId) {
  validateObjectId(userId, 'userId');
  const res = await Notification.updateMany({ userId: mongoose.Types.ObjectId(userId), isRead: false }, { $set: { isRead: true } });
  return { matched: res.matchedCount, modified: res.modifiedCount };
}

async function markAllReadForTeam(teamId) {
  validateObjectId(teamId, 'teamId');
  const res = await Notification.updateMany({ teamId: mongoose.Types.ObjectId(teamId), isRead: false }, { $set: { isRead: true } });
  return { matched: res.matchedCount, modified: res.modifiedCount };
}

// ----------------------
// Delete / Purge / Stats
// ----------------------
async function deleteNotification(notificationId) {
  validateObjectId(notificationId, 'notificationId');
  const removed = await Notification.findByIdAndDelete(notificationId);
  if (!removed) throw new ApiError('Notification not found', 404);
  return { message: 'Notification deleted', notificationId };
}

async function purgeNotificationsOlderThan(date) {
  if (!date) throw new ApiError('date required', 400);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new ApiError('Invalid date', 400);
  const res = await Notification.deleteMany({ createdAt: { $lt: d } });
  return { deletedCount: res.deletedCount || 0 };
}

async function getNotificationStats({ userId = null, teamId = null } = {}) {
  const match = {};
  if (userId) match.userId = mongoose.Types.ObjectId(userId);
  if (teamId) match.teamId = mongoose.Types.ObjectId(teamId);

  const rows = await Notification.aggregate([
    { $match: match },
    { $group: { _id: { type: '$type', isRead: '$isRead' }, count: { $sum: 1 } } },
  ]);

  const result = { total: 0, byType: {}, unread: 0 };
  for (const r of rows) {
    const type = r._id.type || 'general';
    const isRead = r._id.isRead;
    if (!result.byType[type]) result.byType[type] = { read: 0, unread: 0, total: 0 };
    if (isRead) result.byType[type].read += r.count;
    else { result.byType[type].unread += r.count; result.unread += r.count; }
    result.byType[type].total += r.count;
    result.total += r.count;
  }
  return result;
}

// ----------------------
// Send to Role / Team / College / Broadcast
// ----------------------
async function sendToRole(role, message, options = {}) {
  const allowedRoles = ['public','student','organizer','faculty','admin','superadmin'];
  if (!role || !message) throw new ApiError('role and message required', 400);
  if (!allowedRoles.includes(role)) throw new ApiError('Invalid role', 400);
  const users = await User.find({ role }).select('_id');
  const items = users.map(u => ({ userId: u._id.toString(), message, type: 'announcement', isRead: false }));
  return bulkCreateNotifications(items, options);
}

async function broadcastToAll(message, options = {}) {
  const users = await User.find({}).select('_id');
  const items = users.map(u => ({ userId: u._id.toString(), message, type: 'announcement', isRead: false }));
  return bulkCreateNotifications(items, options);
}

async function sendToCollege(collegeName, message, options = {}) {
  if (!collegeName || !message) throw new ApiError('collegeName and message required', 400);
  const users = await User.find({ college: { $regex: `^${collegeName}$`, $options: 'i' } }).select('_id');
  const items = users.map(u => ({ userId: u._id.toString(), message, type: 'announcement', isRead: false }));
  return bulkCreateNotifications(items, options);
}

async function sendToTeam(teamId, message, options = {}) {
  const team = await ensureTeamExists(teamId);
  const teamNotif = await createNotification({ teamId: team._id, message, type: 'team' }, options);
  // also notify leader if not included in team members
  if (team.leaderId && (!team.memberIds || !team.memberIds.includes(team.leaderId))) {
    await createNotification({ userId: team.leaderId, message, type: 'team' }, options);
  }
  return teamNotif;
}

// ----------------------
// Remove notifications by user/team
// ----------------------
async function removeNotificationsForUser(userId) {
  validateObjectId(userId, 'userId');
  const res = await Notification.deleteMany({ userId: mongoose.Types.ObjectId(userId) });
  return { deletedCount: res.deletedCount || 0 };
}

async function removeNotificationsForTeam(teamId) {
  validateObjectId(teamId, 'teamId');
  const res = await Notification.deleteMany({ teamId: mongoose.Types.ObjectId(teamId) });
  return { deletedCount: res.deletedCount || 0 };
}

// ----------------------
// Export helpers (CSV/JSON)
// ----------------------
async function exportNotificationsCSV(filter = {}) {
  const docs = await Notification.find(filter).populate('userId').populate('teamId');
  const json = docs.map(n => ({
    id: n._id.toString(),
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    user: n.userId ? n.userId.email : null,
    team: n.teamId ? n.teamId.teamName : null,
    createdAt: n.createdAt,
  }));
  const parser = new Parser();
  return parser.parse(json);
}

async function exportNotificationsJSON(filter = {}) {
  const docs = await Notification.find(filter).populate('userId').populate('teamId');
  return docs.map(n => ({
    id: n._id.toString(),
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    user: n.userId ? n.userId.email : null,
    team: n.teamId ? n.teamId.teamName : null,
    createdAt: n.createdAt,
  }));
}

// ----------------------
// Module Exports
// ----------------------
module.exports = {
  ApiError,
  createNotification,
  bulkCreateNotifications,
  getNotificationById: async (id) => populateNotification(await Notification.findById(id)),
  listNotifications: async (opts) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortDir = 'desc', ...rest } = opts || {};
    const filter = {};
    if (rest.userId) filter.userId = rest.userId;
    if (rest.teamId) filter.teamId = rest.teamId;
    if (rest.type) filter.type = rest.type;
    if (typeof rest.isRead === 'boolean') filter.isRead = rest.isRead;
    const docs = await Notification.find(filter)
      .populate('userId')
      .populate('teamId')
      .sort({ [sortBy]: sortDir === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Notification.countDocuments(filter);
    return { notifications: docs, total, page, limit };
  },
  markAsRead,
  markAsUnread,
  markAllReadForUser,
  markAllReadForTeam,
  countUnread: async ({ userId = null, teamId = null } = {}) => {
    const filter = { isRead: false };
    if (userId) filter.userId = mongoose.Types.ObjectId(userId);
    if (teamId) filter.teamId = mongoose.Types.ObjectId(teamId);
    const total = await Notification.countDocuments(filter);
    return { unread: total };
  },
  deleteNotification,
  purgeNotificationsOlderThan,
  getNotificationStats,
  sendToRole,
  broadcastToAll,
  sendToCollege,
  sendToTeam,
  removeNotificationsForUser,
  removeNotificationsForTeam,
  realtimeNotify,
  exportNotificationsCSV,
  exportNotificationsJSON,
};
