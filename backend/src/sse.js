/**
 * sse.js — Server-Sent Events (SSE) Real-Time Broadcaster
 * 
 * Maintains a registry of connected clients and broadcasts
 * typed events to all or specific connected sessions.
 * 
 * Usage:
 *   import { sseClients, broadcastEvent } from './sse.js';
 * 
 *   // Route
 *   app.get('/api/events', (req, res) => {
 *     sseClients.register(res, req.user.role);
 *   });
 * 
 *   // Broadcast
 *   broadcastEvent({ type: 'CLAIM_SUBMITTED', data: claim });
 */

const clients = new Map(); // clientId -> { res, role, userId, connectedAt }
let clientIdCounter = 0;

export const sseClients = {
  /**
   * Register a new SSE client (underwriters & admins only get all events)
   */
  register(res, role = 'unknown', userId = 'unknown') {
    const id = ++clientIdCounter;
    
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ 
      clientId: id, 
      message: 'Connected to Ledger real-time event stream.',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Register client
    clients.set(id, { res, role, userId, connectedAt: new Date().toISOString() });

    // Heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
        clients.delete(id);
      }
    }, 30000);

    // Clean up on disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(id);
    });

    return id;
  },

  /**
   * Get count of active connections
   */
  count() {
    return clients.size;
  }
};

/**
 * Broadcast a typed event to all connected SSE clients
 * @param {Object} event - { type: string, data: object }
 * @param {string[]} [targetRoles] - If specified, only send to these roles
 */
export function broadcastEvent(event, targetRoles = null) {
  const payload = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString()
  });
  
  const message = `event: ${event.type}\ndata: ${payload}\n\n`;
  
  const dead = [];
  for (const [id, client] of clients.entries()) {
    // Role filter
    if (targetRoles && !targetRoles.includes(client.role)) continue;
    
    try {
      client.res.write(message);
    } catch {
      dead.push(id);
    }
  }
  
  // Remove dead connections
  dead.forEach(id => clients.delete(id));
}
