/**
 * Example 6: Complete Production-Ready Cluster
 *
 * This example combines all advanced patterns into a comprehensive,
 * production-ready clustered Node.js application. It demonstrates:
 *
 * - Sticky sessions with session store
 * - Advanced load balancing (least connections)
 * - Real-time performance monitoring
 * - Circuit breaker pattern
 * - Graceful shutdown
 * - Health checks
 * - Automatic worker recovery
 * - Metrics collection and export
 *
 * This is a reference implementation suitable for production deployment
 * with appropriate modifications for your specific use case.
 *
 * Run this: node 06-production-cluster.js
 * Dashboard: http://localhost:8000/dashboard
 * Health: http://localhost:8000/health
 * Metrics: http://localhost:8000/metrics
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// Configuration
const CONFIG = {
  port: process.env.PORT || 8000,
  workers: parseInt(process.env.WORKERS) || Math.min(4, os.cpus().length),
  shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000,
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 5000,
  metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 1000,
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 1800000, // 30 minutes
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 10000
  }
};

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 3;
    this.timeout = options.timeout || 10000;
  }

  async execute(fn, fallback) {
    if (this.state === 'OPEN' && Date.now() < this.nextAttempt) {
      return fallback ? fallback() : Promise.reject(new Error('Circuit breaker open'));
    }

    if (this.state === 'OPEN') {
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      return fallback ? fallback() : Promise.reject(error);
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.successCount = 0;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null
    };
  }
}

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting production cluster`);
  console.log(`[Master] Configuration:`);
  console.log(`  - Workers: ${CONFIG.workers}`);
  console.log(`  - Port: ${CONFIG.port}`);
  console.log(`  - Shutdown Timeout: ${CONFIG.shutdownTimeout}ms`);
  console.log(`  - Health Check Interval: ${CONFIG.healthCheckInterval}ms\n`);

  // Worker tracking
  const workers = new Map();
  const sessionMap = new Map();
  const circuitBreakers = new Map();

  // Cluster metrics
  const clusterMetrics = {
    startTime: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
    requestsPerSecond: 0,
    activeConnections: 0,
    recentRequests: []
  };

  /**
   * Fork worker with full initialization
   */
  function forkWorker() {
    const worker = cluster.fork();

    workers.set(worker.id, {
      id: worker.id,
      pid: worker.process.pid,
      status: 'starting',
      startTime: Date.now(),
      activeConnections: 0,
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      lastHealthCheck: Date.now(),
      healthScore: 100
    });

    // Create circuit breaker for worker
    circuitBreakers.set(worker.id, new CircuitBreaker(`Worker-${worker.id}`, CONFIG.circuitBreaker));

    // Handle worker messages
    worker.on('message', (msg) => handleWorkerMessage(worker.id, msg));

    // Worker ready notification
    worker.once('message', (msg) => {
      if (msg.type === 'ready') {
        const workerData = workers.get(worker.id);
        workerData.status = 'healthy';
        console.log(`[Master] Worker ${worker.id} (PID ${worker.process.pid}) ready`);
      }
    });

    return worker;
  }

  // Initialize workers
  for (let i = 0; i < CONFIG.workers; i++) {
    forkWorker();
  }

  /**
   * Handle messages from workers
   */
  function handleWorkerMessage(workerId, msg) {
    const workerData = workers.get(workerId);
    if (!workerData) return;

    switch (msg.type) {
      case 'request-start':
        workerData.activeConnections++;
        workerData.totalRequests++;
        clusterMetrics.totalRequests++;
        clusterMetrics.activeConnections++;
        break;

      case 'request-complete':
        workerData.activeConnections--;
        workerData.totalResponseTime += msg.duration;
        workerData.avgResponseTime = workerData.totalResponseTime / workerData.totalRequests;
        clusterMetrics.activeConnections--;
        clusterMetrics.recentRequests.push(Date.now());
        break;

      case 'request-error':
        workerData.activeConnections--;
        workerData.totalErrors++;
        clusterMetrics.totalErrors++;
        clusterMetrics.activeConnections--;
        break;

      case 'health-update':
        workerData.cpuUsage = msg.cpu;
        workerData.memoryUsage = msg.memory;
        workerData.lastHealthCheck = Date.now();
        updateWorkerHealth(workerId);
        break;
    }
  }

  /**
   * Update worker health score
   */
  function updateWorkerHealth(workerId) {
    const workerData = workers.get(workerId);
    if (!workerData) return;

    let health = 100;

    // Check various health indicators
    if (workerData.cpuUsage > 80) health -= 20;
    if (workerData.memoryUsage > 80) health -= 20;
    if (workerData.avgResponseTime > 1000) health -= 20;
    const errorRate = workerData.totalRequests > 0 ?
      (workerData.totalErrors / workerData.totalRequests) * 100 : 0;
    if (errorRate > 5) health -= 20;

    // Check if health check is stale
    if (Date.now() - workerData.lastHealthCheck > CONFIG.healthCheckInterval * 3) {
      health -= 30;
      workerData.status = 'unhealthy';
    }

    workerData.healthScore = Math.max(0, health);
    workerData.status = health > 50 ? 'healthy' : 'degraded';
  }

  /**
   * Load balancing: Least connections algorithm
   */
  function selectWorker() {
    let minConnections = Infinity;
    let selectedWorker = null;

    for (const [workerId, workerData] of workers.entries()) {
      if (workerData.status !== 'healthy') continue;

      if (workerData.activeConnections < minConnections) {
        minConnections = workerData.activeConnections;
        selectedWorker = cluster.workers[workerId];
      }
    }

    // Fallback to any available worker
    if (!selectedWorker) {
      const firstWorker = Array.from(workers.keys())[0];
      selectedWorker = cluster.workers[firstWorker];
    }

    return selectedWorker;
  }

  /**
   * Get worker by session (sticky sessions)
   */
  function getWorkerBySession(sessionId) {
    if (!sessionId) return null;

    if (sessionMap.has(sessionId)) {
      const workerId = sessionMap.get(sessionId);
      const worker = cluster.workers[workerId];
      if (worker) return worker;
      sessionMap.delete(sessionId);
    }

    return null;
  }

  /**
   * Assign session to worker
   */
  function assignSession(sessionId, workerId) {
    sessionMap.set(sessionId, workerId);

    // Clean up old sessions periodically
    if (sessionMap.size > 10000) {
      const entriesToDelete = Array.from(sessionMap.entries())
        .slice(0, 1000);
      entriesToDelete.forEach(([key]) => sessionMap.delete(key));
    }
  }

  /**
   * Proxy request to worker
   */
  async function proxyToWorker(req, res) {
    // Extract session ID
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.sessionId;

    // Select worker
    let worker = sessionId ? getWorkerBySession(sessionId) : null;
    if (!worker) {
      worker = selectWorker();
    }

    const workerId = worker.id;
    const requestId = crypto.randomBytes(16).toString('hex');

    // Use circuit breaker
    const circuitBreaker = circuitBreakers.get(workerId);

    try {
      await circuitBreaker.execute(
        () => sendToWorker(worker, requestId, req),
        () => {
          // Fallback: try another worker
          const fallbackWorker = selectWorker();
          if (fallbackWorker && fallbackWorker.id !== workerId) {
            return sendToWorker(fallbackWorker, requestId, req);
          }
          throw new Error('All workers unavailable');
        }
      );

      // Wait for response
      return new Promise((resolve) => {
        const responseHandler = (msg) => {
          if (msg.type === 'http-response' && msg.requestId === requestId) {
            worker.removeListener('message', responseHandler);

            // Assign session if new
            if (!sessionId && msg.sessionId) {
              assignSession(msg.sessionId, workerId);
            }

            res.writeHead(msg.statusCode, msg.headers);
            res.end(msg.body);
            resolve();
          }
        };

        worker.on('message', responseHandler);

        // Timeout
        setTimeout(() => {
          worker.removeListener('message', responseHandler);
          if (!res.headersSent) {
            res.writeHead(504);
            res.end('Gateway Timeout');
          }
          resolve();
        }, 30000);
      });
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(503);
        res.end(JSON.stringify({
          error: 'Service Unavailable',
          message: 'All workers are unavailable'
        }));
      }
    }
  }

  function sendToWorker(worker, requestId, req) {
    return new Promise((resolve, reject) => {
      worker.send({
        type: 'http-request',
        requestId,
        method: req.method,
        url: req.url,
        headers: req.headers
      });

      const confirmHandler = (msg) => {
        if (msg.type === 'request-received' && msg.requestId === requestId) {
          worker.removeListener('message', confirmHandler);
          resolve();
        }
      };

      worker.on('message', confirmHandler);

      setTimeout(() => {
        worker.removeListener('message', confirmHandler);
        reject(new Error('Worker timeout'));
      }, 5000);
    });
  }

  function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) cookies[name] = value;
    });
    return cookies;
  }

  /**
   * Master HTTP Server
   */
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      serveHealth(req, res);
    } else if (req.url === '/metrics') {
      serveMetrics(req, res);
    } else if (req.url === '/dashboard') {
      serveDashboard(req, res);
    } else {
      proxyToWorker(req, res);
    }
  });

  function serveHealth(req, res) {
    const healthyWorkers = Array.from(workers.values())
      .filter(w => w.status === 'healthy').length;

    const health = {
      status: healthyWorkers > 0 ? 'healthy' : 'unhealthy',
      workers: {
        total: workers.size,
        healthy: healthyWorkers,
        degraded: Array.from(workers.values()).filter(w => w.status === 'degraded').length
      },
      uptime: (Date.now() - clusterMetrics.startTime) / 1000
    };

    res.writeHead(healthyWorkers > 0 ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  }

  function serveMetrics(req, res) {
    // Calculate requests per second
    const now = Date.now();
    clusterMetrics.recentRequests = clusterMetrics.recentRequests.filter(t => now - t < 60000);
    clusterMetrics.requestsPerSecond = clusterMetrics.recentRequests.length / 60;

    const metrics = {
      cluster: {
        totalRequests: clusterMetrics.totalRequests,
        totalErrors: clusterMetrics.totalErrors,
        requestsPerSecond: clusterMetrics.requestsPerSecond.toFixed(2),
        activeConnections: clusterMetrics.activeConnections,
        uptime: (Date.now() - clusterMetrics.startTime) / 1000
      },
      workers: Array.from(workers.values()),
      circuitBreakers: Array.from(circuitBreakers.values()).map(cb => cb.getState())
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
  }

  function serveDashboard(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head><title>Production Cluster Dashboard</title>
<style>
  body { font-family: Arial; margin: 20px; background: #f5f5f5; }
  .container { max-width: 1200px; margin: 0 auto; }
  .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  h1 { color: #333; }
  .metric { display: inline-block; margin: 10px 20px 10px 0; }
  .metric-label { color: #666; font-size: 14px; }
  .metric-value { font-size: 24px; font-weight: bold; color: #4CAF50; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #4CAF50; color: white; padding: 10px; text-align: left; }
  td { padding: 10px; border-bottom: 1px solid #ddd; }
  .status-healthy { color: #4CAF50; font-weight: bold; }
  .status-degraded { color: #ff9800; font-weight: bold; }
</style>
<script>
  setInterval(() => {
    fetch('/metrics').then(r => r.json()).then(data => {
      document.getElementById('total-requests').textContent = data.cluster.totalRequests;
      document.getElementById('req-per-sec').textContent = data.cluster.requestsPerSecond;
      document.getElementById('total-errors').textContent = data.cluster.totalErrors;
      document.getElementById('active-connections').textContent = data.cluster.activeConnections;
    });
  }, 2000);
</script>
</head>
<body>
<div class="container">
  <h1>Production Cluster Dashboard</h1>
  <div class="card">
    <h2>Cluster Metrics</h2>
    <div class="metric">
      <div class="metric-label">Total Requests</div>
      <div class="metric-value" id="total-requests">0</div>
    </div>
    <div class="metric">
      <div class="metric-label">Req/Sec</div>
      <div class="metric-value" id="req-per-sec">0</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Errors</div>
      <div class="metric-value" id="total-errors">0</div>
    </div>
    <div class="metric">
      <div class="metric-label">Active Connections</div>
      <div class="metric-value" id="active-connections">0</div>
    </div>
  </div>
  <div class="card">
    <h2>API Endpoints</h2>
    <p><a href="/health">Health Check</a> | <a href="/metrics">Metrics (JSON)</a></p>
  </div>
</div>
</body>
</html>
    `);
  }

  /**
   * Graceful shutdown
   */
  let isShuttingDown = false;

  function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Master] Received ${signal}, starting graceful shutdown...`);

    server.close(() => {
      console.log('[Master] Server closed');
    });

    // Shutdown all workers
    workers.forEach((data, id) => {
      const worker = cluster.workers[id];
      if (worker) {
        worker.send({ type: 'shutdown' });
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.log('[Master] Forcing shutdown');
      process.exit(1);
    }, CONFIG.shutdownTimeout);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  /**
   * Handle worker crashes
   */
  cluster.on('exit', (worker, code, signal) => {
    if (isShuttingDown) return;

    console.log(`[Master] Worker ${worker.id} died (${code || signal}), restarting...`);
    workers.delete(worker.id);
    circuitBreakers.delete(worker.id);

    // Clean up sessions for dead worker
    for (const [sessionId, workerId] of sessionMap.entries()) {
      if (workerId === worker.id) {
        sessionMap.delete(sessionId);
      }
    }

    // Restart worker
    forkWorker();
  });

  server.listen(CONFIG.port, () => {
    console.log(`\n[Master] Production cluster ready on port ${CONFIG.port}`);
    console.log(`[Master] Dashboard: http://localhost:${CONFIG.port}/dashboard`);
    console.log(`[Master] Health: http://localhost:${CONFIG.port}/health`);
    console.log(`[Master] Metrics: http://localhost:${CONFIG.port}/metrics\n`);
  });

  // Periodic health checks
  setInterval(() => {
    workers.forEach((data, id) => {
      updateWorkerHealth(id);
    });
  }, CONFIG.healthCheckInterval);

} else {
  // === WORKER PROCESS ===

  const sessions = new Map();

  process.on('message', async (msg) => {
    if (msg.type === 'http-request') {
      handleRequest(msg);
    } else if (msg.type === 'shutdown') {
      gracefulShutdown();
    }
  });

  function handleRequest(msg) {
    const startTime = Date.now();

    // Acknowledge request received
    process.send({ type: 'request-received', requestId: msg.requestId });
    process.send({ type: 'request-start' });

    // Get or create session
    const cookies = parseCookies(msg.headers.cookie);
    let sessionId = cookies.sessionId;
    let session;

    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
      session.lastAccess = Date.now();
    } else {
      sessionId = crypto.randomBytes(16).toString('hex');
      session = {
        id: sessionId,
        created: Date.now(),
        lastAccess: Date.now(),
        data: {}
      };
      sessions.set(sessionId, session);
    }

    // Simulate work
    const processingTime = 50 + Math.random() * 100;

    setTimeout(() => {
      const duration = Date.now() - startTime;

      // Random errors (2% rate)
      if (Math.random() < 0.02) {
        process.send({ type: 'request-error', duration });
        process.send({
          type: 'http-response',
          requestId: msg.requestId,
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Internal Server Error' }),
          sessionId
        });
        return;
      }

      process.send({ type: 'request-complete', duration });
      process.send({
        type: 'http-response',
        requestId: msg.requestId,
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Max-Age=3600; Path=/`
        },
        body: JSON.stringify({
          worker: cluster.worker.id,
          session: sessionId.substring(0, 8),
          processingTime: processingTime.toFixed(2) + 'ms',
          timestamp: new Date().toISOString()
        }),
        sessionId
      });
    }, processingTime);
  }

  function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) cookies[name] = value;
    });
    return cookies;
  }

  // Send health updates
  setInterval(() => {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();

    process.send({
      type: 'health-update',
      cpu: ((usage.user + usage.system) / 1000000) % 100,
      memory: (memory.heapUsed / memory.heapTotal) * 100
    });
  }, CONFIG.metricsInterval);

  // Session cleanup
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastAccess > CONFIG.sessionTimeout) {
        sessions.delete(id);
      }
    }
  }, 60000);

  function gracefulShutdown() {
    console.log(`[Worker ${cluster.worker.id}] Graceful shutdown`);
    setTimeout(() => process.exit(0), 1000);
  }

  // Send ready notification
  process.send({ type: 'ready' });
  console.log(`[Worker ${cluster.worker.id}] Started`);
}

/**
 * PRODUCTION DEPLOYMENT CHECKLIST:
 *
 * 1. Environment Configuration:
 *    - Set appropriate environment variables
 *    - Configure worker count based on CPU cores
 *    - Set timeouts based on application needs
 *
 * 2. External Dependencies:
 *    - Use Redis for session storage
 *    - Use proper database connection pooling
 *    - Configure external API clients
 *
 * 3. Monitoring:
 *    - Integrate with APM (New Relic, DataDog)
 *    - Set up logging (Winston, Bunyan)
 *    - Configure alerting
 *
 * 4. Security:
 *    - Enable HTTPS
 *    - Set secure cookie options
 *    - Implement rate limiting
 *    - Add authentication/authorization
 *
 * 5. Process Management:
 *    - Use PM2 or systemd for process supervision
 *    - Configure auto-restart policies
 *    - Set up log rotation
 *
 * 6. Load Balancer:
 *    - Configure nginx or cloud load balancer
 *    - Enable health checks
 *    - Set up SSL termination
 */
