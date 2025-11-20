/**
 * Exercise 5: HTTPS Server with Redirects - SOLUTION
 *
 * Complete implementation of production-ready HTTPS server with:
 * - Self-signed SSL certificates
 * - Strong TLS configuration
 * - HTTP to HTTPS redirects
 * - Security headers
 * - Certificate expiration check
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('=== Exercise 5: HTTPS Server with Redirects - SOLUTION ===\n');

// ============================================================================
// Configuration
// ============================================================================

const CERTS_DIR = path.join(__dirname, 'certs');
const CERT_FILE = path.join(CERTS_DIR, 'server.crt');
const KEY_FILE = path.join(CERTS_DIR, 'server.key');

const HTTPS_PORT = 8443;
const HTTP_PORT = 8080;

// Certificate expiration warning threshold (30 days)
const EXPIRATION_WARNING_DAYS = 30;

// ============================================================================
// Task 1: Generate or Load SSL Certificates
// ============================================================================

/**
 * Generate self-signed SSL certificate using OpenSSL
 *
 * For production, use:
 * - Let's Encrypt (free, automated)
 * - Commercial CA (DigiCert, GlobalSign, etc.)
 * - AWS ACM, Cloudflare, etc.
 *
 * This creates a self-signed cert for development/testing.
 */
function generateSelfSignedCert() {
  console.log('Generating self-signed SSL certificate...');

  try {
    // Create certs directory if it doesn't exist
    if (!fs.existsSync(CERTS_DIR)) {
      fs.mkdirSync(CERTS_DIR, { recursive: true });
      console.log('✓ Created certs directory:', CERTS_DIR);
    }

    // Generate private key and certificate using OpenSSL
    // -nodes: No DES encryption (no password required)
    // -days 365: Valid for 1 year
    // -newkey rsa:2048: Generate new 2048-bit RSA key
    // -keyout: Private key output file
    // -out: Certificate output file
    // -subj: Certificate subject (CN=localhost for local testing)
    const command = `openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
      -keyout ${KEY_FILE} \\
      -out ${CERT_FILE} \\
      -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;

    execSync(command, { stdio: 'pipe' });

    console.log('✓ Generated SSL certificate');
    console.log(`  Certificate: ${CERT_FILE}`);
    console.log(`  Private Key: ${KEY_FILE}`);

    return true;
  } catch (error) {
    console.error('✗ Failed to generate certificate:', error.message);
    console.error('\nNote: OpenSSL must be installed on your system.');
    console.error('Install OpenSSL:');
    console.error('  - macOS: brew install openssl');
    console.error('  - Ubuntu/Debian: apt-get install openssl');
    console.error('  - Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
    return false;
  }
}

/**
 * Load SSL certificates
 */
function loadCertificates() {
  try {
    // Check if certificates exist
    if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
      console.log('✗ Certificates not found, generating new ones...');
      if (!generateSelfSignedCert()) {
        throw new Error('Failed to generate certificates');
      }
    }

    const cert = fs.readFileSync(CERT_FILE);
    const key = fs.readFileSync(KEY_FILE);

    console.log('✓ Loaded SSL certificates');

    return { cert, key };
  } catch (error) {
    console.error('✗ Failed to load certificates:', error.message);
    throw error;
  }
}

// ============================================================================
// Task 4: Certificate Expiration Check
// ============================================================================

/**
 * Check certificate expiration and warn if expiring soon
 *
 * This demonstrates:
 * - Reading certificate metadata
 * - Date calculations
 * - Proactive monitoring
 */
function checkCertificateExpiration() {
  try {
    if (!fs.existsSync(CERT_FILE)) {
      return;
    }

    // Read certificate using OpenSSL
    const certInfo = execSync(
      `openssl x509 -in ${CERT_FILE} -noout -dates`,
      { encoding: 'utf8' }
    );

    // Parse expiration date
    // Output format: notAfter=Dec 31 23:59:59 2024 GMT
    const expiryMatch = certInfo.match(/notAfter=(.+)/);

    if (expiryMatch) {
      const expiryDate = new Date(expiryMatch[1]);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

      console.log(`\nCertificate Expiration Check:`);
      console.log(`  Expires: ${expiryDate.toISOString()}`);
      console.log(`  Days remaining: ${daysUntilExpiry}`);

      if (daysUntilExpiry < 0) {
        console.warn('  ⚠️  WARNING: Certificate has EXPIRED!');
      } else if (daysUntilExpiry < EXPIRATION_WARNING_DAYS) {
        console.warn(`  ⚠️  WARNING: Certificate expires in ${daysUntilExpiry} days!`);
      } else {
        console.log('  ✓ Certificate valid');
      }
      console.log('');
    }
  } catch (error) {
    console.error('Could not check certificate expiration:', error.message);
  }
}

// ============================================================================
// Task 5: Security Headers
// ============================================================================

/**
 * Add security headers to response
 *
 * Security headers protect against common vulnerabilities:
 * - HSTS: Force HTTPS for future visits
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - X-Frame-Options: Prevent clickjacking
 * - X-XSS-Protection: Enable browser XSS filter
 * - Content-Security-Policy: Prevent XSS/injection attacks
 */
function setSecurityHeaders(res) {
  const headers = {
    // Strict-Transport-Security (HSTS)
    // - Forces browser to use HTTPS for 1 year
    // - includeSubDomains: Apply to all subdomains
    // - preload: Allow inclusion in browser HSTS preload lists
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // X-Content-Type-Options
    // - Prevents browsers from MIME-sniffing
    // - Forces use of declared Content-Type
    'X-Content-Type-Options': 'nosniff',

    // X-Frame-Options
    // - Prevents clickjacking attacks
    // - DENY: Cannot be framed at all
    // - SAMEORIGIN: Can only be framed by same origin
    'X-Frame-Options': 'SAMEORIGIN',

    // X-XSS-Protection
    // - Enables browser's built-in XSS filter
    // - mode=block: Block page instead of sanitizing
    'X-XSS-Protection': '1; mode=block',

    // Content-Security-Policy
    // - Controls resource loading
    // - Prevents XSS and injection attacks
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",

    // X-Permitted-Cross-Domain-Policies
    // - Controls cross-domain policy files (Flash, PDF)
    'X-Permitted-Cross-Domain-Policies': 'none',

    // Referrer-Policy
    // - Controls referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  Object.entries(headers).forEach(([name, value]) => {
    res.setHeader(name, value);
  });
}

// ============================================================================
// Task 2: Create HTTPS Server
// ============================================================================

/**
 * HTTPS server with strong TLS configuration
 */
function createHTTPSServer() {
  const credentials = loadCertificates();

  // Task 2: Configure strong TLS options
  const tlsOptions = {
    key: credentials.key,
    cert: credentials.cert,

    // Minimum TLS version 1.2 (disable older, insecure versions)
    minVersion: 'TLSv1.2',

    // Strong cipher configuration
    // - Prefer modern, secure ciphers
    // - Exclude weak/vulnerable ciphers
    // - Enable forward secrecy (ECDHE)
    ciphers: [
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-CHACHA20-POLY1305',
      'ECDHE-RSA-CHACHA20-POLY1305',
      'DHE-RSA-AES128-GCM-SHA256',
      'DHE-RSA-AES256-GCM-SHA384'
    ].join(':'),

    // Prefer server cipher order
    honorCipherOrder: true
  };

  const server = https.createServer(tlsOptions, (req, res) => {
    // Task 5: Add security headers
    setSecurityHeaders(res);

    // Simple routing
    const { url } = req;

    if (url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Secure HTTPS Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #2e7d32; }
            .secure { background: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; }
            .feature { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
            code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
            .lock { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="lock">🔒</div>
          <h1>Secure HTTPS Server</h1>

          <div class="secure">
            <strong>This connection is secure!</strong><br>
            Your connection is encrypted with TLS 1.2+
          </div>

          <h2>Security Features</h2>

          <div class="feature">
            <strong>✓ TLS 1.2+ Encryption</strong><br>
            Modern encryption protocol with strong ciphers
          </div>

          <div class="feature">
            <strong>✓ HSTS Enabled</strong><br>
            Strict-Transport-Security header forces HTTPS
          </div>

          <div class="feature">
            <strong>✓ Security Headers</strong><br>
            X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
          </div>

          <div class="feature">
            <strong>✓ CSP Protection</strong><br>
            Content-Security-Policy prevents XSS attacks
          </div>

          <div class="feature">
            <strong>✓ Auto HTTP Redirect</strong><br>
            HTTP traffic automatically redirected to HTTPS
          </div>

          <h2>Server Information</h2>
          <pre>HTTPS Port: ${HTTPS_PORT}
HTTP Port:  ${HTTP_PORT}
TLS Version: ${req.socket.getProtocol()}
Cipher: ${req.socket.getCipher()?.name}</pre>

          <h2>Test Endpoints</h2>
          <p><a href="/api">GET /api</a> - Test API endpoint</p>
          <p><a href="/health">GET /health</a> - Health check</p>

          <h2>Browser Note</h2>
          <p>
            If you see a security warning, it's because this is a self-signed certificate.
            In production, use a certificate from a trusted CA (Let's Encrypt, etc.).
          </p>
        </body>
        </html>
      `);

    } else if (url === '/api') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Secure API endpoint',
        timestamp: new Date().toISOString(),
        connection: {
          protocol: req.socket.getProtocol(),
          cipher: req.socket.getCipher()
        }
      }, null, 2));

    } else if (url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString()
      }));

    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not Found',
        path: url
      }));
    }
  });

  return server;
}

// ============================================================================
// Task 3: Create HTTP Server with Redirects
// ============================================================================

/**
 * HTTP server that redirects to HTTPS
 *
 * Exceptions:
 * - /health endpoint (for load balancers that don't support HTTPS health checks)
 */
function createHTTPServer() {
  const server = http.createServer((req, res) => {
    const { url } = req;

    // Task 3: Exception for /health endpoint
    // Load balancers often use HTTP for health checks
    if (url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        note: 'HTTP health check endpoint'
      }));
      return;
    }

    // Task 3: Redirect all other traffic to HTTPS
    const host = req.headers.host || 'localhost';
    const redirectUrl = `https://${host.replace(HTTP_PORT, HTTPS_PORT)}${url}`;

    console.log(`Redirecting: ${req.url} -> ${redirectUrl}`);

    // 301: Permanent redirect
    // Tells browsers to always use HTTPS in the future
    res.writeHead(301, {
      'Location': redirectUrl,
      'Strict-Transport-Security': 'max-age=31536000' // Task 3: Set HSTS header
    });
    res.end();
  });

  return server;
}

// ============================================================================
// Server Startup
// ============================================================================

async function startServers() {
  try {
    console.log('Starting HTTPS server with redirects...\n');

    // Task 4: Check certificate expiration
    checkCertificateExpiration();

    // Create servers
    const httpsServer = createHTTPSServer();
    const httpServer = createHTTPServer();

    // Start HTTPS server
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`✓ HTTPS server listening on port ${HTTPS_PORT}`);
      console.log(`  https://localhost:${HTTPS_PORT}/`);
    });

    // Start HTTP server (for redirects)
    httpServer.listen(HTTP_PORT, () => {
      console.log(`✓ HTTP server listening on port ${HTTP_PORT}`);
      console.log(`  http://localhost:${HTTP_PORT}/ (redirects to HTTPS)`);
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('Secure HTTPS Server Running');
    console.log(`${'='.repeat(60)}`);
    console.log(`\nHTTPS URL: https://localhost:${HTTPS_PORT}/`);
    console.log(`HTTP URL:  http://localhost:${HTTP_PORT}/ (auto-redirects)`);
    console.log(`\nSecurity Features:`);
    console.log(`  ✓ TLS 1.2+ with strong ciphers`);
    console.log(`  ✓ HSTS header (forces HTTPS)`);
    console.log(`  ✓ Security headers (XSS, clickjacking protection)`);
    console.log(`  ✓ HTTP to HTTPS redirect`);
    console.log(`  ✓ Health check exception (/health)`);
    console.log(`  ✓ Certificate expiration monitoring`);
    console.log(`\nEndpoints:`);
    console.log(`  GET /         - Home page`);
    console.log(`  GET /api      - API endpoint`);
    console.log(`  GET /health   - Health check (HTTP & HTTPS)`);
    console.log(`\nNote: Browser will show warning for self-signed certificate.`);
    console.log(`In production, use certificates from trusted CA.`);
    console.log(`\n${'='.repeat(60)}\n`);

    // Handle server errors
    httpsServer.on('error', (error) => {
      console.error('HTTPS server error:', error);
      process.exit(1);
    });

    httpServer.on('error', (error) => {
      console.error('HTTP server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down servers...');

      httpsServer.close(() => {
        console.log('✓ HTTPS server closed');
      });

      httpServer.close(() => {
        console.log('✓ HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start servers:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// Start the servers
// ============================================================================

startServers();

// ============================================================================
// Educational Notes
// ============================================================================

console.log('Implementation Highlights:');
console.log('✓ Self-signed SSL certificate generation');
console.log('✓ Strong TLS 1.2+ configuration');
console.log('✓ Modern cipher suites with forward secrecy');
console.log('✓ HTTP to HTTPS redirect (301 permanent)');
console.log('✓ HSTS header for forced HTTPS');
console.log('✓ Comprehensive security headers');
console.log('✓ Health check exception for load balancers');
console.log('✓ Certificate expiration monitoring');
console.log('✓ Graceful shutdown handling');
console.log('');

console.log('Production Recommendations:');
console.log('• Use Let\'s Encrypt for free, automated certificates');
console.log('• Store private keys securely (file permissions, HSM)');
console.log('• Implement certificate rotation/renewal automation');
console.log('• Monitor certificate expiration (30+ days warning)');
console.log('• Use CDN/reverse proxy for SSL termination (Cloudflare, etc.)');
console.log('• Enable OCSP stapling for better performance');
console.log('• Regular security audits and TLS configuration updates');
console.log('');
