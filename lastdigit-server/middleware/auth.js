const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

/**
 * Protect routes — verify JWT token OR Admin API Key.
 * - JWT: Authorization: Bearer <token>  → sets req.user from DB
 * - API Key: X-Admin-Key: <ADMIN_API_KEY>  → sets req.user as synthetic admin
 */
const protect = async (req, res, next) => {
  try {
    // ── Admin API Key shortcut (no login required) ────────────────────────────
    const adminKey = req.headers['x-admin-key'];
    if (adminKey) {
      if (adminKey === process.env.ADMIN_API_KEY) {
        req.user = { id: 0, name: 'Admin', email: 'admin@local', role: 'admin', isActive: true };
        return next();
      }
      return res.status(403).json({ success: false, message: 'Invalid admin key.' });
    }

    // ── JWT Bearer token ──────────────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive'],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account disabled.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Optional auth — attaches req.user if valid token provided, but doesn't block if absent.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'email', 'role', 'isActive'],
      });
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (_err) {
    // Continue without req.user
  }
  next();
};

/**
 * Restrict to admin role only.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required.' });
};

module.exports = { protect, optionalAuth, adminOnly };
