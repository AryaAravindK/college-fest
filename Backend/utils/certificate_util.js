/**
 * backend/utils/certificate_util.js
 *
 * Certificate Utility Functions for College Fest Management System
 * ---------------------------------------------------------------
 * - Handles advanced business logic for Certificates
 * - Covers issuing, approval, revocation, verification
 * - Delivery tracking, download logs, role-based access checks
 * - Pagination, filtering, and batch operations
 */

"use strict";

const Certificate = require("../models/certificate_model");
const User = require("../models/user_model");
const Event = require("../models/event_model");

/* -------------------------
   Core Utility Functions
------------------------- */

/**
 * Create a new certificate
 * @param {Object} data - Certificate data (student, event, title, category, template, fields)
 * @returns {Promise<Certificate>}
 */
async function createCertificate(data) {
  if (!data.student || !data.event || !data.title) {
    throw new Error("student, event, and title are required to create a certificate");
  }

  const cert = new Certificate({
    student: data.student,
    event: data.event,
    team: data.team || null,
    registration: data.registration || null,
    title: data.title,
    category: data.category || "participation",
    template: data.template || null,
    fields: data.fields || {},
    backgroundImage: data.backgroundImage || null,
    signatureImages: data.signatureImages || [],
    filePath: data.filePath || null,
    fileUrl: data.fileUrl || null,
    notes: data.notes || "",
  });

  await cert.save();
  return cert;
}

/**
 * Issue a certificate
 * @param {Certificate} cert
 * @param {ObjectId} actorId - User issuing the certificate
 * @param {Object} options - Optional fields, filePath, template, notes
 */
async function issueCertificate(cert, actorId, options = {}) {
  const actor = actorId ? await User.findById(actorId) : null;
  return cert.issue(actor, options);
}

/**
 * Approve a certificate
 * @param {Certificate} cert
 * @param {ObjectId} actorId - User approving the certificate
 * @param {String} notes - Optional approval notes
 */
async function approveCertificate(cert, actorId, notes = "") {
  const actor = actorId ? await User.findById(actorId) : null;
  return cert.approve(actor, notes);
}

/**
 * Revoke a certificate
 * @param {Certificate} cert
 * @param {ObjectId} actorId - User revoking the certificate
 * @param {String} reason - Reason for revocation
 */
async function revokeCertificate(cert, actorId, reason = "") {
  const actor = actorId ? await User.findById(actorId) : null;
  return cert.revoke(actor, reason);
}

/**
 * Verify a certificate
 * @param {Certificate} cert
 * @param {ObjectId} actorId - User verifying the certificate
 */
async function verifyCertificate(cert, actorId) {
  const actor = actorId ? await User.findById(actorId) : null;
  return cert.verifyCertificate(actor);
}

/**
 * Mark certificate as downloaded
 * @param {Certificate} cert
 * @param {ObjectId} actorId - User downloading
 * @param {Object} info - { destination: email/phone }
 */
async function markCertificateDownloaded(cert, actorId, info = null) {
  const actor = actorId ? await User.findById(actorId) : null;
  return cert.markDownloaded(actor, info);
}

/**
 * Soft delete a certificate
 * @param {Certificate} cert
 * @param {ObjectId} actorId - User performing deletion
 * @param {String} reason - Reason for deletion
 */
async function softDeleteCertificate(cert, actorId, reason = "") {
  const actor = actorId ? await User.findById(actorId) : null;
  return cert.softDelete(actor, reason);
}

/* -------------------------
   Role-Based Access Checks
------------------------- */

/**
 * Check if a student can view a certificate
 * @param {Certificate} cert
 * @param {ObjectId} studentId
 * @returns {Boolean}
 */
function canStudentView(cert, studentId) {
  return cert.canStudentView(studentId);
}

/**
 * Check if an organizer can view a certificate
 * @param {Certificate} cert
 * @param {Array<ObjectId>} organizerEventIds
 */
function canOrganizerView(cert, organizerEventIds = []) {
  return cert.canOrganizerView(organizerEventIds);
}

/**
 * Check if a faculty can view a certificate
 * @param {Certificate} cert
 * @param {Array<ObjectId>} facultyEventIds
 */
function canFacultyView(cert, facultyEventIds = []) {
  return cert.canFacultyView(facultyEventIds);
}

/**
 * Check if an admin can view a certificate
 * @param {Certificate} cert
 */
function canAdminView(cert) {
  return cert.canAdminView();
}

/* -------------------------
   Query & Pagination Helpers
------------------------- */

/**
 * Get certificate by certificateId
 * @param {String} certId
 */
async function getCertificateById(certId) {
  return Certificate.findByCertificateId(certId);
}

/**
 * Get certificates by student with optional filters
 * @param {ObjectId} studentId
 * @param {Object} options - { category, status, paginate: { page, limit } }
 */
async function getCertificatesByStudent(studentId, options = {}) {
  return Certificate.findByStudent(studentId, options);
}

/**
 * Get certificates by event with optional filters
 * @param {ObjectId} eventId
 * @param {Object} options - { status, paginate: { page, limit } }
 */
async function getCertificatesByEvent(eventId, options = {}) {
  return Certificate.findByEvent(eventId, options);
}

/**
 * Batch update certificates (e.g., mark all issued, approved)
 * @param {Array<ObjectId>} certificateIds
 * @param {String} action - 'issue' | 'approve' | 'revoke'
 * @param {ObjectId} actorId
 * @param {Object} options
 */
async function batchUpdateCertificates(certificateIds, action, actorId, options = {}) {
  const actor = actorId ? await User.findById(actorId) : null;
  const certificates = await Certificate.find({ _id: { $in: certificateIds } });

  const results = [];
  for (const cert of certificates) {
    if (action === "issue") results.push(await cert.issue(actor, options));
    else if (action === "approve") results.push(await cert.approve(actor, options.notes || ""));
    else if (action === "revoke") results.push(await cert.revoke(actor, options.reason || ""));
  }
  return results;
}

/* -------------------------
   Export Utilities
------------------------- */
module.exports = {
  createCertificate,
  issueCertificate,
  approveCertificate,
  revokeCertificate,
  verifyCertificate,
  markCertificateDownloaded,
  softDeleteCertificate,
  canStudentView,
  canOrganizerView,
  canFacultyView,
  canAdminView,
  getCertificateById,
  getCertificatesByStudent,
  getCertificatesByEvent,
  batchUpdateCertificates
};
