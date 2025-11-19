/**
 * Exercise 5: HTTPS Server with Redirects
 *
 * Create a production-ready HTTPS server.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

// Task 1: Generate or load SSL certificates
// Use OpenSSL or create self-signed certs

// Task 2: Create HTTPS server with:
// - Minimum TLS version 1.2
// - Strong cipher configuration
// - Proper certificate handling

// Task 3: Create HTTP server that:
// - Redirects all traffic to HTTPS
// - Except /health endpoint (for load balancers)
// - Sets HSTS header

// Task 4: Implement certificate renewal check
// - Check certificate expiration
// - Log warning if expiring soon (< 30 days)

// Task 5: Add security headers:
// - Strict-Transport-Security
// - X-Content-Type-Options
// - X-Frame-Options
// - X-XSS-Protection

const httpsServer = https.createServer({
  // TODO: Configure SSL options
}, (req, res) => {
  // TODO: Handle HTTPS requests
});

const httpServer = http.createServer((req, res) => {
  // TODO: Redirect to HTTPS or handle /health
});

httpsServer.listen(8443);
httpServer.listen(8080);
