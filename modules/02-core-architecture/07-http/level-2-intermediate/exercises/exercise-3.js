/**
 * Exercise 3: Session Management System
 *
 * Implement a complete session management system.
 */

const http = require('http');
const crypto = require('crypto');

// Task 1: Implement session store
class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  create() {
    // TODO: Create new session with unique ID
  }

  get(sessionId) {
    // TODO: Get session by ID, check expiration
  }

  destroy(sessionId) {
    // TODO: Delete session
  }

  cleanup() {
    // TODO: Remove expired sessions
  }
}

const sessionStore = new SessionStore();

// Task 2: Implement cookie helpers
function parseCookies(cookieHeader) {
  // TODO: Parse cookie header
}

function setCookie(res, name, value, options = {}) {
  // TODO: Set cookie with proper attributes
}

// Task 3: Create authentication system
// POST /login - Create session
// POST /logout - Destroy session
// GET /profile - Protected route (requires session)
// GET /dashboard - Protected route with role check

const server = http.createServer(async (req, res) => {
  // TODO: Implement session-based authentication
});

server.listen(3000);
