/**
 * Exercise 2 Solution: Advanced Rate Limiter
 * Production-grade rate limiting with multiple algorithms
 */

const http = require('http');

/**
 * Advanced Rate Limiter
 *
 * Implements multiple rate limiting strategies:
 * 1. Token Bucket - Allows bursts while maintaining average rate
 * 2. Sliding Window - Precise time-based limiting
 * 3. Fixed Window - Simple, memory-efficient
 *
 * Features:
 * - Per-client (IP) and per-user limiting
 * - Per-endpoint custom limits
 * - Distributed-ready (in-memory implementation, Redis-compatible interface)
 * - Rate limit info headers
 * - Retry-After header for rate-limited responses
 * - Automatic cleanup of expired entries
 */

class AdvancedRateLimiter {
  constructor(options = {}) {
    // Default configuration
    this.algorithm = options.algorithm || 'token-bucket'; // 'token-bucket', 'sliding-window', 'fixed-window'
    this.points = options.points || 10; // Number of requests
    this.duration = options.duration || 1000; // Time window in ms
    this.blockDuration = options.blockDuration || 0; // Block duration after limit (0 = just reject)

    // Storage (in-memory, but designed for Redis replacement)
    this.clients = new Map(); // Client tracking
    this.blocked = new Map(); // Blocked IPs

    // Endpoint-specific limits
    this.endpointLimits = options.endpointLimits || {};

    // Statistics
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      uniqueClients: 0
    };

    // Cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Token Bucket Algorithm
   *
   * How it works:
   * - Each client has a bucket with tokens
   * - Tokens are added at a constant rate
   * - Each request consumes a token
   * - Allows bursts while maintaining average rate
   *
   * Advantages:
   * - Allows natural traffic bursts
   * - Smooth rate limiting
   * - Industry standard (AWS, GCP use this)
   */
  tokenBucket(clientId, points, duration) {
    const now = Date.now();

    if (!this.clients.has(clientId)) {
      // New client - initialize bucket
      this.clients.set(clientId, {
        tokens: points - 1, // Consume one token for this request
        lastRefill: now,
        points,
        duration
      });
      return { allowed: true, remaining: points - 1, resetTime: now + duration };
    }

    const client = this.clients.get(clientId);

    // Calculate tokens to add based on time passed
    const timePassed = now - client.lastRefill;
    const tokensToAdd = (timePassed / duration) * points;

    // Refill tokens (up to max)
    client.tokens = Math.min(points, client.tokens + tokensToAdd);
    client.lastRefill = now;

    // Check if we have tokens available
    if (client.tokens >= 1) {
      client.tokens -= 1;

      const resetTime = now + ((points - client.tokens) / points) * duration;

      return {
        allowed: true,
        remaining: Math.floor(client.tokens),
        resetTime: Math.ceil(resetTime)
      };
    }

    // Not enough tokens - calculate retry time
    const tokensNeeded = 1 - client.tokens;
    const retryAfter = Math.ceil((tokensNeeded / points) * duration);

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + retryAfter,
      retryAfter
    };
  }

  /**
   * Sliding Window Algorithm
   *
   * How it works:
   * - Tracks each request timestamp
   * - Counts requests in the sliding time window
   * - More accurate than fixed window
   * - Prevents edge-case abuse
   *
   * Advantages:
   * - No boundary issues
   * - Precise enforcement
   * - Fair distribution
   *
   * Disadvantages:
   * - Higher memory usage (stores all timestamps)
   */
  slidingWindow(clientId, points, duration) {
    const now = Date.now();
    const windowStart = now - duration;

    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, {
        requests: [now],
        points,
        duration
      });
      return {
        allowed: true,
        remaining: points - 1,
        resetTime: now + duration
      };
    }

    const client = this.clients.get(clientId);

    // Remove requests outside the window
    client.requests = client.requests.filter(time => time > windowStart);

    // Check if under limit
    if (client.requests.length < points) {
      client.requests.push(now);

      // Reset time is when the oldest request expires
      const resetTime = client.requests[0] + duration;

      return {
        allowed: true,
        remaining: points - client.requests.length,
        resetTime
      };
    }

    // Over limit - calculate retry time
    const oldestRequest = client.requests[0];
    const retryAfter = oldestRequest + duration - now;

    return {
      allowed: false,
      remaining: 0,
      resetTime: oldestRequest + duration,
      retryAfter
    };
  }

  /**
   * Fixed Window Algorithm
   *
   * How it works:
   * - Divides time into fixed windows
   * - Counts requests per window
   * - Resets at window boundary
   *
   * Advantages:
   * - Very memory efficient
   * - Simple implementation
   * - Fast
   *
   * Disadvantages:
   * - Edge-case abuse (2x limit at boundaries)
   */
  fixedWindow(clientId, points, duration) {
    const now = Date.now();
    const windowStart = Math.floor(now / duration) * duration;

    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, {
        count: 1,
        windowStart,
        points,
        duration
      });
      return {
        allowed: true,
        remaining: points - 1,
        resetTime: windowStart + duration
      };
    }

    const client = this.clients.get(clientId);

    // Check if we're in a new window
    if (windowStart > client.windowStart) {
      client.count = 1;
      client.windowStart = windowStart;
      return {
        allowed: true,
        remaining: points - 1,
        resetTime: windowStart + duration
      };
    }

    // Check if under limit
    if (client.count < points) {
      client.count++;
      return {
        allowed: true,
        remaining: points - client.count,
        resetTime: windowStart + duration
      };
    }

    // Over limit
    return {
      allowed: false,
      remaining: 0,
      resetTime: windowStart + duration,
      retryAfter: windowStart + duration - now
    };
  }

  /**
   * Get client identifier from request
   */
  getClientId(req) {
    // In production, use user ID if authenticated
    const userId = req.headers['x-user-id'];
    if (userId) return `user:${userId}`;

    // Fall back to IP address
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
               req.headers['x-real-ip'] ||
               req.socket.remoteAddress;

    return `ip:${ip}`;
  }

  /**
   * Get rate limit configuration for endpoint
   */
  getLimitConfig(req) {
    const { method, url } = req;
    const endpoint = `${method}:${url.split('?')[0]}`;

    // Check for endpoint-specific limits
    if (this.endpointLimits[endpoint]) {
      return this.endpointLimits[endpoint];
    }

    // Check for method-specific limits
    if (this.endpointLimits[method]) {
      return this.endpointLimits[method];
    }

    // Default limits
    return {
      points: this.points,
      duration: this.duration
    };
  }

  /**
   * Check if request should be allowed
   */
  async consume(req) {
    this.stats.totalRequests++;

    const clientId = this.getClientId(req);
    const config = this.getLimitConfig(req);
    const { points, duration } = config;

    // Check if client is blocked
    if (this.blocked.has(clientId)) {
      const blockUntil = this.blocked.get(clientId);
      const now = Date.now();

      if (now < blockUntil) {
        this.stats.blockedRequests++;
        return {
          allowed: false,
          remaining: 0,
          resetTime: blockUntil,
          retryAfter: blockUntil - now,
          blocked: true
        };
      }

      // Block expired, remove it
      this.blocked.delete(clientId);
    }

    // Update unique clients count
    if (!this.clients.has(clientId)) {
      this.stats.uniqueClients = this.clients.size + 1;
    }

    // Apply rate limiting algorithm
    let result;
    switch (this.algorithm) {
      case 'token-bucket':
        result = this.tokenBucket(clientId, points, duration);
        break;
      case 'sliding-window':
        result = this.slidingWindow(clientId, points, duration);
        break;
      case 'fixed-window':
        result = this.fixedWindow(clientId, points, duration);
        break;
      default:
        throw new Error(`Unknown algorithm: ${this.algorithm}`);
    }

    // If blocked and blockDuration is set, add to blocked list
    if (!result.allowed && this.blockDuration > 0) {
      const blockUntil = Date.now() + this.blockDuration;
      this.blocked.set(clientId, blockUntil);
      result.blocked = true;
      result.retryAfter = this.blockDuration;
    }

    // Update stats
    if (result.allowed) {
      this.stats.allowedRequests++;
    } else {
      this.stats.blockedRequests++;
    }

    return result;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();

    // Clean up blocked IPs
    for (const [clientId, blockUntil] of this.blocked.entries()) {
      if (now >= blockUntil) {
        this.blocked.delete(clientId);
      }
    }

    // Clean up old client data (inactive for 1 hour)
    for (const [clientId, data] of this.clients.entries()) {
      let inactive = false;

      if (this.algorithm === 'token-bucket') {
        inactive = now - data.lastRefill > 3600000;
      } else if (this.algorithm === 'sliding-window') {
        const lastRequest = data.requests[data.requests.length - 1];
        inactive = now - lastRequest > 3600000;
      } else if (this.algorithm === 'fixed-window') {
        inactive = now - data.windowStart > data.duration + 3600000;
      }

      if (inactive) {
        this.clients.delete(clientId);
      }
    }

    this.stats.uniqueClients = this.clients.size;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      algorithm: this.algorithm,
      activeClients: this.clients.size,
      blockedClients: this.blocked.size,
      allowRate: ((this.stats.allowedRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Destroy (cleanup)
   */
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Rate Limiter Middleware
 */
function rateLimiterMiddleware(limiter) {
  return async (req, res, next) => {
    try {
      const result = await limiter.consume(req);

      // Add rate limit headers (following GitHub's standard)
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (!result.allowed) {
        // Add retry-after header (in seconds)
        const retryAfterSeconds = Math.ceil(result.retryAfter / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Retry-After', new Date(result.resetTime).toISOString());

        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Too Many Requests',
          message: result.blocked
            ? 'You have been temporarily blocked due to excessive requests'
            : 'Rate limit exceeded',
          retryAfter: retryAfterSeconds,
          retryAt: new Date(result.resetTime).toISOString()
        }, null, 2));
        return;
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request (fail-open)
      next();
    }
  };
}

/**
 * Demo Server Implementation
 */

// Create rate limiter with different configurations per endpoint
const rateLimiter = new AdvancedRateLimiter({
  algorithm: 'token-bucket', // Try: 'sliding-window', 'fixed-window'
  points: 10,
  duration: 10000, // 10 seconds
  blockDuration: 30000, // Block for 30 seconds after limit
  endpointLimits: {
    // More restrictive for authentication
    'POST:/login': { points: 5, duration: 60000 },
    // Less restrictive for static content
    'GET:/static': { points: 100, duration: 10000 },
    // Very restrictive for expensive operations
    'POST:/process': { points: 2, duration: 60000 }
  }
});

const server = http.createServer((req, res) => {
  // Apply rate limiting middleware
  rateLimiterMiddleware(rateLimiter)(req, res, () => {
    handleRequest(req, res);
  });
});

/**
 * Route handler
 */
function handleRequest(req, res) {
  const { method, url } = req;

  // Route: Get rate limiter stats
  if (url === '/stats' && method === 'GET') {
    const stats = rateLimiter.getStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
    return;
  }

  // Route: Login (strict rate limit)
  if (url === '/login' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Login successful' }));
    return;
  }

  // Route: Expensive processing (very strict)
  if (url === '/process' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Processing started' }));
    return;
  }

  // Route: Static content (lenient)
  if (url === '/static' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Static content');
    return;
  }

  // Route: Home page
  if (url === '/' && method === 'GET') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Rate Limiter Demo</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .info { background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-left: 3px solid #2196f3; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Advanced Rate Limiter Demo</h1>

  <div class="info">
    <strong>Algorithm:</strong> ${rateLimiter.algorithm}<br>
    <strong>Default Limit:</strong> ${rateLimiter.points} requests per ${rateLimiter.duration}ms
  </div>

  <h2>Rate Limit Headers</h2>
  <p>Each response includes:</p>
  <ul>
    <li><code>X-RateLimit-Limit</code> - Maximum requests allowed</li>
    <li><code>X-RateLimit-Remaining</code> - Requests remaining</li>
    <li><code>X-RateLimit-Reset</code> - When the limit resets</li>
    <li><code>Retry-After</code> - Seconds to wait (when limited)</li>
  </ul>

  <h2>Test Endpoints</h2>

  <div class="endpoint">
    <strong>GET /</strong> - This page (10 req/10s)
  </div>

  <div class="endpoint">
    <strong>POST /login</strong> - Login endpoint (5 req/60s)<br>
    <code>curl -X POST http://localhost:3000/login -i</code>
  </div>

  <div class="endpoint">
    <strong>POST /process</strong> - Expensive operation (2 req/60s)<br>
    <code>curl -X POST http://localhost:3000/process -i</code>
  </div>

  <div class="endpoint">
    <strong>GET /static</strong> - Static content (100 req/10s)<br>
    <code>curl http://localhost:3000/static -i</code>
  </div>

  <div class="endpoint">
    <strong>GET /stats</strong> - <a href="/stats">Rate limiter statistics</a>
  </div>

  <h2>Test Rate Limiting</h2>
  <p>Run this command to test:</p>
  <code>for i in {1..15}; do curl http://localhost:3000/ -i | grep -E "HTTP|X-RateLimit"; sleep 0.5; done</code>

  <h2>Algorithm Comparison</h2>
  <ul>
    <li><strong>Token Bucket:</strong> Allows bursts, smooth rate limiting</li>
    <li><strong>Sliding Window:</strong> Precise, no boundary issues, higher memory</li>
    <li><strong>Fixed Window:</strong> Simple, fast, potential edge-case abuse</li>
  </ul>
</body>
</html>
    `.trim();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nRate Limiter: ${rateLimiter.algorithm}`);
  console.log(`Default Limit: ${rateLimiter.points} requests per ${rateLimiter.duration}ms\n`);
  console.log('Test rate limiting:');
  console.log(`for i in {1..15}; do curl http://localhost:${PORT}/ -i | grep -E "HTTP|X-RateLimit"; sleep 0.5; done`);
});

// Cleanup on exit
process.on('SIGTERM', () => {
  rateLimiter.destroy();
  server.close();
});

/**
 * Production Best Practices:
 *
 * 1. Storage Backend:
 *    - Use Redis for distributed systems
 *    - Use Redis Sorted Sets for sliding window
 *    - Use Redis INCR for fixed window
 *    - Implement connection pooling
 *
 * 2. Rate Limit Strategy:
 *    - Different limits per user tier (free/paid)
 *    - More restrictive for authentication endpoints
 *    - Burst allowance for normal usage patterns
 *    - Global limits to prevent abuse
 *
 * 3. Headers and Communication:
 *    - Follow RFC 6585 for 429 status
 *    - Include clear error messages
 *    - Provide retry timing information
 *    - Document limits in API docs
 *
 * 4. Monitoring:
 *    - Track rate limit hits
 *    - Alert on unusual patterns
 *    - Monitor false positives
 *    - Analyze usage patterns
 *
 * 5. Advanced Features:
 *    - Whitelist trusted IPs/users
 *    - Dynamic limits based on load
 *    - Cost-based limiting (expensive ops count more)
 *    - Distributed rate limiting with Redis
 *
 * 6. Security:
 *    - Rate limit by IP and user ID
 *    - Prevent enumeration attacks
 *    - Protect against DDoS
 *    - Log and alert on limit violations
 */

module.exports = { AdvancedRateLimiter, rateLimiterMiddleware };
