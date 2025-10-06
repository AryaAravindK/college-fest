/**
 * backend/services/media_service.js
 *
 * Media / Assets services for College Fest Website
 * Fully matches media_model.js and media_validator.js
 * Extended features: bulk upload, search, CSV export, stats, real-time sockets
 * Advanced filtering for dashboard: multi-model, public/private, type, date-range
 * Added: top / most used media analytics, recent uploads per model
 */

const mongoose = require('mongoose');
const Media = require('../models/media_model');
const { createMediaValidator, updateMediaValidator } = require('../validators/media_validator');
const { Parser } = require('json2csv');

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
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new ApiError(`Invalid ${name}`, 400);
  }
}

async function populateLinked(mediaDoc) {
  if (!mediaDoc) return null;
  const modelMap = {
    event: 'Event',
    sponsor: 'Sponsor',
    announcement: 'Announcement',
    club: 'Club',
  };
  const linkedModelName = modelMap[mediaDoc.linkedModel];
  if (!linkedModelName) return mediaDoc;

  await mediaDoc.populate({ path: 'linkedId', model: linkedModelName }).execPopulate();
  return mediaDoc;
}

// ----------------------
// Real-time socket (optional)
// ----------------------
let io = null;
function initSocket(socketInstance) {
  io = socketInstance;
}

// ----------------------
// Core Services
// ----------------------
async function createMedia(payload) {
  const { error, value } = createMediaValidator.validate(payload);
  if (error) throw new ApiError(error.details[0].message, 422);

  const linkedId = mongoose.Types.ObjectId(value.linkedId);
  const modelMap = {
    event: require('../models/event_model'),
    sponsor: require('../models/sponsor_model'),
    announcement: require('../models/announcement_model'),
    club: require('../models/club_model'),
  };
  const LinkedModel = modelMap[value.linkedModel];
  if (!LinkedModel) throw new ApiError('Invalid linked model', 400);

  const linkedDoc = await LinkedModel.findById(linkedId);
  if (!linkedDoc) throw new ApiError(`${value.linkedModel} not found`, 404);

  const media = await Media.create({
    type: value.type,
    url: value.url,
    linkedModel: value.linkedModel,
    linkedId,
    description: value.description?.trim() || '',
    isPublic: value.isPublic !== undefined ? !!value.isPublic : true,
  });

  const populated = await populateLinked(media);
  if (io) io.emit('mediaCreated', populated);

  return populated;
}

async function updateMedia(mediaId, updateData) {
  validateObjectId(mediaId, 'mediaId');

  const { error, value } = updateMediaValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const media = await Media.findById(mediaId);
  if (!media) throw new ApiError('Media not found', 404);

  if (value.type) media.type = value.type;
  if (value.url) media.url = value.url;
  if (value.linkedModel) media.linkedModel = value.linkedModel;
  if (value.linkedId) {
    validateObjectId(value.linkedId, 'linkedId');
    media.linkedId = mongoose.Types.ObjectId(value.linkedId);
  }
  if (value.description !== undefined) media.description = value.description.trim();
  if (value.isPublic !== undefined) media.isPublic = !!value.isPublic;

  await media.save();
  const populated = await populateLinked(media);
  if (io) io.emit('mediaUpdated', populated);

  return populated;
}

async function deleteMedia(mediaId) {
  validateObjectId(mediaId, 'mediaId');
  const removed = await Media.findByIdAndDelete(mediaId);
  if (!removed) throw new ApiError('Media not found', 404);
  if (io) io.emit('mediaDeleted', { id: mediaId });
  return { message: 'Media deleted', mediaId };
}

async function getMediaById(mediaId) {
  validateObjectId(mediaId, 'mediaId');
  const media = await Media.findById(mediaId);
  if (!media) throw new ApiError('Media not found', 404);
  return populateLinked(media);
}

// ----------------------
// List & Advanced Filtering
// ----------------------
async function listMedia(options = {}) {
  const {
    linkedModel,
    linkedId,
    type,
    isPublic,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortDir = 'desc',
    fromDate,
    toDate,
    linkedModels = [],
  } = options;

  const filter = {};
  if (linkedModel) filter.linkedModel = linkedModel;
  if (linkedId) filter.linkedId = mongoose.Types.ObjectId(linkedId);
  if (type) filter.type = type;
  if (typeof isPublic === 'boolean') filter.isPublic = isPublic;
  if (fromDate || toDate) filter.createdAt = {};
  if (fromDate) filter.createdAt.$gte = new Date(fromDate);
  if (toDate) filter.createdAt.$lte = new Date(toDate);
  if (linkedModels.length > 0) filter.linkedModel = { $in: linkedModels };

  const sortObj = {};
  sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const mediaList = await Media.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort(sortObj);

  const total = await Media.countDocuments(filter);
  const populatedList = await Promise.all(mediaList.map(populateLinked));

  return { media: populatedList, total, page: Number(page), limit: Number(limit) };
}

// ----------------------
// Additional Features
// ----------------------
async function bulkCreateMedia(list = []) {
  if (!Array.isArray(list) || list.length === 0) throw new ApiError('List must be a non-empty array', 400);
  const created = await Media.insertMany(list.map(item => ({
    type: item.type,
    url: item.url,
    linkedModel: item.linkedModel,
    linkedId: mongoose.Types.ObjectId(item.linkedId),
    description: item.description?.trim() || '',
    isPublic: item.isPublic !== undefined ? !!item.isPublic : true,
  })));
  return Promise.all(created.map(populateLinked));
}

async function searchMedia(keyword, options = {}) {
  if (!keyword || typeof keyword !== 'string') throw new ApiError('Keyword required', 400);
  const { page = 1, limit = 10 } = options;
  const filter = { description: { $regex: keyword, $options: 'i' } };
  const mediaList = await Media.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await Media.countDocuments(filter);
  const populatedList = await Promise.all(mediaList.map(populateLinked));
  return { media: populatedList, total, page, limit };
}

async function exportMediaCSV(filter = {}) {
  const mediaList = await Media.find(filter).lean();
  const fields = ['_id', 'type', 'url', 'linkedModel', 'linkedId', 'description', 'isPublic', 'createdAt'];
  const parser = new Parser({ fields });
  return parser.parse(mediaList);
}

async function getMediaStats(filter = {}) {
  const match = {};
  if (filter.linkedModels) match.linkedModel = { $in: filter.linkedModels };
  if (filter.isPublic !== undefined) match.isPublic = filter.isPublic;
  if (filter.fromDate || filter.toDate) match.createdAt = {};
  if (filter.fromDate) match.createdAt.$gte = new Date(filter.fromDate);
  if (filter.toDate) match.createdAt.$lte = new Date(filter.toDate);

  const stats = await Media.aggregate([
    { $match: match },
    { $group: { _id: '$linkedModel', total: { $sum: 1 } } }
  ]);
  return stats;
}

// ----------------------
// Top / Most Used Media
// ----------------------
async function getTopMedia(limit = 5, filter = {}) {
  const match = {};
  if (filter.linkedModels) match.linkedModel = { $in: filter.linkedModels };
  if (filter.isPublic !== undefined) match.isPublic = filter.isPublic;
  if (filter.fromDate || filter.toDate) match.createdAt = {};
  if (filter.fromDate) match.createdAt.$gte = new Date(filter.fromDate);
  if (filter.toDate) match.createdAt.$lte = new Date(filter.toDate);

  const top = await Media.aggregate([
    { $match: match },
    { $group: { _id: { linkedModel: '$linkedModel', type: '$type' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
  return top.map(item => ({
    linkedModel: item._id.linkedModel,
    type: item._id.type,
    count: item.count
  }));
}

// ----------------------
// Recent uploads per model
// ----------------------
async function getRecentMediaPerModel(limit = 5, filter = {}) {
  const models = ['event', 'sponsor', 'announcement', 'club'];
  const result = {};
  for (const model of models) {
    const query = { linkedModel: model };
    if (filter.isPublic !== undefined) query.isPublic = filter.isPublic;
    if (filter.fromDate || filter.toDate) query.createdAt = {};
    if (filter.fromDate) query.createdAt.$gte = new Date(filter.fromDate);
    if (filter.toDate) query.createdAt.$lte = new Date(filter.toDate);

    const mediaList = await Media.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    result[model] = await Promise.all(mediaList.map(populateLinked));
  }
  return result;
}

// ----------------------
// Dashboard Helper
// ----------------------
async function getMediaDashboard(options = {}) {
  const {
    topLimit = 5,
    recentLimit = 5,
    linkedModels,
    isPublic,
    fromDate,
    toDate,
  } = options;

  const filter = { linkedModels, isPublic, fromDate, toDate };

  const [topMedia, recentMedia, stats] = await Promise.all([
    getTopMedia(topLimit, filter),
    getRecentMediaPerModel(recentLimit, filter),
    getMediaStats(filter),
  ]);

  return {
    topMedia,
    recentMedia,
    stats,
  };
}

// ----------------------
// Exports
// ----------------------
module.exports = {
  ApiError,
  initSocket,
  createMedia,
  updateMedia,
  deleteMedia,
  getMediaById,
  listMedia,
  bulkCreateMedia,
  searchMedia,
  exportMediaCSV,
  getMediaStats,
  getTopMedia,
  getRecentMediaPerModel,
  getMediaDashboard, // consolidated dashboard helper with filters
};
