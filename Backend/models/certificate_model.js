/**
 * backend/models/certificate_model.js
 *
 * Certificate Schema
 * - Links event, registration, student, team
 * - Tracks issuance, verification, revocation
 * - Supports RBAC, audit logs, delivery tracking
 * - Self-contained: no PDF/QR/email logic inside
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseDelete = require('mongoose-delete');
const autopopulate = require('mongoose-autopopulate');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');

const { Schema } = mongoose;

//
// 🔹 Constants
//
const CERT_CATEGORIES = [
  'participation',
  'winner',
  'runnerup',
  'special',
  'volunteer',
  'merit'
];
const CERT_STATUSES = [
  'draft',
  'issued',
  'approved',
  'revoked',
  'verified',
  'expired'
];

//
// 🔹 Sub-Schemas
//
const DeliverySchema = new Schema(
  {
    sentEmail: { type: Boolean, default: false },
    emailAt: { type: Date, default: null },
    sentSMS: { type: Boolean, default: false },
    smsAt: { type: Date, default: null },
    downloadedAt: { type: Date, default: null },
    deliveredTo: { type: String, default: null },
    downloadHistory: [
      {
        downloadedAt: { type: Date, default: Date.now },
        deliveredTo: { type: String, default: null },
        actor: { type: Schema.Types.ObjectId, ref: 'User', default: null }
      }
    ]
  },
  { _id: false }
);

const LogSchema = new Schema(
  {
    action: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

//
// 🔹 Main Schema
//
const certificateSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', default: null, autopopulate: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, autopopulate: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, autopopulate: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, autopopulate: true },

    certificateId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CERT_CATEGORIES, default: 'participation', index: true },
    language: { type: String, default: 'en' },

    template: { type: String, default: null },
    fields: { type: Schema.Types.Mixed, default: {} },
    backgroundImage: { type: String, default: null },
    signatureImages: [{ type: String }],

    fileUrl: { type: String, default: null },
    downloadsCount: { type: Number, default: 0 },

    verifyUrl: { type: String, default: null },
    qrCodeUrl: { type: String, default: null },
    isVerified: { type: Boolean, default: false },

    status: { type: String, enum: CERT_STATUSES, default: 'draft', index: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    issuedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    delivery: { type: DeliverySchema, default: {} },
    logs: { type: [LogSchema], default: [] },

    notes: { type: String, default: '' },
    deleted: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

//
// 🔹 Plugins
//
certificateSchema.plugin(mongoosePaginate);
certificateSchema.plugin(autopopulate);
certificateSchema.plugin(uniqueValidator, { message: '{PATH} must be unique.' });
certificateSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

//
// 🔹 Hooks
//
certificateSchema.pre('save', function (next) {
  if (!this.certificateId) {
    this.certificateId = crypto.randomUUID
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString('hex');
  }
  if (!this.verifyUrl) {
    this.verifyUrl = `/certificates/verify/${this.certificateId}`;
  }
  if (this.status === 'issued' && !this.issuedAt) {
    this.issuedAt = new Date();
  }
  if (this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  next();
});

//
// 🔹 Instance Methods
//
certificateSchema.methods.issue = async function (actor = null, options = {}) {
  this.status = 'issued';
  this.issuedBy = actor || this.issuedBy || null;
  this.issuedAt = this.issuedAt || new Date();

  if (options.template) this.template = options.template;
  if (options.fields) this.fields = options.fields;
  if (options.backgroundImage) this.backgroundImage = options.backgroundImage;

  this.logs.push({ action: 'issued', actor, notes: options.notes || '' });
  await this.save();
  return this;
};

certificateSchema.methods.markDownloaded = async function (by = null, info = null) {
  this.downloadsCount += 1;
  this.delivery.downloadedAt = new Date();
  if (info?.destination) this.delivery.deliveredTo = info.destination;

  this.delivery.downloadHistory.push({
    downloadedAt: new Date(),
    deliveredTo: info?.destination || null,
    actor: by || null
  });

  this.logs.push({ action: 'downloaded', actor: by, notes: info ? JSON.stringify(info) : '' });
  await this.save();
  return this;
};

//
// 🔹 Virtuals
//
certificateSchema.virtual('isIssued').get(function () {
  return this.status === 'issued';
});
certificateSchema.virtual('isExpired').get(function () {
  return this.expiresAt ? new Date() > this.expiresAt : false;
});

//
// 🔹 RBAC
//
certificateSchema.methods.canStudentView = function (studentId) {
  return !this.deleted && this.student?._id?.equals(studentId);
};
certificateSchema.methods.canOrganizerView = function (organizerEventIds = []) {
  return !this.deleted && organizerEventIds.includes(this.event._id.toString());
};
certificateSchema.methods.canFacultyView = function (facultyEventIds = []) {
  return !this.deleted && facultyEventIds.includes(this.event._id.toString());
};
certificateSchema.methods.canAdminView = function () {
  return !this.deleted;
};

certificateSchema.methods.canStudentEdit = () => false;
certificateSchema.methods.canOrganizerEdit = function (organizerEventIds = []) {
  return organizerEventIds.includes(this.event._id.toString());
};
certificateSchema.methods.canFacultyEdit = () => false;
certificateSchema.methods.canAdminEdit = () => true;

//
// 🔹 Static Helpers (role aware queries)
//
certificateSchema.statics.findByStudentWithRole = function (studentId, user) {
  if (!user) return [];
  if (user.role === 'admin') return this.find({ student: studentId });
  if (user.role === 'student' && user._id.equals(studentId)) return this.find({ student: studentId });
  if (['organizer', 'faculty'].includes(user.role)) {
    const eventIds = (user.assignedEvents || []).map((e) => e.toString());
    return this.find({ student: studentId, event: { $in: eventIds } });
  }
  return [];
};

certificateSchema.statics.findByEventWithRole = function (eventId, user) {
  if (!user) return [];
  if (user.role === 'admin') return this.find({ event: eventId });
  if (user.role === 'student') return this.find({ event: eventId, student: user._id });
  if (['organizer', 'faculty'].includes(user.role)) {
    const eventIds = (user.assignedEvents || []).map((e) => e.toString());
    if (eventIds.includes(eventId.toString())) return this.find({ event: eventId });
  }
  return [];
};

//
// 🔹 Export
//
module.exports = mongoose.model('Certificate', certificateSchema);
