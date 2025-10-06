/**
 * middlewares/certificate_middleware.js
 *
 * Certificate Middleware for College Fest Management System
 * ---------------------------------------------------------
 * - Role-based access control for student, organizer, faculty, admin
 * - Permission checks for view, issue, approve, revoke, verify, download
 * - Soft-delete handling
 * - Integrates with certificate utils and model methods
 */

"use strict";

const Certificate = require("../models/certificate_model");
const User = require("../models/user_model");
const certificateUtil = require("../utils/certificate_util");

/* -------------------------
   Helper: fetch certificate by ID param
------------------------- */
async function loadCertificate(req, res, next) {
  try {
    const certId = req.params.certificateId || req.body.certificateId;
    if (!certId) return res.status(400).json({ error: "certificateId is required" });

    const certificate = await Certificate.find({_id:certId});
    if (!certificate) return res.status(404).json({ error: "Certificate not found" });

    req.certificate = certificate;
    next();
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Role-Based Access Middleware
------------------------- */

// Only the student who owns the certificate can access
function studentAccess(req, res, next) {
  const user = req.user;
  const cert = req.certificate;

  if (!user || user.role !== "student") return res.status(403).json({ error: "Forbidden: student only" });
  if (!certificateUtil.canStudentView(cert, user._id)) return res.status(403).json({ error: "You cannot access this certificate" });

  next();
}

// Organizer can access certificates for their events
function organizerAccess(req, res, next) {
  const user = req.user;
  const cert = req.certificate;

  if (!user || user.role !== "organizer") return res.status(403).json({ error: "Forbidden: organizer only" });
  const organizerEventIds = user.managedEvents || []; // assume organizer model has managedEvents array
  if (!certificateUtil.canOrganizerView(cert, organizerEventIds)) return res.status(403).json({ error: "You cannot access this certificate" });

  next();
}

// Faculty access
function facultyAccess(req, res, next) {
  const user = req.user;
  const cert = req.certificate;

  if (!user || user.role !== "faculty") return res.status(403).json({ error: "Forbidden: faculty only" });
  const facultyEventIds = user.managedEvents || [];
  if (!certificateUtil.canFacultyView(cert, facultyEventIds)) return res.status(403).json({ error: "You cannot access this certificate" });

  next();
}

// Admin access
function adminAccess(req, res, next) {
  const user = req.user;
  const cert = req.certificate;

  if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden: admin only" });
  if (!certificateUtil.canAdminView(cert)) return res.status(403).json({ error: "You cannot access this certificate" });

  next();
}

/* -------------------------
   Action-Specific Middlewares
------------------------- */

// Check if user can issue a certificate
async function canIssueCertificate(req, res, next) {
  const user = req.user;
  if (!user) return res.status(403).json({ error: "Unauthorized" });
  if (!["organizer", "admin"].includes(user.role)) return res.status(403).json({ error: "Only organizer or admin can issue certificates" });
  next();
}

// Check if user can approve a certificate
async function canApproveCertificate(req, res, next) {
  const user = req.user;
  if (!user) return res.status(403).json({ error: "Unauthorized" });
  if (!["faculty", "admin"].includes(user.role)) return res.status(403).json({ error: "Only faculty or admin can approve certificates" });
  next();
}

// Check if user can revoke a certificate
async function canRevokeCertificate(req, res, next) {
  const user = req.user;
  if (!user) return res.status(403).json({ error: "Unauthorized" });
  if (!["organizer", "faculty", "admin"].includes(user.role)) return res.status(403).json({ error: "Only organizer, faculty or admin can revoke certificates" });
  next();
}

// Check if user can verify a certificate
async function canVerifyCertificate(req, res, next) {
  const user = req.user;
  if (!user) return res.status(403).json({ error: "Unauthorized" });
  // anyone can verify publicly (for public verification)
  next();
}

// Soft-delete filter middleware
async function filterDeleted(req, res, next) {
  const cert = req.certificate;
  if (cert.deleted) return res.status(410).json({ error: "Certificate has been deleted" });
  next();
}

/* -------------------------
   Export Middlewares
------------------------- */
module.exports = {
  loadCertificate,
  studentAccess,
  organizerAccess,
  facultyAccess,
  adminAccess,
  canIssueCertificate,
  canApproveCertificate,
  canRevokeCertificate,
  canVerifyCertificate,
  filterDeleted
};
