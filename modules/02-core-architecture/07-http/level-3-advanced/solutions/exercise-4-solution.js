/**
 * Exercise 4 Solution: HTTP/2 Server with Server Push
 * Intelligent HTTP/2 server with resource optimization
 */

const http2 = require('http2');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * HTTP/2 Server with Server Push
 *
 * Key Features:
 * - HTTP/2 protocol support with multiplexing
 * - Intelligent server push for linked resources
 * - Cache tracking to avoid duplicate pushes
 * - Priority hints for resource loading
 * - Automatic resource discovery from HTML
 * - Graceful fallback to HTTP/1.1
 *
 * HTTP/2 Benefits:
 * - Multiplexing: Multiple requests over single connection
 * - Server Push: Proactively send resources
 * - Header Compression: HPACK algorithm
 * - Stream Prioritization: Critical resources first
 * - Binary Protocol: More efficient parsing
 */

class HTTP2ServerWithPush {
  constructor(options = {}) {
    this.options = {
      // Server push enabled
      enablePush: options.enablePush !== false,

      // Track pushed resources per session
      trackPushedResources: options.trackPushedResources !== false,

      // Auto-discover resources from HTML
      autoDiscoverResources: options.autoDiscoverResources !== false,

      // Maximum concurrent pushes
      maxConcurrentPushes: options.maxConcurrentPushes || 10,

      // Resource priorities
      priorities: {
        css: 'high',
        js: 'low',
        img: 'low',
        font: 'high',
        ...options.priorities
      },

      // Content root directory
      contentRoot: options.contentRoot || path.join(__dirname, 'public'),

      ...options
    };

    // Track pushed resources per client
    this.pushedResources = new Map(); // sessionId -> Set of pushed URLs

    // Cache for static resources
    this.resourceCache = new Map();

    // Statistics
    this.stats = {
      totalRequests: 0,
      http2Requests: 0,
      http1Requests: 0,
      pushedResources: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Extract linked resources from HTML content
   */
  extractLinkedResources(html) {
    const resources = [];

    // Extract CSS files
    const cssRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/g;
    let match;
    while ((match = cssRegex.exec(html)) !== null) {
      resources.push({
        url: match[1],
        type: 'text/css',
        priority: this.options.priorities.css
      });
    }

    // Extract JavaScript files
    const jsRegex = /<script[^>]+src=["']([^"']+\.js)["'][^>]*>/g;
    while ((match = jsRegex.exec(html)) !== null) {
      resources.push({
        url: match[1],
        type: 'application/javascript',
        priority: this.options.priorities.js
      });
    }

    // Extract images (only critical ones like logos)
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*class=["'][^"']*priority[^"']*["']/g;
    while ((match = imgRegex.exec(html)) !== null) {
      resources.push({
        url: match[1],
        type: 'image/*',
        priority: this.options.priorities.img
      });
    }

    // Extract fonts from CSS @font-face rules
    const fontRegex = /url\(['"]?([^'"]+\.woff2?)['"]?\)/g;
    while ((match = fontRegex.exec(html)) !== null) {
      resources.push({
        url: match[1],
        type: 'font/woff2',
        priority: this.options.priorities.font
      });
    }

    return resources;
  }

  /**
   * Get session ID for tracking pushed resources
   */
  getSessionId(stream) {
    const session = stream.session;
    if (!session.id) {
      // Generate unique session ID
      session.id = crypto.randomBytes(16).toString('hex');
    }
    return session.id;
  }

  /**
   * Check if resource was already pushed to this client
   */
  wasAlreadyPushed(sessionId, url) {
    if (!this.options.trackPushedResources) return false;

    const pushed = this.pushedResources.get(sessionId);
    return pushed && pushed.has(url);
  }

  /**
   * Mark resource as pushed to client
   */
  markAsPushed(sessionId, url) {
    if (!this.pushedResources.has(sessionId)) {
      this.pushedResources.set(sessionId, new Set());
    }
    this.pushedResources.get(sessionId).add(url);
  }

  /**
   * Push resource to client
   */
  pushResource(stream, resource) {
    const { url, type, priority } = resource;
    const sessionId = this.getSessionId(stream);

    // Check if already pushed
    if (this.wasAlreadyPushed(sessionId, url)) {
      console.log(`⏭️  Skipping already pushed: ${url}`);
      return;
    }

    // Check if push is supported
    if (!stream.pushAllowed) {
      console.log(`❌ Push not allowed for session`);
      return;
    }

    try {
      // Resolve file path
      const filePath = path.join(this.options.contentRoot, url);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Resource not found: ${filePath}`);
        return;
      }

      // Read file (with caching)
      let content;
      if (this.resourceCache.has(filePath)) {
        content = this.resourceCache.get(filePath);
        this.stats.cacheHits++;
      } else {
        content = fs.readFileSync(filePath);
        this.resourceCache.set(filePath, content);
        this.stats.cacheMisses++;
      }

      // Initiate push
      stream.pushStream({ ':path': url }, (err, pushStream, headers) => {
        if (err) {
          console.error(`❌ Push error for ${url}:`, err.message);
          return;
        }

        // Set response headers
        pushStream.respond({
          ':status': 200,
          'content-type': type,
          'content-length': content.length,
          'cache-control': 'public, max-age=31536000', // Cache for 1 year
          'x-pushed': 'true' // Custom header to indicate push
        });

        // Send content
        pushStream.end(content);

        // Mark as pushed
        this.markAsPushed(sessionId, url);
        this.stats.pushedResources++;

        console.log(`✅ Pushed: ${url} (${priority} priority, ${content.length} bytes)`);
      });
    } catch (error) {
      console.error(`❌ Error pushing ${url}:`, error.message);
    }
  }

  /**
   * Push all resources for an HTML page
   */
  pushResourcesForPage(stream, html) {
    if (!this.options.enablePush) return;
    if (!this.options.autoDiscoverResources) return;

    const resources = this.extractLinkedResources(html);

    // Sort by priority (high priority first)
    resources.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Limit concurrent pushes
    const toPush = resources.slice(0, this.options.maxConcurrentPushes);

    console.log(`\n📤 Pushing ${toPush.length} resources...`);

    // Push resources with priority
    toPush.forEach(resource => {
      this.pushResource(stream, resource);
    });
  }

  /**
   * Create HTTP/2 server
   */
  createServer(requestHandler) {
    // Generate self-signed certificate for demo
    // In production, use proper SSL certificates
    const options = {
      key: this.generateSelfSignedKey(),
      cert: this.generateSelfSignedCert(),
      allowHTTP1: true // Allow HTTP/1.1 fallback
    };

    const server = http2.createSecureServer(options, (stream, headers) => {
      this.stats.totalRequests++;

      // Detect protocol version
      const isHTTP2 = stream.constructor.name === 'Http2ServerRequest';
      if (isHTTP2) {
        this.stats.http2Requests++;
      } else {
        this.stats.http1Requests++;
      }

      console.log(`\n📨 ${headers[':method']} ${headers[':path']} (${isHTTP2 ? 'HTTP/2' : 'HTTP/1.1'})`);

      // Call the request handler
      requestHandler(stream, headers);
    });

    // Handle session cleanup
    server.on('session', session => {
      session.on('close', () => {
        if (session.id) {
          this.pushedResources.delete(session.id);
        }
      });
    });

    return server;
  }

  /**
   * Generate self-signed key (for demo purposes)
   * In production, use proper SSL certificates from Let's Encrypt or similar
   */
  generateSelfSignedKey() {
    // For demo, we'll return a simple key
    // In real implementation, use openssl or node-forge
    return fs.readFileSync(path.join(__dirname, '../../../../temp-cert/key.pem'), 'utf8');
  }

  /**
   * Generate self-signed certificate (for demo purposes)
   */
  generateSelfSignedCert() {
    return fs.readFileSync(path.join(__dirname, '../../../../temp-cert/cert.pem'), 'utf8');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      http2Percentage: ((this.stats.http2Requests / this.stats.totalRequests) * 100).toFixed(2) + '%',
      averagePushesPerRequest: (this.stats.pushedResources / this.stats.totalRequests).toFixed(2),
      cacheHitRate: ((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100).toFixed(2) + '%'
    };
  }
}

/**
 * Demo Server Implementation
 */

// Create public directory structure if it doesn't exist
const publicDir = path.join(__dirname, 'public');
const createDemoFiles = () => {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Create demo CSS file
  const cssContent = `
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
}
h1 { color: #667eea; }
.feature {
  background: #f5f5f5;
  padding: 15px;
  margin: 10px 0;
  border-left: 4px solid #667eea;
  border-radius: 4px;
}
.stats {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
}
  `.trim();

  fs.writeFileSync(path.join(publicDir, 'styles.css'), cssContent);

  // Create demo JS file
  const jsContent = `
console.log('JavaScript loaded via HTTP/2 Server Push! 🚀');

document.addEventListener('DOMContentLoaded', () => {
  const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
  console.log('Page load time:', loadTime, 'ms');

  // Display push information
  const pushInfo = document.getElementById('push-info');
  if (pushInfo) {
    pushInfo.innerHTML = \`
      <strong>Performance:</strong><br>
      Page Load Time: \${loadTime}ms<br>
      Resources Pushed: Check Network tab for 'Push' initiator
    \`;
  }
});
  `.trim();

  fs.writeFileSync(path.join(publicDir, 'app.js'), jsContent);
};

// Initialize HTTP/2 server
const http2Server = new HTTP2ServerWithPush({
  enablePush: true,
  autoDiscoverResources: true,
  maxConcurrentPushes: 10,
  contentRoot: publicDir
});

const server = http2Server.createServer((stream, headers) => {
  const method = headers[':method'];
  const url = headers[':path'];

  // Route: Home page (with server push)
  if (url === '/' && method === 'GET') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HTTP/2 Server Push Demo</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <h1>🚀 HTTP/2 Server Push Demo</h1>

    <div class="stats">
      <strong>Protocol:</strong> HTTP/2<br>
      <strong>Server Push:</strong> Enabled<br>
      <strong>Resources Pushed:</strong> CSS, JavaScript
    </div>

    <h2>Key Features:</h2>

    <div class="feature">
      <strong>1. Multiplexing</strong><br>
      Multiple requests over a single TCP connection
    </div>

    <div class="feature">
      <strong>2. Server Push</strong><br>
      Server proactively sends resources before they're requested
    </div>

    <div class="feature">
      <strong>3. Header Compression (HPACK)</strong><br>
      Compressed headers reduce overhead
    </div>

    <div class="feature">
      <strong>4. Stream Prioritization</strong><br>
      Critical resources loaded first
    </div>

    <div class="feature">
      <strong>5. Binary Protocol</strong><br>
      More efficient than text-based HTTP/1.1
    </div>

    <h2>How Server Push Works:</h2>
    <ol>
      <li>Client requests HTML page</li>
      <li>Server parses HTML and finds linked resources</li>
      <li>Server pushes CSS/JS before browser requests them</li>
      <li>Browser receives resources instantly when needed</li>
      <li>Eliminates round-trip time for critical resources</li>
    </ol>

    <h2>Performance Benefits:</h2>
    <ul>
      <li>Reduced latency (no round-trip for critical resources)</li>
      <li>Faster page load times</li>
      <li>Better bandwidth utilization</li>
      <li>Improved user experience</li>
    </ul>

    <div id="push-info" class="stats"></div>

    <h2>Test Routes:</h2>
    <ul>
      <li><a href="/stats" style="color: #667eea;">Server Statistics</a></li>
      <li><a href="/no-push" style="color: #667eea;">Page Without Push</a></li>
    </ul>

    <h2>How to Test:</h2>
    <p>Open Chrome DevTools → Network tab → Look for "Push" in the Initiator column</p>
    <p>Compare load times with and without server push!</p>
  </div>

  <script src="/app.js"></script>
</body>
</html>
    `.trim();

    // Push resources before sending HTML
    http2Server.pushResourcesForPage(stream, html);

    // Send HTML response
    stream.respond({
      ':status': 200,
      'content-type': 'text/html; charset=utf-8',
      'content-length': Buffer.byteLength(html)
    });
    stream.end(html);
    return;
  }

  // Route: Page without push (for comparison)
  if (url === '/no-push' && method === 'GET') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>No Server Push</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <h1>Page Without Server Push</h1>
    <p>This page doesn't use server push. Compare the load time with the main page!</p>
    <p><a href="/" style="color: #667eea;">Back to Demo</a></p>
  </div>
  <script src="/app.js"></script>
</body>
</html>
    `.trim();

    stream.respond({
      ':status': 200,
      'content-type': 'text/html; charset=utf-8'
    });
    stream.end(html);
    return;
  }

  // Route: Statistics
  if (url === '/stats' && method === 'GET') {
    const stats = http2Server.getStats();
    const json = JSON.stringify(stats, null, 2);

    stream.respond({
      ':status': 200,
      'content-type': 'application/json'
    });
    stream.end(json);
    return;
  }

  // Route: Static files
  if (method === 'GET') {
    const filePath = path.join(publicDir, url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(publicDir)) {
      stream.respond({ ':status': 403 });
      stream.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);

      const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
      };

      stream.respond({
        ':status': 200,
        'content-type': contentTypes[ext] || 'application/octet-stream',
        'content-length': content.length,
        'cache-control': 'public, max-age=31536000'
      });
      stream.end(content);
      return;
    }
  }

  // 404
  stream.respond({ ':status': 404 });
  stream.end('Not Found');
});

// Create demo files
createDemoFiles();

// Start server
const PORT = process.env.PORT || 8443;
server.listen(PORT, () => {
  console.log(`\n🚀 HTTP/2 Server running on https://localhost:${PORT}`);
  console.log(`\n⚠️  Note: Self-signed certificate - accept browser warning`);
  console.log(`\nOpen in Chrome/Firefox for best HTTP/2 support`);
  console.log(`Check Network tab → Filter by 'Push' initiator\n`);
  console.log(`Demo files created in: ${publicDir}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});

/**
 * Production Best Practices:
 *
 * 1. SSL/TLS Certificates:
 *    - Use Let's Encrypt for free certificates
 *    - Automate certificate renewal
 *    - Use strong cipher suites
 *    - Enable OCSP stapling
 *
 * 2. Server Push Strategy:
 *    - Push only critical resources (CSS, fonts)
 *    - Don't push images (usually too large)
 *    - Track what's already in browser cache
 *    - Use Link rel=preload for hints
 *    - Implement cache digests (RFC 7541)
 *
 * 3. Resource Prioritization:
 *    - Critical CSS: highest priority
 *    - Fonts: high priority
 *    - JavaScript: low priority (defer)
 *    - Images: lowest priority
 *
 * 4. Performance Monitoring:
 *    - Track push effectiveness
 *    - Monitor cache hit rates
 *    - Measure time to first paint
 *    - Compare HTTP/2 vs HTTP/1.1
 *
 * 5. Fallback Strategy:
 *    - Support HTTP/1.1 for older clients
 *    - Graceful degradation
 *    - Test both protocols
 *    - Monitor protocol distribution
 *
 * 6. Security:
 *    - TLS 1.2+ required for HTTP/2
 *    - Implement security headers
 *    - Rate limiting per stream
 *    - Monitor for abuse
 *
 * 7. When NOT to use Server Push:
 *    - Resources already in cache
 *    - Non-critical resources
 *    - Large files
 *    - Conditional requests
 *    - User-specific content
 *
 * 8. HTTP/3 Considerations:
 *    - HTTP/3 uses QUIC (UDP-based)
 *    - Even better performance
 *    - Consider migration path
 *    - Not all CDNs support yet
 */

module.exports = { HTTP2ServerWithPush };
