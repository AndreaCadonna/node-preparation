/**
 * Exercise 3: Session Management System - SOLUTION
 *
 * Complete implementation of session-based authentication with:
 * - Session store with expiration
 * - Cookie parsing and setting
 * - Protected routes
 * - Role-based access control
 */

const http = require('http');
const crypto = require('crypto');
const url = require('url');

console.log('=== Exercise 3: Session Management System - SOLUTION ===\n');

// ============================================================================
// Constants and Configuration
// ============================================================================

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const COOKIE_NAME = 'sessionId';

// Mock user database (in production, use a real database)
const USERS = {
  'admin': { password: 'admin123', role: 'admin', name: 'Admin User' },
  'user': { password: 'user123', role: 'user', name: 'Regular User' }
};

// ============================================================================
// Task 1: Session Store Implementation
// ============================================================================

/**
 * SessionStore manages user sessions with automatic expiration
 *
 * Key concepts:
 * - In-memory storage using Map (for production, use Redis or database)
 * - Cryptographically secure session IDs
 * - Automatic cleanup of expired sessions
 * - Session data storage (user info, timestamps, etc.)
 */
class SessionStore {
  constructor() {
    this.sessions = new Map();
    this.startCleanup();
  }

  /**
   * Create new session with unique ID
   *
   * Session ID generation:
   * - Uses crypto.randomBytes for cryptographic security
   * - 32 bytes = 256 bits of entropy
   * - Hex encoding makes it URL-safe
   */
  create(userData = {}) {
    // Generate cryptographically secure random session ID
    const sessionId = crypto.randomBytes(32).toString('hex');

    const session = {
      id: sessionId,
      data: userData,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
      lastAccessed: Date.now()
    };

    this.sessions.set(sessionId, session);

    console.log(`✓ Session created: ${sessionId.substring(0, 16)}...`);

    return session;
  }

  /**
   * Get session by ID, check expiration
   *
   * This method:
   * - Validates session existence
   * - Checks expiration time
   * - Updates last accessed time (sliding expiration)
   * - Removes expired sessions
   */
  get(sessionId) {
    if (!sessionId) {
      return null;
    }

    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      console.log(`✗ Session expired: ${sessionId.substring(0, 16)}...`);
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last accessed time (sliding expiration)
    session.lastAccessed = Date.now();
    session.expiresAt = Date.now() + SESSION_DURATION;

    return session;
  }

  /**
   * Update session data
   */
  update(sessionId, data) {
    const session = this.get(sessionId);

    if (!session) {
      return false;
    }

    session.data = { ...session.data, ...data };
    return true;
  }

  /**
   * Delete session (logout)
   */
  destroy(sessionId) {
    if (this.sessions.delete(sessionId)) {
      console.log(`✓ Session destroyed: ${sessionId.substring(0, 16)}...`);
      return true;
    }
    return false;
  }

  /**
   * Remove expired sessions
   *
   * This cleanup process:
   * - Runs periodically (every 5 minutes)
   * - Prevents memory leaks from abandoned sessions
   * - Improves performance by reducing Map size
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`✓ Cleaned ${cleaned} expired session(s)`);
    }
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);

    console.log(`✓ Session cleanup scheduled (every ${CLEANUP_INTERVAL / 1000}s)`);
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      console.log('✓ Session cleanup stopped');
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        active++;
      } else {
        expired++;
      }
    }

    return { total: this.sessions.size, active, expired };
  }
}

const sessionStore = new SessionStore();

// ============================================================================
// Task 2: Cookie Helpers
// ============================================================================

/**
 * Parse cookie header into key-value object
 *
 * Cookie header format: "name1=value1; name2=value2"
 * Example: "sessionId=abc123; theme=dark"
 */
function parseCookies(cookieHeader) {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  // Split by semicolon and parse each cookie
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      // Join back in case value contained '='
      cookies[name] = valueParts.join('=');
    }
  });

  return cookies;
}

/**
 * Set cookie with proper attributes
 *
 * Cookie attributes:
 * - HttpOnly: Prevents JavaScript access (XSS protection)
 * - Secure: Only sent over HTTPS (in production)
 * - SameSite: CSRF protection
 * - Path: Cookie scope
 * - Max-Age: Cookie lifetime in seconds
 */
function setCookie(res, name, value, options = {}) {
  const defaults = {
    httpOnly: true,        // Prevent XSS attacks
    secure: false,         // Set to true in production with HTTPS
    sameSite: 'Strict',    // CSRF protection
    path: '/',             // Available on all paths
    maxAge: SESSION_DURATION / 1000  // Convert ms to seconds
  };

  const opts = { ...defaults, ...options };

  let cookie = `${name}=${value}`;

  if (opts.httpOnly) cookie += '; HttpOnly';
  if (opts.secure) cookie += '; Secure';
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.path) cookie += `; Path=${opts.path}`;
  if (opts.maxAge) cookie += `; Max-Age=${opts.maxAge}`;

  res.setHeader('Set-Cookie', cookie);
}

/**
 * Clear cookie (for logout)
 */
function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}

/**
 * Get session from request cookies
 */
function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[COOKIE_NAME];

  if (!sessionId) {
    return null;
  }

  return sessionStore.get(sessionId);
}

// ============================================================================
// Body Parser for JSON
// ============================================================================

/**
 * Parse JSON body from request
 */
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('error', err => reject(err));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        const data = body ? JSON.parse(body) : {};
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// ============================================================================
// Response Helpers
// ============================================================================

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendHTML(res, statusCode, html) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(html);
}

// ============================================================================
// Task 3: Authentication Endpoints
// ============================================================================

/**
 * POST /login - Create session
 *
 * Authentication flow:
 * 1. Parse credentials from request body
 * 2. Validate against user database
 * 3. Create session with user data
 * 4. Set session cookie
 * 5. Return success response
 */
async function handleLogin(req, res) {
  try {
    const { username, password } = await parseJSONBody(req);

    // Validate credentials
    const user = USERS[username];

    if (!user || user.password !== password) {
      return sendJSON(res, 401, {
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Create session with user data (don't store password!)
    const session = sessionStore.create({
      username: username,
      name: user.name,
      role: user.role,
      loginTime: new Date().toISOString()
    });

    // Set session cookie
    setCookie(res, COOKIE_NAME, session.id);

    console.log(`✓ User logged in: ${username} (${user.role})`);

    sendJSON(res, 200, {
      success: true,
      message: 'Login successful',
      user: {
        username: session.data.username,
        name: session.data.name,
        role: session.data.role
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    sendJSON(res, 400, {
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /logout - Destroy session
 */
async function handleLogout(req, res) {
  const session = getSessionFromRequest(req);

  if (!session) {
    return sendJSON(res, 401, {
      success: false,
      error: 'Not logged in'
    });
  }

  const username = session.data.username;

  // Destroy session
  sessionStore.destroy(session.id);

  // Clear cookie
  clearCookie(res, COOKIE_NAME);

  console.log(`✓ User logged out: ${username}`);

  sendJSON(res, 200, {
    success: true,
    message: 'Logout successful'
  });
}

/**
 * GET /profile - Protected route (requires session)
 *
 * This demonstrates:
 * - Session validation
 * - Protected routes
 * - User data access from session
 */
async function handleProfile(req, res) {
  const session = getSessionFromRequest(req);

  if (!session) {
    return sendJSON(res, 401, {
      success: false,
      error: 'Unauthorized - Please login',
      redirectTo: '/login'
    });
  }

  const timeLeft = Math.round((session.expiresAt - Date.now()) / 1000 / 60);

  sendJSON(res, 200, {
    success: true,
    profile: {
      username: session.data.username,
      name: session.data.name,
      role: session.data.role,
      loginTime: session.data.loginTime,
      sessionExpiresIn: `${timeLeft} minutes`
    }
  });
}

/**
 * GET /dashboard - Protected route with role check
 *
 * This demonstrates:
 * - Session validation
 * - Role-based access control (RBAC)
 * - Admin-only routes
 */
async function handleDashboard(req, res) {
  const session = getSessionFromRequest(req);

  if (!session) {
    return sendJSON(res, 401, {
      success: false,
      error: 'Unauthorized - Please login'
    });
  }

  // Check admin role
  if (session.data.role !== 'admin') {
    return sendJSON(res, 403, {
      success: false,
      error: 'Forbidden - Admin access required',
      yourRole: session.data.role,
      requiredRole: 'admin'
    });
  }

  // Get session statistics (admin only)
  const stats = sessionStore.getStats();

  sendJSON(res, 200, {
    success: true,
    message: 'Welcome to admin dashboard',
    user: {
      username: session.data.username,
      name: session.data.name,
      role: session.data.role
    },
    sessionStats: stats
  });
}

/**
 * GET / - Landing page
 */
function handleRoot(req, res) {
  const session = getSessionFromRequest(req);

  const loginStatus = session
    ? `Logged in as: <strong>${session.data.name}</strong> (${session.data.role})`
    : 'Not logged in';

  sendHTML(res, 200, `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Session Management Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .status { background: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
        .endpoint { background: #f4f4f4; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-weight: bold; color: white; margin-right: 10px; }
        .post { background: #49cc90; }
        .get { background: #61affe; }
        code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .users { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Session Management System</h1>

      <div class="status">
        Status: ${loginStatus}
      </div>

      <div class="users">
        <strong>Test Users:</strong><br>
        Username: <code>admin</code> Password: <code>admin123</code> Role: admin<br>
        Username: <code>user</code> Password: <code>user123</code> Role: user
      </div>

      <h2>API Endpoints</h2>

      <div class="endpoint">
        <span class="method post">POST</span>
        <strong>/login</strong> - Create session
        <pre>curl -X POST http://localhost:3000/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}' \\
  -c cookies.txt</pre>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span>
        <strong>/logout</strong> - Destroy session
        <pre>curl -X POST http://localhost:3000/logout \\
  -b cookies.txt</pre>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <strong>/profile</strong> - Protected route (requires login)
        <pre>curl http://localhost:3000/profile \\
  -b cookies.txt</pre>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <strong>/dashboard</strong> - Admin only route
        <pre>curl http://localhost:3000/dashboard \\
  -b cookies.txt</pre>
      </div>

      <h2>Features</h2>
      <ul>
        <li>Secure session management with crypto-generated IDs</li>
        <li>HTTP-only cookies (XSS protection)</li>
        <li>Session expiration (30 minutes)</li>
        <li>Automatic cleanup of expired sessions</li>
        <li>Role-based access control</li>
        <li>Sliding expiration (extends on activity)</li>
      </ul>
    </body>
    </html>
  `);
}

// ============================================================================
// Main Request Router
// ============================================================================

const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);
  const { method } = req;

  console.log(`${method} ${pathname}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route requests
  try {
    if (method === 'POST' && pathname === '/login') {
      await handleLogin(req, res);

    } else if (method === 'POST' && pathname === '/logout') {
      await handleLogout(req, res);

    } else if (method === 'GET' && pathname === '/profile') {
      await handleProfile(req, res);

    } else if (method === 'GET' && pathname === '/dashboard') {
      await handleDashboard(req, res);

    } else if (method === 'GET' && pathname === '/') {
      handleRoot(req, res);

    } else {
      sendJSON(res, 404, {
        success: false,
        error: 'Not Found'
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    sendJSON(res, 500, {
      success: false,
      error: 'Internal Server Error'
    });
  }
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Session Management Server Running');
  console.log(`${'='.repeat(60)}`);
  console.log(`\nServer URL: http://localhost:${PORT}/`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /login      - Create session`);
  console.log(`  POST /logout     - Destroy session`);
  console.log(`  GET  /profile    - Protected route`);
  console.log(`  GET  /dashboard  - Admin route`);
  console.log(`\nSession Config:`);
  console.log(`  Duration: ${SESSION_DURATION / 1000 / 60} minutes`);
  console.log(`  Cleanup: Every ${CLEANUP_INTERVAL / 1000 / 60} minutes`);
  console.log(`  Cookie: ${COOKIE_NAME} (HttpOnly, SameSite=Strict)`);
  console.log(`\n${'='.repeat(60)}\n`);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');

  sessionStore.stopCleanup();

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ============================================================================
// Educational Notes
// ============================================================================

console.log('Implementation Highlights:');
console.log('✓ Complete session store with expiration');
console.log('✓ Cryptographically secure session IDs');
console.log('✓ Cookie parsing and setting with security attributes');
console.log('✓ HTTP-only cookies (XSS protection)');
console.log('✓ Protected routes with session validation');
console.log('✓ Role-based access control (RBAC)');
console.log('✓ Sliding expiration (extends on activity)');
console.log('✓ Automatic cleanup of expired sessions');
console.log('');
