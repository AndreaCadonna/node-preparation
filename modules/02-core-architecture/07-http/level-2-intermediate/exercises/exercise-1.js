/**
 * Exercise 1: Multi-Format Body Parser
 *
 * Create a comprehensive body parser that handles multiple content types.
 */

const http = require('http');

// Task 1: Create a body parser that supports:
// - application/json
// - application/x-www-form-urlencoded
// - multipart/form-data (simple implementation)
// - text/plain

function parseBody(req) {
  // TODO: Implement body parser
  // Return Promise<{type: string, data: any}>
}

// Task 2: Implement size limits
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

// Task 3: Handle errors gracefully

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    try {
      const result = await parseBody(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        contentType: result.type,
        data: result.data
      }, null, 2));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Send POST request with different content types');
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
