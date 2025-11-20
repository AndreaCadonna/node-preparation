/**
 * Example 3: Production Performance Monitoring & Metrics Dashboard
 *
 * This example demonstrates comprehensive performance monitoring for a
 * clustered Node.js application. It collects detailed metrics from all
 * workers and provides a real-time dashboard.
 *
 * Key Concepts:
 * - Real-time metrics collection
 * - Performance monitoring dashboard
 * - Resource usage tracking
 * - Request latency percentiles
 * - Error rate monitoring
 * - Health scoring
 *
 * Metrics Collected:
 * - Request throughput (req/sec)
 * - Response time percentiles (p50, p95, p99)
 * - CPU and memory usage
 * - Event loop lag
 * - Active connections
 * - Error rates
 *
 * Run this: node 03-performance-monitoring.js
 * Dashboard: http://localhost:8000/dashboard
 * Metrics API: http://localhost:8000/metrics
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const numCPUs = Math.min(4, os.cpus().length);
const METRICS_INTERVAL = 1000; // Collect metrics every second

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting monitored cluster`);
  console.log(`[Master] Workers: ${numCPUs}\n`);

  // Metrics storage
  const workers = new Map();
  const clusterMetrics = {
    startTime: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
    requestsPerSecond: 0,
    avgResponseTime: 0,
    responseTimes: [] // For percentile calculations
  };

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    forkWorker();
  }

  function forkWorker() {
    const worker = cluster.fork();

    // Initialize worker metrics
    workers.set(worker.id, {
      id: worker.id,
      pid: worker.process.pid,
      status: 'healthy',
      startTime: Date.now(),
      metrics: {
        requests: 0,
        errors: 0,
        activeConnections: 0,
        responseTimes: [],
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        memoryMB: 0,
        eventLoopLag: 0,
        requestsPerSecond: 0,
        errorsPerSecond: 0,
        lastMinuteRequests: [],
        lastMinuteErrors: []
      },
      healthScore: 100
    });

    // Handle worker messages
    worker.on('message', (msg) => {
      handleWorkerMessage(worker.id, msg);
    });

    console.log(`[Master] Worker ${worker.id} (PID ${worker.process.pid}) started`);
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} died (${code || signal})`);
    workers.delete(worker.id);
    forkWorker();
  });

  /**
   * Handle metrics from workers
   */
  function handleWorkerMessage(workerId, msg) {
    const workerData = workers.get(workerId);
    if (!workerData) return;

    const metrics = workerData.metrics;

    switch (msg.type) {
      case 'request-complete':
        metrics.requests++;
        metrics.responseTimes.push(msg.duration);
        metrics.activeConnections--;

        // Update cluster metrics
        clusterMetrics.totalRequests++;
        clusterMetrics.responseTimes.push(msg.duration);

        // Track last minute for rate calculation
        metrics.lastMinuteRequests.push(Date.now());
        if (metrics.lastMinuteRequests.length > 1000) {
          metrics.lastMinuteRequests.shift();
        }

        // Keep only last 1000 response times
        if (metrics.responseTimes.length > 1000) {
          metrics.responseTimes.shift();
        }
        if (clusterMetrics.responseTimes.length > 10000) {
          clusterMetrics.responseTimes.shift();
        }
        break;

      case 'request-error':
        metrics.errors++;
        metrics.activeConnections--;
        clusterMetrics.totalErrors++;

        metrics.lastMinuteErrors.push(Date.now());
        if (metrics.lastMinuteErrors.length > 1000) {
          metrics.lastMinuteErrors.shift();
        }
        break;

      case 'request-start':
        metrics.activeConnections++;
        break;

      case 'metrics-update':
        metrics.cpuUsage = msg.cpu;
        metrics.memoryUsage = msg.memoryPercent;
        metrics.memoryMB = msg.memoryMB;
        metrics.eventLoopLag = msg.eventLoopLag;
        break;
    }

    // Update calculated metrics
    updateCalculatedMetrics(workerData);
  }

  /**
   * Calculate derived metrics
   */
  function updateCalculatedMetrics(workerData) {
    const metrics = workerData.metrics;

    // Response time statistics
    if (metrics.responseTimes.length > 0) {
      const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
      metrics.avgResponseTime = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      metrics.minResponseTime = sorted[0];
      metrics.maxResponseTime = sorted[sorted.length - 1];
      metrics.p50 = sorted[Math.floor(sorted.length * 0.50)];
      metrics.p95 = sorted[Math.floor(sorted.length * 0.95)];
      metrics.p99 = sorted[Math.floor(sorted.length * 0.99)];
    }

    // Requests per second (last minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    metrics.lastMinuteRequests = metrics.lastMinuteRequests.filter(t => t > oneMinuteAgo);
    metrics.requestsPerSecond = metrics.lastMinuteRequests.length / 60;

    metrics.lastMinuteErrors = metrics.lastMinuteErrors.filter(t => t > oneMinuteAgo);
    metrics.errorsPerSecond = metrics.lastMinuteErrors.length / 60;

    // Health score (0-100)
    let health = 100;
    if (metrics.cpuUsage > 80) health -= 20;
    if (metrics.memoryUsage > 80) health -= 20;
    if (metrics.eventLoopLag > 100) health -= 20;
    if (metrics.errorsPerSecond > 1) health -= 20;
    if (metrics.avgResponseTime > 500) health -= 20;

    workerData.healthScore = Math.max(0, health);
    workerData.status = health > 50 ? 'healthy' : 'degraded';
  }

  /**
   * Update cluster-wide metrics
   */
  function updateClusterMetrics() {
    const allMetrics = Array.from(workers.values()).map(w => w.metrics);

    // Calculate cluster-wide stats
    if (clusterMetrics.responseTimes.length > 0) {
      const sorted = [...clusterMetrics.responseTimes].sort((a, b) => a - b);
      clusterMetrics.avgResponseTime = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      clusterMetrics.p50 = sorted[Math.floor(sorted.length * 0.50)];
      clusterMetrics.p95 = sorted[Math.floor(sorted.length * 0.95)];
      clusterMetrics.p99 = sorted[Math.floor(sorted.length * 0.99)];
    }

    clusterMetrics.requestsPerSecond = allMetrics.reduce((sum, m) => sum + m.requestsPerSecond, 0);
    clusterMetrics.activeConnections = allMetrics.reduce((sum, m) => sum + m.activeConnections, 0);
  }

  // Periodic metrics update
  setInterval(updateClusterMetrics, METRICS_INTERVAL);

  /**
   * Master HTTP Server with Dashboard
   */
  const server = http.createServer((req, res) => {
    if (req.url === '/dashboard') {
      serveDashboard(req, res);
    } else if (req.url === '/metrics') {
      serveMetrics(req, res);
    } else if (req.url === '/metrics/prometheus') {
      servePrometheusMetrics(req, res);
    } else {
      // Proxy to worker
      proxyToWorker(req, res);
    }
  });

  /**
   * Serve HTML dashboard
   */
  function serveDashboard(req, res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Cluster Performance Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-card h3 { margin-top: 0; color: #555; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #4CAF50; margin: 10px 0; }
    .stat-label { color: #777; font-size: 14px; }
    .worker-table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .worker-table th { background: #4CAF50; color: white; padding: 12px; text-align: left; }
    .worker-table td { padding: 12px; border-bottom: 1px solid #eee; }
    .worker-table tr:hover { background: #f9f9f9; }
    .health-good { color: #4CAF50; font-weight: bold; }
    .health-degraded { color: #ff9800; font-weight: bold; }
    .refresh-info { text-align: center; color: #777; margin: 20px 0; }
    .progress-bar { background: #eee; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
    .progress-fill { background: #4CAF50; height: 100%; transition: width 0.3s; }
  </style>
  <script>
    function refreshMetrics() {
      fetch('/metrics')
        .then(r => r.json())
        .then(data => {
          document.getElementById('total-requests').textContent = data.cluster.totalRequests.toLocaleString();
          document.getElementById('req-per-sec').textContent = data.cluster.requestsPerSecond.toFixed(2);
          document.getElementById('avg-response').textContent = data.cluster.avgResponseTime.toFixed(2) + ' ms';
          document.getElementById('p95-response').textContent = (data.cluster.p95 || 0).toFixed(2) + ' ms';
          document.getElementById('error-rate').textContent = data.cluster.totalErrors.toLocaleString();
          document.getElementById('active-connections').textContent = data.cluster.activeConnections;
          document.getElementById('uptime').textContent = formatUptime(data.cluster.uptime);

          // Update worker table
          updateWorkerTable(data.workers);
        });
    }

    function updateWorkerTable(workers) {
      const tbody = document.getElementById('worker-tbody');
      tbody.innerHTML = workers.map(w => \`
        <tr>
          <td>\${w.id}</td>
          <td>\${w.pid}</td>
          <td class="\${w.status === 'healthy' ? 'health-good' : 'health-degraded'}">\${w.status}</td>
          <td>\${w.healthScore}%</td>
          <td>\${w.metrics.requests.toLocaleString()}</td>
          <td>\${w.metrics.requestsPerSecond.toFixed(2)}</td>
          <td>\${w.metrics.avgResponseTime.toFixed(2)} ms</td>
          <td>\${w.metrics.p95.toFixed(2)} ms</td>
          <td>\${w.metrics.activeConnections}</td>
          <td>\${w.metrics.cpuUsage.toFixed(1)}%</td>
          <td>\${w.metrics.memoryMB.toFixed(0)} MB</td>
          <td>\${w.metrics.eventLoopLag.toFixed(2)} ms</td>
        </tr>
      \`).join('');
    }

    function formatUptime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return \`\${hours}h \${minutes}m \${secs}s\`;
    }

    // Auto-refresh every 2 seconds
    setInterval(refreshMetrics, 2000);
    refreshMetrics();
  </script>
</head>
<body>
  <div class="container">
    <h1>Cluster Performance Dashboard</h1>
    <div class="refresh-info">Auto-refreshing every 2 seconds</div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Requests</h3>
        <div class="stat-value" id="total-requests">0</div>
        <div class="stat-label">All-time requests processed</div>
      </div>
      <div class="stat-card">
        <h3>Requests/Second</h3>
        <div class="stat-value" id="req-per-sec">0</div>
        <div class="stat-label">Current throughput</div>
      </div>
      <div class="stat-card">
        <h3>Avg Response Time</h3>
        <div class="stat-value" id="avg-response">0 ms</div>
        <div class="stat-label">Mean latency</div>
      </div>
      <div class="stat-card">
        <h3>P95 Response Time</h3>
        <div class="stat-value" id="p95-response">0 ms</div>
        <div class="stat-label">95th percentile</div>
      </div>
      <div class="stat-card">
        <h3>Error Rate</h3>
        <div class="stat-value" id="error-rate">0</div>
        <div class="stat-label">Total errors</div>
      </div>
      <div class="stat-card">
        <h3>Active Connections</h3>
        <div class="stat-value" id="active-connections">0</div>
        <div class="stat-label">Current connections</div>
      </div>
      <div class="stat-card">
        <h3>Uptime</h3>
        <div class="stat-value" id="uptime">0h 0m 0s</div>
        <div class="stat-label">Cluster uptime</div>
      </div>
    </div>

    <h2>Worker Performance</h2>
    <table class="worker-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>PID</th>
          <th>Status</th>
          <th>Health</th>
          <th>Requests</th>
          <th>Req/Sec</th>
          <th>Avg RT</th>
          <th>P95 RT</th>
          <th>Active</th>
          <th>CPU</th>
          <th>Memory</th>
          <th>Loop Lag</th>
        </tr>
      </thead>
      <tbody id="worker-tbody">
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve JSON metrics
   */
  function serveMetrics(req, res) {
    updateClusterMetrics();

    const metrics = {
      cluster: {
        ...clusterMetrics,
        uptime: (Date.now() - clusterMetrics.startTime) / 1000,
        workers: workers.size
      },
      workers: Array.from(workers.values()).map(w => ({
        id: w.id,
        pid: w.pid,
        status: w.status,
        healthScore: w.healthScore,
        uptime: (Date.now() - w.startTime) / 1000,
        metrics: w.metrics
      }))
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
  }

  /**
   * Serve Prometheus-format metrics
   */
  function servePrometheusMetrics(req, res) {
    updateClusterMetrics();

    let output = '';

    // Cluster metrics
    output += `# HELP nodejs_cluster_requests_total Total number of requests\n`;
    output += `# TYPE nodejs_cluster_requests_total counter\n`;
    output += `nodejs_cluster_requests_total ${clusterMetrics.totalRequests}\n\n`;

    output += `# HELP nodejs_cluster_requests_per_second Current requests per second\n`;
    output += `# TYPE nodejs_cluster_requests_per_second gauge\n`;
    output += `nodejs_cluster_requests_per_second ${clusterMetrics.requestsPerSecond.toFixed(2)}\n\n`;

    output += `# HELP nodejs_cluster_response_time_ms Response time percentiles\n`;
    output += `# TYPE nodejs_cluster_response_time_ms gauge\n`;
    output += `nodejs_cluster_response_time_ms{percentile="50"} ${clusterMetrics.p50 || 0}\n`;
    output += `nodejs_cluster_response_time_ms{percentile="95"} ${clusterMetrics.p95 || 0}\n`;
    output += `nodejs_cluster_response_time_ms{percentile="99"} ${clusterMetrics.p99 || 0}\n\n`;

    // Worker metrics
    workers.forEach(w => {
      output += `nodejs_worker_requests_total{worker="${w.id}"} ${w.metrics.requests}\n`;
      output += `nodejs_worker_cpu_usage{worker="${w.id}"} ${w.metrics.cpuUsage}\n`;
      output += `nodejs_worker_memory_mb{worker="${w.id}"} ${w.metrics.memoryMB}\n`;
      output += `nodejs_worker_event_loop_lag_ms{worker="${w.id}"} ${w.metrics.eventLoopLag}\n`;
      output += `nodejs_worker_health_score{worker="${w.id}"} ${w.healthScore}\n`;
    });

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(output);
  }

  /**
   * Proxy request to worker
   */
  function proxyToWorker(req, res) {
    const worker = Array.from(workers.keys())[0];
    const workerInstance = Array.from(workers.values())[0];

    if (!workerInstance) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('No workers available');
      return;
    }

    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    workerInstance.worker = cluster.workers[worker];
    workerInstance.worker.send({
      type: 'http-request',
      requestId,
      method: req.method,
      url: req.url
    });

    const responseHandler = (msg) => {
      if (msg.type === 'http-response' && msg.requestId === requestId) {
        workerInstance.worker.removeListener('message', responseHandler);
        res.writeHead(msg.statusCode, msg.headers);
        res.end(msg.body);
      }
    };

    workerInstance.worker.on('message', responseHandler);
  }

  server.listen(PORT, () => {
    console.log(`\n[Master] Monitoring dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`[Master] Metrics API: http://localhost:${PORT}/metrics`);
    console.log(`[Master] Prometheus metrics: http://localhost:${PORT}/metrics/prometheus\n`);
  });

} else {
  // === WORKER PROCESS ===

  let eventLoopStart = Date.now();

  /**
   * Measure event loop lag
   */
  function measureEventLoopLag() {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      eventLoopStart = Date.now();
      return lag;
    });
  }

  // Send metrics updates periodically
  setInterval(() => {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();

    process.send({
      type: 'metrics-update',
      cpu: ((usage.user + usage.system) / 1000000) % 100,
      memoryPercent: (memory.heapUsed / memory.heapTotal) * 100,
      memoryMB: memory.heapUsed / 1024 / 1024,
      eventLoopLag: Date.now() - eventLoopStart
    });

    measureEventLoopLag();
  }, METRICS_INTERVAL);

  /**
   * Handle requests
   */
  process.on('message', (msg) => {
    if (msg.type === 'http-request') {
      const startTime = Date.now();

      process.send({ type: 'request-start' });

      // Simulate work
      const processingTime = Math.random() * 100 + 50; // 50-150ms

      setTimeout(() => {
        const duration = Date.now() - startTime;

        // Random errors
        if (Math.random() < 0.02) {
          process.send({ type: 'request-error', duration });
          sendResponse(msg.requestId, 500, 'Internal Server Error');
          return;
        }

        process.send({ type: 'request-complete', duration });
        sendResponse(msg.requestId, 200, JSON.stringify({
          worker: cluster.worker.id,
          timestamp: new Date().toISOString(),
          processingTime: processingTime.toFixed(2) + 'ms'
        }));
      }, processingTime);
    }
  });

  function sendResponse(requestId, statusCode, body) {
    process.send({
      type: 'http-response',
      requestId,
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body
    });
  }

  console.log(`[Worker ${cluster.worker.id}] Monitoring enabled`);
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Essential Metrics:
 *    - Throughput (requests/sec)
 *    - Latency (avg, p50, p95, p99)
 *    - Error rate
 *    - Resource usage (CPU, memory)
 *    - Event loop lag
 *
 * 2. Real-time Dashboard:
 *    - Live metrics updates
 *    - Per-worker breakdown
 *    - Health scoring
 *    - Visual indicators
 *
 * 3. Metrics Export:
 *    - JSON API for custom integrations
 *    - Prometheus format for monitoring systems
 *    - Historical data retention
 *
 * 4. Health Scoring:
 *    - Composite score from multiple metrics
 *    - Early warning for degradation
 *    - Automatic status detection
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Use proper APM tools:
 *    - New Relic, DataDog, Dynatrace
 *    - Application Insights, Elastic APM
 *    - Custom Prometheus + Grafana
 *
 * 2. Metric storage:
 *    - Time-series database
 *    - Aggregation strategies
 *    - Retention policies
 *
 * 3. Alerting:
 *    - Threshold-based alerts
 *    - Anomaly detection
 *    - Alert routing and escalation
 */
