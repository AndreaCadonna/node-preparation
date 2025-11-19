/**
 * Example 1: Sticky Sessions (Session Affinity) Implementation
 *
 * This example demonstrates how to implement sticky sessions in a clustered
 * Node.js application. Sticky sessions ensure that requests from the same
 * client are always routed to the same worker process.
 *
 * Key Concepts:
 * - Session affinity routing
 * - Cookie-based sticky sessions
 * - IP-based sticky sessions
 * - Session store integration
 * - Load balancing with affinity
 *
 * Why Sticky Sessions?
 * - Maintain in-memory session state
 * - Reduce database lookups
 * - Improve WebSocket connection handling
 * - Better caching efficiency
 *
 * Run this: node 01-sticky-sessions.js
 * Test: curl -c cookies.txt http://localhost:8000/
 *       curl -b cookies.txt http://localhost:8000/
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// Configuration
const PORT = 8000;
const numCPUs = Math.min(4, os.cpus().length); // Limit to 4 workers for testing

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting sticky session cluster`);
  console.log(`[Master] Workers: ${numCPUs}\n`);

  // Track workers and their assignments
  const workers = [];
  const sessionMap = new Map(); // Maps session IDs to worker IDs
  const ipMap = new Map(); // Maps IP addresses to worker IDs

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    console.log(`[Master] Worker ${worker.id} (PID ${worker.process.pid}) started`);
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} died, restarting...`);
    const index = workers.indexOf(worker);
    if (index > -1) {
      workers[index] = cluster.fork();
    }

    // Clean up session assignments for dead worker
    for (const [sessionId, workerId] of sessionMap.entries()) {
      if (workerId === worker.id) {
        sessionMap.delete(sessionId);
      }
    }
    for (const [ip, workerId] of ipMap.entries()) {
      if (workerId === worker.id) {
        ipMap.delete(ip);
      }
    }
  });

  /**
   * Sticky Session Routing Strategies
   */

  // Strategy 1: Cookie-based routing (most reliable)
  function getWorkerBySession(sessionId) {
    if (!sessionId) return null;

    // Check if session is already assigned
    if (sessionMap.has(sessionId)) {
      const workerId = sessionMap.get(sessionId);
      const worker = workers.find(w => w.id === workerId);
      if (worker) return worker;

      // Worker died, remove stale mapping
      sessionMap.delete(sessionId);
    }

    // Assign to new worker using consistent hashing
    const hash = crypto.createHash('md5').update(sessionId).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % workers.length;
    const worker = workers[index];

    sessionMap.set(sessionId, worker.id);
    console.log(`[Master] Session ${sessionId.substring(0, 8)}... assigned to Worker ${worker.id}`);

    return worker;
  }

  // Strategy 2: IP-based routing (fallback)
  function getWorkerByIP(ip) {
    if (!ip) return null;

    // Check if IP is already assigned
    if (ipMap.has(ip)) {
      const workerId = ipMap.get(ip);
      const worker = workers.find(w => w.id === workerId);
      if (worker) return worker;

      // Worker died, remove stale mapping
      ipMap.delete(ip);
    }

    // Assign to new worker using consistent hashing
    const hash = crypto.createHash('md5').update(ip).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % workers.length;
    const worker = workers[index];

    ipMap.set(ip, worker.id);
    console.log(`[Master] IP ${ip} assigned to Worker ${worker.id}`);

    return worker;
  }

  // Strategy 3: Round-robin (default fallback)
  let roundRobinIndex = 0;
  function getWorkerRoundRobin() {
    const worker = workers[roundRobinIndex];
    roundRobinIndex = (roundRobinIndex + 1) % workers.length;
    return worker;
  }

  /**
   * Master HTTP Server (Proxy)
   * Routes requests to appropriate workers based on sticky session strategy
   */
  const server = http.createServer((req, res) => {
    const clientIP = req.socket.remoteAddress;

    // Extract session ID from cookie
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.sessionId;

    // Choose worker based on routing strategy
    let worker;
    let routingStrategy;

    if (sessionId) {
      worker = getWorkerBySession(sessionId);
      routingStrategy = 'cookie';
    } else if (clientIP) {
      worker = getWorkerByIP(clientIP);
      routingStrategy = 'ip';
    } else {
      worker = getWorkerRoundRobin();
      routingStrategy = 'round-robin';
    }

    // Log routing decision
    console.log(`[Master] ${req.method} ${req.url} -> Worker ${worker.id} (${routingStrategy})`);

    // Create a unique request ID for tracking
    const requestId = crypto.randomBytes(8).toString('hex');

    // Send request to worker
    worker.send({
      type: 'http-request',
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      clientIP,
      sessionId: sessionId || null
    });

    // Collect request body if present
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length > 0) {
        const body = Buffer.concat(chunks).toString();
        worker.send({
          type: 'http-request-body',
          requestId,
          body
        });
      }
    });

    // Wait for response from worker
    const responseHandler = (msg) => {
      if (msg.type === 'http-response' && msg.requestId === requestId) {
        worker.removeListener('message', responseHandler);

        // Write response
        res.writeHead(msg.statusCode, msg.headers);
        res.end(msg.body);
      }
    };

    worker.on('message', responseHandler);

    // Handle client disconnect
    req.on('close', () => {
      worker.removeListener('message', responseHandler);
    });
  });

  server.listen(PORT, () => {
    console.log(`\n[Master] Sticky session server listening on port ${PORT}`);
    console.log(`[Master] Using cookie-based sticky sessions with IP fallback\n`);
  });

  // Utility: Parse cookies from header
  function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });

    return cookies;
  }

} else {
  // === WORKER PROCESS ===

  // In-memory session store (per worker)
  const sessions = new Map();

  // Pending requests waiting for response
  const pendingRequests = new Map();

  /**
   * Handle HTTP requests from master
   */
  process.on('message', (msg) => {
    if (msg.type === 'http-request') {
      handleRequest(msg);
    } else if (msg.type === 'http-request-body') {
      const pending = pendingRequests.get(msg.requestId);
      if (pending) {
        pending.body = msg.body;
      }
    }
  });

  function handleRequest(msg) {
    const { requestId, method, url, headers, clientIP, sessionId } = msg;

    console.log(`[Worker ${cluster.worker.id}] Handling ${method} ${url} (Session: ${sessionId || 'new'})`);

    // Store request for body processing
    pendingRequests.set(requestId, { msg, body: null });

    // Process request after short delay to allow body to arrive
    setTimeout(() => {
      const pending = pendingRequests.get(requestId);
      pendingRequests.delete(requestId);

      processRequest(requestId, pending.msg, pending.body);
    }, 10);
  }

  function processRequest(requestId, msg, body) {
    const { method, url, sessionId } = msg;

    // Get or create session
    let session;
    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
      session.lastAccess = Date.now();
      session.requestCount++;
    } else {
      // Create new session
      const newSessionId = crypto.randomBytes(16).toString('hex');
      session = {
        id: newSessionId,
        created: Date.now(),
        lastAccess: Date.now(),
        requestCount: 1,
        data: {}
      };
      sessions.set(newSessionId, session);
    }

    // Route to appropriate handler
    if (url === '/') {
      handleHome(requestId, session);
    } else if (url === '/session') {
      handleSession(requestId, session);
    } else if (url === '/data' && method === 'POST') {
      handleSetData(requestId, session, body);
    } else if (url === '/data' && method === 'GET') {
      handleGetData(requestId, session);
    } else if (url === '/stats') {
      handleStats(requestId, session);
    } else {
      sendResponse(requestId, 404, 'Not Found', session.id);
    }
  }

  function handleHome(requestId, session) {
    const html = `
      <h1>Sticky Sessions Demo - Worker ${cluster.worker.id}</h1>
      <p>Session ID: ${session.id}</p>
      <p>Request Count: ${session.requestCount}</p>
      <p>Session Created: ${new Date(session.created).toISOString()}</p>
      <hr>
      <h2>Test Sticky Sessions:</h2>
      <p>Refresh this page multiple times - you should always see Worker ${cluster.worker.id}</p>
      <p><a href="/session">View Session Details</a></p>
      <p><a href="/stats">View Worker Stats</a></p>
      <hr>
      <form method="POST" action="/data">
        <input type="text" name="data" placeholder="Enter some data">
        <button type="submit">Save to Session</button>
      </form>
      <p><a href="/data">View Saved Data</a></p>
    `;

    sendResponse(requestId, 200, html, session.id, 'text/html');
  }

  function handleSession(requestId, session) {
    const response = {
      workerId: cluster.worker.id,
      workerPid: process.pid,
      session: {
        id: session.id,
        created: new Date(session.created).toISOString(),
        lastAccess: new Date(session.lastAccess).toISOString(),
        requestCount: session.requestCount,
        data: session.data
      }
    };

    sendResponse(requestId, 200, JSON.stringify(response, null, 2), session.id, 'application/json');
  }

  function handleSetData(requestId, session, body) {
    // Parse form data
    const params = new URLSearchParams(body);
    const data = params.get('data');

    if (data) {
      session.data.userInput = data;
      session.data.timestamp = Date.now();
    }

    sendResponse(requestId, 302, '', session.id, 'text/plain', { 'Location': '/data' });
  }

  function handleGetData(requestId, session) {
    const html = `
      <h1>Session Data - Worker ${cluster.worker.id}</h1>
      <p>Session ID: ${session.id}</p>
      <hr>
      <h2>Stored Data:</h2>
      <pre>${JSON.stringify(session.data, null, 2)}</pre>
      <p><a href="/">Back to Home</a></p>
    `;

    sendResponse(requestId, 200, html, session.id, 'text/html');
  }

  function handleStats(requestId, session) {
    const stats = {
      workerId: cluster.worker.id,
      workerPid: process.pid,
      activeSessions: sessions.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      sessions: Array.from(sessions.values()).map(s => ({
        id: s.id.substring(0, 8) + '...',
        requestCount: s.requestCount,
        age: Date.now() - s.created
      }))
    };

    sendResponse(requestId, 200, JSON.stringify(stats, null, 2), session.id, 'application/json');
  }

  function sendResponse(requestId, statusCode, body, sessionId, contentType = 'text/plain', extraHeaders = {}) {
    const headers = {
      'Content-Type': contentType,
      'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Max-Age=3600; Path=/`,
      ...extraHeaders
    };

    process.send({
      type: 'http-response',
      requestId,
      statusCode,
      headers,
      body
    });
  }

  // Session cleanup - remove expired sessions
  setInterval(() => {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastAccess > timeout) {
        console.log(`[Worker ${cluster.worker.id}] Removing expired session ${sessionId.substring(0, 8)}...`);
        sessions.delete(sessionId);
      }
    }
  }, 60000); // Check every minute

  console.log(`[Worker ${cluster.worker.id}] Ready to handle requests`);
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Sticky Session Strategies:
 *    - Cookie-based: Most reliable, works across networks
 *    - IP-based: Good fallback, but issues with NAT/proxies
 *    - Round-robin: Load balancing when no affinity needed
 *
 * 2. Consistent Hashing:
 *    - Use hash function to assign sessions to workers
 *    - Same session always routes to same worker
 *    - Maintains affinity even after worker restarts
 *
 * 3. Session Storage:
 *    - In-memory: Fast but lost on worker crash
 *    - Shared store (Redis): Persistent but slower
 *    - Hybrid: Cache in memory, persist to store
 *
 * 4. Worker Failure Handling:
 *    - Clean up session mappings for dead workers
 *    - Reassign sessions on next request
 *    - Consider session replication for critical data
 *
 * 5. Load Distribution:
 *    - Sticky sessions can cause uneven load
 *    - Monitor worker utilization
 *    - Use session limits or TTL to rebalance
 *
 * 6. Performance Considerations:
 *    - Session lookup overhead
 *    - Memory usage per worker
 *    - Session cleanup intervals
 *
 * TESTING:
 *
 * 1. Test sticky routing:
 *    curl -c cookies.txt http://localhost:8000/
 *    curl -b cookies.txt http://localhost:8000/stats
 *    # Should always hit same worker
 *
 * 2. Test session persistence:
 *    # In browser, refresh multiple times
 *    # Request count should increment
 *
 * 3. Test worker failure:
 *    # Find worker PID from stats
 *    kill -9 <worker-pid>
 *    # Next request creates new session on different worker
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Use external session store (Redis/Memcached):
 *    - Persist sessions across worker restarts
 *    - Share sessions between server instances
 *    - Enable horizontal scaling
 *
 * 2. Load Balancer Integration:
 *    - Configure load balancer for sticky sessions
 *    - Use consistent hashing algorithms
 *    - Set appropriate cookie/header names
 *
 * 3. Session Security:
 *    - Use secure, httpOnly cookies
 *    - Implement CSRF protection
 *    - Rotate session IDs after login
 *    - Set appropriate expiration
 *
 * 4. Monitoring:
 *    - Track session distribution across workers
 *    - Monitor session store performance
 *    - Alert on session store failures
 *    - Track session creation/expiration rates
 */
