/**
 * Exercise 1: Implement Sticky Sessions with External Session Store
 *
 * Build a production-ready sticky session implementation using an external
 * session store (simulated with a Map, but design for Redis compatibility).
 *
 * Requirements:
 * 1. Implement cookie-based sticky sessions
 * 2. Create a shared session store that multiple workers can access
 * 3. Handle session creation, retrieval, and expiration
 * 4. Implement session persistence across worker restarts
 * 5. Add session migration when workers die
 * 6. Create a session cleanup mechanism for expired sessions
 *
 * Features to Implement:
 * - Session ID generation (secure random)
 * - Session affinity routing (cookie-based)
 * - Session store with TTL support
 * - Session data persistence
 * - Graceful session migration on worker failure
 * - Session statistics (total, active, expired)
 *
 * Bonus Challenges:
 * 1. Add IP-based fallback routing when cookie is missing
 * 2. Implement session refresh on activity (sliding expiration)
 * 3. Add session data encryption
 * 4. Create session replication across workers
 * 5. Implement session locking for concurrent updates
 * 6. Add Redis-compatible interface for easy migration
 *
 * Testing Requirements:
 * - Sessions persist across requests
 * - Sessions are maintained on same worker
 * - Sessions expire after timeout
 * - Sessions migrate when worker dies
 * - Session data is correctly stored and retrieved
 *
 * Your implementation should be below this comment block.
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

const PORT = 8000;
const numCPUs = Math.min(4, os.cpus().length);
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// TODO: Implement the shared session store
// This should simulate Redis with Map but have Redis-compatible interface
class SessionStore {
  constructor() {
    // TODO: Initialize session storage
  }

  // TODO: Implement async get(sessionId)
  async get(sessionId) {
    // Return session data or null if not found/expired
  }

  // TODO: Implement async set(sessionId, data, ttl)
  async set(sessionId, data, ttl) {
    // Store session with expiration
  }

  // TODO: Implement async delete(sessionId)
  async delete(sessionId) {
    // Remove session
  }

  // TODO: Implement async exists(sessionId)
  async exists(sessionId) {
    // Check if session exists and not expired
  }

  // TODO: Implement async refresh(sessionId, ttl)
  async refresh(sessionId, ttl) {
    // Update session expiration (sliding window)
  }

  // TODO: Implement cleanup()
  cleanup() {
    // Remove expired sessions
  }

  // TODO: Implement getStats()
  getStats() {
    // Return statistics: total, active, expired
  }
}

if (cluster.isMaster) {
  console.log('[Master] TODO: Implement sticky session master process');

  // TODO: Create shared session store
  // TODO: Fork workers
  // TODO: Implement sticky routing logic
  // TODO: Handle worker crashes and session migration
  // TODO: Create HTTP server with routing
  // TODO: Add session statistics endpoint

  // TODO: Implement periodic session cleanup

} else {
  console.log('[Worker] TODO: Implement worker process');

  // TODO: Handle requests from master
  // TODO: Implement session creation
  // TODO: Store and retrieve session data
  // TODO: Send responses with session cookie

}

/**
 * TESTING CHECKLIST:
 *
 * [ ] Sessions are created with secure random IDs
 * [ ] Requests with same cookie go to same worker
 * [ ] Session data persists across requests
 * [ ] Sessions expire after timeout
 * [ ] Expired sessions are cleaned up
 * [ ] Sessions migrate when worker dies
 * [ ] Session statistics are accurate
 * [ ] IP fallback works when cookie missing (bonus)
 * [ ] Session refresh works on activity (bonus)
 *
 * SUCCESS CRITERIA:
 * - All basic requirements implemented
 * - At least 2 bonus challenges completed
 * - All tests pass
 * - Code is production-ready
 */
