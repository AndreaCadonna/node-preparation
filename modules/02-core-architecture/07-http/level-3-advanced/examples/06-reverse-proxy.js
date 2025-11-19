/**
 * Example 6: Reverse Proxy
 * 
 * Demonstrates building a reverse proxy that forwards requests
 */

const http = require('http');

console.log('=== Reverse Proxy Example ===\n');

// Backend servers configuration
const backends = [
  { host: 'httpbin.org', port: 80 },
];

let currentBackend = 0;

// Simple round-robin load balancing
function getBackend() {
  const backend = backends[currentBackend];
  currentBackend = (currentBackend + 1) % backends.length;
  return backend;
}

const proxy = http.createServer((clientReq, clientRes) => {
  const backend = getBackend();

  console.log(`Proxying ${clientReq.method} ${clientReq.url} -> ${backend.host}`);

  const options = {
    hostname: backend.host,
    port: backend.port,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      'X-Forwarded-For': clientReq.socket.remoteAddress,
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Host': clientReq.headers.host
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    clientRes.writeHead(502);
    clientRes.end('Bad Gateway');
  });

  clientReq.pipe(proxyReq);
});

proxy.listen(3000, () => {
  console.log('Reverse proxy running at http://localhost:3000/');
  console.log('Try: curl http://localhost:3000/get\n');
});
