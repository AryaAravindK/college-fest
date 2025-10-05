/**
 * backend/models/club_model.js
 *
 * Club Schema for College Fest Management System
 */

const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const mongooseDelete = require("mongoose-delete");
const autopopulate = require("mongoose-autopopulate");
const validator = require("validator");
const slugify = require("slugify");

const { Schema } = mongoose;

/* ------------------------- Constants ------------------------- */
const CLUB_STATUSES = ["draft", "active", "inactive", "archived"];
const CLUB_ROLES = ["superadmin", "admin", "club_head", "club_member", "public"];
const CLUB_CATEGORIES = ["cultural", "technical", "sports", "arts", "literature", "social", "other"];

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
    url: { type: String, required: true, validate: (v) => validator.isURL(v) },
    type: { type: String, trim: true, default: "file" },
  },
  { _id: false }
);

const MemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", autopopulate: { select: "name email" } },
    role: { type: String, enum: CLUB_ROLES, default: "club_member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ------------------------- Main Schema ------------------------- */
const clubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    description: { type: String, trim: true, maxlength: 5000 },
    category: { type: String, enum: CLUB_CATEGORIES, default: "other", index: true },
    tags: { type: [String], default: [], set: (arr) => arr.map((s) => s.trim()) },
    status: { type: String, enum: CLUB_STATUSES, default: "draft", index: true },
    isPublic: { type: Boolean, default: false, index: true },

    attachments: { type: [AttachmentSchema], default: [] },
    members: { type: [MemberSchema], default: [] },
    likes: [{ type: Schema.Types.ObjectId, ref: "User", autopopulate: { select: "name email" } }],
    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    impressionCount: { type: Number, default: 0 },

    events: [{ type: Schema.Types.ObjectId, ref: "Event", autopopulate: true, default: [] }],
    teams: [{ type: Schema.Types.ObjectId, ref: "Team", autopopulate: true, default: [] }],
    sponsors: [{ type: Schema.Types.ObjectId, ref: "Sponsor", autopopulate: true, default: [] }],
    announcements: [{ type: Schema.Types.ObjectId, ref: "Announcement", autopopulate: true, default: [] }],
    feedbacks: [{ type: Schema.Types.ObjectId, ref: "Feedback", autopopulate: true, default: [] }],

    notifyEmail: { type: Boolean, default: false },
    notifySms: { type: Boolean, default: false },

    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, default: null },

    slug: { type: String, unique: true, index: true },

    logs: { type: [LogSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ------------------------- Indexes ------------------------- */
clubSchema.index({ name: 1, category: 1 });
clubSchema.index({ members: 1, status: 1 });
clubSchema.index({ createdAt: -1 });

/* ------------------------- Hooks ------------------------- */
clubSchema.pre("save", async function (next) {
  if (!this.createdBy && this.updatedBy) this.createdBy = this.updatedBy;

  if (!this.slug && this.name) {
    let baseSlug = slugify(this.name, { lower: true, strict: true }).slice(0, 50);
    let candidateSlug = baseSlug;
    const Club = mongoose.model("Club");
    let tries = 0;

    while (tries < 5) {
      const existing = await Club.findOne({ slug: candidateSlug, _id: { $ne: this._id } });
      if (!existing) break;
      candidateSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      tries++;
    }
    this.slug = candidateSlug;
  }

  this.likeCount = this.likes.length;
  next();
});

clubSchema.post("save", async function (doc) {
  if (doc.notifyEmail) console.log(`📧 Email club notification → ${doc._id}`);
  if (doc.notifySms) console.log(`📩 SMS club notification → ${doc._id}`);
});

/* ------------------------- Instance Methods ------------------------- */
clubSchema.methods.addLike = async function (userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    this.likeCount = this.likes.length;
    await this.save();
  }
};

clubSchema.methods.removeLike = async function (userId) {
  this.likes = this.likes.filter((id) => id.toString() !== userId.toString());
  this.likeCount = this.likes.length;
  await this.save();
};

clubSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save();
};

clubSchema.methods.incrementImpressions = async function () {
  this.impressionCount += 1;
  await this.save();
};

clubSchema.methods.isActive = function () {
  const now = new Date();
  const afterStart = !this.validFrom || this.validFrom <= now;
  const beforeEnd = !this.validTo || this.validTo >= now;
  return this.status === "active" && afterStart && beforeEnd;
};

clubSchema.methods.toPublicJSON = function () {
  if (!this.isPublic) return null;
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    category: this.category,
    tags: this.tags,
    status: this.status,
    attachments: this.attachments,
    likeCount: this.likeCount,
    viewCount: this.viewCount,
    impressionCount: this.impressionCount,
    engagementScore: this.engagementScore,
    memberCount: this.memberCount,
    events: this.events,
    teams: this.teams,
    sponsors: this.sponsors,
    announcements: this.announcements,
    feedbacks: this.feedbacks,
    slug: this.slug,
  };
};

/* ------------------------- Virtuals ------------------------- */
clubSchema.virtual("engagementScore").get(function () {
  return this.likeCount * 3 + this.viewCount * 2 + this.impressionCount;
});

clubSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

/* ------------------------- RBAC Helpers ------------------------- */
clubSchema.methods.canEdit = function (role) {
  return ["superadmin", "admin", "club_head"].includes(role);
};

clubSchema.methods.canManageMembers = function (role) {
  return ["superadmin", "admin", "club_head"].includes(role);
};

clubSchema.methods.canDelete = function (role) {
  return ["superadmin", "admin"].includes(role);
};

clubSchema.methods.canView = function (role) {
  if (role === "public") return this.isPublic;
  return ["superadmin", "admin", "club_head", "club_member"].includes(role);
};

/* ------------------------- Static Methods ------------------------- */
clubSchema.statics.getTopClubsByEngagement = async function (limit = 10) {
  const clubs = await this.find({ deleted: false, status: "active" });
  return clubs
    .map((c) => ({ club: c, score: c.engagementScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

clubSchema.statics.getTopClubsByEngagementInPeriod = async function (days = 7, limit = 10) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const clubs = await this.find({
    deleted: false,
    status: "active",
    createdAt: { $gte: since },
  });

  return clubs
    .map((c) => ({ club: c, score: c.engagementScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

clubSchema.statics.getWeeklyLeaderboard = function (limit = 10) {
  return this.getTopClubsByEngagementInPeriod(7, limit);
};

clubSchema.statics.getMonthlyLeaderboard = function (limit = 10) {
  return this.getTopClubsByEngagementInPeriod(30, limit);
};

clubSchema.statics.getTrendingClubs = async function (limit = 10) {
  const clubs = await this.find({ deleted: false, status: "active" });

  return clubs
    .map((c) => {
      const engagement = c.engagementScore;
      const daysSinceCreated = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 30 - daysSinceCreated);
      return { club: c, trendingScore: engagement + recencyBoost * 5 };
    })
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, limit);
};

/* ------------------------- Plugins ------------------------- */
clubSchema.plugin(mongoosePaginate);
clubSchema.plugin(autopopulate);
clubSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

/* ------------------------- Export ------------------------- */
module.exports = mongoose.model("Club", clubSchema);
