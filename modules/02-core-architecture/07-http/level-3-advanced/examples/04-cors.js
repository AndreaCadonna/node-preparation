/**
 * Example 4: CORS (Cross-Origin Resource Sharing)
 *
 * Demonstrates:
 * - CORS headers
 * - Preflight requests
 * - Allowed origins
 * - Credentials handling
 */

const http = require('http');

console.log('=== CORS Example ===\n');

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://example.com'
];

function handleCORS(req, res) {
  const origin = req.headers.origin;

  // Check if origin is allowed
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  // Handle CORS
  if (handleCORS(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>CORS Demo</h1>
      <button onclick="testCORS()">Test CORS</button>
      <pre id="result"></pre>
      <script>
        async function testCORS() {
          try {
            const response = await fetch('http://localhost:3000/api/data', {
              credentials: 'include'
            });
            const data = await response.json();
            document.getElementById('result').textContent = JSON.stringify(data, null, 2);
          } catch (err) {
            document.getElementById('result').textContent = 'Error: ' + err.message;
          }
        }
      </script>
    `);
  } else if (url.pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'CORS enabled' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/\n');
});
