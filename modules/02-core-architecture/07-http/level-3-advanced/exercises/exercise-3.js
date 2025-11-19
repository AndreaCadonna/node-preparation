/**
 * Exercise 3: Security Headers Middleware
 * Implement comprehensive security headers
 */

const http = require('http');

// Task: Create middleware that adds:
// 1. Content-Security-Policy
// 2. X-Frame-Options
// 3. X-Content-Type-Options
// 4. X-XSS-Protection
// 5. Strict-Transport-Security
// 6. Referrer-Policy
// 7. Permissions-Policy

function securityHeaders(req, res, next) {
  // TODO: Implement security headers
}

const server = http.createServer((req, res) => {
  // TODO: Apply security middleware
});

server.listen(3000);
