/**
 * backend/models/payment_model.js
 *
 * Payment Schema for College Fest Management System
 * - Supports online/offline payments (mock gateway supported)
 * - Tracks receipts, audit logs, soft delete
 * - Enforces transaction uniqueness
 * - Includes enhanced role-based access helpers and self-sync
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseDelete = require('mongoose-delete');
const autopopulate = require('mongoose-autopopulate');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');

const { Schema } = mongoose;

const PAY_STATUSES = ['pending', 'success', 'failed', 'refunded'];
const PAY_MODES = ['online', 'offline'];

/* -------------------------
   Payment Schema
------------------------- */
const paymentSchema = new Schema(
  {
    registration: {
      type: Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      index: true,
      autopopulate: { select: 'event student team status' },
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      autopopulate: { select: 'firstName lastName email role assignedEvents registeredEvents' },
    },

    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      autopopulate: { select: 'title fee isPaid startDate status registrations' },
    },

    amount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: PAY_STATUSES,
      default: 'pending',
      index: true,
    },

    paymentMode: {
      type: String,
      enum: PAY_MODES,
      default: 'online',
    },

    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      autopopulate: { select: 'firstName lastName role' },
    },

    offlineReceiptNumber: { type: String, default: '' },
    bankName: { type: String, default: '' },
    notes: { type: String, default: '' },

    transactionId: {
      type: String,
      unique: true,
      index: true,
    },

    receiptUrl: {
      type: String,
      validate: { validator: (v) => !v || validator.isURL(v), message: 'Invalid URL' },
    },

    mockPaymentLink: {
      type: String,
      validate: { validator: (v) => !v || validator.isURL(v), message: 'Invalid URL' },
    },

    auditLogs: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* -------------------------
   Plugins
------------------------- */
paymentSchema.plugin(mongoosePaginate);
paymentSchema.plugin(autopopulate);
paymentSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

/* -------------------------
   Hooks
------------------------- */
paymentSchema.pre('save', function (next) {
  if (!this.transactionId) {
    // Safer unique ID with timestamp
    this.transactionId = `TXN-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`;
  }
  next();
});

/* -------------------------
   Post-save self-sync
------------------------- */
paymentSchema.post('save', async function (doc) {
  try {
    const Event = require('./event_model');
    const Registration = require('./registration_model');

    // Update Event payments / status
    await Event.findByIdAndUpdate(doc.event?._id, { $addToSet: { payments: doc._id } });

    // Update Registration status if payment successful
    if (doc.registration && doc.status === 'success') {
      await Registration.findByIdAndUpdate(doc.registration, { status: 'confirmed' });
    }
  } catch (err) {
    console.error('Post-save sync error (Payment):', err.message);
  }
});

/* -------------------------
   Role-based Access Helpers
------------------------- */
paymentSchema.methods.isAdmin = function (user) { return user?.role === 'admin'; };
paymentSchema.methods.isStudent = function (user) { return user?.role === 'student'; };
paymentSchema.methods.isOrganizer = function (user) { return user?.role === 'organizer'; };
paymentSchema.methods.isFaculty = function (user) { return user?.role === 'faculty'; };
paymentSchema.methods.isPublic = function (user) { return user?.role === 'public'; };

paymentSchema.methods.canView = function (user) {
  if (!user) return false;
  if (this.isAdmin(user)) return true;
  if (this.isStudent(user)) return this.student?._id.equals(user._id);
  if (this.isOrganizer(user) || this.isFaculty(user)) {
    const assignedEventIds = (user.assignedEvents || []).map((e) => e.toString());
    return assignedEventIds.includes(this.event?._id.toString());
  }
  return false;
};

paymentSchema.methods.canEdit = function (user) {
  if (!user) return false;
  if (this.isAdmin(user)) return true;
  if (this.isOrganizer(user)) {
    const assignedEventIds = (user.assignedEvents || []).map((e) => e.toString());
    return assignedEventIds.includes(this.event?._id.toString());
  }
  return false;
};

/* -------------------------
   Instance Methods
------------------------- */
paymentSchema.methods.markSuccess = async function (performedBy) {
  this.status = 'success';
  if (performedBy) this.processedBy = performedBy;
  this.auditLogs.push({ action: 'markSuccess', performedBy, notes: 'Payment marked successful' });
  return this.save();
};

paymentSchema.methods.markFailed = async function (performedBy, reason) {
  this.status = 'failed';
  if (performedBy) this.processedBy = performedBy;
  this.auditLogs.push({ action: 'markFailed', performedBy, notes: reason || 'Payment failed' });
  return this.save();
};

paymentSchema.methods.markRefunded = async function (performedBy, reason) {
  this.status = 'refunded';
  if (performedBy) this.processedBy = performedBy;
  this.auditLogs.push({ action: 'markRefunded', performedBy, notes: reason || 'Payment refunded' });
  return this.save();
};

/* -------------------------
   Export
------------------------- */
module.exports = mongoose.model('Payment', paymentSchema);
