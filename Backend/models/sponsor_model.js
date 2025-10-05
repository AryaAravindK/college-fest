/**
 * backend/models/sponsor_model.js
 *
 * Sponsor Schema for College Fest Management System
 * --------------------------------------------------
 * Features:
 * - RBAC (public, student, organizer, faculty, admin)
 * - Link sponsors to events
 * - Status lifecycle: draft / published / archived
 * - Tier, category, tags
 * - Attachments (logo/banner)
 * - Engagement tracking (likes, views, impressions)
 * - Leaderboards (weekly, monthly, trending)
 * - Audit logs
 * - Soft delete, timestamps, pagination, autopopulate
 * - Scheduled publishing
 * - Notifications (email/SMS)
 * - Slug/short URL for frontend
 */

const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const mongooseDelete = require("mongoose-delete");
const autopopulate = require("mongoose-autopopulate");
const validator = require("validator");

const { Schema } = mongoose;

/* ------------------------- Constants ------------------------- */
const SPONSOR_STATUSES = ["draft", "published", "archived"];
const SPONSOR_TIERS = ["platinum", "gold", "silver", "bronze", "partner"];
const SPONSOR_CATEGORIES = ["technology", "food", "education", "media", "other"];

/* ------------------------- Sub-Schemas ------------------------- */
const LogSchema = new Schema(
  {
    action: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const AttachmentSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      validate: (v) => validator.isURL(v),
    },
    type: { type: String, trim: true, default: "file" }, // logo, banner, doc
  },
  { _id: false }
);

/* ------------------------- Main Schema ------------------------- */
const sponsorSchema = new Schema(
  {
    /* Basic Info */
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    description: { type: String, trim: true, maxlength: 5000 },
    tier: { type: String, enum: SPONSOR_TIERS, default: "partner", index: true },
    category: { type: String, enum: SPONSOR_CATEGORIES, default: "other", index: true },
    tags: { type: [String], default: [], index: true },
    status: { type: String, enum: SPONSOR_STATUSES, default: "draft", index: true },

    /* Contact Info */
    website: { type: String, trim: true, validate: (v) => !v || validator.isURL(v) },
    contactEmail: { type: String, trim: true, validate: (v) => !v || validator.isEmail(v) },
    contactPhone: { type: String, trim: true },
    contactPerson: { type: String, trim: true },

    /* Media & Attachments */
    attachments: { type: [AttachmentSchema], default: [] },

    /* Engagement */
    likes: [
      { type: Schema.Types.ObjectId, ref: "User", autopopulate: { select: "name email" } }
    ],
    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    impressionCount: { type: Number, default: 0 },

    /* Relationships */
    events: [
      { type: Schema.Types.ObjectId, ref: "Event", autopopulate: true, default: [] }
    ],

    /* Notifications */
    notifyEmail: { type: Boolean, default: false },
    notifySms: { type: Boolean, default: false },

    /* Scheduling */
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, default: null },

    /* SEO / Linking */
    slug: { type: String, unique: true, index: true },

    /* Logs & Audit */
    logs: { type: [LogSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },

    /* Soft Delete */
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ------------------------- Indexes ------------------------- */
sponsorSchema.index({ name: 1, tier: 1 });
sponsorSchema.index({ events: 1, status: 1 });
sponsorSchema.index({ createdAt: -1 });

/* ------------------------- Hooks ------------------------- */
sponsorSchema.pre("save", function (next) {
  if (!this.createdBy && this.updatedBy) this.createdBy = this.updatedBy;

  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);
  }

  this.likeCount = this.likes.length;
  next();
});

sponsorSchema.post("save", async function (doc) {
  if (doc.notifyEmail) console.log(`📧 Email sponsor notification → ${doc._id}`);
  if (doc.notifySms) console.log(`📩 SMS sponsor notification → ${doc._id}`);
});

/* ------------------------- Instance Methods ------------------------- */
sponsorSchema.methods.addLike = async function (userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    this.likeCount = this.likes.length;
    await this.save();
  }
};

sponsorSchema.methods.removeLike = async function (userId) {
  this.likes = this.likes.filter((id) => id.toString() !== userId.toString());
  this.likeCount = this.likes.length;
  await this.save();
};

sponsorSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save();
};

sponsorSchema.methods.incrementImpressions = async function () {
  this.impressionCount += 1;
  await this.save();
};

sponsorSchema.methods.isActive = function () {
  const now = new Date();
  const afterStart = !this.validFrom || this.validFrom <= now;
  const beforeEnd = !this.validTo || this.validTo >= now;
  return this.status === "published" && afterStart && beforeEnd;
};

/* ------------------------- Virtuals ------------------------- */
sponsorSchema.virtual("engagementScore").get(function () {
  return (this.likeCount * 3) + (this.viewCount * 2) + (this.impressionCount * 1);
});

/* ------------------------- RBAC Methods ------------------------- */
sponsorSchema.methods.canView = function (role, userContext = {}) {
  if (this.deleted || !this.isActive()) return false;

  switch (role) {
    case "public":
      return this.status === "published";
    case "student":
      return !this.events.length || (userContext.registeredEvents || []).some(e => this.events.map(ev => ev._id.toString()).includes(e.toString()));
    case "organizer":
    case "faculty":
      return !this.events.length || (userContext.assignedEvents || []).some(e => this.events.map(ev => ev._id.toString()).includes(e.toString()));
    case "admin":
      return true;
    default:
      return false;
  }
};

sponsorSchema.methods.canEdit = function (role, userContext = {}) {
  switch (role) {
    case "organizer":
    case "faculty":
      return !this.events.length || (userContext.assignedEvents || []).some(e => this.events.map(ev => ev._id.toString()).includes(e.toString()));
    case "admin":
      return true;
    default:
      return false;
  }
};

/* ------------------------- Static Methods ------------------------- */
sponsorSchema.statics.getTopSponsorsByEngagement = async function (limit = 10) {
  const sponsors = await this.find({ deleted: false, status: "published" });
  return sponsors
    .map(s => ({ sponsor: s, score: s.engagementScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

sponsorSchema.statics.getActiveSponsorsByRole = async function (role, userContext = {}) {
  const now = new Date();
  const query = {
    status: "published",
    deleted: false,
    validFrom: { $lte: now },
    $or: [{ validTo: null }, { validTo: { $gte: now } }],
  };

  switch (role) {
    case "student":
      if (userContext.registeredEvents) query.events = { $in: userContext.registeredEvents };
      break;
    case "organizer":
    case "faculty":
      if (userContext.assignedEvents) query.events = { $in: userContext.assignedEvents };
      break;
    case "public":
    case "admin":
      break;
    default:
      return [];
  }

  return this.find(query).sort({ tier: 1, createdAt: -1 });
};

/* ------------------------- Plugins ------------------------- */
sponsorSchema.plugin(mongoosePaginate);
sponsorSchema.plugin(autopopulate);
sponsorSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

/* ------------------------- Export ------------------------- */
module.exports = mongoose.model("Sponsor", sponsorSchema);
