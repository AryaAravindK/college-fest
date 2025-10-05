/**
 * backend/models/registration_model.js
 *
 * Registration Schema for College Fest Management System
 * ------------------------------------------------------
 * ✅ Supports individual & team registrations
 * ✅ Tracks documents, notifications, audit logs
 * ✅ Enforces uniqueness & event capacity
 * ✅ Provides helper statics & instance methods
 * ✅ Keeps sync hooks for User, Event, Team
 * ✅ Added Role-Based Access Control
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseDelete = require('mongoose-delete');
const autopopulate = require('mongoose-autopopulate');
const validator = require('validator');

const { Schema } = mongoose;

const REG_STATUSES = ['pending', 'confirmed', 'waitlisted', 'cancelled', 'refunded', 'rejected'];

/* -------------------------
   Schema
------------------------- */
const registrationSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
      autopopulate: { select: 'title startDate capacity isPaid fee status organizer' },
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      autopopulate: { select: 'firstName lastName email role registeredEvents' },
    },

    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
      autopopulate: { select: 'name event members leader' },
    },

    registrationType: {
      type: String,
      enum: ['individual', 'team'],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: REG_STATUSES,
      default: 'pending',
      index: true,
    },

    idProof: {
      type: String,
      default: null,
      validate: (v) => !v || validator.isURL(v),
    },
    extraDocs: [
      {
        type: String,
        validate: (v) => !v || validator.isURL(v),
      },
    ],

    score: {
      type: Number,
      default: null,
      min: [0, 'Score cannot be negative'],
    },
    rank: {
      type: Number,
      default: null,
      min: [0, 'Rank cannot be negative'],
    },

    notifications: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Notification',
        autopopulate: { select: 'title message type createdAt' },
      },
    ],

    notes: { type: String, default: '' },
    auditLogs: [
      {
        action: String,
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        notes: String,
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* -------------------------
   Indexes
------------------------- */
registrationSchema.index(
  { event: 1, student: 1 },
  { unique: true, partialFilterExpression: { student: { $type: 'objectId' } } }
);
registrationSchema.index(
  { event: 1, team: 1 },
  { unique: true, partialFilterExpression: { team: { $type: 'objectId' } } }
);
registrationSchema.index({ status: 1 });
registrationSchema.index({ registrationType: 1 });

/* -------------------------
   Validation Hooks
------------------------- */
registrationSchema.pre('validate', function (next) {
  if (this.registrationType === 'individual') {
    if (!this.student) return next(new Error(`Individual registration requires a student (Event: ${this.event})`));
    this.team = null;
  } else if (this.registrationType === 'team') {
    if (!this.team) return next(new Error(`Team registration requires a team (Event: ${this.event})`));
    this.student = null;
  } else {
    return next(new Error(`Invalid registrationType: ${this.registrationType} (Event: ${this.event})`));
  }
  next();
});

registrationSchema.pre('save', async function (next) {
  try {
    const Event = require('./event_model');
    const event = await Event.findById(this.event).select('capacity status').lean();
    if (!event) return next(new Error(`Event not found (ID: ${this.event})`));

    if (['cancelled', 'completed'].includes(event.status)) {
      return next(new Error(`Cannot register for cancelled/completed event (ID: ${event._id})`));
    }

    if (event.capacity && event.capacity > 0) {
      const Registration = mongoose.model('Registration');
      const activeRegs = await Registration.countDocuments({
        event: this.event,
        status: { $in: ['pending', 'confirmed'] },
      });
      if (activeRegs >= event.capacity && this.status !== 'waitlisted') {
        this.status = 'waitlisted';
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   Role check helpers
------------------------- */
registrationSchema.methods.isAdmin = function (user) {
  return user?.role === 'admin';
};
registrationSchema.methods.isStudent = function (user) {
  return user?.role === 'student';
};
registrationSchema.methods.isOrganizer = function (user) {
  return user?.role === 'organizer';
};
registrationSchema.methods.isFaculty = function (user) {
  return user?.role === 'faculty';
};
registrationSchema.methods.isPublic = function (user) {
  return user?.role === 'public';
};

/* -------------------------
   Role-based access
------------------------- */
registrationSchema.methods.canView = function (user) {
  if (!user) return false;
  if (this.isAdmin(user)) return true;
  if (this.isStudent(user)) return this.student && this.student._id.equals(user._id);
  if (this.isOrganizer(user) || this.isFaculty(user)) return true;
  return false;
};

registrationSchema.methods.canEdit = function (user) {
  if (!user) return false;
  if (this.isAdmin(user)) return true;
  if (this.isStudent(user)) return this.student && this.student._id.equals(user._id);
  if (this.isOrganizer(user)) return true; // organizer can update registrations for their event
  return false;
};

/* -------------------------
   Instance Methods
------------------------- */
registrationSchema.methods.cancel = async function (reason = '') {
  if (['cancelled', 'refunded'].includes(this.status)) return this;
  this.status = 'cancelled';
  this.notes = `${this.notes || ''}\nCancelled: ${reason}`;
  this.auditLogs.push({ action: 'cancelled', notes: reason });
  await this.save();
  return this;
};

/* -------------------------
   Static Helpers
------------------------- */
registrationSchema.statics.registerIndividual = async function (eventId, studentId) {
  const Event = require('./event_model');
  const event = await Event.findById(eventId).lean();
  if (!event) throw new Error(`Event not found (ID: ${eventId})`);
  if (['cancelled', 'completed'].includes(event.status)) throw new Error(`Cannot register for this event (ID: ${eventId})`);

  return this.create({
    event: eventId,
    student: studentId,
    registrationType: 'individual',
    status: 'pending',
  });
};

registrationSchema.statics.registerTeam = async function (eventId, teamId) {
  const Event = require('./event_model');
  const Team = require('./team_model');
  const event = await Event.findById(eventId).lean();
  if (!event) throw new Error(`Event not found (ID: ${eventId})`);
  if (['cancelled', 'completed'].includes(event.status)) throw new Error(`Cannot register for this event (ID: ${eventId})`);

  const team = await Team.findById(teamId).lean();
  if (!team) throw new Error(`Team not found (ID: ${teamId})`);
  if (team.event.toString() !== eventId.toString()) throw new Error(`Team (ID: ${team._id}) does not belong to Event (ID: ${event._id})`);

  return this.create({
    event: eventId,
    team: teamId,
    registrationType: 'team',
    status: 'pending',
  });
};

/* -------------------------
   Sync Hooks
------------------------- */
registrationSchema.post('save', async function (doc) {
  try {
    const Event = require('./event_model');
    const User = require('./user_model');
    const Team = require('./team_model');

    await Event.findByIdAndUpdate(doc.event, { $addToSet: { registrations: doc._id } });

    if (doc.registrationType === 'individual' && doc.student) {
      await User.findByIdAndUpdate(doc.student, { $addToSet: { registeredEvents: doc.event } });
    }

    if (doc.registrationType === 'team' && doc.team) {
      await Team.findByIdAndUpdate(doc.team, { $addToSet: { registeredEvents: doc.event } });
    }
  } catch (err) {
    console.error('Post-save sync error (Registration):', err.message);
  }
});

registrationSchema.post('delete', async function (doc) {
  try {
    const Event = require('./event_model');
    const User = require('./user_model');
    const Team = require('./team_model');

    await Event.findByIdAndUpdate(doc.event, { $pull: { registrations: doc._id } });

    if (doc.registrationType === 'individual' && doc.student) {
      await User.findByIdAndUpdate(doc.student, { $pull: { registeredEvents: doc.event } });
    }

    if (doc.registrationType === 'team' && doc.team) {
      await Team.findByIdAndUpdate(doc.team, { $pull: { registeredEvents: doc.event } });
    }
  } catch (err) {
    console.error('Post-delete sync error (Registration):', err.message);
  }
});

/* -------------------------
   Plugins
------------------------- */
registrationSchema.plugin(mongoosePaginate);
registrationSchema.plugin(autopopulate);
registrationSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

/* -------------------------
   Export
------------------------- */
module.exports = mongoose.model('Registration', registrationSchema);
