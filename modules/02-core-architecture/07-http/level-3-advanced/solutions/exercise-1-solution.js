/**
 * Exercise 1 Solution: Response Compression
 * Implements automatic response compression with performance monitoring
 */

const http = require('http');
const zlib = require('zlib');

/**
 * Compression Middleware
 *
 * Key Features:
 * - Automatic gzip/deflate compression based on Accept-Encoding
 * - Selective compression (only text-based content types)
 * - Compression ratio tracking for performance monitoring
 * - Threshold-based compression (skip small responses)
 * - Proper header management
 *
 * Performance Considerations:
 * - Compression overhead vs transfer time trade-off
 * - CPU usage for compression vs bandwidth savings
 * - Minimum size threshold to avoid compressing tiny responses
 */

class CompressionMiddleware {
  constructor(options = {}) {
    // Configuration with sensible defaults
    this.minSize = options.minSize || 1024; // Don't compress < 1KB
    this.level = options.level || zlib.constants.Z_DEFAULT_COMPRESSION;
    this.compressibleTypes = options.compressibleTypes || [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'application/xml',
      'text/plain',
      'text/xml',
      'image/svg+xml'
    ];

    // Statistics tracking
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      bytesOriginal: 0,
      bytesCompressed: 0
    };
  }

  /**
   * Check if content type is compressible
   */
  isCompressible(contentType) {
    if (!contentType) return false;

    // Extract base content type (remove charset, etc.)
    const baseType = contentType.split(';')[0].trim().toLowerCase();

    return this.compressibleTypes.some(type =>
      baseType === type || baseType.startsWith(type)
    );
  }

  /**
   * Parse Accept-Encoding header to determine supported compression
   */
  getAcceptedEncoding(acceptEncoding) {
    if (!acceptEncoding) return null;

    // Parse quality values (q parameter)
    const encodings = acceptEncoding
      .split(',')
      .map(e => e.trim())
      .map(e => {
        const [encoding, qValue] = e.split(';');
        const q = qValue ? parseFloat(qValue.split('=')[1]) : 1.0;
        return { encoding: encoding.trim(), q };
      })
      .filter(e => e.q > 0)
      .sort((a, b) => b.q - a.q);

    // Prefer gzip, then deflate
    for (const { encoding } of encodings) {
      if (encoding === 'gzip') return 'gzip';
      if (encoding === 'deflate') return 'deflate';
      if (encoding === '*') return 'gzip'; // Default to gzip for wildcard
    }

    return null;
  }

  /**
   * Create compression stream based on encoding
   */
  createCompressionStream(encoding) {
    switch (encoding) {
      case 'gzip':
        return zlib.createGzip({ level: this.level });
      case 'deflate':
        return zlib.createDeflate({ level: this.level });
      default:
        return null;
    }
  }

  /**
   * Apply compression middleware
   */
  compress(req, res, next) {
    this.stats.totalRequests++;

    const acceptEncoding = req.headers['accept-encoding'];
    const encoding = this.getAcceptedEncoding(acceptEncoding);

    // If no compression support, proceed normally
    if (!encoding) {
      return next();
    }

    // Store original methods
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const originalWriteHead = res.writeHead.bind(res);

    // Buffer to check content type and size
    let chunks = [];
    let shouldCompress = false;
    let compressionStream = null;
    let originalSize = 0;
    let compressedSize = 0;

    /**
     * Override writeHead to intercept headers
     */
    res.writeHead = function(statusCode, statusMessage, headers) {
      let finalHeaders = headers || statusMessage || {};

      // Handle both (statusCode, headers) and (statusCode, statusMessage, headers)
      if (typeof statusMessage === 'object') {
        finalHeaders = statusMessage;
      }

      const contentType = finalHeaders['content-type'] ||
                         res.getHeader('content-type');

      // Determine if we should compress
      shouldCompress = contentType &&
                      this.isCompressible(contentType) &&
                      !finalHeaders['content-encoding'] &&
                      !res.getHeader('content-encoding');

      if (shouldCompress) {
        // Remove content-length as it will change
        delete finalHeaders['content-length'];
        res.removeHeader('content-length');

        // Add compression header
        finalHeaders['content-encoding'] = encoding;
        finalHeaders['vary'] = 'Accept-Encoding';
      }

      return originalWriteHead.call(
        this,
        statusCode,
        typeof statusMessage === 'string' ? statusMessage : undefined,
        finalHeaders
      );
    }.bind(this);

    /**
     * Override write method
     */
    res.write = function(chunk, encoding) {
      if (!shouldCompress) {
        return originalWrite(chunk, encoding);
      }

      // Buffer chunks until we know if compression is worthwhile
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        originalSize += chunk.length;
      } else {
        const buffer = Buffer.from(chunk, encoding);
        chunks.push(buffer);
        originalSize += buffer.length;
      }

      return true;
    }.bind(this);

    /**
     * Override end method to perform actual compression
     */
    res.end = function(chunk, encoding) {
      if (chunk) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
          originalSize += chunk.length;
        } else if (chunk) {
          const buffer = Buffer.from(chunk, encoding);
          chunks.push(buffer);
          originalSize += buffer.length;
        }
      }

      if (!shouldCompress || originalSize < this.minSize) {
        // Don't compress - too small or not compressible
        if (chunks.length > 0) {
          const fullBuffer = Buffer.concat(chunks);
          return originalEnd(fullBuffer);
        }
        return originalEnd();
      }

      // Perform compression
      const fullBuffer = Buffer.concat(chunks);

      zlib[encoding === 'gzip' ? 'gzip' : 'deflate'](
        fullBuffer,
        { level: this.level },
        (err, compressed) => {
          if (err) {
            console.error('Compression error:', err);
            // Fallback to uncompressed
            res.removeHeader('content-encoding');
            return originalEnd(fullBuffer);
          }

          compressedSize = compressed.length;

          // Update statistics
          this.stats.compressedRequests++;
          this.stats.bytesOriginal += originalSize;
          this.stats.bytesCompressed += compressedSize;

          // Calculate compression ratio
          const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

          // Add compression info header (useful for debugging)
          res.setHeader('X-Compression-Ratio', `${ratio}%`);
          res.setHeader('X-Original-Size', originalSize);
          res.setHeader('X-Compressed-Size', compressedSize);

          originalEnd(compressed);
        }
      );
    }.bind(this);

    next();
  }

  /**
   * Get compression statistics
   */
  getStats() {
    const avgRatio = this.stats.bytesOriginal > 0
      ? ((1 - this.stats.bytesCompressed / this.stats.bytesOriginal) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      averageCompressionRatio: `${avgRatio}%`,
      compressionRate: `${((this.stats.compressedRequests / this.stats.totalRequests) * 100).toFixed(2)}%`
    };
  }
}

/**
 * Demo Server Implementation
 */

// Initialize compression middleware
const compression = new CompressionMiddleware({
  minSize: 1024,      // 1KB minimum
  level: 6            // Balanced compression (0-9, where 9 is max)
});

const server = http.createServer((req, res) => {
  // Simple middleware runner
  const middleware = [
    compression.compress.bind(compression)
  ];

  let index = 0;

  const next = () => {
    if (index >= middleware.length) {
      handleRequest(req, res);
      return;
    }

    const handler = middleware[index++];
    handler(req, res, next);
  };

  next();
});

/**
 * Route handler (after middleware)
 */
function handleRequest(req, res) {
  const { method, url } = req;

  // Route: Get compression stats
  if (url === '/stats' && method === 'GET') {
    const stats = compression.getStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
    return;
  }

  // Route: Large text response (will be compressed)
  if (url === '/large' && method === 'GET') {
    // Generate large text content
    const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1000);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(content);
    return;
  }

  // Route: JSON response
  if (url === '/data' && method === 'GET') {
    const data = {
      message: 'This is a JSON response',
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'This is a long description that will benefit from compression'
      }))
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // Route: HTML response
  if (url === '/' && method === 'GET') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Compression Demo</title>
</head>
<body>
  <h1>Response Compression Demo</h1>
  <p>This page is automatically compressed using gzip or deflate.</p>
  <p>Check the response headers to see Content-Encoding.</p>

  <h2>Test Routes:</h2>
  <ul>
    <li><a href="/large">Large Text Response</a></li>
    <li><a href="/data">JSON Data</a></li>
    <li><a href="/stats">Compression Statistics</a></li>
  </ul>

  <h2>Benefits:</h2>
  <ul>
    <li>Reduced bandwidth usage (typically 60-80% for text)</li>
    <li>Faster page load times</li>
    <li>Lower hosting costs</li>
    <li>Better user experience on slow connections</li>
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
  console.log('\nTest compression:');
  console.log(`curl -H "Accept-Encoding: gzip" -i http://localhost:${PORT}/`);
  console.log(`curl -H "Accept-Encoding: gzip" http://localhost:${PORT}/stats`);
  console.log('\nCompare sizes:');
  console.log(`curl http://localhost:${PORT}/large | wc -c`);
  console.log(`curl -H "Accept-Encoding: gzip" http://localhost:${PORT}/large | wc -c`);
});

/**
 * Production Best Practices:
 *
 * 1. Compression Level Trade-offs:
 *    - Level 1: Fast, ~60% compression
 *    - Level 6: Balanced (default), ~70% compression
 *    - Level 9: Slow, ~75% compression
 *    - For dynamic content: use 4-6
 *    - For static assets: pre-compress at level 9
 *
 * 2. What NOT to Compress:
 *    - Already compressed (images, video, archives)
 *    - Small responses (< 1KB overhead not worth it)
 *    - Binary formats
 *
 * 3. Security Considerations:
 *    - BREACH attack: compression + secrets in response
 *    - Mitigation: don't compress responses with sensitive data
 *    - Or use random padding for CSRF tokens
 *
 * 4. Performance Monitoring:
 *    - Track compression ratios
 *    - Monitor CPU usage
 *    - Measure time-to-first-byte impact
 *
 * 5. CDN Integration:
 *    - Let CDN handle compression when possible
 *    - Or pre-compress and serve .gz files
 *    - Set Vary: Accept-Encoding for caching
 *
 * 6. HTTP/2 Considerations:
 *    - HTTP/2 has header compression (HPACK)
 *    - Still compress response bodies
 *    - Consider Brotli for better compression
 */

module.exports = { CompressionMiddleware };
