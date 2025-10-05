/**
 * backend/middlewares/result_middleware.js
 *
 * Middleware for Result routes
 * ----------------------------
 * Features:
 * - JWT authentication
 * - Role-based access control
 * - Request validation using result_validator.js
 * - Ownership and permission checks
 */

const jwt = require("jsonwebtoken");
const Result = require("../models/result_model");
const { validateCreateResult, validateUpdateResult, validateApproveReject } = require("../validators/result_validator");
const mongoose = require("mongoose");
const User = require("../models/user_model");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 🔹 Authenticate JWT token and attach user to req
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Missing or invalid authorization header" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * 🔹 Role-based access control middleware
 * @param {Array} allowedRoles
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role))
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    next();
  };
}

/**
 * 🔹 Validate create result request
 */
async function validateCreate(req, res, next) {
  try {
    req.body = await validateCreateResult(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ message: "Validation error", details: error.details.map((d) => d.message) });
  }
}

/**
 * 🔹 Validate update result request
 */
async function validateUpdate(req, res, next) {
  try {
    req.body = await validateUpdateResult(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ message: "Validation error", details: error.details.map((d) => d.message) });
  }
}

/**
 * 🔹 Validate approve/reject request
 */
async function validateApproveRejectRequest(req, res, next) {
  try {
    req.body = await validateApproveReject(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ message: "Validation error", details: error.details.map((d) => d.message) });
  }
}

/**
 * 🔹 Check if user can modify a result (update/delete)
 */
async function canModifyResult(req, res, next) {
  try {
    const resultId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(resultId))
      return res.status(400).json({ message: "Invalid result ID" });

    const result = await Result.findById(resultId);
    if (!result) return res.status(404).json({ message: "Result not found" });

    // Only admin or enteredBy can update
    if (req.user.role === "admin" || (result.enteredBy && result.enteredBy.toString() === req.user.id)) {
      req.result = result;
      return next();
    }

    return res.status(403).json({ message: "You do not have permission to modify this result" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

/**
 * 🔹 Check if user can approve/reject a result
 */
async function canApproveRejectResult(req, res, next) {
  try {
    const resultId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(resultId))
      return res.status(400).json({ message: "Invalid result ID" });

    const result = await Result.findById(resultId);
    if (!result) return res.status(404).json({ message: "Result not found" });

    // Only faculty assigned to event or admin can approve/reject
    if (req.user.role === "faculty" || req.user.role === "admin") {
      req.result = result;
      return next();
    }

    return res.status(403).json({ message: "You do not have permission to approve/reject this result" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  validateCreate,
  validateUpdate,
  validateApproveRejectRequest,
  canModifyResult,
  canApproveRejectResult,
};
