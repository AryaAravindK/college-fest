/**
 * team_middleware.js
 * -----------------------
 * Middleware for Team module.
 * Responsibilities:
 * - JWT authentication
 * - Role-based access control
 * - Team management permission checks
 * - Request validation result handling
 */

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Team = require('../models/team_model');
const User = require('../models/user_model');
const { canUserManageTeam } = require('../utils/team_util');

const JWT_SECRET = process.env.JWT_SECRET;

/* -------------------------
   Handle validation errors
------------------------- */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/* -------------------------
   JWT Authentication
------------------------- */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

/* -------------------------
   Role-based access
------------------------- */
const permitRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role' });
  }
  next();
};

/* -------------------------
   Check if user can manage the team
------------------------- */
const canManageTeam = async (req, res, next) => {
  const { teamId } = req.params;
  if (!teamId) return res.status(400).json({ success: false, message: 'Team ID is required' });

  try {
    const team = await Team.findById(teamId).populate('event');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const allowed = await canUserManageTeam(team, req.user);
    if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden: Cannot manage this team' });

    req.team = team; // Attach team to request for controller usage
    next();
  } catch (err) {
    console.error('canManageTeam middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* -------------------------
   Export middleware
------------------------- */
module.exports = {
  authMiddleware,
  permitRoles,
  canManageTeam,
  handleValidationErrors
};
