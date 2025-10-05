/**
 * backend/models/event_model.js
 *
 * Event Schema (refined and production-ready)
 */

const mongoose = require('mongoose');
const slugify = require('slugify');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseDelete = require('mongoose-delete');
const autopopulate = require('mongoose-autopopulate');
const validator = require('validator');

const { Schema } = mongoose;

const EVENT_TYPES = ['inter-college', 'intra-college'];
const EVENT_STATUS = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
const EVENT_MODE = ['offline', 'online', 'hybrid'];
const EVENT_LEVELS = ['UG', 'PG', 'Faculty', 'Alumni', 'Open'];
const EVENT_CATEGORIES = [
  'technical',
  'cultural',
  'sports',
  'literary',
  'management',
  'workshop',
  'seminar',
];

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200, index: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true, default: '' },
    poster: { type: String, trim: true, validate: (v) => !v || validator.isURL(v) },
    brochure: { type: String, trim: true, validate: (v) => !v || validator.isURL(v) },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    registrationDeadline: { type: Date, required: true, index: true },
    sessions: [
      {
        title: String,
        description: String,
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        venue: String,
      },
    ],

    type: { type: String, enum: EVENT_TYPES, required: true, index: true },
    mode: { type: String, enum: EVENT_MODE, default: 'offline' },
    meetingLink: { type: String, trim: true, validate: (v) => !v || validator.isURL(v) },
    venues: [{ type: String, trim: true }],
    program: { type: Schema.Types.ObjectId, ref: 'Lookup' },
    department: { type: Schema.Types.ObjectId, ref: 'Lookup' },
    primaryClub: { type: Schema.Types.ObjectId, ref: 'Club' },
    category: { type: String, enum: EVENT_CATEGORIES },
    level: { type: String, enum: EVENT_LEVELS, default: 'Open' },

    capacity: { type: Number, default: 0, min: 0 },
    registeredCountCache: { type: Number, default: 0 },
    teamSize: { min: { type: Number, default: 1 }, max: { type: Number, default: 1 } },
    registrationType: { type: String, enum: ['individual', 'team'], default: 'individual' },
    eligibilityCriteria: { type: String, trim: true, default: '' },
    requiredDocuments: [{ type: String, trim: true, maxlength: 100 }],

    registrations: [{ type: Schema.Types.ObjectId, ref: 'Registration', autopopulate: true }],
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team', autopopulate: true }],
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', autopopulate: true }],

    isPaid: { type: Boolean, default: false },
    fee: { type: Number, default: 0, min: 0 },
    paymentMode: { type: String, enum: ['online', 'offline', 'both'], default: 'online' },
    refundPolicy: { type: String, trim: true, default: '' },
    payments: [{ type: Schema.Types.ObjectId, ref: 'Payment', autopopulate: true }],
    sponsors: [{ type: Schema.Types.ObjectId, ref: 'Sponsor' }],

    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, autopopulate: true },
    coordinators: [{ type: Schema.Types.ObjectId, ref: 'User', autopopulate: true }],
    volunteers: [{ type: Schema.Types.ObjectId, ref: 'User', autopopulate: true }],
    judges: [{ type: Schema.Types.ObjectId, ref: 'User', autopopulate: true }],
    assignedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    eventRoles: [{ type: Schema.Types.ObjectId, ref: 'Lookup' }],

    announcements: [{ type: Schema.Types.ObjectId, ref: 'Announcement', autopopulate: true }],
    notifications: [{ type: Schema.Types.ObjectId, ref: 'Notification', autopopulate: true }],
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    socialLinks: {
      facebook: { type: String, validate: (v) => !v || validator.isURL(v) },
      instagram: { type: String, validate: (v) => !v || validator.isURL(v) },
      twitter: { type: String, validate: (v) => !v || validator.isURL(v) },
    },
    tags: [{ type: String, trim: true }],

    resources: [{ type: String, trim: true }],
    budget: { estimated: { type: Number, default: 0 }, expenses: { type: Number, default: 0 } },
    safetyMeasures: { type: String, default: '' },

    certificates: [{ type: Schema.Types.ObjectId, ref: 'Certificate', autopopulate: true }],
    feedbacks: [{ type: Schema.Types.ObjectId, ref: 'Feedback', autopopulate: true }],
    results: [{ type: Schema.Types.ObjectId, ref: 'Result', autopopulate: true }],
    winners: [
      {
        position: { type: String, required: true },
        prize: { type: String, required: true },
        awardedToUser: { type: Schema.Types.ObjectId, ref: 'User' },
        awardedToTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
      },
    ],

    status: { type: String, enum: EVENT_STATUS, default: 'draft', index: true },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,
    isHighlighted: { type: Boolean, default: false },
    auditLogs: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        notes: String,
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', autopopulate: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', autopopulate: true },
  },
  { timestamps: true }
);

// Pre-save hook
eventSchema.pre('save', async function (next) {
  // Slug generation
  if (!this.slug || this.isModified('title') || this.isModified('startDate')) {
    const base = `${this.title} ${this.startDate ? this.startDate.toISOString().split('T')[0] : Date.now()}`;
    let raw = slugify(base, { lower: true, strict: true });
    let candidate = `${raw}-${Math.random().toString(36).slice(2, 7)}`;

    const Event = mongoose.model('Event');
    let tries = 0;
    while (tries < 5) {
      const existing = await Event.findOne({ slug: candidate, _id: { $ne: this._id } }).lean();
      if (!existing) break;
      candidate = `${raw}-${Math.random().toString(36).slice(2, 7)}`;
      tries++;
    }
    this.slug = candidate;
  }

  // Validations
  if (this.endDate < this.startDate) return next(new Error('End date cannot be before start date'));
  if (this.registrationDeadline > this.startDate)
    return next(new Error('Registration deadline must be before event start date'));
  if (this.isPaid && (!this.fee || this.fee <= 0)) return next(new Error('Paid events must have a positive fee'));
  if (this.capacity < 0) return next(new Error('Capacity cannot be negative'));
  if (this.teamSize.max < this.teamSize.min) return next(new Error('Maximum team size < minimum'));
  if (this.budget.expenses > this.budget.estimated) return next(new Error('Expenses > estimated budget'));

  next();
});

// Virtuals
eventSchema.virtual('duration').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)); // duration in days
});
eventSchema.virtual('isFull').get(function () {
  return this.capacity > 0 && this.registeredCountCache >= this.capacity;
});
eventSchema.virtual('isActive').get(function () {
  return this.status === 'published' && this.approvalStatus === 'approved';
});

// Instance Methods
eventSchema.methods.isOngoing = function () {
  return this.status === 'ongoing' && Date.now() >= this.startDate && Date.now() <= this.endDate;
};
eventSchema.methods.hasVacancy = function () {
  return this.capacity === 0 || this.registeredCountCache < this.capacity;
};
eventSchema.methods.isPastEvent = function () {
  return Date.now() > this.endDate;
};

// Role-based access methods
eventSchema.methods.canView = function (user) {
  if (!user || user.role === 'public') return this.status === 'published';
  if (user.isAdmin && user.isAdmin()) return true;
  if (user.isOrganizer && (this.organizer?._id.equals(user._id) || this.assignedUsers.some(u => u.equals(user._id)))) return true;
  if (user.isFaculty && this.assignedUsers.some(u => u.equals(user._id))) return true;
  if (user.isStudent && this.participants.some(p => p.equals(user._id))) return true;
  return false;
};
eventSchema.methods.canEdit = function (user) {
  if (!user || user.role === 'public') return false;
  if (user.isAdmin && user.isAdmin()) return true;
  if (user.isOrganizer && this.organizer?._id.equals(user._id)) return true;
  return false;
};
eventSchema.methods.canManageRegistrations = function (user) {
  return this.canEdit(user);
};
eventSchema.methods.canAssignRoles = function (user) {
  return this.canEdit(user);
};
eventSchema.methods.canViewPayments = function (user) {
  if (!user || user.role === 'public') return false;
  if (user.isAdmin && user.isAdmin()) return true;
  if ((user.isOrganizer || user.isFaculty) && (this.assignedUsers.some(u => u.equals(user._id)) || this.organizer?._id.equals(user._id))) return true;
  if (user.isStudent && this.participants.some(p => p.equals(user._id))) return true;
  return false;
};

// Statics
eventSchema.statics.findUpcomingEvents = function () {
  return this.find({ startDate: { $gte: new Date() }, status: { $in: ['published', 'ongoing'] } });
};
eventSchema.statics.findByCategory = function (category) {
  return this.find({ category });
};
eventSchema.statics.findByOrganizer = function (userId) {
  return this.find({ organizer: userId });
};

// Indexes & Plugins
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });
eventSchema.plugin(mongoosePaginate);
eventSchema.plugin(autopopulate);
eventSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

module.exports = mongoose.model('Event', eventSchema);
