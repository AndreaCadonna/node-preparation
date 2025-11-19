/**
 * Example 4: Session Management
 *
 * Demonstrates:
 * - Implementing sessions without external libraries
 * - Session storage (in-memory)
 * - Session ID generation
 * - Session expiration
 */

const http = require('http');
const crypto = require('crypto');
const url = require('url');

console.log('=== Session Management Example ===\n');

// Session store (in-memory - not for production!)
const sessions = new Map();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Generate secure session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Parse cookies
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

// Get or create session
function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sessionId;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      sessions.delete(sessionId);
      return null;
    }

    // Extend session
    session.expiresAt = Date.now() + SESSION_DURATION;
    return session;
  }

  return null;
}

// Create new session
function createSession() {
  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    data: {},
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };

  sessions.set(sessionId, session);
  console.log(`New session created: ${sessionId}`);
  return session;
}

// Destroy session
function destroySession(sessionId) {
  sessions.delete(sessionId);
  console.log(`Session destroyed: ${sessionId}`);
}

// Clean expired sessions (run periodically)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired session(s)`);
  }
}, 60000); // Every minute

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Get or create session
  let session = getSession(req);
  let isNewSession = false;

  if (!session) {
    session = createSession();
    isNewSession = true;
  }

  // Initialize session data
  if (!session.data.visits) {
    session.data.visits = 0;
  }
  session.data.visits++;
  session.data.lastVisit = new Date().toISOString();

  // Routes
  if (pathname === '/') {
    const headers = { 'Content-Type': 'text/html' };

    if (isNewSession) {
      headers['Set-Cookie'] = `sessionId=${session.id}; Path=/; HttpOnly; SameSite=Strict`;
    }

    res.writeHead(200, headers);
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Session Management</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; }
          .session { background: #f0f0f0; padding: 20px; margin: 20px 0; }
          .info { background: #e3f2fd; padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>Session Management Example</h1>

        <div class="session">
          <h2>Your Session:</h2>
          <p><strong>Session ID:</strong> ${session.id}</p>
          <p><strong>Visits:</strong> ${session.data.visits}</p>
          <p><strong>Last Visit:</strong> ${session.data.lastVisit}</p>
          <p><strong>Created:</strong> ${new Date(session.createdAt).toLocaleString()}</p>
          <p><strong>Expires:</strong> ${new Date(session.expiresAt).toLocaleString()}</p>
          ${session.data.username ? `<p><strong>Username:</strong> ${session.data.username}</p>` : ''}
        </div>

        <h2>Actions:</h2>
        <ul>
          <li><a href="/login">Login</a></li>
          <li><a href="/profile">View Profile</a></li>
          <li><a href="/increment">Increment Counter</a></li>
          <li><a href="/logout">Logout</a></li>
        </ul>

        <div class="info">
          <h3>Active Sessions: ${sessions.size}</h3>
        </div>
      </body>
      </html>
    `);
  } else if (pathname === '/login') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <body>
          <h1>Login</h1>
          <form method="POST">
            <input type="text" name="username" placeholder="Username" required>
            <button type="submit">Login</button>
          </form>
          <a href="/">Back</a>
        </body>
        </html>
      `);
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const params = new URLSearchParams(body);
        const username = params.get('username');

        session.data.username = username;
        session.data.loginTime = new Date().toISOString();

        res.writeHead(302, { 'Location': '/' });
        res.end();
      });
    }
  } else if (pathname === '/profile') {
    if (!session.data.username) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <body>
        <h1>Profile</h1>
        <p>Username: ${session.data.username}</p>
        <p>Login Time: ${session.data.loginTime}</p>
        <p>Total Visits: ${session.data.visits}</p>
        <a href="/">Back</a>
      </body>
      </html>
    `);
  } else if (pathname === '/increment') {
    if (!session.data.counter) {
      session.data.counter = 0;
    }
    session.data.counter++;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      counter: session.data.counter,
      sessionId: session.id
    }));
  } else if (pathname === '/logout') {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.sessionId;

    if (sessionId) {
      destroySession(sessionId);
    }

    res.writeHead(302, {
      'Location': '/',
      'Set-Cookie': 'sessionId=; Path=/; Max-Age=0'
    });
    res.end();
  } else if (pathname === '/sessions') {
    // Admin: view all sessions
    const sessionList = Array.from(sessions.values()).map(s => ({
      id: s.id,
      data: s.data,
      createdAt: new Date(s.createdAt).toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString()
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalSessions: sessions.size,
      sessions: sessionList
    }, null, 2));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/\n`);
  console.log('Session Configuration:');
  console.log(`  Duration: ${SESSION_DURATION / 1000} seconds`);
  console.log(`  Storage: In-memory (${sessions.size} active)\n`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  console.log(`Active sessions: ${sessions.size}`);
  server.close(() => process.exit(0));
});

/**
 * Key Concepts:
 *
 * 1. Sessions store user state on the server
 * 2. Session ID is stored in a cookie
 * 3. Session data is stored on server (not in cookie)
 * 4. Sessions should expire after inactivity
 * 5. Always use HttpOnly and Secure flags for session cookies
 * 6. Clean up expired sessions periodically
 * 7. For production, use Redis or database for session storage
 * 8. Generate cryptographically secure session IDs
 */
