/**
 * Exercise 2: Advanced Rate Limiter
 * Build production-grade rate limiter
 */

const http = require('http');

// Task: Implement rate limiter with:
// 1. Token bucket algorithm
// 2. Sliding window
// 3. Per-user and per-IP limits
// 4. Redis-like storage (in-memory)
// 5. Configurable limits per endpoint
// 6. Rate limit headers
// 7. Retry-After header

class AdvancedRateLimiter {
  // TODO: Implement
}

const server = http.createServer((req, res) => {
  // TODO: Apply rate limiting
});

server.listen(3000);
