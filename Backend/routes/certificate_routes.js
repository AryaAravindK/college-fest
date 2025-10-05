/**
 * routes/certificate_routes.js
 *
 * Certificate Routes for College Fest Management System
 * -----------------------------------------------------
 * - Fully integrates controller, middleware, and validator
 * - Handles all endpoints: create, issue, approve, revoke, verify, download
 * - Role-based access control and soft-delete checks
 */

"use strict";

const express = require("express");
const router = express.Router();

const certificateController = require("../controllers/certificate_controller");
const certificateMiddleware = require("../middlewares/certificate_middleware");
const { certificateBaseValidation, validateCertificate } = require("../validators/certificate_validator");
const authMiddleware = require("../middlewares/auth_middleware"); // JWT authentication
const roleMiddleware = require("../middlewares/role_middleware"); // Optional extra role checks

/* -------------------------
   Certificate Routes
------------------------- */

/**
 * Create Certificate
 * POST /api/certificates
 * Roles: organizer, admin
 */
router.post(
  "/",
  authMiddleware.protect,
  roleMiddleware(['Organizer','Admin']),
  certificateBaseValidation,
  validateCertificate,
  certificateController.createCertificate
);

/**
 * Issue Certificate
 * PATCH /api/certificates/issue/:certificateId
 * Roles: organizer, admin
 */
router.patch(
  "/issue/:certificateId",
  authMiddleware.protect,
  certificateMiddleware.loadCertificate,
  certificateMiddleware.canIssueCertificate,
  certificateMiddleware.filterDeleted,
  certificateController.issueCertificate
);

/**
 * Approve Certificate
 * PATCH /api/certificates/approve/:certificateId
 * Roles: faculty, admin
 */
router.patch(
  "/approve/:certificateId",
  authMiddleware.protect,
  certificateMiddleware.loadCertificate,
  certificateMiddleware.canApproveCertificate,
  certificateMiddleware.filterDeleted,
  certificateController.approveCertificate
);

/**
 * Revoke Certificate
 * PATCH /api/certificates/revoke/:certificateId
 * Roles: organizer, faculty, admin
 */
router.patch(
  "/revoke/:certificateId",
  authMiddleware.protect,
  certificateMiddleware.loadCertificate,
  certificateMiddleware.canRevokeCertificate,
  certificateMiddleware.filterDeleted,
  certificateController.revokeCertificate
);

/**
 * Verify Certificate (public or logged in)
 * PATCH /api/certificates/verify/:certificateId
 */
router.patch(
  "/verify/:certificateId",
  // authMiddleware.optional, // can be public verification
  certificateMiddleware.loadCertificate,
  certificateMiddleware.canVerifyCertificate,
  certificateMiddleware.filterDeleted,
  certificateController.verifyCertificate
);

/**
 * Mark Certificate Downloaded
 * PATCH /api/certificates/download/:certificateId
 */
router.patch(
  "/download/:certificateId",
  // authMiddleware.optional,
  certificateMiddleware.loadCertificate,
  certificateMiddleware.filterDeleted,
  certificateController.markDownloaded
);

/**
 * Soft Delete Certificate
 * DELETE /api/certificates/:certificateId
 * Roles: admin only
 */
router.delete(
  "/:certificateId",
  authMiddleware.protect,
  roleMiddleware('Admin'),
  certificateMiddleware.loadCertificate,
  certificateMiddleware.filterDeleted,
  certificateController.softDeleteCertificate
);

/**
 * Get Certificate by ID
 * GET /api/certificates/:certificateId
 * Roles: student, organizer, faculty, admin
 */
router.get(
  "/:certificateId",
  authMiddleware.protect,
  certificateMiddleware.loadCertificate,
  certificateMiddleware.filterDeleted,
  (req, res, next) => {
    const role = req.user.role;
    switch (role) {
      case "student":
        certificateMiddleware.studentAccess(req, res, next);
        break;
      case "organizer":
        certificateMiddleware.organizerAccess(req, res, next);
        break;
      case "faculty":
        certificateMiddleware.facultyAccess(req, res, next);
        break;
      case "admin":
        certificateMiddleware.adminAccess(req, res, next);
        break;
      default:
        return res.status(403).json({ error: "Forbidden" });
    }
  },
  certificateController.getCertificateById
);

/**
 * Get Certificates by Student
 * GET /api/certificates/student/:studentId
 * Roles: student (own), organizer, faculty, admin
 */
router.get(
  "/student/:studentId",
  authMiddleware.protect,
  certificateController.getCertificatesByStudent
);

/**
 * Get Certificates by Event
 * GET /api/certificates/event/:eventId
 * Roles: organizer, faculty, admin
 */
router.get(
  "/event/:eventId",
  authMiddleware.protect,
  certificateController.getCertificatesByEvent
);

/**
 * Batch Update Certificates
 * POST /api/certificates/batch
 * Roles: organizer, faculty, admin
 */
router.post(
  "/batch",
  authMiddleware.protect,
  // roleMiddleware.onlyOrganizerFacultyAdmin,   Here and many more such instance chatgpt has provided pseudo code instead of actual code
  roleMiddleware(['Organizer','Faculty','Admin']),
  certificateController.batchUpdateCertificates
);

/* -------------------------
   Export Router
------------------------- */
module.exports = router;
