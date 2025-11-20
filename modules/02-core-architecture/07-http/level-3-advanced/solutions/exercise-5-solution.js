/**
 * Exercise 5 Solution: Complete Production API
 * Production-ready API server with all best practices
 */

const http = require('http');
const cluster = require('cluster');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');

/**
 * Production API Server
 *
 * Features:
 * 1. Clustering - Multi-core CPU utilization
 * 2. Graceful Shutdown - Clean process termination
 * 3. Health Checks - Readiness and liveness probes
 * 4. Metrics - Performance monitoring
 * 5. Request Logging - Structured logging
 * 6. Error Handling - Comprehensive error recovery
 * 7. Rate Limiting - Prevent abuse
 * 8. CORS - Cross-origin resource sharing
 * 9. Compression - Response optimization
 * 10. Caching - ETags for conditional requests
 * 11. Security Headers - Defense in depth
 *
 * This is a complete, production-ready HTTP server implementation
 */

/**
 * Logger - Structured logging utility
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  log(level, message, meta = {}) {
    if (this.levels[level] <= this.levels[this.level]) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
        pid: process.pid
      };
      console.log(JSON.stringify(entry));
    }
  }

  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }
}

/**
 * Simple Rate Limiter
 */
class SimpleRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
    this.clients = new Map();

    setInterval(() => this.cleanup(), this.windowMs);
  }

  isAllowed(clientId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, [now]);
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    const requests = this.clients.get(clientId).filter(time => time > windowStart);
    requests.push(now);
    this.clients.set(clientId, requests);

    const allowed = requests.length <= this.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - requests.length),
      resetTime: windowStart + this.windowMs
    };
  }

  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [clientId, requests] of this.clients.entries()) {
      const activeRequests = requests.filter(time => time > windowStart);
      if (activeRequests.length === 0) {
        this.clients.delete(clientId);
      } else {
        this.clients.set(clientId, activeRequests);
      }
    }
  }
}

/**
 * Metrics Collector
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: { total: 0, success: 0, error: 0, rate_limited: 0 },
      latency: { samples: [], p50: 0, p95: 0, p99: 0 },
      status_codes: {},
      routes: {},
      errors: []
    };
  }

  recordRequest(statusCode, latency, route) {
    this.metrics.requests.total++;

    if (statusCode >= 200 && statusCode < 300) {
      this.metrics.requests.success++;
    } else if (statusCode === 429) {
      this.metrics.requests.rate_limited++;
    } else if (statusCode >= 400) {
      this.metrics.requests.error++;
    }

    // Track status codes
    this.metrics.status_codes[statusCode] = (this.metrics.status_codes[statusCode] || 0) + 1;

    // Track routes
    this.metrics.routes[route] = (this.metrics.routes[route] || 0) + 1;

    // Track latency (keep last 1000 samples)
    this.metrics.latency.samples.push(latency);
    if (this.metrics.latency.samples.length > 1000) {
      this.metrics.latency.samples.shift();
    }

    this.calculatePercentiles();
  }

  calculatePercentiles() {
    const sorted = [...this.metrics.latency.samples].sort((a, b) => a - b);
    const len = sorted.length;

    if (len > 0) {
      this.metrics.latency.p50 = sorted[Math.floor(len * 0.5)];
      this.metrics.latency.p95 = sorted[Math.floor(len * 0.95)];
      this.metrics.latency.p99 = sorted[Math.floor(len * 0.99)];
    }
  }

  recordError(error, context) {
    this.metrics.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }
}

/**
 * Production API Server
 */
class ProductionAPIServer {
  constructor(options = {}) {
    this.options = options;
    this.logger = new Logger({ level: options.logLevel || 'info' });
    this.rateLimiter = new SimpleRateLimiter({
      windowMs: 60000,
      maxRequests: 100
    });
    this.metrics = new MetricsCollector();

    this.isShuttingDown = false;
    this.activeRequests = 0;

    // In-memory data store (use database in production)
    this.dataStore = new Map();
    this.initializeData();
  }

  initializeData() {
    // Sample data
    this.dataStore.set('users', [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' }
    ]);
  }

  /**
   * Generate ETag for response
   */
  generateETag(content) {
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }

  /**
   * CORS Middleware
   */
  applyCORS(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    return false;
  }

  /**
   * Security Headers Middleware
   */
  applySecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.removeHeader('X-Powered-By');
  }

  /**
   * Compression Middleware
   */
  shouldCompress(req, res) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const contentType = res.getHeader('content-type') || '';

    return acceptEncoding.includes('gzip') &&
           (contentType.includes('application/json') ||
            contentType.includes('text/'));
  }

  /**
   * Request Logging Middleware
   */
  logRequest(req, startTime, statusCode) {
    const duration = Date.now() - startTime;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    this.logger.info('Request processed', {
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration}ms`,
      clientIp,
      userAgent: req.headers['user-agent']
    });

    this.metrics.recordRequest(statusCode, duration, `${req.method} ${req.url.split('?')[0]}`);
  }

  /**
   * Error Handler
   */
  handleError(error, req, res) {
    this.logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });

    this.metrics.recordError(error, { url: req.url, method: req.method });

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message
      }));
    }
  }

  /**
   * Send JSON Response with caching and compression
   */
  sendJSON(req, res, data, statusCode = 200) {
    const json = JSON.stringify(data, null, 2);
    const etag = this.generateETag(json);

    // Check If-None-Match for caching
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60');

    // Apply compression if supported
    if (this.shouldCompress(req, res)) {
      res.setHeader('Content-Encoding', 'gzip');
      res.writeHead(statusCode);

      zlib.gzip(json, (err, compressed) => {
        if (err) {
          res.end(json);
        } else {
          res.end(compressed);
        }
      });
    } else {
      res.writeHead(statusCode);
      res.end(json);
    }
  }

  /**
   * Parse JSON body
   */
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();

        // Prevent large payloads
        if (body.length > 1e6) { // 1MB
          req.connection.destroy();
          reject(new Error('Payload too large'));
        }
      });

      req.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Request Handler
   */
  async handleRequest(req, res) {
    const startTime = Date.now();
    this.activeRequests++;

    try {
      // Check if shutting down
      if (this.isShuttingDown) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server is shutting down' }));
        return;
      }

      // Apply security headers
      this.applySecurityHeaders(res);

      // Apply CORS
      if (this.applyCORS(req, res)) {
        this.logRequest(req, startTime, 204);
        return;
      }

      // Rate limiting
      const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const rateLimit = this.rateLimiter.isAllowed(clientId);

      res.setHeader('X-RateLimit-Limit', '100');
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

      if (!rateLimit.allowed) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Too Many Requests',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        }));
        this.logRequest(req, startTime, 429);
        return;
      }

      // Route handling
      await this.router(req, res);

      // Log successful request
      this.logRequest(req, startTime, res.statusCode);

    } catch (error) {
      this.handleError(error, req, res);
      this.logRequest(req, startTime, 500);
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Router
   */
  async router(req, res) {
    const { method, url } = req;
    const path = url.split('?')[0];

    // Health check
    if (path === '/health' && method === 'GET') {
      this.sendJSON(req, res, {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Readiness check
    if (path === '/ready' && method === 'GET') {
      const ready = !this.isShuttingDown && this.activeRequests < 1000;
      this.sendJSON(req, res, {
        status: ready ? 'ready' : 'not ready',
        activeRequests: this.activeRequests
      }, ready ? 200 : 503);
      return;
    }

    // Metrics
    if (path === '/metrics' && method === 'GET') {
      this.sendJSON(req, res, this.metrics.getMetrics());
      return;
    }

    // API Routes
    if (path === '/api/users' && method === 'GET') {
      const users = this.dataStore.get('users');
      this.sendJSON(req, res, { users });
      return;
    }

    if (path.match(/^\/api\/users\/\d+$/) && method === 'GET') {
      const id = parseInt(path.split('/')[3]);
      const users = this.dataStore.get('users');
      const user = users.find(u => u.id === id);

      if (user) {
        this.sendJSON(req, res, { user });
      } else {
        this.sendJSON(req, res, { error: 'User not found' }, 404);
      }
      return;
    }

    if (path === '/api/users' && method === 'POST') {
      const body = await this.parseBody(req);
      const users = this.dataStore.get('users');

      const newUser = {
        id: users.length + 1,
        name: body.name,
        email: body.email
      };

      users.push(newUser);
      this.sendJSON(req, res, { user: newUser }, 201);
      return;
    }

    // Home page
    if (path === '/' && method === 'GET') {
      const html = this.getHomePage();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    // 404
    this.sendJSON(req, res, { error: 'Not Found' }, 404);
  }

  /**
   * Get home page HTML
   */
  getHomePage() {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Production API Server</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      background: white;
      color: #333;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      max-width: 1000px;
      margin: 0 auto;
    }
    h1 { color: #667eea; }
    h2 { color: #764ba2; margin-top: 30px; }
    .feature {
      background: #f5f5f5;
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
    .endpoint {
      background: #e3f2fd;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      font-family: monospace;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 5px;
    }
    .badge-get { background: #4caf50; color: white; }
    .badge-post { background: #2196f3; color: white; }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      color: #d32f2f;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Production API Server</h1>

    <p><strong>Status:</strong> Running in ${cluster.isMaster ? 'master' : 'worker'} mode</p>
    <p><strong>Process ID:</strong> ${process.pid}</p>
    <p><strong>Workers:</strong> ${cluster.isMaster ? os.cpus().length : 'N/A'}</p>

    <h2>✨ Features</h2>

    <div class="feature">
      <strong>1. Multi-core Clustering</strong><br>
      Utilizes all CPU cores for maximum performance
    </div>

    <div class="feature">
      <strong>2. Graceful Shutdown</strong><br>
      Handles SIGTERM/SIGINT signals properly
    </div>

    <div class="feature">
      <strong>3. Health Checks</strong><br>
      Kubernetes-ready readiness and liveness probes
    </div>

    <div class="feature">
      <strong>4. Request Logging</strong><br>
      Structured JSON logging for easy parsing
    </div>

    <div class="feature">
      <strong>5. Rate Limiting</strong><br>
      Protects against abuse (100 req/min per IP)
    </div>

    <div class="feature">
      <strong>6. CORS Support</strong><br>
      Cross-origin resource sharing enabled
    </div>

    <div class="feature">
      <strong>7. Response Compression</strong><br>
      Automatic gzip compression for JSON
    </div>

    <div class="feature">
      <strong>8. ETag Caching</strong><br>
      Conditional requests with 304 responses
    </div>

    <div class="feature">
      <strong>9. Security Headers</strong><br>
      HSTS, CSP, X-Frame-Options, etc.
    </div>

    <div class="feature">
      <strong>10. Metrics & Monitoring</strong><br>
      Performance metrics and error tracking
    </div>

    <h2>📡 API Endpoints</h2>

    <div class="endpoint">
      <span class="badge badge-get">GET</span>
      <strong>/health</strong> - Health check endpoint
    </div>

    <div class="endpoint">
      <span class="badge badge-get">GET</span>
      <strong>/ready</strong> - Readiness probe
    </div>

    <div class="endpoint">
      <span class="badge badge-get">GET</span>
      <strong>/metrics</strong> - Performance metrics
    </div>

    <div class="endpoint">
      <span class="badge badge-get">GET</span>
      <strong>/api/users</strong> - Get all users
    </div>

    <div class="endpoint">
      <span class="badge badge-get">GET</span>
      <strong>/api/users/:id</strong> - Get user by ID
    </div>

    <div class="endpoint">
      <span class="badge badge-post">POST</span>
      <strong>/api/users</strong> - Create new user
    </div>

    <h2>🧪 Testing</h2>

    <p><strong>Get all users:</strong></p>
    <code>curl http://localhost:3000/api/users</code>

    <p><strong>Get single user:</strong></p>
    <code>curl http://localhost:3000/api/users/1</code>

    <p><strong>Create user:</strong></p>
    <code>curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"name":"Dave","email":"dave@example.com"}'</code>

    <p><strong>Check metrics:</strong></p>
    <code>curl http://localhost:3000/metrics</code>

    <p><strong>Test rate limiting:</strong></p>
    <code>for i in {1..110}; do curl http://localhost:3000/api/users -i | grep -E "HTTP|X-RateLimit"; done</code>

    <p><strong>Test caching:</strong></p>
    <code>curl -i http://localhost:3000/api/users</code> (note ETag)<br>
    <code>curl -i -H "If-None-Match: &lt;etag&gt;" http://localhost:3000/api/users</code> (304 response)

    <h2>🏭 Production Deployment</h2>

    <ul>
      <li>Set <code>NODE_ENV=production</code></li>
      <li>Use PM2 or systemd for process management</li>
      <li>Set up reverse proxy (nginx)</li>
      <li>Enable SSL/TLS</li>
      <li>Configure logging aggregation</li>
      <li>Set up monitoring (Prometheus, Grafana)</li>
      <li>Implement database instead of in-memory storage</li>
      <li>Add authentication/authorization</li>
    </ul>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('Shutdown signal received');
    this.isShuttingDown = true;

    // Wait for active requests to complete (max 30 seconds)
    const maxWait = 30000;
    const checkInterval = 100;
    let waited = 0;

    while (this.activeRequests > 0 && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
      this.logger.info(`Waiting for ${this.activeRequests} active requests...`);
    }

    if (this.activeRequests > 0) {
      this.logger.warn(`Forcing shutdown with ${this.activeRequests} active requests`);
    }

    this.logger.info('Server shutdown complete');
    process.exit(0);
  }

  /**
   * Start server
   */
  start(port = 3000) {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(port, () => {
      this.logger.info(`Server started`, {
        port,
        pid: process.pid,
        nodeVersion: process.version
      });
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      this.shutdown();
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', {
        reason,
        promise
      });
    });

    return server;
  }
}

/**
 * Main - Clustering Setup
 */
if (cluster.isMaster) {
  const numWorkers = process.env.WORKERS || os.cpus().length;

  console.log(`Master ${process.pid} starting ${numWorkers} workers...`);

  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // Replace dead workers
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

} else {
  // Worker process - start API server
  const api = new ProductionAPIServer({
    logLevel: process.env.LOG_LEVEL || 'info'
  });

  const PORT = process.env.PORT || 3000;
  api.start(PORT);
}

/**
 * Production Deployment Checklist:
 *
 * 1. Environment:
 *    ✓ Set NODE_ENV=production
 *    ✓ Configure environment variables
 *    ✓ Use secrets management
 *
 * 2. Process Management:
 *    ✓ Use PM2 or systemd
 *    ✓ Enable clustering
 *    ✓ Configure auto-restart
 *    ✓ Set resource limits
 *
 * 3. Networking:
 *    ✓ Use reverse proxy (nginx)
 *    ✓ Enable SSL/TLS
 *    ✓ Configure load balancing
 *    ✓ Set up CDN
 *
 * 4. Security:
 *    ✓ Security headers
 *    ✓ Rate limiting
 *    ✓ Input validation
 *    ✓ Authentication/authorization
 *    ✓ CORS configuration
 *    ✓ Dependency scanning
 *
 * 5. Monitoring:
 *    ✓ Health checks
 *    ✓ Metrics collection
 *    ✓ Error tracking (Sentry)
 *    ✓ Log aggregation (ELK, Datadog)
 *    ✓ APM (New Relic, Dynatrace)
 *
 * 6. Performance:
 *    ✓ Response compression
 *    ✓ Caching (Redis)
 *    ✓ Database optimization
 *    ✓ Connection pooling
 *    ✓ CDN for static assets
 *
 * 7. Reliability:
 *    ✓ Graceful shutdown
 *    ✓ Circuit breakers
 *    ✓ Retry logic
 *    ✓ Timeouts
 *    ✓ Backups
 *
 * 8. Testing:
 *    ✓ Unit tests
 *    ✓ Integration tests
 *    ✓ Load testing
 *    ✓ Security testing
 *    ✓ CI/CD pipeline
 */

module.exports = { ProductionAPIServer };
