/**
 * backend/models/user_model.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const mongoosePaginate = require('mongoose-paginate-v2');
const uniqueValidator = require('mongoose-unique-validator');
const mongooseDelete = require('mongoose-delete');
const { string } = require('joi');

const { Schema } = mongoose;
const ROLES = ['public', 'student', 'organizer', 'faculty', 'admin'];

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80 },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9._-]+$/, 'Invalid username format'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: { validator: (v) => validator.isEmail(v || ''), message: 'Invalid email' },
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
    },
    profilePic: { type: String, default: null },
    bio: { type: String, maxlength: 300, default: '' },

    password: {
      type: String,
      minlength: 8,
      select: false,
      required: function () {
        return this.provider === 'local';
      },
    },
    provider: { type: String, enum: ['local', 'google', 'facebook', 'linkedin'], default: 'local' },

    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    linkedinId: { type: String, unique: true, sparse: true },

    role: { type: String, enum: ROLES, default: 'public' },

    program: { type: Schema.Types.ObjectId, ref: 'Lookup' },
    department: { type: String, ref: 'Lookup' },
    year: { type: Number, min: 1, max: 6 },
    rollNumber: { type: String, unique: true, sparse: true },
    designation: { type: String, ref: 'Lookup' },

    clubs: [{ type: Schema.Types.ObjectId, ref: 'Club' }],
    primaryClub: { type: Schema.Types.ObjectId, ref: 'Club' },
    clubPosition: { type: Schema.Types.ObjectId, ref: 'Lookup' },

    assignedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    registeredEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    certificates: [{ type: Schema.Types.ObjectId, ref: 'Certificate' }],
    notifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
    likedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    interests: [{ type: String, trim: true }],

    eventRoles: [{ type: Schema.Types.ObjectId, ref: 'Lookup' }],

    verificationToken: String,
    verificationExpires: Date,

    isVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    passwordSetAt: { type: Date, default: Date.now },
    tokenVersion: { type: Number, default: 0 },

    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },

    lastLogin: Date,
    lastActiveAt: Date,
    loginAttempts: { type: Number, default: 0 },
    accountLockedUntil: Date,

    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
    social: {
      linkedin: String,
      instagram: String,
      facebook: String,
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    locale: { type: String, default: 'en-IN' },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.plugin(mongoosePaginate);
userSchema.plugin(uniqueValidator, { message: '{PATH} must be unique.' });
userSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

/* -------------------------
   Pre-save hooks
------------------------- */
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password && this.provider === 'local') {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordSetAt = Date.now();
  }
  if (this.provider !== 'local' && !this.password) this.password = null;
  next();
});

userSchema.methods.matchPassword = async function (password) {
  return this.password ? bcrypt.compare(password, this.password) : false;
};

/* -------------------------
   Role check helpers
------------------------- */
userSchema.methods.isAdmin = function () { return this.role === 'admin'; };
userSchema.methods.isStudent = function () { return this.role === 'student'; };
userSchema.methods.isOrganizer = function () { return this.role === 'organizer'; };
userSchema.methods.isFaculty = function () { return this.role === 'faculty'; };
userSchema.methods.isPublic = function () { return this.role === 'public'; };

/* -------------------------
   Role-based access methods
------------------------- */
userSchema.methods.canViewEvent = function (eventId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isStudent()) return this.registeredEvents.some(e => e.equals(eventId));
  if (this.isOrganizer() || this.isFaculty()) return this.assignedEvents.some(e => e.equals(eventId));
  return false;
};

userSchema.methods.canEditEvent = function (eventId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isOrganizer()) return this.assignedEvents.some(e => e.equals(eventId));
  return false;
};

userSchema.methods.canViewTeam = function (teamId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isStudent()) return this.teams.some(t => t.equals(teamId));
  if (this.isOrganizer() || this.isFaculty()) return true;
  return false;
};

userSchema.methods.canEditTeam = function (teamId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isOrganizer()) return this.teams.some(t => t.equals(teamId));
  return false;
};

userSchema.methods.canViewCertificate = function (certificateId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isStudent()) return this.certificates.some(c => c.equals(certificateId));
  if (this.isOrganizer() || this.isFaculty()) return true;
  return false;
};

userSchema.methods.canEditCertificate = function (certificateId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isOrganizer()) return true;
  return false;
};

userSchema.methods.canViewUser = function (targetUserId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isStudent() && this._id.equals(targetUserId)) return true;
  if (this.isOrganizer() || this.isFaculty()) return true;
  return false;
};

userSchema.methods.canEditUser = function (targetUserId) {
  if (this.isPublic()) return false;
  if (this.isAdmin()) return true;
  if (this.isStudent() && this._id.equals(targetUserId)) return true;
  return false;
};
userSchema.methods.createVerificationToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};
userSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.accountLockedUntil = null;
};
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    role: this.role,
    department: this.department,
    year: this.year,
    rollNumber: this.rollNumber,
    designation: this.designation,
    phone: this.phone,
    profilePic: this.profilePic,
    bio: this.bio,
    isVerified: this.isVerified,
    clubs: this.clubs,
    primaryClub: this.primaryClub,
    clubPosition: this.clubPosition,
    interests: this.interests,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};


/* -------------------------
   Statics
------------------------- */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: (email || '').toLowerCase().trim() });
};
userSchema.statics.findBasicProfile = function (id) {
  return this.findById(id).select('firstName lastName email role profilePic username');
};

/* -------------------------
   Virtuals
------------------------- */
userSchema.virtual('fullName').get(function () {
  return `${this.firstName}${this.lastName ? ' ' + this.lastName : ''}`;
});

/* -------------------------
   JSON Transform
------------------------- */
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
