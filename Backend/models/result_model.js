/**
 * backend/models/result_model.js
 *
 * Result Schema
 * -----------------------------------------------------
 * - Links to Event, Registration, Team, Student
 * - Tracks rank, score, award, feedback, attachments
 * - Supports RBAC, audit logs, soft delete
 * - Provides leaderboard + highlights
 */

const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const mongooseDelete = require("mongoose-delete");
const autopopulate = require("mongoose-autopopulate");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema } = mongoose;

/* ------------------------- Constants ------------------------- */
const RESULT_STATUSES = ["draft", "published", "revoked", "pending", "approved", "rejected"];

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

/* ------------------------- Main Schema ------------------------- */
const resultSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      autopopulate: true,
      index: true,
    },
    registration: { type: Schema.Types.ObjectId, ref: "Registration", default: null, autopopulate: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", default: null, autopopulate: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, autopopulate: true },

    rank: { type: Number, default: null, min: 1 },
    score: { type: Number, default: null },
    award: { type: String, trim: true, default: "" },
    feedback: { type: String, trim: true, default: "" },

    certificates: { type: [String], default: [] },
    scoreSheets: { type: [String], default: [] },
    media: { type: [String], default: [] },

    status: { type: String, enum: RESULT_STATUSES, default: "draft", index: true },

    issuedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    issuedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: "" },

    logs: { type: [LogSchema], default: [] },

    isHighlighted: { type: Boolean, default: false },
    points: { type: Number, default: 0 },

    notes: { type: String, default: "" },
    eventDate: { type: Date },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ------------------------- Virtuals ------------------------- */
resultSchema.virtual("isPublished").get(function () {
  return this.status === "published";
});

/* ------------------------- Plugins ------------------------- */
resultSchema.plugin(mongoosePaginate);
resultSchema.plugin(autopopulate);
resultSchema.plugin(uniqueValidator, { message: "{PATH} must be unique." });
resultSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

/* ------------------------- Hooks ------------------------- */
resultSchema.pre("save", async function (next) {
  if (this.status === "published" && !this.issuedAt) {
    this.issuedAt = new Date();
  }

  if (this.event && !this.eventDate) {
    const Event = require("./event_model");
    const evt = await Event.findById(this.event).select("startDate endDate");
    if (evt) this.eventDate = evt.startDate || new Date();
  }

  next();
});

/* ------------------------- Instance Methods ------------------------- */
resultSchema.methods.publish = async function (actor = null, options = {}) {
  this.status = "published";
  this.issuedBy = actor || this.issuedBy || null;
  this.issuedAt = this.issuedAt || new Date();
  if (options.award) this.award = options.award;
  if (options.rank) this.rank = options.rank;
  if (options.score) this.score = options.score;
  if (options.feedback) this.feedback = options.feedback;
  this.logs.push({ action: "published", actor, notes: options.notes || "" });
  await this.save();
  return this;
};

resultSchema.methods.revoke = async function (actor = null, reason = "") {
  this.status = "revoked";
  this.revokedBy = actor || this.revokedBy || null;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  // Optionally reset rank/score for leaderboard consistency
  // this.rank = null;
  // this.score = null;
  this.logs.push({ action: "revoked", actor, notes: reason });
  await this.save();
  return this;
};

/* ------------------------- RBAC ------------------------- */
resultSchema.methods.canStudentView = function (studentId) {
  return !this.deleted && this.student?._id?.equals(studentId);
};
resultSchema.methods.canOrganizerView = function (organizerEventIds = []) {
  return !this.deleted && organizerEventIds.includes(this.event._id.toString());
};
resultSchema.methods.canFacultyView = function (facultyEventIds = []) {
  return !this.deleted && facultyEventIds.includes(this.event._id.toString());
};
resultSchema.methods.canAdminView = function () {
  return !this.deleted;
};

resultSchema.methods.canStudentEdit = () => false;
resultSchema.methods.canOrganizerEdit = function (organizerEventIds = []) {
  return organizerEventIds.includes(this.event._id.toString());
};
resultSchema.methods.canFacultyEdit = () => false;
resultSchema.methods.canAdminEdit = () => true;

/* ------------------------- Static Helpers ------------------------- */
resultSchema.statics.findByStudentWithRole = function (studentId, user) {
  if (!user) return [];
  if (user.role === "admin") return this.find({ student: studentId });
  if (user.role === "student" && user._id.equals(studentId)) return this.find({ student: studentId });
  if (["organizer", "faculty"].includes(user.role)) {
    const eventIds = (user.assignedEvents || []).map((e) => e.toString());
    return this.find({ student: studentId, event: { $in: eventIds } });
  }
  return [];
};

resultSchema.statics.findByEventWithRole = function (eventId, user) {
  if (!user) return [];
  if (user.role === "admin") return this.find({ event: eventId });
  if (user.role === "student") return this.find({ event: eventId, student: user._id });
  if (["organizer", "faculty"].includes(user.role)) {
    const eventIds = (user.assignedEvents || []).map((e) => e.toString());
    if (eventIds.includes(eventId.toString())) return this.find({ event: eventId });
  }
  return [];
};

/* ------------------------- Leaderboard ------------------------- */
resultSchema.statics.getLeaderboard = async function (eventId, limit = 10) {
  const match = { event: mongoose.Types.ObjectId(eventId), status: "published" };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$student",
        totalScore: { $sum: "$score" },
        ranks: { $push: "$rank" },
        events: { $push: "$event" },
      },
    },
    { $sort: { totalScore: -1 } },
    { $limit: limit },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "student" } },
    { $unwind: "$student" },
    {
      $project: {
        _id: 0,
        student: { _id: "$student._id", name: "$student.name", email: "$student.email" },
        totalScore: 1,
        ranks: 1,
        events: 1,
      },
    },
  ]);
};

/* ------------------------- Export ------------------------- */
module.exports = mongoose.model("Result", resultSchema);
