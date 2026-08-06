/**
 * api.js — Central API base URL configuration
 * 
 * In production: reads VITE_API_URL from Vercel environment
 * In development: empty string → Vite proxy handles /api/* → localhost:5000
 */
export const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Wrapper around fetch that prepends the API base URL
 */
export async function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}
