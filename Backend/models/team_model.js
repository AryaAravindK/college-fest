/**
 * backend/models/team_model.js
 *
 * Team Schema aligned with user_model.js & event_model.js
 * Independent, clean, production-ready
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseDelete = require('mongoose-delete');
const autopopulate = require('mongoose-autopopulate');
const uniqueValidator = require('mongoose-unique-validator');
const slugify = require('slugify');
const validator = require('validator');

const { Schema } = mongoose;

const TEAM_STATUS = ['pending', 'active', 'disqualified', 'withdrawn'];
const VISIBILITY = ['public', 'invite-only', 'private'];

const teamSchema = new Schema(
  {
    /* -------------------------
       Basic Info
    ------------------------- */
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [3, 'Team name too short'],
      maxlength: [100, 'Team name too long'],
      index: true,
    },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    logo: { type: String, trim: true, validate: (v) => !v || validator.isURL(v) },

    /* -------------------------
       Relations
    ------------------------- */
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      autopopulate: true,
      index: true,
    },
    leader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      autopopulate: true,
    },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', autopopulate: true }],

    registration: { type: Schema.Types.ObjectId, ref: 'Registration', autopopulate: true },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', autopopulate: true },

    /* -------------------------
       Status & Meta
    ------------------------- */
    status: { type: String, enum: TEAM_STATUS, default: 'pending', index: true },
    isApproved: { type: Boolean, default: false },
    joinCode: { type: String, trim: true, index: true },

    tags: [{ type: String, trim: true }],
    visibility: { type: String, enum: VISIBILITY, default: 'invite-only' },

    /* -------------------------
       Audit
    ------------------------- */
    auditLogs: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', autopopulate: true, default: null },
        date: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', autopopulate: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', autopopulate: true },
  },
  { timestamps: true }
);

/* -------------------------
   Indexes
------------------------- */
teamSchema.index({ event: 1, name: 1 }, { unique: true, sparse: true });
teamSchema.index({ event: 1, leader: 1 }, { unique: true, sparse: true });
teamSchema.index({ name: 'text', description: 'text', tags: 'text' });

/* -------------------------
   Pre-save Hooks
------------------------- */
teamSchema.pre('save', async function (next) {
  try {
    // Generate slug if missing or name changed
    if (!this.slug || this.isModified('name')) {
      const base = `${this.name} ${this.event ? this.event.toString() : Date.now()}`;
      let raw = slugify(base, { lower: true, strict: true }).slice(0, 40);
      let candidate = `${raw}-${Math.random().toString(36).slice(2, 6)}`;
      const Team = mongoose.model('Team');

      for (let i = 0; i < 5; i++) {
        const existing = await Team.findOne({ slug: candidate, _id: { $ne: this._id } }).lean();
        if (!existing) break;
        candidate = `${raw}-${Math.random().toString(36).slice(2, 6)}`;
      }
      this.slug = candidate;
    }

    // Ensure leader is in members
    if (this.leader && !this.members.some((m) => m && m.toString() === this.leader.toString())) {
      this.members.push(this.leader);
    }

    // Generate joinCode if missing
    if (!this.joinCode) {
      this.joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    next();
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   Statics (Helper Queries)
------------------------- */
teamSchema.statics.findByEvent = function (eventId) {
  return this.find({ event: eventId });
};

teamSchema.statics.findByLeader = function (leaderId) {
  return this.find({ leader: leaderId });
};

teamSchema.statics.findByMember = function (memberId) {
  return this.find({ members: memberId });
};

/* -------------------------
   Role-based helpers
------------------------- */
teamSchema.methods.isAdmin = function (user) { return user?.role === 'admin'; };
teamSchema.methods.isStudent = function (user) { return user?.role === 'student'; };
teamSchema.methods.isOrganizer = function (user) { return user?.role === 'organizer'; };
teamSchema.methods.isFaculty = function (user) { return user?.role === 'faculty'; };
teamSchema.methods.isPublic = function (user) { return user?.role === 'public'; };

// Can view a team
teamSchema.methods.canView = function (user) {
  if (!user || this.isPublic(user)) return this.visibility === 'public';
  if (this.isAdmin(user)) return true;
  if (this.isOrganizer(user) && this.event?.organizer?._id.equals(user._id)) return true;
  if ((this.isFaculty(user) || this.isStudent(user)) && this.members.some(m => m._id.equals(user._id))) return true;
  return false;
};

// Can edit a team
teamSchema.methods.canEdit = function (user) {
  if (!user) return false;
  if (this.isAdmin(user)) return true;
  if (this.leader?._id.equals(user._id)) return true;
  if (this.isOrganizer(user) && this.event?.organizer?._id.equals(user._id)) return true;
  return false;
};

// Can manage team members
teamSchema.methods.canManageMembers = function (user) {
  return this.canEdit(user);
};

// Can view payment
teamSchema.methods.canViewPayment = function (user) {
  return this.canEdit(user);
};

// Can edit payment
teamSchema.methods.canEditPayment = function (user) {
  return this.canEdit(user);
};

/* -------------------------
   Plugins
------------------------- */
teamSchema.plugin(mongoosePaginate);
teamSchema.plugin(autopopulate);
teamSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all', indexFields: true });
teamSchema.plugin(uniqueValidator, { message: '{PATH} must be unique.' });

/* -------------------------
   Export
------------------------- */
module.exports = mongoose.model('Team', teamSchema);
