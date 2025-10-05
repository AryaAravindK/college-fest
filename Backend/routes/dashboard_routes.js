/**
 * backend/routes/dashboard_routes.js
 *
 * Routes for role-based dashboards in College Fest Management System
 * ------------------------------------------------------------------
 * Features:
 *  - Single entry point:   GET /api/dashboard        → auto-dispatch by user role
 *  - Role-specific routes: GET /api/dashboard/student, /organizer, /faculty, /admin
 *  - Uses JWT authentication (auth_middleware)
 *  - Uses role-based access control (role_middleware)
 *  - Validates query params with dashboard_validator
 *  - Academic project ready (production-grade structure & comments)
 */

const express = require('express');
const { validationResult } = require('express-validator');

// Middlewares
const {protect} = require('../middlewares/auth_middleware');
const roleMiddleware = require('../middlewares/role_middleware');

// Controllers
const dashboardController = require('../controllers/dashboard_controller');

// Validators (grouped by role)
const {
  studentDashboardValidators,
  organizerDashboardValidators,
  facultyDashboardValidators,
  adminDashboardValidators
} = require('../validators/dashboard_validator');

const router = express.Router();

/* -------------------------
   Helper: Validate requests
------------------------- */
function validateRequest(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  };
}

/* -------------------------
   Single entry point
   GET /api/dashboard
   - Auto-dispatches to correct role dashboard
------------------------- */
router.get(
  '/',
  protect,                        // user must be logged in
  validateRequest([]),                 // no extra params, just JWT
  dashboardController.getDashboard     // internally dispatches by req.user.role
);

/* -------------------------
   Student Dashboard
   GET /api/dashboard/student
------------------------- */
router.get(
  '/student',
  protect,                                         // must be logged in
  roleMiddleware(['student']),                          // only student role allowed
  validateRequest(studentDashboardValidators),          // validate query params
  dashboardController.getStudentDashboard               // controller method
);

/* -------------------------
   Organizer Dashboard
   GET /api/dashboard/organizer
------------------------- */
router.get(
  '/organizer',
  protect,
  roleMiddleware(['organizer']),
  validateRequest(organizerDashboardValidators),
  dashboardController.getOrganizerDashboard
);

/* -------------------------
   Faculty Dashboard
   GET /api/dashboard/faculty
------------------------- */
router.get(
  '/faculty',
  protect,
  roleMiddleware(['faculty']),
  validateRequest(facultyDashboardValidators),
  dashboardController.getFacultyDashboard
);

/* -------------------------
   Admin Dashboard
   GET /api/dashboard/admin
------------------------- */
router.get(
  '/admin',
  protect,
  roleMiddleware(['admin']),
  validateRequest(adminDashboardValidators),
  dashboardController.getAdminDashboard
);

/* -------------------------
   Export Router
------------------------- */
module.exports = router;
