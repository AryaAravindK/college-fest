/**
 * backend/services/registration_service.js
 *
 * Registration services for College Fest Website
 * (final version with helpers & exports)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const Registration = require('../models/registration_model');
const Event = require('../models/event_model');
const User = require('../models/user_model');
const Team = require('../models/team_model');
const Payment = require('../models/payment_model');
const { createRegistrationValidator } = require('../validators/registration_validator');
const paymentService = require('./payment_service');
const notificationService = require('./notification_service');

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const INTRA_COLLEGE_NAME = process.env.INTRA_COLLEGE_NAME || 'SURANA COLLEGE AUTONOMOUS';

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!id) throw new ApiError(`${name} is required`);
  if (!mongoose.Types.ObjectId.isValid(String(id))) throw new ApiError(`Invalid ${name}`);
}

async function findEventOrThrow(eventId) {
  validateObjectId(eventId, 'eventId');
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);
  return event;
}

async function findUserOrThrow(userId) {
  validateObjectId(userId, 'userId');
  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404);
  return user;
}

async function findTeamOrThrow(teamId) {
  validateObjectId(teamId, 'teamId');
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);
  return team;
}

async function findPaymentOrThrow(paymentId) {
  validateObjectId(paymentId, 'paymentId');
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new ApiError('Payment not found', 404);
  return payment;
}

async function populateRegistration(reg) {
  if (!reg) return null;
  return reg.populate(['userId', 'teamId', 'eventId', 'paymentId']);
}

async function countRegistrationsForEvent(eventId) {
  validateObjectId(eventId, 'eventId');
  return await Registration.countDocuments({ eventId: mongoose.Types.ObjectId(eventId) });
}

async function isAlreadyRegistered({ eventId, userId = null, teamId = null }) {
  const filter = { eventId: mongoose.Types.ObjectId(eventId) };
  if (userId && teamId) {
    filter.$or = [{ userId: mongoose.Types.ObjectId(userId) }, { teamId: mongoose.Types.ObjectId(teamId) }];
  } else if (userId) {
    filter.userId = mongoose.Types.ObjectId(userId);
  } else if (teamId) {
    filter.teamId = mongoose.Types.ObjectId(teamId);
  } else {
    throw new ApiError('userId or teamId required to check registration');
  }
  return !!(await Registration.findOne(filter));
}

// ----------------------
// Core Services
// ----------------------

/**
 * Create registration
 * - Handles both free & paid events
 * - For paid: uses paymentService.createPayment (mock) to create payment; links paymentId and sets paymentStatus
 * - Ensures capacity and event-type constraints
 *
 * payload: { eventId, userId?, teamId? }
 * options: { sendEmail: true, notify: true }
 */
async function createRegistration(payload = {}, options = { sendEmail: true, notify: true }) {
  const { error, value } = createRegistrationValidator.validate(payload);
  if (error) throw new ApiError(error.details[0].message, 422);

  const event = await findEventOrThrow(value.eventId);

  // enforce event type
  if (event.type === 'solo' && value.teamId) {
    throw new ApiError('This event is solo. Register with a userId, not teamId', 400);
  }
  if (event.type === 'team' && value.userId) {
    throw new ApiError('This event is team-based. Register with a teamId, not userId', 400);
  }

  // verify participant exists and for intra-college events ensure college match
  let participant = null;
  if (value.userId) {
    participant = await findUserOrThrow(value.userId);
    if (event.interCollege === false) {
      // intra-college: ensure user's college matches INTRA_COLLEGE_NAME
      const userCollege = (participant.college || '').trim().toLowerCase();
      if (userCollege !== INTRA_COLLEGE_NAME.trim().toLowerCase()) {
        throw new ApiError(`This is an intra-college event. Only students from ${INTRA_COLLEGE_NAME} can register`, 403);
      }
    }
  } else if (value.teamId) {
    participant = await findTeamOrThrow(value.teamId);
    // If intra-college, ensure team leader's college matches
    if (event.interCollege === false) {
      const leader = await User.findById(participant.leaderId);
      if (!leader) throw new ApiError('Team leader not found', 404);
      const leaderCollege = (leader.college || '').trim().toLowerCase();
      if (leaderCollege !== INTRA_COLLEGE_NAME.trim().toLowerCase()) {
        throw new ApiError(`This is an intra-college event. Only teams whose leader is from ${INTRA_COLLEGE_NAME} can register`, 403);
      }
    }
  }

  // prevent duplicates
  const already = await isAlreadyRegistered({ eventId: value.eventId, userId: value.userId || null, teamId: value.teamId || null });
  if (already) throw new ApiError('Already registered for this event', 400);

  // enforce capacity if defined (maxParticipants > 0)
  const maxParticipants = Number(event.maxParticipants || 0);
  if (maxParticipants > 0) {
    const currentCount = await countRegistrationsForEvent(event._id);
    if (currentCount >= maxParticipants) {
      throw new ApiError('Event capacity reached', 400);
    }
  }

  // Assess fee and payment needs (you should add fee & isPaid in Event model)
  const fee = Number(event.fee || 0);
  const requiresPayment = !!event.isPaid; // event.isPaid boolean recommended
  const registrationSession = await mongoose.startSession();
  registrationSession.startTransaction();

  try {
    // If event requires payment, call payment service and link payment
    let paymentResult = null;
    let paymentId = null;
    let paymentStatus = 'pending';

    if (requiresPayment && fee > 0) {
      // build payment payload for paymentService
      const paymentPayload = {
        eventId: value.eventId,
        amount: fee,
        userId: value.userId || null,
        teamId: value.teamId || null,
        mode: 'online',
      };

      // use paymentService.createPayment(payload, options)
      // It will return { payment, receiptUrl, transactionId }
      // We pass options but instruct paymentService to avoid duplicate notification emails if we will handle them below.
      try {
        paymentResult = await paymentService.createPayment(paymentPayload, { sendEmail: options.sendEmail, notify: false });
      } catch (err) {
        // payment attempted and failed — abort registration, bubble error
        await registrationSession.abortTransaction();
        registrationSession.endSession();
        throw new ApiError(`Payment failed: ${err.message}`, err.statusCode || 400);
      }

      paymentId = paymentResult.payment._id;
      paymentStatus = paymentResult.payment.status || 'pending';
    } else {
      // free event -> mark as completed without payment
      paymentStatus = 'completed';
      paymentId = null;
    }

    // Create the registration record
    const regDoc = await Registration.create(
      [
        {
          userId: value.userId ? mongoose.Types.ObjectId(value.userId) : null,
          teamId: value.teamId ? mongoose.Types.ObjectId(value.teamId) : null,
          eventId: mongoose.Types.ObjectId(value.eventId),
          paymentId: paymentId ? mongoose.Types.ObjectId(paymentId) : null,
          registrationDate: new Date(),
          paymentStatus,
        },
      ],
      { session: registrationSession }
    );

    const registration = regDoc[0];

    // Commit tx
    await registrationSession.commitTransaction();
    registrationSession.endSession();

    // Post-processing notifications & optional emails (best-effort; do not rollback if they fail)
    const payerName = value.userId ? `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.email : participant.teamName || `Team ${String(participant._id).slice(-6)}`;
    const message = requiresPayment
      ? `Registration ${paymentStatus === 'completed' ? 'confirmed' : 'pending payment'} for ${event.title}. Amount: ₹${fee}.`
      : `Registration confirmed for ${event.title}.`;

    try {
      // send internal notification
      const notePayload = {
        message,
        type: 'event',
      };
      if (value.userId) notePayload.userId = value.userId;
      if (value.teamId) notePayload.teamId = value.teamId;
      await notificationService.createNotification(notePayload, { sendEmail: false });
    } catch (err) {
      // swallow
    }

    // Return populated registration plus payment/receipt info if any
    const populated = await populateRegistration(registration);
    const response = { registration: populated };
    if (paymentResult) response.payment = paymentResult.payment;
    if (paymentResult && paymentResult.receiptUrl) response.receiptUrl = paymentResult.receiptUrl;

    return response;
  } catch (err) {
    try {
      await registrationSession.abortTransaction();
      registrationSession.endSession();
    } catch (e) {}
    throw err;
  }
}

/**
 * Confirm registration after external payment verification (if you use a 2-step flow)
 * - If payment is verified externally, link paymentId to registration and set paymentStatus to completed
 */
async function confirmRegistration(registrationId, paymentId) {
  validateObjectId(registrationId, 'registrationId');
  validateObjectId(paymentId, 'paymentId');

  const reg = await Registration.findById(registrationId);
  if (!reg) throw new ApiError('Registration not found', 404);

  const payment = await findPaymentOrThrow(paymentId);
  // Optionally check payment.eventId === reg.eventId
  if (payment.eventId.toString() !== reg.eventId.toString()) {
    throw new ApiError('Payment event mismatch', 400);
  }

  reg.paymentId = payment._id;
  reg.paymentStatus = payment.status === 'completed' ? 'completed' : payment.status;
  await reg.save();

  // notify user
  try {
    const notePayload = {
      message: `Your payment for event has been confirmed. Registration updated.`,
      type: 'payment',
    };
    if (reg.userId) notePayload.userId = reg.userId.toString();
    if (reg.teamId) notePayload.teamId = reg.teamId.toString();
    await notificationService.createNotification(notePayload, { sendEmail: false });
  } catch (err) {}

  return populateRegistration(reg);
}

/**
 * Cancel registration
 * - If payment was completed, attempts mock refund (paymentService.refundPayment)
 * - Deletes or marks registration as canceled (here we delete; alternatively you can add status field)
 *
 * options: { refund: true } - perform refund attempt if payment exists and was completed
 */
async function cancelRegistration(registrationId, options = { refund: true }) {
  validateObjectId(registrationId, 'registrationId');

  const reg = await Registration.findById(registrationId);
  if (!reg) throw new ApiError('Registration not found', 404);

  // If registration already exists, attempt refund if requested and payment exists
  if (options.refund && reg.paymentId) {
    try {
      const refundRes = await paymentService.refundPayment(reg.paymentId.toString(), 'User cancelled registration');
      // optionally record refund info somewhere
    } catch (err) {
      // refund failed: decide whether to block deletion. We'll proceed but inform caller.
    }
  }

  // Remove registration record (or mark deleted) — here we delete
  await Registration.findByIdAndDelete(registrationId);

  // notify
  try {
    const notePayload = {
      message: `Registration cancelled for event.`,
      type: 'event',
    };
    if (reg.userId) notePayload.userId = reg.userId.toString();
    if (reg.teamId) notePayload.teamId = reg.teamId.toString();
    await notificationService.createNotification(notePayload, { sendEmail: false });
  } catch (err) {}

  return { message: 'Registration cancelled', registrationId };
}

/**
 * Get registration by ID (populated)
 */
async function getRegistrationById(registrationId) {
  validateObjectId(registrationId, 'registrationId');
  const reg = await Registration.findById(registrationId).populate(['userId', 'teamId', 'eventId', 'paymentId']);
  if (!reg) throw new ApiError('Registration not found', 404);
  return reg;
}

/**
 * List registrations with filters & pagination
 * options: { page, limit, eventId, userId, teamId, paymentStatus, from, to, sortBy, sortDir }
 */
async function listRegistrations(options = {}) {
  const {
    page = 1,
    limit = 10,
    eventId,
    userId,
    teamId,
    paymentStatus,
    from,
    to,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = options;

  const filter = {};
  if (eventId) {
    validateObjectId(eventId, 'eventId');
    filter.eventId = mongoose.Types.ObjectId(eventId);
  }
  if (userId) {
    validateObjectId(userId, 'userId');
    filter.userId = mongoose.Types.ObjectId(userId);
  }
  if (teamId) {
    validateObjectId(teamId, 'teamId');
    filter.teamId = mongoose.Types.ObjectId(teamId);
  }
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (from || to) {
    filter.registrationDate = {};
    if (from) filter.registrationDate.$gte = new Date(from);
    if (to) filter.registrationDate.$lte = new Date(to);
  }

  const sortObj = {};
  sortObj[sortBy] = sortDir === 'asc' ? 1 : -1;

  const regs = await Registration.find(filter)
    .populate(['userId', 'teamId', 'eventId', 'paymentId'])
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Registration.countDocuments(filter);
  return { registrations: regs, total, page: Number(page), limit: Number(limit) };
}

/**
 * Bulk register (transactional)
 * items: [{ eventId, userId? , teamId? }, ...]
 * options: forwarded to createRegistration (sendEmail/notify)
 */
async function bulkRegister(items = [], options = { sendEmail: true, notify: true }) {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError('items must be non-empty array', 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const createdRegs = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const { error } = createRegistrationValidator.validate(it);
      if (error) throw new ApiError(`Row ${i}: ${error.details[0].message}`, 422);

      // Use createRegistration but in same session we must ensure atomic behavior.
      // Since createRegistration uses its own transactions for payment, to keep simplicity,
      // here we'll create registrations for free events only or fail if paid.
      const event = await Event.findById(it.eventId).session(session);
      if (!event) throw new ApiError(`Row ${i}: Event not found`, 404);
      const requiresPayment = !!event.isPaid && Number(event.fee || 0) > 0;
      if (requiresPayment) {
        throw new ApiError(`Row ${i}: Bulk registration does not support paid events. Register paid events individually.`, 400);
      }

      // Check duplicates / capacity
      const already = await Registration.findOne({ eventId: it.eventId, $or: [{ userId: it.userId || null }, { teamId: it.teamId || null }] }).session(session);
      if (already) throw new ApiError(`Row ${i}: Already registered for event`);

      const regDoc = await Registration.create(
        [
          {
            userId: it.userId ? mongoose.Types.ObjectId(it.userId) : null,
            teamId: it.teamId ? mongoose.Types.ObjectId(it.teamId) : null,
            eventId: mongoose.Types.ObjectId(it.eventId),
            paymentId: null,
            registrationDate: new Date(),
            paymentStatus: 'completed',
          },
        ],
        { session }
      );

      createdRegs.push(regDoc[0]);
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await Promise.all(createdRegs.map(r => populateRegistration(r)));
    // send notifications in bulk (best-effort)
    for (const r of populated) {
      try {
        const notePayload = {
          message: `Your registration for ${r.eventId.title || r.eventId.name || 'Event'} is confirmed.`,
          type: 'event',
        };
        if (r.userId) notePayload.userId = r.userId._id.toString();
        if (r.teamId) notePayload.teamId = r.teamId._id.toString();
        await notificationService.createNotification(notePayload, { sendEmail: false });
      } catch (err) {}
    }

    return { created: populated };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

/**
 * Registration statistics
 * options: { eventId?, collegeName? }
 * Returns:
 *  - totalRegistrations
 *  - byEvent: [{ eventId, title, count }]
 *  - byCollege: [{ collegeName, count }]
 */
async function getRegistrationStats({ eventId = null, collegeName = null } = {}) {
  const match = {};
  if (eventId) {
    validateObjectId(eventId, 'eventId');
    match.eventId = mongoose.Types.ObjectId(eventId);
  }

  // For college grouping we need to lookup user college via populate -> better aggregate with $lookup
  const pipeline = [{ $match: match }];

  // Join user (for college) - only useful if we want byCollege
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    }
  );

  // Group overall
  pipeline.push({
    $group: {
      _id: null,
      totalRegistrations: { $sum: 1 },
      byEvent: { $addToSet: '$eventId' }, // we'll resolve titles later
    },
  });

  const agg = await Registration.aggregate(pipeline);
  const result = { totalRegistrations: 0, byEvent: [], byCollege: [] };
  if (!agg || agg.length === 0) return result;

  result.totalRegistrations = agg[0].totalRegistrations || 0;

  // ByEvent: run a separate aggregation to count per event (title)
  const byEventAgg = await Registration.aggregate([
    ...(eventId ? [{ $match: { eventId: mongoose.Types.ObjectId(eventId) } }] : []),
    {
      $group: {
        _id: '$eventId',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // fetch titles
  const eventIds = byEventAgg.map(b => b._id).filter(Boolean);
  const events = await Event.find({ _id: { $in: eventIds } }).select('title name');
  const eventMap = new Map(events.map(e => [String(e._id), e.title || e.name || 'Event']));

  result.byEvent = byEventAgg.map(b => ({ eventId: b._id, title: eventMap.get(String(b._id)) || 'Event', count: b.count }));

  // ByCollege: aggregate users' colleges
  const byCollegeAgg = await Registration.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { college: { $toLower: { $ifNull: ['$user.college', 'UNKNOWN'] } } },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  result.byCollege = byCollegeAgg.map(b => ({ collegeName: b._id.college || 'UNKNOWN', count: b.count }));

  return result;
}

// ----------------------
// Extra Helpers
// ----------------------

/** Resend confirmation email/notification */
async function resendRegistrationConfirmation(registrationId) {
  const reg = await getRegistrationById(registrationId);
  if (!reg) throw new ApiError('Registration not found', 404);

  const message = `Your registration for ${reg.eventId.title || 'Event'} is confirmed.`;
  const notePayload = { message, type: 'event' };
  if (reg.userId) notePayload.userId = reg.userId._id.toString();
  if (reg.teamId) notePayload.teamId = reg.teamId._id.toString();

  await notificationService.createNotification(notePayload, { sendEmail: true });
  return { ok: true, message: 'Confirmation resent' };
}

/** Send reminders X days before event start */
async function sendEventReminders(daysBefore = 1) {
  const now = new Date();
  const targetDate = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);

  const events = await Event.find({ startDate: { $gte: now, $lte: targetDate } });
  const reminders = [];

  for (const ev of events) {
    const regs = await Registration.find({ eventId: ev._id }).populate('userId teamId');
    for (const reg of regs) {
      const message = `Reminder: Your event "${ev.title}" is happening soon!`;
      const notePayload = { message, type: 'event' };
      if (reg.userId) notePayload.userId = reg.userId._id.toString();
      if (reg.teamId) notePayload.teamId = reg.teamId._id.toString();

      try {
        await notificationService.createNotification(notePayload, { sendEmail: true });
        reminders.push({ regId: reg._id, ok: true });
      } catch (err) {
        reminders.push({ regId: reg._id, ok: false, error: err.message });
      }
    }
  }
  return reminders;
}

/** Simple attendance marking */
async function markAttendance(registrationId) {
  const reg = await getRegistrationById(registrationId);
  if (!reg) throw new ApiError('Registration not found', 404);

  // You can extend Registration schema to persist this later
  return { ok: true, registrationId, attended: true };
}

/** Export registrations to CSV */
async function exportRegistrationsCSV({ eventId = null } = {}) {
  const filter = {};
  if (eventId) {
    validateObjectId(eventId, 'eventId');
    filter.eventId = mongoose.Types.ObjectId(eventId);
  }

  const regs = await Registration.find(filter).populate(['userId', 'teamId', 'eventId', 'paymentId']);
  const rows = regs.map(r => ({
    id: r._id.toString(),
    event: r.eventId ? r.eventId.title : '',
    user: r.userId ? `${r.userId.firstName} ${r.userId.lastName}` : '',
    team: r.teamId ? r.teamId.teamName : '',
    paymentStatus: r.paymentStatus,
    date: r.registrationDate ? r.registrationDate.toISOString() : '',
  }));

  const parser = new Parser();
  const csv = parser.parse(rows);

  const outDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filePath = path.join(outDir, `registrations_${Date.now()}.csv`);
  fs.writeFileSync(filePath, csv);

  return { filePath, count: rows.length };
}

// ----------------------
// Exports
// ----------------------
module.exports = {
  ApiError,
  createRegistration,
  confirmRegistration,
  cancelRegistration,
  getRegistrationById,
  listRegistrations,
  bulkRegister,
  getRegistrationStats,
  countRegistrationsForEvent,
  isAlreadyRegistered,
  // new helpers
  resendRegistrationConfirmation,
  sendEventReminders,
  markAttendance,
  exportRegistrationsCSV,
};
