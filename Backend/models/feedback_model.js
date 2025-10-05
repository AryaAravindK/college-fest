/**
 * backend/models/feedback_model.js
 *
 * Feedback Schema for College Fest Management System
 * ---------------------------------------------------
 * - Links to Event, Registration, Team, Student
 * - Tracks ratings, comments, attachments, likes, responses
 * - Supports RBAC, moderation, audit logs, soft delete
 */

const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const mongooseDelete = require("mongoose-delete");
const autopopulate = require("mongoose-autopopulate");
const validator = require("validator");

const { Schema } = mongoose;

/* ------------------------- Constants ------------------------- */
const FEEDBACK_TYPES = ["event", "session", "workshop", "general"];
const FEEDBACK_STATUSES = ["draft", "published", "archived"];
const MODERATION_STATUSES = ["pending", "approved", "rejected"];

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

/* ------------------------- Main Schema ------------------------- */
const feedbackSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event", autopopulate: true, required: true, index: true },
    registration: { type: Schema.Types.ObjectId, ref: "Registration", autopopulate: true, default: null },
    team: { type: Schema.Types.ObjectId, ref: "Team", autopopulate: true, default: null },
    student: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true, required: true },

    type: { type: String, enum: FEEDBACK_TYPES, default: "general", index: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    comments: { type: String, trim: true, maxlength: 2000, default: "" },
    attachments: { type: [AttachmentSchema], default: [] },
    likes: [{ type: Schema.Types.ObjectId, ref: "User", autopopulate: true }],
    tags: [{ type: String, trim: true }],
    response: { type: String, trim: true, default: "" },

    status: { type: String, enum: FEEDBACK_STATUSES, default: "draft", index: true },
    moderationStatus: { type: String, enum: MODERATION_STATUSES, default: "pending", index: true },
    moderator: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true, default: null },
    moderationReason: { type: String, default: "" },

    logs: { type: [LogSchema], default: [] },
    notes: { type: String, default: "" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ------------------------- Indexes ------------------------- */
feedbackSchema.index({ event: 1, student: 1, type: 1 }, { unique: true, sparse: true });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ rating: -1 });

/* ------------------------- Hooks ------------------------- */
feedbackSchema.pre("save", function (next) {
  if (!this.createdBy && this.student) this.createdBy = this.student;
  next();
});

/* ------------------------- Instance Methods ------------------------- */
feedbackSchema.methods.publish = async function (actor = null) {
  this.status = "published";
  this.updatedBy = actor || this.updatedBy || null;
  this.logs.push({ action: "published", actor });
  await this.save();
  return this;
};

feedbackSchema.methods.archive = async function (actor = null) {
  this.status = "archived";
  this.updatedBy = actor || this.updatedBy || null;
  this.logs.push({ action: "archived", actor });
  await this.save();
  return this;
};

feedbackSchema.methods.addLike = async function (userId) {
  if (!this.likes.some((id) => id.toString() === userId.toString())) this.likes.push(userId);
  await this.save();
};

feedbackSchema.methods.removeLike = async function (userId) {
  this.likes = this.likes.filter((id) => id.toString() !== userId.toString());
  await this.save();
};

feedbackSchema.methods.addResponse = async function (responseText, actor) {
  this.response = responseText;
  this.updatedBy = actor;
  await this.save();
};

/* ------------------------- Virtuals ------------------------- */
feedbackSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

feedbackSchema.virtual("engagementScore").get(function () {
  return this.likeCount + (this.rating || 0) * 2;
});

/* ------------------------- RBAC ------------------------- */
feedbackSchema.methods.canStudentView = function (studentId) {
  return !this.deleted && this.student?._id?.equals(studentId);
};
feedbackSchema.methods.canOrganizerView = function (organizerEventIds = []) {
  return !this.deleted && organizerEventIds.includes(this.event._id.toString());
};
feedbackSchema.methods.canFacultyView = function (facultyEventIds = []) {
  return !this.deleted && facultyEventIds.includes(this.event._id.toString());
};
feedbackSchema.methods.canAdminView = function () {
  return !this.deleted;
};

feedbackSchema.methods.canStudentEdit = function (studentId) {
  return !this.deleted && this.student?._id?.equals(studentId) && this.status === "draft";
};
feedbackSchema.methods.canOrganizerEdit = function (organizerEventIds = []) {
  return organizerEventIds.includes(this.event._id.toString());
};
feedbackSchema.methods.canFacultyEdit = () => false;
feedbackSchema.methods.canAdminEdit = () => true;

/* ------------------------- Static Helpers ------------------------- */
feedbackSchema.statics.findByStudentWithRole = function (studentId, user) {
  if (!user) return [];
  if (user.role === "admin") return this.find({ student: studentId });
  if (user.role === "student" && user._id.equals(studentId)) return this.find({ student: studentId });
  if (["organizer", "faculty"].includes(user.role)) {
    const eventIds = (user.assignedEvents || []).map((e) => e.toString());
    return this.find({ student: studentId, event: { $in: eventIds } });
  }
  return [];
};

feedbackSchema.statics.findByEventWithRole = function (eventId, user) {
  if (!user) return [];
  if (user.role === "admin") return this.find({ event: eventId });
  if (user.role === "student") return this.find({ event: eventId, student: user._id });
  if (["organizer", "faculty"].includes(user.role)) {
    const eventIds = (user.assignedEvents || []).map((e) => e.toString());
    if (eventIds.includes(eventId.toString())) return this.find({ event: eventId });
  }
  return [];
};

/* ------------------------- Plugins ------------------------- */
feedbackSchema.plugin(mongoosePaginate);
feedbackSchema.plugin(autopopulate);
feedbackSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

/* ------------------------- Export ------------------------- */
module.exports = mongoose.model("Feedback", feedbackSchema);
