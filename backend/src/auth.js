/**
 * auth.js — JWT Authentication & bcrypt Password Utilities
 * Provides: generateToken, verifyToken, hashPassword, comparePassword
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'ledger_super_secret_jwt_key_change_in_production_min_32_chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// In-memory token blacklist (for logout; use Redis in production)
const tokenBlacklist = new Set();

/**
 * Generate a signed JWT token for a user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT token
 * Returns decoded payload or throws
 */
export function verifyToken(token) {
  if (tokenBlacklist.has(token)) {
    throw new Error('Token has been invalidated');
  }
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Invalidate a token (logout)
 */
export function blacklistToken(token) {
  tokenBlacklist.add(token);
  // Auto-clean after 25 hours to prevent memory leak
  setTimeout(() => tokenBlacklist.delete(token), 25 * 60 * 60 * 1000);
}

/**
 * Hash a plain-text password using bcrypt (cost factor 12)
 */
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, 12);
}

/**
 * Compare a plain-text password against a bcrypt hash
 */
export async function comparePassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Extract the Bearer token from an Authorization header
 */
export function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
