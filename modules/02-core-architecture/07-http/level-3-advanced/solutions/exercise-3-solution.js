/**
 * Exercise 3 Solution: Security Headers Middleware
 * Comprehensive security headers for production applications
 */

const http = require('http');

/**
 * Security Headers Middleware
 *
 * Implements defense-in-depth strategy with multiple security headers:
 * - Content-Security-Policy (CSP) - Prevents XSS, injection attacks
 * - X-Frame-Options - Prevents clickjacking
 * - X-Content-Type-Options - Prevents MIME sniffing
 * - X-XSS-Protection - Legacy XSS filter (deprecated but still useful)
 * - Strict-Transport-Security (HSTS) - Forces HTTPS
 * - Referrer-Policy - Controls referrer information
 * - Permissions-Policy - Controls browser features
 *
 * Security Best Practices:
 * - Start with strict defaults, relax as needed
 * - Test thoroughly before production
 * - Monitor CSP violations
 * - Keep policies up to date
 */

class SecurityHeadersMiddleware {
  constructor(options = {}) {
    this.options = {
      // Content Security Policy
      contentSecurityPolicy: options.contentSecurityPolicy !== false ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
          ...options.contentSecurityPolicy?.directives
        },
        reportOnly: options.contentSecurityPolicy?.reportOnly || false,
        reportUri: options.contentSecurityPolicy?.reportUri || null
      } : false,

      // X-Frame-Options
      frameOptions: options.frameOptions || 'DENY', // DENY, SAMEORIGIN, ALLOW-FROM

      // X-Content-Type-Options
      contentTypeOptions: options.contentTypeOptions !== false,

      // X-XSS-Protection (deprecated but still useful for older browsers)
      xssProtection: options.xssProtection !== false,

      // Strict-Transport-Security (HSTS)
      hsts: options.hsts !== false ? {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: false,
        ...options.hsts
      } : false,

      // Referrer-Policy
      referrerPolicy: options.referrerPolicy || 'strict-origin-when-cross-origin',

      // Permissions-Policy (formerly Feature-Policy)
      permissionsPolicy: options.permissionsPolicy !== false ? {
        geolocation: [],
        microphone: [],
        camera: [],
        payment: [],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: [],
        ...options.permissionsPolicy
      } : false,

      // Additional security headers
      dnsPrefetchControl: options.dnsPrefetchControl !== false ? 'off' : false,
      downloadOptions: options.downloadOptions !== false ? 'noopen' : false,

      // Custom headers
      customHeaders: options.customHeaders || {}
    };

    // Statistics
    this.stats = {
      totalRequests: 0,
      cspViolations: 0,
      secureConnections: 0,
      insecureConnections: 0
    };
  }

  /**
   * Build Content-Security-Policy header value
   */
  buildCSP() {
    if (!this.options.contentSecurityPolicy) return null;

    const { directives } = this.options.contentSecurityPolicy;
    const parts = [];

    for (const [key, values] of Object.entries(directives)) {
      // Convert camelCase to kebab-case
      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();

      if (Array.isArray(values)) {
        if (values.length === 0) {
          // Directive with no values (e.g., upgrade-insecure-requests)
          parts.push(directive);
        } else {
          parts.push(`${directive} ${values.join(' ')}`);
        }
      }
    }

    return parts.join('; ');
  }

  /**
   * Build Permissions-Policy header value
   */
  buildPermissionsPolicy() {
    if (!this.options.permissionsPolicy) return null;

    const parts = [];

    for (const [feature, allowlist] of Object.entries(this.options.permissionsPolicy)) {
      // Convert camelCase to kebab-case
      const featureName = feature.replace(/([A-Z])/g, '-$1').toLowerCase();

      if (Array.isArray(allowlist)) {
        if (allowlist.length === 0) {
          parts.push(`${featureName}=()`);
        } else {
          const origins = allowlist.map(origin => {
            if (origin === 'self') return 'self';
            return `"${origin}"`;
          }).join(' ');
          parts.push(`${featureName}=(${origins})`);
        }
      }
    }

    return parts.join(', ');
  }

  /**
   * Apply security headers to response
   */
  applyHeaders(req, res) {
    this.stats.totalRequests++;

    // Track connection security
    const isSecure = req.connection.encrypted || req.headers['x-forwarded-proto'] === 'https';
    if (isSecure) {
      this.stats.secureConnections++;
    } else {
      this.stats.insecureConnections++;
    }

    // Content-Security-Policy
    if (this.options.contentSecurityPolicy) {
      const csp = this.buildCSP();
      if (csp) {
        const headerName = this.options.contentSecurityPolicy.reportOnly
          ? 'Content-Security-Policy-Report-Only'
          : 'Content-Security-Policy';
        res.setHeader(headerName, csp);

        // Add report-to if specified
        if (this.options.contentSecurityPolicy.reportUri) {
          const existingCsp = res.getHeader(headerName);
          res.setHeader(headerName, `${existingCsp}; report-uri ${this.options.contentSecurityPolicy.reportUri}`);
        }
      }
    }

    // X-Frame-Options
    if (this.options.frameOptions) {
      res.setHeader('X-Frame-Options', this.options.frameOptions);
    }

    // X-Content-Type-Options
    if (this.options.contentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (this.options.xssProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Strict-Transport-Security (only on HTTPS)
    if (this.options.hsts && isSecure) {
      const { maxAge, includeSubDomains, preload } = this.options.hsts;
      let hsts = `max-age=${maxAge}`;
      if (includeSubDomains) hsts += '; includeSubDomains';
      if (preload) hsts += '; preload';
      res.setHeader('Strict-Transport-Security', hsts);
    }

    // Referrer-Policy
    if (this.options.referrerPolicy) {
      res.setHeader('Referrer-Policy', this.options.referrerPolicy);
    }

    // Permissions-Policy
    const permissionsPolicy = this.buildPermissionsPolicy();
    if (permissionsPolicy) {
      res.setHeader('Permissions-Policy', permissionsPolicy);
    }

    // X-DNS-Prefetch-Control
    if (this.options.dnsPrefetchControl) {
      res.setHeader('X-DNS-Prefetch-Control', this.options.dnsPrefetchControl);
    }

    // X-Download-Options (IE specific)
    if (this.options.downloadOptions) {
      res.setHeader('X-Download-Options', this.options.downloadOptions);
    }

    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Custom headers
    for (const [name, value] of Object.entries(this.options.customHeaders)) {
      res.setHeader(name, value);
    }
  }

  /**
   * Middleware function
   */
  middleware() {
    return (req, res, next) => {
      this.applyHeaders(req, res);
      next();
    };
  }

  /**
   * Handle CSP violation reports
   */
  handleCSPViolation(req, res) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const report = JSON.parse(body);
        this.stats.cspViolations++;

        // Log violation
        console.error('CSP Violation:', JSON.stringify(report, null, 2));

        // In production, send to logging service
        // logToService(report);

        res.writeHead(204); // No Content
        res.end();
      } catch (error) {
        console.error('Error parsing CSP violation report:', error);
        res.writeHead(400);
        res.end();
      }
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      securityScore: this.calculateSecurityScore()
    };
  }

  /**
   * Calculate security score based on enabled features
   */
  calculateSecurityScore() {
    let score = 0;
    const maxScore = 10;

    if (this.options.contentSecurityPolicy) score += 3;
    if (this.options.hsts) score += 2;
    if (this.options.frameOptions) score += 1;
    if (this.options.contentTypeOptions) score += 1;
    if (this.options.xssProtection) score += 1;
    if (this.options.referrerPolicy) score += 1;
    if (this.options.permissionsPolicy) score += 1;

    return `${score}/${maxScore}`;
  }
}

/**
 * Demo Server Implementation
 */

// Initialize security middleware with strict defaults
const securityHeaders = new SecurityHeadersMiddleware({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // For demo; remove in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    },
    reportOnly: false, // Set to true for testing
    reportUri: '/csp-violation-report'
  },
  frameOptions: 'DENY',
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    geolocation: [], // Block all
    microphone: [],
    camera: [],
    payment: [],
    usb: []
  }
});

const server = http.createServer((req, res) => {
  // Apply security middleware
  securityHeaders.middleware()(req, res, () => {
    handleRequest(req, res);
  });
});

/**
 * Route handler
 */
function handleRequest(req, res) {
  const { method, url } = req;

  // Route: CSP Violation Report
  if (url === '/csp-violation-report' && method === 'POST') {
    securityHeaders.handleCSPViolation(req, res);
    return;
  }

  // Route: Security stats
  if (url === '/stats' && method === 'GET') {
    const stats = securityHeaders.getStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
    return;
  }

  // Route: Test page with CSP violation
  if (url === '/test-csp' && method === 'GET') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>CSP Test</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .violation { background: #ffebee; padding: 15px; margin: 20px 0; border-left: 4px solid #f44336; }
  </style>
</head>
<body>
  <h1>Content Security Policy Test</h1>

  <div class="violation">
    <strong>Test CSP Violation:</strong>
    <p>The script below is blocked by CSP (inline script without nonce/hash)</p>
  </div>

  <button onclick="alert('This will be blocked!')">Click Me</button>

  <script>
    // This inline script is allowed because we have 'unsafe-inline' in demo
    // In production, use nonces or hashes instead
    console.log('Script loaded');
  </script>

  <p><a href="/">Back to Home</a></p>
</body>
</html>
    `.trim();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Route: Headers inspector
  if (url === '/headers' && method === 'GET') {
    const headers = {};
    res.getHeaderNames().forEach(name => {
      headers[name] = res.getHeader(name);
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Security Headers Inspector</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { background: #f5f5f5; padding: 10px; margin: 5px 0; border-left: 3px solid #4caf50; }
    .header-name { font-weight: bold; color: #1976d2; }
    .header-value { color: #555; margin-top: 5px; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Security Headers</h1>
  ${Object.entries(headers).map(([name, value]) => `
    <div class="header">
      <div class="header-name">${name}</div>
      <div class="header-value">${value}</div>
    </div>
  `).join('')}
  <p><a href="/">Back to Home</a></p>
</body>
</html>
    `.trim();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Route: Home page
  if (url === '/' && method === 'GET') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Security Headers Demo</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .header-info { background: #e8f5e9; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .warning { background: #fff3e0; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9800; }
    .security { background: #e3f2fd; padding: 15px; margin: 20px 0; border-left: 4px solid #2196f3; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    ul { margin: 10px 0; }
    li { margin: 5px 0; }
    a { color: #1976d2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Security Headers Middleware Demo</h1>

  <div class="header-info">
    <strong>Security Score:</strong> ${securityHeaders.calculateSecurityScore()}<br>
    <strong>Active Protection:</strong> CSP, HSTS, Frame Protection, XSS Filter
  </div>

  <h2>Implemented Security Headers</h2>

  <div class="security">
    <h3>1. Content-Security-Policy (CSP)</h3>
    <p>Prevents XSS, clickjacking, and other injection attacks by controlling resource loading.</p>
    <ul>
      <li><code>default-src 'self'</code> - Only load resources from same origin</li>
      <li><code>script-src 'self'</code> - Only execute scripts from same origin</li>
      <li><code>object-src 'none'</code> - Disable plugins (Flash, Java)</li>
      <li><code>frame-ancestors 'none'</code> - Prevent embedding in frames</li>
    </ul>
  </div>

  <div class="security">
    <h3>2. Strict-Transport-Security (HSTS)</h3>
    <p>Forces browsers to use HTTPS for all future requests.</p>
    <ul>
      <li><code>max-age=31536000</code> - Remember for 1 year</li>
      <li><code>includeSubDomains</code> - Apply to all subdomains</li>
    </ul>
  </div>

  <div class="security">
    <h3>3. X-Frame-Options</h3>
    <p>Prevents clickjacking by controlling if site can be framed.</p>
    <ul>
      <li><code>DENY</code> - Cannot be framed at all</li>
      <li>Alternative: <code>SAMEORIGIN</code> - Only same-origin framing</li>
    </ul>
  </div>

  <div class="security">
    <h3>4. X-Content-Type-Options</h3>
    <p>Prevents MIME-sniffing attacks.</p>
    <ul>
      <li><code>nosniff</code> - Browser must respect declared content type</li>
    </ul>
  </div>

  <div class="security">
    <h3>5. X-XSS-Protection</h3>
    <p>Legacy XSS filter for older browsers.</p>
    <ul>
      <li><code>1; mode=block</code> - Enable filter and block pages</li>
    </ul>
  </div>

  <div class="security">
    <h3>6. Referrer-Policy</h3>
    <p>Controls how much referrer information is shared.</p>
    <ul>
      <li><code>strict-origin-when-cross-origin</code> - Full URL for same-origin, origin only for cross-origin</li>
    </ul>
  </div>

  <div class="security">
    <h3>7. Permissions-Policy</h3>
    <p>Controls which browser features can be used.</p>
    <ul>
      <li><code>geolocation=()</code> - Block geolocation</li>
      <li><code>microphone=()</code> - Block microphone access</li>
      <li><code>camera=()</code> - Block camera access</li>
    </ul>
  </div>

  <h2>Test Pages</h2>
  <ul>
    <li><a href="/headers">View All Security Headers</a></li>
    <li><a href="/test-csp">Test CSP Violations</a></li>
    <li><a href="/stats">Security Statistics</a></li>
  </ul>

  <div class="warning">
    <strong>Production Checklist:</strong>
    <ul>
      <li>Remove <code>'unsafe-inline'</code> from CSP (use nonces/hashes)</li>
      <li>Enable HSTS preload after testing</li>
      <li>Monitor CSP violation reports</li>
      <li>Test all features work with strict CSP</li>
      <li>Gradually tighten policies</li>
    </ul>
  </div>

  <h2>Testing Security Headers</h2>
  <p>Check your headers with:</p>
  <code>curl -I http://localhost:3000/</code>

  <p>Or use online tools:</p>
  <ul>
    <li><a href="https://securityheaders.com" target="_blank">securityheaders.com</a></li>
    <li><a href="https://observatory.mozilla.org" target="_blank">Mozilla Observatory</a></li>
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
  console.log(`Security Score: ${securityHeaders.calculateSecurityScore()}\n`);
  console.log('View security headers:');
  console.log(`curl -I http://localhost:${PORT}/`);
  console.log('\nTest pages:');
  console.log(`http://localhost:${PORT}/headers - View all headers`);
  console.log(`http://localhost:${PORT}/test-csp - Test CSP`);
  console.log(`http://localhost:${PORT}/stats - Statistics`);
});

/**
 * Production Best Practices:
 *
 * 1. Content Security Policy:
 *    - Start with report-only mode
 *    - Monitor violation reports
 *    - Gradually tighten policies
 *    - Use nonces/hashes instead of unsafe-inline
 *    - Whitelist only necessary sources
 *
 * 2. HSTS:
 *    - Test thoroughly before enabling
 *    - Start with short max-age
 *    - Enable preload only when confident
 *    - Remember: HSTS is hard to undo
 *
 * 3. Monitoring:
 *    - Log CSP violations to analytics
 *    - Track security header adoption
 *    - Alert on unusual patterns
 *    - Regular security audits
 *
 * 4. Testing:
 *    - Use securityheaders.com
 *    - Mozilla Observatory
 *    - Test in all browsers
 *    - Verify mobile compatibility
 *
 * 5. Defense in Depth:
 *    - Headers are one layer
 *    - Also validate/sanitize input
 *    - Use secure authentication
 *    - Keep dependencies updated
 *    - Regular security reviews
 *
 * 6. Performance:
 *    - Headers add minimal overhead
 *    - CSP may improve performance (blocks bad resources)
 *    - HSTS reduces redirects
 *    - Monitor impact on metrics
 */

module.exports = { SecurityHeadersMiddleware };
