/**
 * backend/models/lookup_model.js
 *
 * Generic Lookup Model
 * --------------------
 * Used for dropdowns, controlled vocabularies, and categorization
 * Examples: programs, departments, designations, event roles, club positions
 */

const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const { Schema } = mongoose;

const LOOKUP_TYPES = [
  'program',       // MCA, BCA, B.Tech, etc.
  'department',    // Computer Science, ECE, Mechanical
  'designation',   // Faculty, HOD, Principal, etc.
  'clubPosition',  // President, Secretary, Treasurer
  'eventRole',     // Volunteer, Judge, Organizer
  'other',         // Fallback for misc types
];

const lookupSchema = new Schema(
  {
    type: {
      type: String,
      enum: LOOKUP_TYPES,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },
    description: { type: String, trim: true, maxlength: 300, default: '' },

    // Optional fields for ordering and metadata
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique constraint to prevent duplicate type + name
lookupSchema.index({ type: 1, name: 1 }, { unique: true });

// Optional: unique code per type for programmatic lookups
lookupSchema.index({ type: 1, code: 1 }, { unique: true, sparse: true });

// Plugins
lookupSchema.plugin(autopopulate);

const Lookup = mongoose.model('Lookup', lookupSchema);
module.exports = Lookup;
