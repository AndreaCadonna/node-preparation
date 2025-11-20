/**
 * Example 3: Worker Health Check System
 *
 * This example demonstrates a comprehensive health monitoring system for
 * clustered applications. It includes:
 * - Heartbeat monitoring
 * - Memory usage tracking
 * - Request processing metrics
 * - Automatic unhealthy worker restart
 * - Health check endpoint
 *
 * Key Concepts:
 * - Worker health metrics
 * - Heartbeat patterns
 * - Threshold-based monitoring
 * - Automatic remediation
 * - Health check endpoints
 *
 * Run this: node 03-health-monitoring.js
 * Check health: curl http://localhost:8000/health
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const HEARTBEAT_INTERVAL = 2000; // Send heartbeat every 2 seconds
const HEARTBEAT_TIMEOUT = 6000; // Consider worker dead after 6 seconds
const MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB threshold
const ERROR_RATE_THRESHOLD = 0.1; // 10% error rate threshold
const numCPUs = Math.min(os.cpus().length, 4);

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting health monitoring system\n`);

  // Worker health tracking
  const workerHealth = new Map();

  /**
   * Initialize health tracking for a worker
   */
  function initializeHealthTracking(worker) {
    workerHealth.set(worker.id, {
      worker,
      lastHeartbeat: Date.now(),
      isHealthy: true,
      metrics: {
        memoryUsage: 0,
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        cpuUsage: 0
      },
      startTime: Date.now(),
      restartCount: 0
    });

    console.log(`[Master] Initialized health tracking for worker ${worker.id}`);
  }

  /**
   * Fork a new worker
   */
  function forkWorker() {
    const worker = cluster.fork();
    console.log(`[Master] Forked worker ${worker.id} (PID ${worker.process.pid})`);

    initializeHealthTracking(worker);

    // Listen for health messages from worker
    worker.on('message', (msg) => {
      const health = workerHealth.get(worker.id);
      if (!health) return;

      switch (msg.type) {
        case 'heartbeat':
          health.lastHeartbeat = Date.now();
          health.metrics = { ...health.metrics, ...msg.metrics };
          break;

        case 'error':
          health.metrics.errorCount++;
          console.log(`[Master] Worker ${worker.id} reported error: ${msg.error}`);
          break;

        case 'request-complete':
          health.metrics.requestCount++;
          // Update average response time
          const currentAvg = health.metrics.avgResponseTime;
          const count = health.metrics.requestCount;
          health.metrics.avgResponseTime =
            (currentAvg * (count - 1) + msg.duration) / count;
          break;
      }
    });

    return worker;
  }

  /**
   * Check health of all workers
   */
  function checkWorkerHealth() {
    const now = Date.now();

    workerHealth.forEach((health, workerId) => {
      const timeSinceHeartbeat = now - health.lastHeartbeat;
      const metrics = health.metrics;

      // Check 1: Heartbeat timeout
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
        console.log(`[Master] ⚠️  Worker ${workerId} heartbeat timeout (${timeSinceHeartbeat}ms)`);
        health.isHealthy = false;
        restartUnhealthyWorker(workerId, 'heartbeat timeout');
        return;
      }

      // Check 2: Memory usage
      if (metrics.memoryUsage > MEMORY_THRESHOLD) {
        console.log(`[Master] ⚠️  Worker ${workerId} high memory usage: ${formatBytes(metrics.memoryUsage)}`);
        health.isHealthy = false;
        restartUnhealthyWorker(workerId, 'high memory usage');
        return;
      }

      // Check 3: Error rate
      if (metrics.requestCount > 10) {
        const errorRate = metrics.errorCount / metrics.requestCount;
        if (errorRate > ERROR_RATE_THRESHOLD) {
          console.log(`[Master] ⚠️  Worker ${workerId} high error rate: ${(errorRate * 100).toFixed(2)}%`);
          health.isHealthy = false;
          restartUnhealthyWorker(workerId, `high error rate: ${(errorRate * 100).toFixed(2)}%`);
          return;
        }
      }

      // Worker is healthy
      if (!health.isHealthy) {
        console.log(`[Master] ✓ Worker ${workerId} recovered`);
        health.isHealthy = true;
      }
    });
  }

  /**
   * Restart an unhealthy worker
   */
  function restartUnhealthyWorker(workerId, reason) {
    const health = workerHealth.get(workerId);
    if (!health) return;

    console.log(`[Master] Restarting worker ${workerId} due to: ${reason}`);

    health.restartCount++;

    // Fork new worker first
    const newWorker = forkWorker();

    // Wait a bit for new worker to start, then kill old one
    setTimeout(() => {
      console.log(`[Master] Killing unhealthy worker ${workerId}`);
      health.worker.kill('SIGTERM');

      // Force kill if doesn't exit
      setTimeout(() => {
        if (workerHealth.has(workerId)) {
          health.worker.kill('SIGKILL');
        }
      }, 5000);
    }, 2000);
  }

  /**
   * Print health status report
   */
  function printHealthReport() {
    console.log('\n========== HEALTH REPORT ==========');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Total Workers: ${workerHealth.size}\n`);

    workerHealth.forEach((health, workerId) => {
      const uptime = Math.floor((Date.now() - health.startTime) / 1000);
      const metrics = health.metrics;
      const errorRate = metrics.requestCount > 0
        ? (metrics.errorCount / metrics.requestCount * 100).toFixed(2)
        : '0.00';

      console.log(`Worker ${workerId} (PID ${health.worker.process.pid}):`);
      console.log(`  Status: ${health.isHealthy ? '✓ Healthy' : '✗ Unhealthy'}`);
      console.log(`  Uptime: ${uptime}s`);
      console.log(`  Memory: ${formatBytes(metrics.memoryUsage)}`);
      console.log(`  Requests: ${metrics.requestCount}`);
      console.log(`  Errors: ${metrics.errorCount} (${errorRate}%)`);
      console.log(`  Avg Response: ${metrics.avgResponseTime.toFixed(2)}ms`);
      console.log(`  CPU: ${metrics.cpuUsage.toFixed(2)}%`);
      console.log(`  Restarts: ${health.restartCount}`);
      console.log('');
    });

    console.log('==================================\n');
  }

  /**
   * Format bytes to human-readable string
   */
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * Initialize workers
   */
  for (let i = 0; i < numCPUs; i++) {
    forkWorker();
  }

  /**
   * Handle worker exits
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} exited (code: ${code}, signal: ${signal})`);
    workerHealth.delete(worker.id);

    // Don't auto-restart if we're shutting down
    // Restart will be handled by health check system
  });

  /**
   * Start health monitoring
   */
  const healthCheckInterval = setInterval(checkWorkerHealth, HEARTBEAT_INTERVAL);
  const reportInterval = setInterval(printHealthReport, 15000); // Report every 15s

  /**
   * Graceful shutdown
   */
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    console.log('\n[Master] Shutting down...');
    clearInterval(healthCheckInterval);
    clearInterval(reportInterval);

    workerHealth.forEach((health) => {
      health.worker.kill('SIGTERM');
    });

    setTimeout(() => process.exit(0), 5000);
  }

  console.log(`[Master] Health monitoring active`);
  console.log(`[Master] Heartbeat interval: ${HEARTBEAT_INTERVAL}ms`);
  console.log(`[Master] Heartbeat timeout: ${HEARTBEAT_TIMEOUT}ms`);
  console.log(`[Master] Memory threshold: ${formatBytes(MEMORY_THRESHOLD)}`);
  console.log(`[Master] Server running on http://localhost:${PORT}\n`);

} else {
  // === WORKER PROCESS ===

  let requestCount = 0;
  let errorCount = 0;
  const responseTimes = [];

  /**
   * Calculate CPU usage
   */
  let lastCpuUsage = process.cpuUsage();
  function getCpuUsage() {
    const currentUsage = process.cpuUsage(lastCpuUsage);
    lastCpuUsage = process.cpuUsage();

    // Convert to percentage
    const totalUsage = currentUsage.user + currentUsage.system;
    const percentage = (totalUsage / 1000000 / 2) * 100; // Rough estimate

    return Math.min(percentage, 100);
  }

  /**
   * Send heartbeat to master
   */
  function sendHeartbeat() {
    const memUsage = process.memoryUsage();

    if (process.send) {
      process.send({
        type: 'heartbeat',
        metrics: {
          memoryUsage: memUsage.heapUsed,
          requestCount,
          errorCount,
          avgResponseTime: responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0,
          cpuUsage: getCpuUsage()
        }
      });
    }
  }

  /**
   * HTTP Server
   */
  const server = http.createServer((req, res) => {
    const startTime = Date.now();
    requestCount++;

    // Route handling
    if (req.url === '/health') {
      // Health check endpoint
      const memUsage = process.memoryUsage();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        worker: cluster.worker.id,
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          heapUsed: formatBytes(memUsage.heapUsed),
          heapTotal: formatBytes(memUsage.heapTotal),
          rss: formatBytes(memUsage.rss)
        },
        requests: requestCount,
        errors: errorCount
      }, null, 2));

      const duration = Date.now() - startTime;
      responseTimes.push(duration);
      notifyRequestComplete(duration);
      return;
    }

    if (req.url === '/error') {
      // Simulate error
      errorCount++;
      if (process.send) {
        process.send({ type: 'error', error: 'Simulated error' });
      }
      res.writeHead(500);
      res.end('Simulated error\n');

      const duration = Date.now() - startTime;
      responseTimes.push(duration);
      notifyRequestComplete(duration);
      return;
    }

    if (req.url === '/leak') {
      // Simulate memory leak
      const leak = new Array(1000000).fill('memory leak');
      res.writeHead(200);
      res.end(`Leaked memory (array size: ${leak.length})\n`);

      const duration = Date.now() - startTime;
      responseTimes.push(duration);
      notifyRequestComplete(duration);
      return;
    }

    if (req.url === '/slow') {
      // Slow endpoint
      setTimeout(() => {
        res.writeHead(200);
        res.end(`Slow response from worker ${cluster.worker.id}\n`);

        const duration = Date.now() - startTime;
        responseTimes.push(duration);
        notifyRequestComplete(duration);
      }, 2000);
      return;
    }

    // Default endpoint
    res.writeHead(200);
    res.end(`Response from worker ${cluster.worker.id}\n`);

    const duration = Date.now() - startTime;
    responseTimes.push(duration);
    notifyRequestComplete(duration);
  });

  /**
   * Notify master of completed request
   */
  function notifyRequestComplete(duration) {
    if (process.send) {
      process.send({
        type: 'request-complete',
        duration
      });
    }

    // Keep only last 100 response times
    if (responseTimes.length > 100) {
      responseTimes.shift();
    }
  }

  /**
   * Start heartbeat
   */
  const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  /**
   * Graceful shutdown
   */
  process.on('SIGTERM', () => {
    console.log(`[Worker ${cluster.worker.id}] Shutting down...`);
    clearInterval(heartbeatInterval);
    server.close(() => {
      process.exit(0);
    });
  });

  /**
   * Start server
   */
  server.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id}] Listening on port ${PORT}`);
    sendHeartbeat(); // Send initial heartbeat
  });
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Heartbeat Pattern:
 *    - Workers send periodic heartbeats
 *    - Master tracks last heartbeat time
 *    - Timeout indicates worker is stuck or crashed
 *
 * 2. Health Metrics:
 *    - Memory usage (heap, RSS)
 *    - Request count and error rate
 *    - Response time averages
 *    - CPU usage
 *
 * 3. Threshold Monitoring:
 *    - Define acceptable ranges for metrics
 *    - Take action when thresholds exceeded
 *    - Different thresholds for different metrics
 *
 * 4. Automatic Remediation:
 *    - Restart unhealthy workers automatically
 *    - Start new worker before killing old one
 *    - Track restart count to detect repeated failures
 *
 * 5. Health Endpoints:
 *    - Expose /health for external monitoring
 *    - Return structured health data
 *    - Include worker-specific information
 *
 * TESTING:
 *
 * 1. Normal operation:
 *    node 03-health-monitoring.js
 *    curl http://localhost:8000/health
 *
 * 2. Trigger high error rate:
 *    for i in {1..20}; do curl http://localhost:8000/error; done
 *    # Watch worker restart due to error rate
 *
 * 3. Simulate memory leak:
 *    for i in {1..10}; do curl http://localhost:8000/leak; done
 *    # Watch memory grow and worker restart
 *
 * 4. Test heartbeat timeout:
 *    # Find worker PID and send SIGSTOP
 *    kill -STOP <worker_pid>
 *    # Watch master detect timeout and restart worker
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Alert Integration:
 *    - Send alerts when workers restart
 *    - Track restart frequency
 *    - Alert on repeated restarts
 *
 * 2. Metrics Collection:
 *    - Export metrics to monitoring system
 *    - Track trends over time
 *    - Set up dashboards
 *
 * 3. Configurable Thresholds:
 *    - Make thresholds configurable
 *    - Different thresholds for different environments
 *    - Adjust based on load patterns
 *
 * 4. Circuit Breaker:
 *    - Stop restarting after N failures
 *    - Prevent restart loops
 *    - Alert human operators
 */

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
