/**
 * Example 7: Server Monitoring
 * 
 * Demonstrates monitoring server health and metrics
 */

const http = require('http');

console.log('=== Server Monitoring Example ===\n');

const metrics = {
  requests: { total: 0, success: 0, errors: 0 },
  responseTime: [],
  activeConnections: 0,
  startTime: Date.now()
};

const server = http.createServer((req, res) => {
  const start = Date.now();
  metrics.requests.total++;
  metrics.activeConnections++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.responseTime.push(duration);
    if (metrics.responseTime.length > 100) {
      metrics.responseTime.shift();
    }
    if (res.statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.errors++;
    }
    metrics.activeConnections--;
  });

  if (req.url === '/metrics') {
    const avgResponseTime = metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length || 0;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      uptime: Date.now() - metrics.startTime,
      requests: metrics.requests,
      activeConnections: metrics.activeConnections,
      averageResponseTime: avgResponseTime.toFixed(2),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }, null, 2));
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy' }));
  } else {
    res.writeHead(200);
    res.end('OK');
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
  console.log('  /metrics - View metrics');
  console.log('  /health  - Health check\n');
});
