/**
 * Exercise 1: Multi-Format Body Parser - SOLUTION
 *
 * Complete implementation of a comprehensive body parser that handles
 * multiple content types: JSON, URL-encoded, multipart, and plain text.
 */

const http = require('http');
const querystring = require('querystring');

console.log('=== Exercise 1: Multi-Format Body Parser - SOLUTION ===\n');

// ============================================================================
// Constants
// ============================================================================

const MAX_BODY_SIZE = 1024 * 1024; // 1MB - prevent memory exhaustion attacks

// Supported content types with their aliases
const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain'
};

// ============================================================================
// Task 1: Multi-Format Body Parser
// ============================================================================

/**
 * Parse request body based on Content-Type header
 *
 * This function demonstrates intermediate HTTP concepts:
 * - Content negotiation (handling different MIME types)
 * - Stream processing (reading request body chunks)
 * - Error handling with size limits
 * - Promise-based async operations
 *
 * @param {http.IncomingMessage} req - The HTTP request object
 * @returns {Promise<{type: string, data: any}>} Parsed body with type information
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    // Get content type from header (may include charset, e.g., "application/json; charset=utf-8")
    const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();

    // Content-Length header helps us validate payload size upfront
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    // Task 2: Implement size limits
    // Reject oversized payloads immediately to prevent memory issues
    if (contentLength > MAX_BODY_SIZE) {
      return reject(new Error(`Payload too large. Max size: ${MAX_BODY_SIZE} bytes`));
    }

    const chunks = [];
    let receivedBytes = 0;

    // Listen for data chunks from the request stream
    req.on('data', (chunk) => {
      receivedBytes += chunk.length;

      // Double-check size limit during streaming (defense in depth)
      if (receivedBytes > MAX_BODY_SIZE) {
        req.destroy(); // Stop reading immediately
        return reject(new Error(`Payload exceeded ${MAX_BODY_SIZE} bytes during transfer`));
      }

      chunks.push(chunk);
    });

    // Task 3: Handle errors gracefully
    req.on('error', (err) => {
      reject(new Error(`Request error: ${err.message}`));
    });

    // Process complete body once all chunks received
    req.on('end', () => {
      try {
        // Combine all chunks into single buffer, then convert to string
        const buffer = Buffer.concat(chunks);
        const bodyString = buffer.toString('utf8');

        // Route to appropriate parser based on content type
        let parsedData;
        let dataType;

        switch (contentType) {
          case CONTENT_TYPES.JSON:
            // Parse JSON data
            // Common use case: REST API requests, AJAX calls
            try {
              parsedData = JSON.parse(bodyString);
              dataType = 'json';
            } catch (err) {
              throw new Error(`Invalid JSON: ${err.message}`);
            }
            break;

          case CONTENT_TYPES.FORM:
            // Parse URL-encoded form data (e.g., "name=John&age=30")
            // Common use case: HTML form submissions with default encoding
            parsedData = querystring.parse(bodyString);
            dataType = 'form';
            break;

          case CONTENT_TYPES.MULTIPART:
            // Simple multipart/form-data parser
            // Production apps should use libraries like 'busboy' or 'formidable'
            // This demonstrates the basic concept of boundary-based parsing
            parsedData = parseMultipart(bodyString, contentType, req.headers['content-type']);
            dataType = 'multipart';
            break;

          case CONTENT_TYPES.TEXT:
            // Plain text - no parsing needed
            // Common use case: webhooks, simple API endpoints
            parsedData = bodyString;
            dataType = 'text';
            break;

          default:
            // Unknown content type - return raw data
            parsedData = bodyString;
            dataType = 'unknown';
            console.warn(`Unknown content type: ${contentType}`);
        }

        resolve({
          type: dataType,
          data: parsedData,
          size: receivedBytes,
          contentType: contentType
        });

      } catch (err) {
        reject(new Error(`Parse error: ${err.message}`));
      }
    });
  });
}

// ============================================================================
// Simple Multipart Parser
// ============================================================================

/**
 * Basic multipart/form-data parser
 *
 * Multipart format is used for file uploads and forms with mixed data types.
 * Format: Each part separated by boundary string, with headers and content.
 *
 * Example:
 * ------WebKitFormBoundary123
 * Content-Disposition: form-data; name="field1"
 *
 * value1
 * ------WebKitFormBoundary123
 * Content-Disposition: form-data; name="file"; filename="test.txt"
 * Content-Type: text/plain
 *
 * file content here
 * ------WebKitFormBoundary123--
 *
 * @param {string} bodyString - Raw multipart body
 * @param {string} contentType - Short content type
 * @param {string} fullContentType - Full content type with boundary
 * @returns {Object} Parsed multipart data
 */
function parseMultipart(bodyString, contentType, fullContentType) {
  // Extract boundary from content-type header
  const boundaryMatch = fullContentType.match(/boundary=(.+)/);

  if (!boundaryMatch) {
    throw new Error('Multipart boundary not found in Content-Type header');
  }

  const boundary = '--' + boundaryMatch[1].trim();

  // Split body by boundary markers
  const parts = bodyString.split(boundary).filter(part => {
    // Filter out empty parts and closing boundary
    return part.trim() && !part.trim().startsWith('--');
  });

  const result = {};

  parts.forEach(part => {
    // Each part has headers followed by blank line, then content
    const [headerSection, ...contentParts] = part.split('\r\n\r\n');

    if (!headerSection) return;

    const content = contentParts.join('\r\n\r\n').trim();

    // Parse Content-Disposition header to get field name
    const nameMatch = headerSection.match(/name="([^"]+)"/);
    const filenameMatch = headerSection.match(/filename="([^"]+)"/);

    if (nameMatch) {
      const fieldName = nameMatch[1];

      if (filenameMatch) {
        // This is a file upload
        result[fieldName] = {
          filename: filenameMatch[1],
          content: content,
          size: content.length,
          type: 'file'
        };
      } else {
        // This is a regular form field
        result[fieldName] = content;
      }
    }
  });

  return result;
}

// ============================================================================
// HTTP Server with Body Parser
// ============================================================================

const server = http.createServer(async (req, res) => {
  // Helper function to send JSON response
  const sendJSON = (statusCode, data) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff' // Security header
    });
    res.end(JSON.stringify(data, null, 2));
  };

  // Route handler
  if (req.method === 'POST' && req.url === '/parse') {
    try {
      // Parse the request body
      const result = await parseBody(req);

      console.log(`\nReceived ${result.type} data (${result.size} bytes)`);
      console.log('Parsed data:', JSON.stringify(result.data, null, 2));

      // Send successful response
      sendJSON(200, {
        success: true,
        message: 'Body parsed successfully',
        contentType: result.type,
        originalContentType: result.contentType,
        size: result.size,
        data: result.data
      });

    } catch (error) {
      // Task 3: Handle errors gracefully
      console.error('Parse error:', error.message);

      // Determine appropriate status code
      let statusCode = 400;
      if (error.message.includes('too large') || error.message.includes('exceeded')) {
        statusCode = 413; // Payload Too Large
      }

      sendJSON(statusCode, {
        success: false,
        error: error.message,
        code: statusCode
      });
    }

  } else if (req.method === 'GET' && req.url === '/') {
    // Landing page with usage instructions
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Body Parser Demo</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #333; }
          .example { background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }
          code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>Multi-Format Body Parser Demo</h1>
        <p>Send POST requests to <code>/parse</code> with different content types:</p>

        <div class="example">
          <h3>1. JSON (application/json)</h3>
          <pre>curl -X POST http://localhost:3000/parse \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John", "age": 30}'</pre>
        </div>

        <div class="example">
          <h3>2. Form URL-encoded (application/x-www-form-urlencoded)</h3>
          <pre>curl -X POST http://localhost:3000/parse \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "name=John&age=30"</pre>
        </div>

        <div class="example">
          <h3>3. Plain text (text/plain)</h3>
          <pre>curl -X POST http://localhost:3000/parse \\
  -H "Content-Type: text/plain" \\
  -d "Hello, World!"</pre>
        </div>

        <div class="example">
          <h3>4. Multipart form data (multipart/form-data)</h3>
          <pre>curl -X POST http://localhost:3000/parse \\
  -F "name=John" \\
  -F "file=@test.txt"</pre>
        </div>

        <p><strong>Features:</strong></p>
        <ul>
          <li>Maximum body size: 1MB</li>
          <li>Supports JSON, form data, multipart, and plain text</li>
          <li>Comprehensive error handling</li>
          <li>Size validation during streaming</li>
        </ul>
      </body>
      </html>
    `);

  } else {
    // 404 for unknown routes
    sendJSON(404, {
      success: false,
      error: 'Not Found',
      message: 'Supported routes: GET /, POST /parse'
    });
  }
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Body Parser Server Running');
  console.log(`${'='.repeat(60)}`);
  console.log(`\nServer URL: http://localhost:${PORT}/`);
  console.log(`API Endpoint: POST http://localhost:${PORT}/parse`);
  console.log(`\nSupported Content Types:`);
  console.log(`  - ${CONTENT_TYPES.JSON}`);
  console.log(`  - ${CONTENT_TYPES.FORM}`);
  console.log(`  - ${CONTENT_TYPES.MULTIPART}`);
  console.log(`  - ${CONTENT_TYPES.TEXT}`);
  console.log(`\nMax Body Size: ${MAX_BODY_SIZE.toLocaleString()} bytes (1MB)`);
  console.log(`\n${'='.repeat(60)}\n`);
  console.log('Waiting for requests...\n');
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ============================================================================
// Educational Notes
// ============================================================================

console.log('Implementation Highlights:');
console.log('✓ Multi-format body parsing (JSON, form, multipart, text)');
console.log('✓ Size limits with both header check and streaming validation');
console.log('✓ Comprehensive error handling with appropriate status codes');
console.log('✓ Security headers (X-Content-Type-Options)');
console.log('✓ Stream processing to handle large payloads efficiently');
console.log('✓ Promise-based async API for modern JavaScript patterns');
console.log('✓ Detailed logging and debugging information');
console.log('');
