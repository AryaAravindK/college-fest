/**
 * backend/controllers/dashboard_controller.js
 *
 * Role-based Dashboard Controller for College Fest Management System
 *
 * Features:
 *  - getDashboard (single entry point)
 *  - getStudentDashboard
 *  - getOrganizerDashboard
 *  - getFacultyDashboard
 *  - getAdminDashboard
 *
 * Implementation notes:
 *  - Uses utils for business logic where available (preferred).
 *  - Uses models/statics for counts/aggregations when needed for performance.
 *  - Validates/normalizes query params, supports pagination & date filters.
 *  - Returns curated stats + lists for UI (summary + paginated lists).
 *  - Exposes validator middleware groups (so routes can import validators).
 *
 * Usage:
 *  - Protect route with authentication middleware (req.user required).
 *  - Example route: router.get('/dashboard', authenticate, dashboardController.getDashboard);
 */

const mongoose = require('mongoose');

// Models (for counts/aggregates or when utils don't provide)
const User = require('../models/user_model');
const Event = require('../models/event_model');
const Team = require('../models/team_model');
const Registration = require('../models/registration_model');
const Payment = require('../models/payment_model');
const Result = require('../models/result_model');
const Certificate = require('../models/certificate_model');
const Notification = require('../models/notification_model');
const Feedback = require('../models/feedback_model');
const Announcement = require('../models/announcement_model');

// Utils (full list you provided)
const userUtil = require('../utils/user_util');
const eventUtil = require('../utils/event_util');
const teamUtil = require('../utils/team_util');
const registrationUtil = require('../utils/registration_util');
const paymentUtil = require('../utils/payment_util');
const notificationUtil = require('../utils/notification_util');
const feedbackUtil = require('../utils/feedback_util');
const resultUtil = require('../utils/result_util');
const certificateUtil = require('../utils/certificate_util');
const announcementUtil = require('../utils/announcement_util');
const authUtil = require('../utils/auth_util');

// Validators (so consumers of this controller can re-use)
const dashboardValidators = require('../validators/dashboard_validator') || {}; // optional

/* -------------------------
   Helpers & constants
------------------------- */

const DEFAULT_LIMIT = 10;
const DEFAULT_ADMIN_LIMIT = 20;

// Safe convert to string id
const toIdStr = (v) => (v && v.toString ? v.toString() : v);

// Ensure limit is reasonable and numeric
function parseLimit(q, fallback = DEFAULT_LIMIT) {
  const n = parseInt(q, 10);
  if (!isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 100); // upper bound
}

// Accept startDate/endDate (ISO) for filtering; returns { start, end } or nulls
function parseDateRange(q) {
  let start = null;
  let end = null;
  if (q.startDate) {
    const s = new Date(q.startDate);
    if (!isNaN(s)) start = s;
  }
  if (q.endDate) {
    const e = new Date(q.endDate);
    if (!isNaN(e)) end = e;
  }
  return { start, end };
}

// Simple safe object pick
const pick = (obj, keys = []) => {
  const out = {};
  keys.forEach(k => { if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]; });
  return out;
};

// Flatten array-of-arrays
const flatten = arr => ([]).concat(...(arr || []));

/* -------------------------
   Common query helpers
------------------------- */

/**
 * Build userContext object for announcement filtering
 * uses department/year/club fields from user
 */
function buildUserContext(user) {
  return {
    department: user && user.department ? user.department : null,
    year: user && user.year ? user.year : null,
    club: user && user.club ? user.club : null
  };
}

/**
 * Extract event ids safely from mixed arrays (registrations, teams, events)
 */
function extractEventIds(mixed = []) {
  const ids = new Set();
  (mixed || []).forEach(item => {
    if (!item) return;
    // if it's an event doc
    if (item._id && item.startDate) ids.add(toIdStr(item._id));
    else if (item.event) {
      // registration or team
      const ev = item.event;
      ids.add(toIdStr(ev && ev._id ? ev._id : ev));
    } else if (mongoose.Types.ObjectId.isValid(item)) ids.add(toIdStr(item));
  });
  return Array.from(ids);
}

/* -------------------------
   Student Dashboard
------------------------- */
exports.getStudentDashboard = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const userId = toIdStr(user._id);
    const limit = parseLimit(req.query.limit, DEFAULT_LIMIT);
    const { start, end } = parseDateRange(req.query);
    const refreshToken = req.query.refreshToken === '1' || req.query.refreshToken === true;

    // 1) Registrations for student (util returns either paginated or array)
    const registrationsRaw = await registrationUtil.listRegistrationsForStudent(userId, { paginate: false });
    // optionally filter by date range on registration.createdAt or event.startDate
    const registrations = (registrationsRaw || []).filter(r => {
      if (!start && !end) return true;
      const dateToCheck = r.createdAt ? new Date(r.createdAt) : (r.event && r.event.startDate ? new Date(r.event.startDate) : null);
      if (!dateToCheck) return true;
      if (start && dateToCheck < start) return false;
      if (end && dateToCheck > end) return false;
      return true;
    });

    // 2) Teams the student belongs to (use Team model)
    const teams = await Team.find({ members: userId })
      .populate('event leader', 'title startDate endDate status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // 3) Results (use result util)
    const results = await resultUtil.fetchResultsByRole('student', userId);

    // 4) Certificates
    const certificates = await certificateUtil.getCertificatesByStudent(userId, { paginate: false });

    // 5) Payments
    const payments = await paymentUtil.getPaymentsByStudent(userId);

    // 6) Notifications (from events in regs & teams)
    const eventIds = Array.from(new Set([
      ...extractEventIds(registrations),
      ...extractEventIds(teams)
    ]));

    const notifications = await notificationUtil.getNotificationsForUser({ role: 'student', userId, eventIds });

    // 7) Announcements (respect user context)
    const announcements = await announcementUtil.fetchAnnouncements('student', eventIds, buildUserContext(user));

    // 8) Basic computed stats
    const now = new Date();
    const totalRegistrations = registrations.length;
    const confirmedRegistrations = registrations.filter(r => r.status === 'confirmed').length;
    const upcomingRegistered = registrations.filter(r => {
      const ev = r.event;
      const startDate = ev && ev.startDate ? new Date(ev.startDate) : null;
      return startDate && startDate >= now;
    }).length;

    const totalCertificates = certificates.length;
    const totalPayments = payments.length;
    const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 9) Optionally refresh JWT token for the client
    const auth = refreshToken ? { token: authUtil.generateToken(user), expiresIn: process.env.JWT_EXPIRES_IN || '7d' } : undefined;

    // 10) Response to client
    return res.status(200).json({
      success: true,
      data: {
        profile: pick(user, ['_id', 'name', 'email', 'role', 'department', 'year', 'club', 'phone']),
        auth,
        stats: {
          totalRegistrations,
          confirmedRegistrations,
          upcomingRegistered,
          totalTeams: teams.length,
          totalResults: (results || []).length,
          totalCertificates,
          totalPayments,
          paidAmount
        },
        lists: {
          registrations: registrations.slice(0, limit),
          teams,
          results: (results || []).slice(0, limit),
          certificates: (certificates || []).slice(0, limit),
          payments: (payments || []).slice(0, limit),
          notifications: (notifications || []).slice(0, 50),
          announcements: (announcements || []).slice(0, 10)
        }
      }
    });
  } catch (err) {
    console.error('getStudentDashboard error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/* -------------------------
   Organizer Dashboard
------------------------- */
exports.getOrganizerDashboard = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const userId = toIdStr(user._id);
    const limit = parseLimit(req.query.limit, DEFAULT_LIMIT);
    const { start, end } = parseDateRange(req.query);

    // 1) Events this organizer manages (organizer or coordinator)
    const events = await Event.find({
      $or: [{ organizer: userId }, { coordinators: userId }],
      deleted: { $ne: true }
    })
      .populate('organizer coordinators', 'name email')
      .sort({ startDate: 1 })
      .lean();

    // Optionally filter events by date range
    const eventsFiltered = (events || []).filter(ev => {
      if (!start && !end) return true;
      const evStart = ev.startDate ? new Date(ev.startDate) : null;
      if (start && evStart && evStart < start) return false;
      if (end && evStart && evStart > end) return false;
      return true;
    });

    const eventIds = eventsFiltered.map(e => toIdStr(e._id));

    // 2) Registrations for those events (use util per-event to respect business rules)
    const regsPromises = eventIds.map(evId => registrationUtil.listRegistrationsForEvent(evId, { paginate: false }));
    const regsPerEvent = await Promise.all(regsPromises);
    const registrations = flatten(regsPerEvent);

    // 3) Teams for those events
    const teams = await Team.find({ event: { $in: eventIds } })
      .populate('leader members', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // 4) Results via util
    const results = await resultUtil.fetchResultsByRole('organizer', userId, eventIds);

    // 5) Payments for those events (use util)
    const paymentPromises = eventIds.map(evId => paymentUtil.getPaymentsByEvent(evId));
    const paymentsList = await Promise.all(paymentPromises);
    const payments = flatten(paymentsList);

    // 6) Revenue aggregation (efficient via Payment aggregation)
    // convert eventIds to ObjectId
    const eventObjectIds = eventIds.map(id => mongoose.Types.ObjectId(id));
    const revenueAgg = await Payment.aggregate([
      { $match: { event: { $in: eventObjectIds }, status: 'success' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const revenue = (revenueAgg[0] && revenueAgg[0].totalAmount) || 0;
    const revenueCount = (revenueAgg[0] && revenueAgg[0].count) || 0;

    // 7) Feedbacks for those events via util
    const feedbacks = await feedbackUtil.getFeedbackByRole('organizer', userId, eventIds);

    // 8) Certificates for those events via util
    const certPromises = eventIds.map(evId => certificateUtil.getCertificatesByEvent(evId, { paginate: false }));
    const certsPerEvent = await Promise.all(certPromises);
    const certificates = flatten(certsPerEvent);

    // 9) Notifications & announcements relevant to organizer
    const notifications = await notificationUtil.getNotificationsForUser({ role: 'organizer', userId, eventIds });
    const announcements = await announcementUtil.fetchAnnouncements('organizer', eventIds, buildUserContext(user));

    // 10) Stats summary
    const stats = {
      totalEvents: eventsFiltered.length,
      totalRegistrations: registrations.length,
      totalTeams: teams.length,
      totalResults: (results || []).length,
      totalPayments: payments.length,
      revenue,
      revenueCount,
      totalFeedbacks: (feedbacks || []).length,
      totalCertificates: certificates.length
    };

    return res.status(200).json({
      success: true,
      data: {
        profile: pick(user, ['_id', 'name', 'email', 'club', 'role']),
        stats,
        lists: {
          events: eventsFiltered.slice(0, limit),
          registrations: registrations.slice(0, limit),
          teams,
          results: (results || []).slice(0, limit),
          payments: payments.slice(0, limit),
          certificates: certificates.slice(0, limit),
          feedbacks: (feedbacks || []).slice(0, limit),
          notifications: (notifications || []).slice(0, 50),
          announcements: (announcements || []).slice(0, 10)
        }
      }
    });
  } catch (err) {
    console.error('getOrganizerDashboard error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/* -------------------------
   Faculty Dashboard
------------------------- */
exports.getFacultyDashboard = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const userId = toIdStr(user._id);
    const limit = parseLimit(req.query.limit, DEFAULT_LIMIT);

    // 1) Events where faculty is coordinator or judge
    const events = await Event.find({
      $or: [{ coordinators: userId }, { judges: userId }],
      deleted: { $ne: true }
    })
      .sort({ startDate: 1 })
      .lean();

    const eventIds = events.map(e => toIdStr(e._id));

    // 2) Results for those events via util, filter pending
    const allResults = await resultUtil.fetchResultsByRole('faculty', userId, eventIds);
    const pendingResults = (allResults || []).filter(r => r.status === 'pending').slice(0, limit);

    // 3) Feedback for those events via util
    const feedbacks = await feedbackUtil.getFeedbackByRole('faculty', userId, eventIds);

    // 4) Certificates requiring faculty attention (issued but not approved)
    const certPromises = eventIds.map(evId => certificateUtil.getCertificatesByEvent(evId, { status: 'issued', paginate: false }));
    const certsPendingPerEvent = await Promise.all(certPromises);
    const certificatesPending = flatten(certsPendingPerEvent);

    // 5) Notifications & announcements
    const notifications = await notificationUtil.getNotificationsForUser({ role: 'faculty', userId, eventIds });
    const announcements = await announcementUtil.fetchAnnouncements('faculty', eventIds, buildUserContext(user));

    // 6) Stats
    const stats = {
      totalAssignedEvents: events.length,
      pendingResults: pendingResults.length,
      certificatesPending: certificatesPending.length,
      feedbackCount: (feedbacks || []).length
    };

    return res.status(200).json({
      success: true,
      data: {
        profile: pick(user, ['_id', 'name', 'email', 'designation', 'role']),
        stats,
        lists: {
          events: events.slice(0, limit),
          pendingResults,
          feedbacks: (feedbacks || []).slice(0, limit),
          certificatesPending: certificatesPending.slice(0, limit),
          notifications: (notifications || []).slice(0, 50),
          announcements: (announcements || []).slice(0, 10)
        }
      }
    });
  } catch (err) {
    console.error('getFacultyDashboard error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/* -------------------------
   Admin Dashboard
------------------------- */
exports.getAdminDashboard = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const limit = parseLimit(req.query.limit, DEFAULT_ADMIN_LIMIT);

    // Basic counts (use model counts for performance)
    const [
      usersCount,
      eventsCount,
      teamsCount,
      registrationsCount,
      paymentsCount,
      resultsCount,
      certificatesCount,
      feedbackCount,
      announcementsCount
    ] = await Promise.all([
      User.countDocuments({}),
      Event.countDocuments({}),
      Team.countDocuments({}),
      Registration.countDocuments({}),
      Payment.countDocuments({}),
      Result.countDocuments({}),
      Certificate.countDocuments({}),
      Feedback.countDocuments({}),
      Announcement.countDocuments({})
    ]);

    // Recent items (for admin quick view)
    const [recentEvents, recentRegistrations, recentPayments, recentResults, recentAnnouncements] = await Promise.all([
      Event.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
      Registration.find({}).populate('student event').sort({ createdAt: -1 }).limit(limit).lean(),
      Payment.find({}).populate('student event').sort({ createdAt: -1 }).limit(limit).lean(),
      Result.find({}).populate('student event').sort({ createdAt: -1 }).limit(limit).lean(),
      Announcement.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    ]);

    // Revenue aggregate
    const revenueAgg = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalRevenue = (revenueAgg[0] && revenueAgg[0].totalAmount) || 0;

    // Top events by registrations (aggregation)
    const topEventsAgg = await Registration.aggregate([
      { $group: { _id: '$event', regs: { $sum: 1 } } },
      { $sort: { regs: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
      { $project: { regs: 1, 'event.title': 1, 'event.startDate': 1, 'event._id': 1 } }
    ]);
    const topEvents = topEventsAgg.map(x => ({ event: x.event, registrations: x.regs }));

    // Admin notifications
    const notifications = await notificationUtil.getNotificationsForUser({ role: 'admin', userId: toIdStr(user._id), eventIds: [] });

    const stats = {
      usersCount,
      eventsCount,
      teamsCount,
      registrationsCount,
      paymentsCount,
      resultsCount,
      certificatesCount,
      feedbackCount,
      announcementsCount,
      totalRevenue
    };

    return res.status(200).json({
      success: true,
      data: {
        profile: pick(user, ['_id', 'name', 'email', 'role']),
        stats,
        lists: {
          recentEvents,
          recentRegistrations,
          recentPayments,
          recentResults,
          recentAnnouncements,
          topEvents,
          notifications: (notifications || []).slice(0, 50)
        }
      }
    });
  } catch (err) {
    console.error('getAdminDashboard error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/* -------------------------
   Generic dispatcher
   - Route-level convenience: single /dashboard route
------------------------- */
exports.getDashboard = async (req, res) => {
  if (!req.user || !req.user.role) return res.status(401).json({ success: false, message: 'User not authenticated' });

  switch (req.user.role) {
    case 'student':
      return exports.getStudentDashboard(req, res);
    case 'organizer':
      return exports.getOrganizerDashboard(req, res);
    case 'faculty':
      return exports.getFacultyDashboard(req, res);
    case 'admin':
      return exports.getAdminDashboard(req, res);
    default:
      return res.status(403).json({ success: false, message: 'Role not supported for dashboard' });
  }
};

/* -------------------------
   Export validators groups for routes to use
   - these are references to the dashboard_validator you created earlier
------------------------- */
exports.validators = {
  student: dashboardValidators.studentDashboardValidators || {},
  organizer: dashboardValidators.organizerDashboardValidators || {},
  faculty: dashboardValidators.facultyDashboardValidators || {},
  admin: dashboardValidators.adminDashboardValidators || {}
};
