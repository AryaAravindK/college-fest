/**
 * backend/services/feedback_service.js
 *
 * Feedback services for College Fest Website
 * Matches feedback_model.js and validators/feedback_validator.js
 * Features:
 *   - CRUD
 *   - Filters: eventId, userId, isPublic, pagination
 *   - Prevent multiple feedbacks per user per event
 *   - Stats per event / multiple events / user
 *   - Bulk upload
 *   - Search (by comments)
 *   - CSV export
 *   - Real-time socket notifications
 */

const mongoose = require('mongoose');
const Feedback = require('../models/feedback_model');
const { createFeedbackValidator, updateFeedbackValidator } = require('../validators/feedback_validator');
const { Parser } = require('json2csv');

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ----------------------
// Socket reference
// ----------------------
let io;
function initSocket(socketInstance) {
  io = socketInstance;
}

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(String(id))) throw new ApiError(`Invalid ${name}`, 400);
}

function toObjectIdArray(ids = [], name = 'id') {
  if (!Array.isArray(ids)) throw new ApiError(`${name} must be an array`, 400);
  return [...new Set(ids.map(String))].map(id => {
    validateObjectId(id, name);
    return mongoose.Types.ObjectId(id);
  });
}

// ----------------------
// Core Services
// ----------------------

async function createFeedback(payload) {
  const { error, value } = createFeedbackValidator.validate(payload);
  if (error) throw new ApiError(error.details[0].message, 422);

  const userId = mongoose.Types.ObjectId(value.userId);
  const eventId = mongoose.Types.ObjectId(value.eventId);

  // Prevent multiple feedbacks per user per event
  const exists = await Feedback.findOne({ userId, eventId });
  if (exists) throw new ApiError('User has already submitted feedback for this event', 400);

  const feedback = await Feedback.create({
    userId,
    eventId,
    rating: value.rating,
    comments: value.comments ? value.comments.trim() : '',
    isPublic: value.isPublic !== undefined ? !!value.isPublic : false,
  });

  if (io) io.emit('feedbackCreated', feedback);

  return feedback.populate('userId').populate('eventId');
}

async function updateFeedback(feedbackId, updateData) {
  validateObjectId(feedbackId, 'feedbackId');

  const { error, value } = updateFeedbackValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new ApiError('Feedback not found', 404);

  if (value.rating !== undefined) feedback.rating = value.rating;
  if (value.comments !== undefined) feedback.comments = value.comments ? value.comments.trim() : '';
  if (value.isPublic !== undefined) feedback.isPublic = !!value.isPublic;

  await feedback.save();

  if (io) io.emit('feedbackUpdated', feedback);

  return feedback.populate('userId').populate('eventId');
}

async function deleteFeedback(feedbackId) {
  validateObjectId(feedbackId, 'feedbackId');
  const removed = await Feedback.findByIdAndDelete(feedbackId);
  if (!removed) throw new ApiError('Feedback not found', 404);

  if (io) io.emit('feedbackDeleted', { feedbackId });

  return { message: 'Feedback deleted', feedbackId };
}

async function getFeedbackById(feedbackId) {
  validateObjectId(feedbackId, 'feedbackId');
  const feedback = await Feedback.findById(feedbackId)
    .populate('userId')
    .populate('eventId');
  if (!feedback) throw new ApiError('Feedback not found', 404);
  return feedback;
}

async function listFeedbacks(options = {}) {
  const {
    eventId,
    userId,
    isPublic,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = options;

  const filter = {};
  if (eventId) filter.eventId = mongoose.Types.ObjectId(eventId);
  if (userId) filter.userId = mongoose.Types.ObjectId(userId);
  if (typeof isPublic === 'boolean') filter.isPublic = !!isPublic;

  const sortObj = {};
  sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const feedbacks = await Feedback.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort(sortObj)
    .populate('userId')
    .populate('eventId');

  const total = await Feedback.countDocuments(filter);
  return { feedbacks, total, page: Number(page), limit: Number(limit) };
}

// ----------------------
// Stats
// ----------------------
async function getEventFeedbackStats(eventId) {
  validateObjectId(eventId, 'eventId');

  const stats = await Feedback.aggregate([
    { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$eventId',
        averageRating: { $avg: '$rating' },
        totalFeedbacks: { $sum: 1 },
        ratingsBreakdown: { $push: '$rating' },
      },
    },
  ]);

  if (stats.length === 0) return { eventId, averageRating: 0, totalFeedbacks: 0, ratingsBreakdown: [] };
  const { averageRating, totalFeedbacks, ratingsBreakdown } = stats[0];
  return { eventId, averageRating, totalFeedbacks, ratingsBreakdown };
}

async function getEventsFeedbackStats(eventIds = []) {
  const ids = eventIds.map(id => mongoose.Types.ObjectId(id));
  const stats = await Feedback.aggregate([
    { $match: { eventId: { $in: ids } } },
    {
      $group: {
        _id: '$eventId',
        averageRating: { $avg: '$rating' },
        totalFeedbacks: { $sum: 1 },
      },
    },
  ]);
  return stats;
}

async function getUserFeedbackSummary(userId) {
  validateObjectId(userId, 'userId');
  const feedbacks = await Feedback.find({ userId }).populate('eventId');
  const totalFeedbacks = feedbacks.length;
  const averageRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / (totalFeedbacks || 1);
  return { userId, totalFeedbacks, averageRating, feedbacks };
}

// ----------------------
// Public Feedback
// ----------------------
async function getPublicFeedbacks(eventId, options = {}) {
  validateObjectId(eventId, 'eventId');
  const { page = 1, limit = 10, sortBy = 'createdAt', sortDir = 'desc' } = options;

  const sortObj = {};
  sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const feedbacks = await Feedback.find({ eventId, isPublic: true })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort(sortObj)
    .populate('userId');

  const total = await Feedback.countDocuments({ eventId, isPublic: true });
  return { feedbacks, total, page: Number(page), limit: Number(limit) };
}

// ----------------------
// Bulk Upload
// ----------------------
async function bulkCreateFeedback(list = []) {
  if (!Array.isArray(list) || list.length === 0) throw new ApiError('List must be a non-empty array', 400);
  const created = await Feedback.insertMany(list);

  if (io) io.emit('feedbackBulkCreated', created);
  return created;
}

// ----------------------
// Search
// ----------------------
async function searchFeedback(keyword, options = {}) {
  if (!keyword || typeof keyword !== 'string') throw new ApiError('Keyword required', 400);
  const { page = 1, limit = 10 } = options;
  const filter = { comments: { $regex: keyword, $options: 'i' } };
  const feedbacks = await Feedback.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId')
    .populate('eventId');
  const total = await Feedback.countDocuments(filter);
  return { feedbacks, total, page, limit };
}

// ----------------------
// CSV Export
// ----------------------
async function exportFeedbackCSV(filter = {}) {
  const feedbacks = await Feedback.find(filter)
    .populate('userId')
    .populate('eventId')
    .lean();
  const fields = ['_id', 'userId.name', 'eventId.title', 'rating', 'comments', 'isPublic', 'createdAt'];
  const parser = new Parser({ fields });
  return parser.parse(feedbacks);
}

module.exports = {
  ApiError,
  initSocket,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackById,
  listFeedbacks,
  getEventFeedbackStats,
  getEventsFeedbackStats,
  getUserFeedbackSummary,
  getPublicFeedbacks,
  bulkCreateFeedback,
  searchFeedback,
  exportFeedbackCSV,
};
