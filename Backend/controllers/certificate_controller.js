/**
 * controllers/certificate_controller.js
 *
 * Certificate Controller for College Fest Management System
 * ---------------------------------------------------------
 * - Fully integrates with utils, validators, and middlewares
 * - Handles CRUD, lifecycle actions, verification, download tracking
 * - Supports pagination, batch operations, role-based access
 */

"use strict";

const certificateUtil = require("../utils/certificate_util");
const Certificate = require("../models/certificate_model");
const { validationResult } = require("express-validator");

/* -------------------------
   Create Certificate
------------------------- */
async function createCertificate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const certData = req.body;
    const cert = await certificateUtil.createCertificate(certData);

    return res.status(201).json({
      message: "Certificate created successfully",
      certificate: cert
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Issue Certificate
------------------------- */
async function issueCertificate(req, res, next) {
  try {
    const cert = req.certificate;
    const actorId = req.user._id;
    const options = req.body || {};

    const issuedCert = await certificateUtil.issueCertificate(cert, actorId, options);
    return res.status(200).json({
      message: "Certificate issued successfully",
      certificate: issuedCert
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Approve Certificate
------------------------- */
async function approveCertificate(req, res, next) {
  try {
    const cert = req.certificate;
    const actorId = req.user._id;
    const notes = req.body.notes || "";

    const approvedCert = await certificateUtil.approveCertificate(cert, actorId, notes);
    return res.status(200).json({
      message: "Certificate approved successfully",
      certificate: approvedCert
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Revoke Certificate
------------------------- */
async function revokeCertificate(req, res, next) {
  try {
    const cert = req.certificate;
    const actorId = req.user._id;
    const reason = req.body.reason || "";

    const revokedCert = await certificateUtil.revokeCertificate(cert, actorId, reason);
    return res.status(200).json({
      message: "Certificate revoked successfully",
      certificate: revokedCert
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Verify Certificate
------------------------- */
async function verifyCertificate(req, res, next) {
  try {
    const cert = req.certificate;
    const actorId = req.user ? req.user._id : null;

    const verifiedCert = await certificateUtil.verifyCertificate(cert, actorId);
    return res.status(200).json({
      message: "Certificate verified successfully",
      certificate: verifiedCert
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Mark Downloaded
------------------------- */
async function markDownloaded(req, res, next) {
  try {
    const cert = req.certificate;
    const actorId = req.user ? req.user._id : null;
    const info = req.body || {};

    const updatedCert = await certificateUtil.markCertificateDownloaded(cert, actorId, info);
    return res.status(200).json({
      message: "Certificate download tracked successfully",
      certificate: updatedCert
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Soft Delete Certificate
------------------------- */
async function softDeleteCertificate(req, res, next) {
  try {
    const cert = req.certificate;
    const actorId = req.user._id;
    const reason = req.body.reason || "";

    const deletedCert = await certificateUtil.softDeleteCertificate(cert, actorId, reason);
    return res.status(200).json({
      message: "Certificate soft-deleted successfully",
      certificate: deletedCert
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Get Certificate by ID
------------------------- */
async function getCertificateById(req, res, next) {
  try {
    const cert = req.certificate;
    return res.status(200).json({ certificate: cert });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Get Certificates by Student
------------------------- */
async function getCertificatesByStudent(req, res, next) {
  try {
    const studentId = req.params.studentId;
    const { category, status, page = 1, limit = 20 } = req.query;

    const options = {
      category,
      status,
      paginate: { page: parseInt(page), limit: parseInt(limit) }
    };

    const certificates = await certificateUtil.getCertificatesByStudent(studentId, options);
    return res.status(200).json({ certificates });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Get Certificates by Event
------------------------- */
async function getCertificatesByEvent(req, res, next) {
  try {
    const eventId = req.params.eventId;
    const { status, page = 1, limit = 20 } = req.query;

    const options = {
      status,
      paginate: { page: parseInt(page), limit: parseInt(limit) }
    };

    const certificates = await certificateUtil.getCertificatesByEvent(eventId, options);
    return res.status(200).json({ certificates });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Batch Update Certificates
------------------------- */
async function batchUpdateCertificates(req, res, next) {
  try {
    const { certificateIds, action, options } = req.body;
    const actorId = req.user._id;

    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0)
      return res.status(400).json({ error: "certificateIds must be a non-empty array" });

    if (!["issue", "approve", "revoke"].includes(action))
      return res.status(400).json({ error: "action must be one of 'issue', 'approve', 'revoke'" });

    const updatedCertificates = await certificateUtil.batchUpdateCertificates(certificateIds, action, actorId, options || {});
    return res.status(200).json({
      message: `Certificates ${action}d successfully`,
      certificates: updatedCertificates
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------
   Export Controller
------------------------- */
module.exports = {
  createCertificate,
  issueCertificate,
  approveCertificate,
  revokeCertificate,
  verifyCertificate,
  markDownloaded,
  softDeleteCertificate,
  getCertificateById,
  getCertificatesByStudent,
  getCertificatesByEvent,
  batchUpdateCertificates
};
