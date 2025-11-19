/**
 * Example 3: Rate Limiting
 *
 * Demonstrates:
 * - Token bucket algorithm
 * - Per-IP rate limiting
 * - Different limits for different endpoints
 * - Rate limit headers
 */

const http = require('http');

console.log('=== Rate Limiting Example ===\n');

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.max = options.max || 10;
    this.clients = new Map();
  }

  check(identifier) {
    const now = Date.now();
    const client = this.clients.get(identifier) || {
      count: 0,
      resetTime: now + this.windowMs
    };

    if (now > client.resetTime) {
      client.count = 0;
      client.resetTime = now + this.windowMs;
    }

    client.count++;
    this.clients.set(identifier, client);

    const remaining = Math.max(0, this.max - client.count);
    const resetIn = Math.ceil((client.resetTime - now) / 1000);

    return {
      allowed: client.count <= this.max,
      limit: this.max,
      remaining: remaining,
      resetIn: resetIn
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, client] of this.clients) {
      if (now > client.resetTime) {
        this.clients.delete(key);
      }
    }
  }
}

// Different limiters for different endpoints
const globalLimiter = new RateLimiter({ windowMs: 60000, max: 100 });
const apiLimiter = new RateLimiter({ windowMs: 60000, max: 10 });
const strictLimiter = new RateLimiter({ windowMs: 60000, max: 3 });

// Cleanup every minute
setInterval(() => {
  globalLimiter.cleanup();
  apiLimiter.cleanup();
  strictLimiter.cleanup();
}, 60000);

const server = http.createServer((req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Choose limiter based on endpoint
  let limiter = globalLimiter;
  if (pathname.startsWith('/api/')) {
    limiter = apiLimiter;
  } else if (pathname === '/strict') {
    limiter = strictLimiter;
  }

  // Check rate limit
  const result = limiter.check(clientIp);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetIn);

  if (!result.allowed) {
    console.log(`Rate limit exceeded for ${clientIp}`);
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': result.resetIn
    });
    res.end(JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${result.resetIn} seconds`,
      limit: result.limit,
      resetIn: result.resetIn
    }));
    return;
  }

  // Handle routes
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Rate Limiting Demo</h1>
      <p>Your IP: ${clientIp}</p>
      <p>Requests remaining: ${result.remaining}/${result.limit}</p>
      <p>Resets in: ${result.resetIn} seconds</p>
      <ul>
        <li><a href="/api/data">API endpoint (10 req/min)</a></li>
        <li><a href="/strict">Strict endpoint (3 req/min)</a></li>
      </ul>
    `);
  } else if (pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: 'API response',
      rateLimit: result
    }));
  } else if (pathname === '/strict') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Strict rate limited endpoint',
      rateLimit: result
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/\n');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
