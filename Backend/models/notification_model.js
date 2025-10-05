/**
 * backend/models/notification_model.js
 *
 * Notification Schema
 * --------------------
 * - Stores in-app notifications
 * - Links to Event, Result, Feedback, Payment, Team
 * - Role-based targeting
 * - Tracks read/unread state, priority, tags, scheduling
 * - Self-sync with createdBy & updatedBy
 */

const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const autopopulate = require("mongoose-autopopulate");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema } = mongoose;

// 🔹 Constants
const NOTIF_TYPES = ["general", "event", "payment", "result", "otp"];
const NOTIF_PRIORITIES = ["low", "normal", "high"];
const ROLES = ["public", "student", "organizer", "faculty", "admin"];

// 🔹 Schema
const notificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, trim: true, default: "" },
    type: { type: String, enum: NOTIF_TYPES, default: "general" },
    priority: { type: String, enum: NOTIF_PRIORITIES, default: "normal" },

    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, autopopulate: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", default: null, autopopulate: true },

    roles: { type: [String], enum: ROLES, default: [] },

    event: { type: Schema.Types.ObjectId, ref: "Event", default: null, autopopulate: true },
    result: { type: Schema.Types.ObjectId, ref: "Result", default: null, autopopulate: true },
    feedback: { type: Schema.Types.ObjectId, ref: "Feedback", default: null, autopopulate: true },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", default: null, autopopulate: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", default: null, autopopulate: true },

    read: { type: Boolean, default: false },
    attachments: [{ type: String }],
    tags: [{ type: String, trim: true }],
    actionLink: { type: String, trim: true, default: "" },

    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true },

    // 🔹 Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", autopopulate: true },
  },
  { timestamps: true }
);

// 🔹 Plugins
notificationSchema.plugin(mongoosePaginate);
notificationSchema.plugin(autopopulate);
notificationSchema.plugin(uniqueValidator, { message: "{PATH} must be unique." });

// 🔹 Instance Methods
notificationSchema.methods.markAsRead = async function () {
  this.read = true;
  await this.save();
  return this;
};

notificationSchema.methods.softDelete = async function () {
  this.isActive = false;
  await this.save();
  return this;
};

// 🔹 Role-based access helpers
notificationSchema.methods.isAdmin = function (user) { return user?.role === "admin"; };
notificationSchema.methods.isStudent = function (user) { return user?.role === "student"; };
notificationSchema.methods.isOrganizer = function (user) { return user?.role === "organizer"; };
notificationSchema.methods.isFaculty = function (user) { return user?.role === "faculty"; };
notificationSchema.methods.isPublic = function (user) { return user?.role === "public"; };

// Can view notification
notificationSchema.methods.canView = function (user) {
  if (!user) return false;
  if (this.isAdmin(user)) return true;
  if (this.recipient && this.recipient._id.equals(user._id)) return true;
  if (this.roles.includes(user.role)) return true;
  return false;
};

// 🔹 Static Methods
notificationSchema.statics.getNotificationsByRole = async function (role, userId, eventIds = []) {
  switch (role) {
    case "public":
      return this.find({ recipient: null, isActive: true }).sort({ createdAt: -1 }).lean();

    case "student":
      return this.find({
        isActive: true,
        $or: [
          { recipient: userId },
          { recipient: null },
          { event: { $in: eventIds } },
          { roles: "student" },
        ],
      }).sort({ createdAt: -1 }).lean();

    case "organizer":
    case "faculty":
      return this.find({
        isActive: true,
        $or: [{ event: { $in: eventIds } }, { recipient: null }, { roles: role }],
      }).sort({ createdAt: -1 }).lean();

    case "admin":
      return this.find({ isActive: true }).sort({ createdAt: -1 }).lean();

    default:
      return [];
  }
};

// 🔹 Hooks for audit
notificationSchema.pre("save", function (next) {
  if (this.isNew && !this.createdBy && this.sender) {
    this.createdBy = this.sender;
  }
  this.updatedBy = this.sender || this.updatedBy;
  next();
});

// 🔹 Export
module.exports = mongoose.model("Notification", notificationSchema);
