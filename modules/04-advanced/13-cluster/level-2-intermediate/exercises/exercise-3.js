/**
 * Exercise 3: Create Health Monitoring with Heartbeats
 *
 * Objective:
 * Build a comprehensive health monitoring system that tracks worker health
 * using heartbeats and automatically restarts unhealthy workers.
 *
 * Requirements:
 * 1. Create a cluster with 3 workers
 * 2. Workers send heartbeat every 3 seconds with metrics:
 *    - Memory usage
 *    - Request count
 *    - Error count
 *    - Uptime
 * 3. Master monitors heartbeats (timeout: 10 seconds)
 * 4. Master checks health based on:
 *    - Heartbeat timeout
 *    - High memory usage (> 100MB)
 *    - High error rate (> 20%)
 * 5. Automatically restart unhealthy workers
 * 6. Print health report every 15 seconds
 *
 * HTTP Endpoints:
 * - GET / - Normal response (track in request count)
 * - GET /health - Worker health status
 * - GET /error - Simulate error (increment error count)
 * - GET /leak - Simulate memory leak
 *
 * Expected Behavior:
 * - Workers send regular heartbeats
 * - Master detects missed heartbeats
 * - Master detects high memory/errors
 * - Unhealthy workers are restarted automatically
 * - Health reports show worker status
 *
 * Test:
 * 1. Start: node exercise-3.js
 * 2. Normal: curl http://localhost:8000/
 * 3. Errors: for i in {1..30}; do curl http://localhost:8000/error; done
 * 4. Memory: for i in {1..10}; do curl http://localhost:8000/leak; done
 * 5. Observe automatic restarts
 *
 * Bonus Challenges:
 * 1. Add CPU usage monitoring
 * 2. Implement graduated responses (warn before restart)
 * 3. Add circuit breaker to prevent restart loops
 * 4. Track restart count per worker
 * 5. Export metrics in Prometheus format
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const NUM_WORKERS = 3;
const HEARTBEAT_INTERVAL = 3000; // 3 seconds
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds
const MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
const ERROR_RATE_THRESHOLD = 20; // 20%

if (cluster.isMaster) {
  console.log(`Master ${process.pid} starting health monitoring\n`);

  // TODO: Track worker health
  const workerHealth = new Map();

  // TODO: Fork workers
  // For each worker:
  // - Fork the worker
  // - Initialize health tracking with:
  //   - worker object
  //   - lastHeartbeat: Date.now()
  //   - isHealthy: true
  //   - metrics: {}
  //   - restartCount: 0
  // - Setup message listener

  // TODO: Handle heartbeat messages
  function handleHeartbeat(workerId, heartbeat) {
    // 1. Get worker health info
    // 2. Update lastHeartbeat timestamp
    // 3. Store metrics from heartbeat
    // 4. Check worker health:
    //    - checkHeartbeatTimeout(info)
    //    - checkMemoryUsage(info)
    //    - checkErrorRate(info)
    // 5. If unhealthy, call restartUnhealthyWorker(workerId)
  }

  // TODO: Check heartbeat timeout
  function checkHeartbeatTimeout(info) {
    // Calculate time since last heartbeat
    // If > HEARTBEAT_TIMEOUT:
    //   - Log warning
    //   - Return false (unhealthy)
    // Return true (healthy)
  }

  // TODO: Check memory usage
  function checkMemoryUsage(info) {
    // Get heapUsed from metrics
    // If > MEMORY_THRESHOLD:
    //   - Log warning
    //   - Return false (unhealthy)
    // Return true (healthy)
  }

  // TODO: Check error rate
  function checkErrorRate(info) {
    // Calculate error rate: (errors / requests) * 100
    // If > ERROR_RATE_THRESHOLD and requests > 10:
    //   - Log warning
    //   - Return false (unhealthy)
    // Return true (healthy)
  }

  // TODO: Restart unhealthy worker
  function restartUnhealthyWorker(workerId) {
    // 1. Get worker info
    // 2. Log restart reason
    // 3. Increment restartCount
    // 4. Fork new worker
    // 5. Initialize health tracking for new worker
    // 6. Wait a moment, then kill old worker
    // 7. Clean up old worker from Map
  }

  // TODO: Periodic health check
  // setInterval(() => {
  //   workerHealth.forEach((info, workerId) => {
  //     checkHeartbeatTimeout(info);
  //     checkMemoryUsage(info);
  //     checkErrorRate(info);
  //   });
  // }, HEARTBEAT_INTERVAL);

  // TODO: Print health report
  // setInterval(() => {
  //   printHealthReport();
  // }, 15000);

  function printHealthReport() {
    // Print formatted health report:
    // - Timestamp
    // - For each worker:
    //   - Worker ID, PID
    //   - Health status
    //   - Memory usage
    //   - Request count, error count, error rate
    //   - Uptime
    //   - Restart count
  }

  // TODO: Handle worker exits
  // cluster.on('exit', (worker, code, signal) => {
  //   - Log exit
  //   - Remove from workerHealth
  // })

  console.log('Health monitoring active');
  console.log(`Heartbeat interval: ${HEARTBEAT_INTERVAL}ms`);
  console.log(`Heartbeat timeout: ${HEARTBEAT_TIMEOUT}ms`);
  console.log(`Memory threshold: ${MEMORY_THRESHOLD / 1024 / 1024}MB\n`);

} else {
  // === WORKER PROCESS ===

  // TODO: Initialize worker metrics
  let requestCount = 0;
  let errorCount = 0;
  const memoryLeaks = []; // For simulating memory leak

  // TODO: Create HTTP server
  const server = http.createServer((req, res) => {
    requestCount++;

    if (req.url === '/health') {
      // Return worker health info
      // - worker ID, PID
      // - uptime
      // - memory usage
      // - request count, error count
    } else if (req.url === '/error') {
      // Simulate error
      // - Increment errorCount
      // - Return 500 status
    } else if (req.url === '/leak') {
      // Simulate memory leak
      // - Create large array: new Array(1000000).fill('x')
      // - Store in memoryLeaks array
      // - Return success
    } else {
      // Normal request
      // - Return worker info
    }
  });

  // TODO: Send heartbeat periodically
  // setInterval(() => {
  //   if (process.send) {
  //     process.send({
  //       type: 'heartbeat',
  //       metrics: {
  //         memory: process.memoryUsage().heapUsed,
  //         requestCount,
  //         errorCount,
  //         uptime: process.uptime()
  //       }
  //     });
  //   }
  // }, HEARTBEAT_INTERVAL);

  // TODO: Start server
  // server.listen(PORT, () => {
  //   console.log(`Worker ${cluster.worker.id} started (PID ${process.pid})`);
  // });
}

/**
 * HINTS:
 *
 * Format Memory:
 * ```javascript
 * function formatBytes(bytes) {
 *   return (bytes / 1024 / 1024).toFixed(2) + 'MB';
 * }
 * ```
 *
 * Calculate Error Rate:
 * ```javascript
 * const errorRate = requestCount > 0
 *   ? (errorCount / requestCount) * 100
 *   : 0;
 * ```
 *
 * Health Check Logic:
 * ```javascript
 * const isHealthy =
 *   checkHeartbeatTimeout(info) &&
 *   checkMemoryUsage(info) &&
 *   checkErrorRate(info);
 *
 * if (!isHealthy) {
 *   restartUnhealthyWorker(workerId);
 * }
 * ```
 */

/**
 * TESTING:
 *
 * 1. Normal operation:
 *    node exercise-3.js
 *    # Make normal requests
 *    for i in {1..20}; do curl http://localhost:8000/; done
 *    # Check health report - all workers healthy
 *
 * 2. Trigger high error rate:
 *    # Make many error requests
 *    for i in {1..30}; do curl http://localhost:8000/error; done
 *    # Watch logs - worker should be restarted due to high error rate
 *
 * 3. Trigger memory issue:
 *    # Cause memory leak
 *    for i in {1..15}; do curl http://localhost:8000/leak; done
 *    # Watch logs - worker should be restarted due to high memory
 *
 * 4. Test heartbeat timeout:
 *    # Find a worker PID
 *    ps aux | grep "exercise-3"
 *    # Suspend the process (simulate hang)
 *    kill -STOP <worker_pid>
 *    # Wait 10+ seconds
 *    # Master should detect timeout and restart worker
 *    # Resume to clean up: kill -CONT <worker_pid>
 *
 * 5. Health report:
 *    # Watch health reports every 15 seconds
 *    # Should show:
 *    # - Worker IDs and PIDs
 *    # - Health status
 *    # - Metrics
 *    # - Restart counts
 */

/**
 * VALIDATION:
 *
 * Your solution should:
 * ✓ Start 3 workers sending heartbeats
 * ✓ Detect heartbeat timeouts (10s)
 * ✓ Detect high memory usage (>100MB)
 * ✓ Detect high error rate (>20%)
 * ✓ Automatically restart unhealthy workers
 * ✓ Print health reports every 15s
 * ✓ Handle /health, /error, /leak endpoints
 * ✓ Track restart counts
 */
