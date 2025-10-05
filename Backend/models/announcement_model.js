/**
 * backend/models/announcement_model.js
 *
 * Announcement Schema
 * - Linked to event (optional) or general
 * - Role-based access (view/edit)
 * - Priority levels, attachments, read-tracking
 * - Supports notifications (email/SMS), logs, soft-delete
 */

const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const mongooseDelete = require("mongoose-delete");
const autopopulate = require("mongoose-autopopulate");
const validator = require("validator");
const slugify = require("slugify");

const { Schema } = mongoose;

/* ------------------------- Constants ------------------------- */
const ANNOUNCEMENT_STATUSES = ["draft", "published", "archived"];
const ANNOUNCEMENT_CATEGORIES = ["general", "event", "workshop", "other"];
const ANNOUNCEMENT_PRIORITIES = ["low", "normal", "high", "urgent"];

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
    type: { type: String, trim: true, default: "file" },
  },
  { _id: false }
);

const ReadBySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ------------------------- Main Schema ------------------------- */
const announcementSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event", autopopulate: true, default: null },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    attachments: { type: [AttachmentSchema], default: [] },

    category: { type: String, enum: ANNOUNCEMENT_CATEGORIES, default: "general" },
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: "draft", index: true },
    priority: { type: String, enum: ANNOUNCEMENT_PRIORITIES, default: "normal" },
    tags: { type: [String], default: [] },

    logs: { type: [LogSchema], default: [] },
    readBy: { type: [ReadBySchema], default: [] },

    likes: [{ type: Schema.Types.ObjectId, ref: "User", autopopulate: true }],
    likeCount: { type: Number, default: 0 },

    notifyEmail: { type: Boolean, default: false },
    notifySms: { type: Boolean, default: false },

    slug: { type: String, unique: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },

    deleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ------------------------- Indexes ------------------------- */
announcementSchema.index({ event: 1, status: 1 });
announcementSchema.index({ "readBy.user": 1 });
announcementSchema.index({ createdAt: -1 });

/* ------------------------- Hooks ------------------------- */
announcementSchema.pre("save", function (next) {
  if (!this.createdBy && this.updatedBy) this.createdBy = this.updatedBy;

  if (!this.slug && this.title) {
    let baseSlug = slugify(this.title, { lower: true, strict: true }).slice(0, 50);
    this.slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  this.likeCount = this.likes.length;
  next();
});

/* ------------------------- Instance Methods ------------------------- */
announcementSchema.methods.publish = async function (actor = null) {
  this.status = "published";
  this.updatedBy = actor || this.updatedBy || null;
  this.logs.push({ action: "published", actor, notes: "" });
  await this.save();
  return this;
};

announcementSchema.methods.archive = async function (actor = null) {
  this.status = "archived";
  this.updatedBy = actor || this.updatedBy || null;
  this.logs.push({ action: "archived", actor, notes: "" });
  await this.save();
  return this;
};

announcementSchema.methods.markRead = async function (userId) {
  const existing = this.readBy.find((r) => r.user.toString() === userId.toString());
  if (!existing) {
    this.readBy.push({ user: userId });
    this.logs.push({ action: "read", actor: userId, notes: "" });
    await this.save();
  }
};

announcementSchema.methods.addLike = async function (userId) {
  if (!this.likes.some((id) => id.toString() === userId.toString())) {
    this.likes.push(userId);
    this.likeCount = this.likes.length;
    this.logs.push({ action: "liked", actor: userId, notes: "" });
    await this.save();
  }
};

announcementSchema.methods.removeLike = async function (userId) {
  this.likes = this.likes.filter((id) => id.toString() !== userId.toString());
  this.likeCount = this.likes.length;
  this.logs.push({ action: "unliked", actor: userId, notes: "" });
  await this.save();
};

/* ------------------------- RBAC ------------------------- */
announcementSchema.methods.canView = function (role, context = {}) {
  if (this.deleted) return false;
  if (role === "admin") return true;
  if (this.status !== "published") return false;
  if (!this.event) return true; // general announcement
  if (role === "student" && context.participatedEvents?.includes(this.event._id.toString())) return true;
  if (role === "organizer" && context.organizedEvents?.includes(this.event._id.toString())) return true;
  if (role === "faculty" && context.assignedEvents?.includes(this.event._id.toString())) return true;
  return false;
};

announcementSchema.methods.canEdit = function (role, context = {}) {
  if (this.deleted) return false;
  if (role === "admin") return true;
  if (role === "organizer" && (!this.event || context.organizedEvents?.includes(this.event._id.toString())))
    return true;
  return false;
};

/* ------------------------- Plugins ------------------------- */
announcementSchema.plugin(mongoosePaginate);
announcementSchema.plugin(autopopulate);
announcementSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

/* ------------------------- Export ------------------------- */
module.exports = mongoose.model("Announcement", announcementSchema);
