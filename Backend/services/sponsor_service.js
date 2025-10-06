/**
 * backend/services/sponsor_service.js
 *
 * Full-featured Sponsor Service for College Fest Website
 * - CRUD with validations
 * - Event associations via contributions
 * - Caching for performance
 * - Socket notifications
 * - CSV export
 * - Bulk operations
 * - Analytics & dashboard helpers
 * - Auto-update dashboard stats
 */

const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const Sponsor = require('../models/sponsor_model');
const Event = require('../models/event_model');
const { createSponsorValidator, updateSponsorValidator } = require('../validators/sponsor_validator');

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ----------------------
// Socket for real-time notifications
// ----------------------
let io;
function initSocket(socketIoInstance) {
  io = socketIoInstance;
}

// ----------------------
// Caching
// ----------------------
const sponsorCache = {};
function updateCache(sponsor) {
  if (sponsor && sponsor._id) sponsorCache[sponsor._id.toString()] = sponsor;
}
function invalidateCache(sponsorId) {
  if (sponsorId) delete sponsorCache[sponsorId.toString()];
}

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(`Invalid ${name}`, 400);
}

async function ensureEventsExist(eventIds = []) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return [];
  const uniqueIds = [...new Set(eventIds.map(id => id.toString()))];

  uniqueIds.forEach(id => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(`Invalid eventId: ${id}`, 400);
  });

  const found = await Event.find({ _id: { $in: uniqueIds } }).select('_id title interCollege startDate endDate');
  if (found.length !== uniqueIds.length) {
    const foundIds = found.map(f => f._id.toString());
    const missing = uniqueIds.filter(id => !foundIds.includes(id));
    throw new ApiError(`One or more eventIds not found: ${missing.join(', ')}`, 404);
  }
  return uniqueIds.map(id => mongoose.Types.ObjectId(id));
}

function buildSort(sortBy = 'createdAt', sortDir = 'desc') {
  const s = {};
  s[sortBy] = sortDir === 'asc' ? 1 : -1;
  return s;
}

// ----------------------
// CRUD Operations
// ----------------------
async function createSponsor(sponsorData) {
  const { error, value } = createSponsorValidator.validate(sponsorData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const contributions = [];
  if (value.contributions && value.contributions.length) {
    for (let c of value.contributions) {
      const validEventIds = await ensureEventsExist([c.eventId]);
      contributions.push({ eventId: validEventIds[0], amount: c.amount || 0 });
    }
  }

  const sponsor = await Sponsor.create({
    name: value.name.trim(),
    type: value.type,
    logo: value.logo || null,
    contributions,
    isPublic: value.isPublic !== undefined ? !!value.isPublic : true,
  });

  updateCache(sponsor);

  if (io) io.emit('sponsorCreated', { sponsorId: sponsor._id });
  return sponsor;
}

async function updateSponsor(sponsorId, updateData) {
  validateObjectId(sponsorId, 'sponsorId');
  const { error, value } = updateSponsorValidator.validate(updateData);
  if (error) throw new ApiError(error.details[0].message, 422);

  const sponsor = await Sponsor.findById(sponsorId);
  if (!sponsor) throw new ApiError('Sponsor not found', 404);

  if (value.name) sponsor.name = value.name.trim();
  if (value.type) sponsor.type = value.type;
  if (value.logo !== undefined) sponsor.logo = value.logo || null;
  if (value.isPublic !== undefined) sponsor.isPublic = !!value.isPublic;

  if (value.contributions) {
    const updatedContributions = [];
    for (let c of value.contributions) {
      const validEventIds = await ensureEventsExist([c.eventId]);
      updatedContributions.push({ eventId: validEventIds[0], amount: c.amount || 0 });
    }
    sponsor.contributions = updatedContributions;
  }

  await sponsor.save();
  updateCache(sponsor);

  if (io) io.emit('sponsorUpdated', { sponsorId: sponsor._id });
  return sponsor;
}

async function deleteSponsor(sponsorId) {
  validateObjectId(sponsorId, 'sponsorId');
  const sponsor = await Sponsor.findByIdAndDelete(sponsorId);
  if (!sponsor) throw new ApiError('Sponsor not found', 404);

  invalidateCache(sponsorId);
  if (io) io.emit('sponsorDeleted', { sponsorId });
  return { message: 'Sponsor deleted', sponsorId };
}

async function getSponsorById(sponsorId) {
  validateObjectId(sponsorId, 'sponsorId');
  if (sponsorCache[sponsorId]) return sponsorCache[sponsorId];

  const sponsor = await Sponsor.findById(sponsorId).populate('contributions.eventId');
  if (!sponsor) throw new ApiError('Sponsor not found', 404);

  updateCache(sponsor);
  return sponsor;
}

// ----------------------
// Listing / Filters
// ----------------------
async function listSponsors(options = {}) {
  const { page = 1, limit = 10, type, isPublic, eventId, search, sortBy = 'createdAt', sortDir = 'desc' } = options;

  const filter = {};
  if (type) filter.type = type;
  if (typeof isPublic === 'boolean') filter.isPublic = isPublic;
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (eventId) {
    validateObjectId(eventId, 'eventId');
    filter['contributions.eventId'] = mongoose.Types.ObjectId(eventId);
  }

  const sponsors = await Sponsor.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(buildSort(sortBy, sortDir))
    .populate('contributions.eventId');

  sponsors.forEach(updateCache);
  const total = await Sponsor.countDocuments(filter);
  return { sponsors, total, page: Number(page), limit: Number(limit) };
}

// ----------------------
// Contributions (Event associations)
// ----------------------
async function addContribution(sponsorId, contribution) {
  validateObjectId(sponsorId, 'sponsorId');
  const sponsor = await Sponsor.findById(sponsorId);
  if (!sponsor) throw new ApiError('Sponsor not found', 404);

  const [eventId] = await ensureEventsExist([contribution.eventId]);
  const exists = sponsor.contributions.some(c => c.eventId.toString() === eventId.toString());
  if (!exists) sponsor.contributions.push({ eventId, amount: contribution.amount || 0 });

  await sponsor.save();
  updateCache(sponsor);
  if (io) io.emit('sponsorContributionAdded', { sponsorId: sponsor._id, contribution });
  return sponsor;
}

async function removeContribution(sponsorId, eventId) {
  validateObjectId(sponsorId, 'sponsorId');
  validateObjectId(eventId, 'eventId');

  const sponsor = await Sponsor.findById(sponsorId);
  if (!sponsor) throw new ApiError('Sponsor not found', 404);

  sponsor.contributions = sponsor.contributions.filter(c => c.eventId.toString() !== eventId.toString());
  await sponsor.save();
  updateCache(sponsor);

  if (io) io.emit('sponsorContributionRemoved', { sponsorId: sponsor._id, eventId });
  return sponsor;
}

// ----------------------
// Bulk operations
// ----------------------
async function bulkAddContributions(sponsorIds = [], contributions = []) {
  if (!Array.isArray(sponsorIds) || sponsorIds.length === 0) throw new ApiError('sponsorIds array required', 400);
  if (!Array.isArray(contributions) || contributions.length === 0) throw new ApiError('contributions array required', 400);

  const promises = sponsorIds.map(sId =>
    contributions.reduce(async (prev, c) => {
      await prev;
      return addContribution(sId, c);
    }, Promise.resolve())
  );

  return Promise.all(promises);
}

// ----------------------
// Analytics / Totals
// ----------------------
async function calculateTotalSponsorshipForEvent(eventId) {
  validateObjectId(eventId, 'eventId');
  const pipeline = [
    { $unwind: '$contributions' },
    { $match: { 'contributions.eventId': mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$contributions.amount' },
        sponsorCount: { $sum: 1 },
      },
    },
  ];

  const res = await Sponsor.aggregate(pipeline);
  return res[0] || { totalAmount: 0, sponsorCount: 0 };
}

async function getSponsorStatistics({ top = 5 } = {}) {
  const totals = await Sponsor.aggregate([{ $group: { _id: null, totalSponsors: { $sum: 1 }, totalSponsoredAmount: { $sum: { $sum: '$contributions.amount' } } } }]);
  const byType = await Sponsor.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: { $sum: '$contributions.amount' } } } }]);
  const topSponsors = await Sponsor.find({}).sort({ 'contributions.amount': -1 }).limit(top).populate('contributions.eventId');

  return {
    totalSponsors: totals[0] ? totals[0].totalSponsors : 0,
    totalSponsoredAmount: totals[0] ? totals[0].totalSponsoredAmount : 0,
    sponsorsByType: byType.map(bt => ({ type: bt._id, count: bt.count, totalAmount: bt.totalAmount })),
    topSponsors,
  };
}

async function getRecentlyAddedSponsors(limit = 5) {
  return await Sponsor.find().sort({ createdAt: -1 }).limit(limit).populate('contributions.eventId');
}

async function getTopSponsorsByEvent(eventId, limit = 5) {
  validateObjectId(eventId, 'eventId');
  return await Sponsor.find({ 'contributions.eventId': eventId }).sort({ 'contributions.amount': -1 }).limit(limit).populate('contributions.eventId');
}

// ----------------------
// CSV Export
// ----------------------
async function exportSponsorsCSV(filter = {}) {
  const sponsors = await Sponsor.find(filter).populate('contributions.eventId');
  const data = sponsors.map(s => ({
    name: s.name,
    type: s.type,
    isPublic: s.isPublic,
    contributions: s.contributions.map(c => `${c.eventId.title || c.eventId} ($${c.amount})`).join('; '),
  }));
  const parser = new Parser();
  return parser.parse(data);
}

// ----------------------
// Search / Toggle visibility
// ----------------------
async function searchSponsorsByName(name, options = {}) {
  if (!name || typeof name !== 'string') throw new ApiError('Search term required', 400);
  const { page = 1, limit = 10 } = options;
  const filter = { name: { $regex: name, $options: 'i' } };
  const sponsors = await Sponsor.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('contributions.eventId');
  const total = await Sponsor.countDocuments(filter);
  return { sponsors, total, page, limit };
}

async function toggleSponsorPublicStatus(sponsorId, isPublic = true) {
  validateObjectId(sponsorId, 'sponsorId');
  const sponsor = await Sponsor.findById(sponsorId);
  if (!sponsor) throw new ApiError('Sponsor not found', 404);

  sponsor.isPublic = !!isPublic;
  await sponsor.save();
  updateCache(sponsor);

  if (io) io.emit('sponsorVisibilityChanged', { sponsorId, isPublic });
  return sponsor;
}

// ----------------------
// Auto-update dashboard stats
// ----------------------
let sponsorDashboardStats = {};
async function autoUpdateSponsorStats() {
  const stats = await getSponsorStatistics({ top: 5 });
  sponsorDashboardStats = stats;
  if (io) io.emit('sponsorStatsUpdated', stats);
}
function getCachedSponsorStats() {
  return sponsorDashboardStats;
}

// ----------------------
// Exports
// ----------------------
module.exports = {
  ApiError,
  initSocket,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getSponsorById,
  listSponsors,
  addContribution,
  removeContribution,
  bulkAddContributions,
  calculateTotalSponsorshipForEvent,
  getSponsorStatistics,
  getRecentlyAddedSponsors,
  getTopSponsorsByEvent,
  exportSponsorsCSV,
  searchSponsorsByName,
  toggleSponsorPublicStatus,
  autoUpdateSponsorStats,
  getCachedSponsorStats,
};
