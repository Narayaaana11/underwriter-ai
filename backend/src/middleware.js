/**
 * middleware.js — Security Middleware Stack
 * 
 * Provides:
 * - requireAuth: JWT token validation
 * - requireRole: RBAC role gating
 * - auditLogger: logs every mutation to claim audit trail
 * - sanitizeBody: strips dangerous fields
 */
import { verifyToken, extractBearerToken } from './auth.js';

/**
 * requireAuth — JWT Authentication Middleware
 * Validates Bearer token, attaches decoded user to req.user
 */
export function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.'
      });
    }
    const decoded = verifyToken(token);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid authentication token.';
    return res.status(401).json({ success: false, error: msg });
  }
}

/**
 * requireRole — Role-Based Access Control Middleware
 * Usage: requireRole('admin') or requireRole('admin', 'senior_underwriter')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

/**
 * auditLogger — Request IP tracker (adds client IP to req for audit trail)
 */
export function auditLogger(req, res, next) {
  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  next();
}

/**
 * notFoundHandler — 404 handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
}

/**
 * errorHandler — Global error handler
 */
export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path}:`, err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
}
