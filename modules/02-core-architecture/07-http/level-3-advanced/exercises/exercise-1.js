/**
 * Exercise 1: Response Compression
 * Implement automatic response compression
 */

const http = require('http');
const zlib = require('zlib');

// Task: Create middleware that:
// 1. Checks Accept-Encoding header
// 2. Compresses response if client supports gzip
// 3. Only compresses text-based content types
// 4. Sets appropriate headers
// 5. Measures compression ratio

const server = http.createServer((req, res) => {
  // TODO: Implement compression middleware
});

server.listen(3000);
