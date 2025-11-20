/**
 * Example 2: Zero-Downtime Rolling Restart
 *
 * This example demonstrates how to perform rolling restarts to deploy
 * updates without any downtime. The pattern:
 * 1. Start new worker with updated code
 * 2. Wait for new worker to be ready
 * 3. Gracefully shutdown one old worker
 * 4. Repeat until all workers are updated
 *
 * Key Concepts:
 * - Zero-downtime deployments
 * - Worker replacement strategy
 * - State management during restart
 * - Restart coordination
 * - Version tracking
 *
 * Run this: node 02-rolling-restart.js
 * Trigger restart: kill -SIGUSR2 <master_pid>
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const SHUTDOWN_TIMEOUT = 10000;
const numCPUs = Math.min(os.cpus().length, 4); // Limit to 4 for demo

// Version tracking (in production, this would come from package.json or env var)
let currentVersion = process.env.APP_VERSION || '1.0.0';

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting cluster`);
  console.log(`[Master] Application version: ${currentVersion}`);
  console.log(`[Master] Number of workers: ${numCPUs}\n`);

  // Track workers with metadata
  const workers = new Map();
  let isRestarting = false;
  let restartQueue = [];

  /**
   * Fork a new worker
   */
  function forkWorker(version = currentVersion) {
    const worker = cluster.fork({
      WORKER_VERSION: version,
      WORKER_START_TIME: Date.now()
    });

    workers.set(worker.id, {
      worker,
      version,
      startTime: Date.now(),
      ready: false,
      shuttingDown: false,
      requestCount: 0
    });

    console.log(`[Master] Forked worker ${worker.id} (PID ${worker.process.pid}, v${version})`);

    // Listen for worker ready message
    worker.on('message', (msg) => {
      const workerInfo = workers.get(worker.id);
      if (!workerInfo) return;

      switch (msg.type) {
        case 'ready':
          workerInfo.ready = true;
          console.log(`[Master] Worker ${worker.id} is ready`);
          break;

        case 'request-handled':
          workerInfo.requestCount++;
          break;

        case 'shutdown-complete':
          console.log(`[Master] Worker ${worker.id} shutdown complete`);
          break;
      }
    });

    return worker;
  }

  /**
   * Initial worker setup
   */
  for (let i = 0; i < numCPUs; i++) {
    forkWorker();
  }

  /**
   * Handle worker exits
   */
  cluster.on('exit', (worker, code, signal) => {
    const workerInfo = workers.get(worker.id);

    console.log(`[Master] Worker ${worker.id} exited (code: ${code}, signal: ${signal})`);

    if (workerInfo) {
      console.log(`[Master] Worker ${worker.id} handled ${workerInfo.requestCount} requests`);
      workers.delete(worker.id);

      // If not a planned shutdown, restart the worker
      if (!workerInfo.shuttingDown && !isRestarting) {
        console.log(`[Master] Unexpected exit, restarting worker`);
        forkWorker();
      }
    }

    // If this was part of rolling restart, continue
    if (isRestarting && restartQueue.length > 0) {
      const nextWorkerId = restartQueue.shift();
      setTimeout(() => restartWorker(nextWorkerId), 1000);
    } else if (isRestarting && restartQueue.length === 0) {
      console.log(`\n[Master] ✓ Rolling restart complete!`);
      console.log(`[Master] All workers updated to version ${currentVersion}\n`);
      isRestarting = false;
    }
  });

  /**
   * Gracefully restart a single worker
   */
  function restartWorker(workerId) {
    const workerInfo = workers.get(workerId);
    if (!workerInfo) {
      console.log(`[Master] Worker ${workerId} not found`);
      return;
    }

    console.log(`[Master] Restarting worker ${workerId}...`);

    // 1. Fork new worker first
    const newWorker = forkWorker(currentVersion);

    // 2. Wait for new worker to be ready
    const readyCheck = setInterval(() => {
      const newWorkerInfo = workers.get(newWorker.id);

      if (newWorkerInfo && newWorkerInfo.ready) {
        clearInterval(readyCheck);

        console.log(`[Master] New worker ${newWorker.id} ready, shutting down old worker ${workerId}`);

        // 3. Gracefully shutdown old worker
        workerInfo.shuttingDown = true;
        workerInfo.worker.send({ type: 'shutdown' });

        // 4. Force kill if doesn't exit gracefully
        setTimeout(() => {
          if (workers.has(workerId)) {
            console.log(`[Master] Force killing worker ${workerId}`);
            workerInfo.worker.kill('SIGKILL');
          }
        }, SHUTDOWN_TIMEOUT);
      }
    }, 100);

    // Safety timeout for ready check
    setTimeout(() => {
      clearInterval(readyCheck);
    }, SHUTDOWN_TIMEOUT);
  }

  /**
   * Perform rolling restart of all workers
   */
  function rollingRestart(newVersion) {
    if (isRestarting) {
      console.log(`[Master] Rolling restart already in progress`);
      return;
    }

    console.log(`\n[Master] ========================================`);
    console.log(`[Master] Starting rolling restart`);
    console.log(`[Master] Current version: ${currentVersion}`);
    console.log(`[Master] New version: ${newVersion}`);
    console.log(`[Master] ========================================\n`);

    currentVersion = newVersion;
    isRestarting = true;

    // Build queue of workers to restart
    restartQueue = Array.from(workers.keys());

    console.log(`[Master] Will restart ${restartQueue.length} workers`);
    console.log(`[Master] Restart order: ${restartQueue.join(', ')}\n`);

    // Start with first worker
    const firstWorkerId = restartQueue.shift();
    restartWorker(firstWorkerId);
  }

  /**
   * Signal handlers
   */

  // SIGUSR2: Trigger rolling restart
  process.on('SIGUSR2', () => {
    const newVersion = `${parseFloat(currentVersion) + 0.1}`;
    rollingRestart(newVersion);
  });

  // SIGTERM/SIGINT: Graceful shutdown all workers
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    console.log(`\n[Master] Received shutdown signal`);
    console.log(`[Master] Shutting down all workers...\n`);

    workers.forEach((info) => {
      info.shuttingDown = true;
      info.worker.send({ type: 'shutdown' });
    });

    setTimeout(() => {
      console.log(`[Master] Shutdown complete`);
      process.exit(0);
    }, SHUTDOWN_TIMEOUT + 1000);
  }

  // Status reporting
  setInterval(() => {
    const workerStats = Array.from(workers.values()).map(w => ({
      id: w.worker.id,
      version: w.version,
      requests: w.requestCount,
      ready: w.ready
    }));

    console.log(`[Master] Status: ${workerStats.map(w =>
      `W${w.id}(v${w.version},${w.requests}req,${w.ready ? 'ready' : 'starting'})`
    ).join(' | ')}`);
  }, 10000);

  console.log(`[Master] Cluster ready`);
  console.log(`[Master] Send SIGUSR2 to trigger rolling restart: kill -SIGUSR2 ${process.pid}`);
  console.log(`[Master] Press Ctrl+C for graceful shutdown\n`);

} else {
  // === WORKER PROCESS ===

  const workerVersion = process.env.WORKER_VERSION || '1.0.0';
  const startTime = parseInt(process.env.WORKER_START_TIME) || Date.now();

  let isShuttingDown = false;
  let requestCount = 0;
  const connections = new Set();

  /**
   * Create HTTP server
   */
  const server = http.createServer((req, res) => {
    if (isShuttingDown) {
      res.writeHead(503, { 'Connection': 'close' });
      res.end('Service Unavailable\n');
      return;
    }

    requestCount++;
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    console.log(`[Worker ${cluster.worker.id}] Handling request #${requestCount}`);

    // Simulate some work
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        worker: cluster.worker.id,
        pid: process.pid,
        version: workerVersion,
        requestNumber: requestCount,
        uptime: `${uptime}s`,
        timestamp: new Date().toISOString()
      }, null, 2) + '\n');

      // Notify master
      if (process.send) {
        process.send({ type: 'request-handled' });
      }
    }, 100);
  });

  /**
   * Track connections
   */
  server.on('connection', (socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  /**
   * Graceful shutdown
   */
  function gracefulShutdown() {
    if (isShuttingDown) return;

    isShuttingDown = true;
    console.log(`[Worker ${cluster.worker.id}] Starting graceful shutdown (handled ${requestCount} requests)`);

    server.close(() => {
      console.log(`[Worker ${cluster.worker.id}] Server closed`);

      if (process.send) {
        process.send({ type: 'shutdown-complete' });
      }

      process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
      console.log(`[Worker ${cluster.worker.id}] Forcing shutdown`);
      connections.forEach(socket => socket.destroy());
      process.exit(0);
    }, SHUTDOWN_TIMEOUT);
  }

  // Listen for shutdown message
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      gracefulShutdown();
    }
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id}] Listening on port ${PORT} (v${workerVersion})`);

    // Notify master that we're ready
    setTimeout(() => {
      if (process.send) {
        process.send({ type: 'ready' });
      }
    }, 500); // Simulate initialization time
  });
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Rolling Restart Strategy:
 *    - Always start new worker BEFORE killing old one
 *    - Wait for new worker to be ready
 *    - Ensure overlap period for zero downtime
 *    - Process workers one at a time
 *
 * 2. Version Tracking:
 *    - Track version for each worker
 *    - Pass version via environment variables
 *    - Log version changes for audit trail
 *
 * 3. Worker Readiness:
 *    - New workers must signal when ready
 *    - Wait for ready signal before proceeding
 *    - Don't assume immediate readiness
 *
 * 4. State Management:
 *    - Track restart progress
 *    - Use flags to prevent concurrent restarts
 *    - Queue workers for sequential restart
 *
 * 5. Safety Mechanisms:
 *    - Timeouts for all async operations
 *    - Force kill if graceful shutdown fails
 *    - Prevent restart during active restart
 *
 * TESTING:
 *
 * 1. Normal operation:
 *    node 02-rolling-restart.js
 *    # In another terminal:
 *    watch -n 0.5 'curl -s http://localhost:8000 | grep version'
 *
 * 2. Trigger rolling restart:
 *    # Get master PID
 *    ps aux | grep "02-rolling-restart"
 *    # Send SIGUSR2
 *    kill -SIGUSR2 <master_pid>
 *    # Observe version changes without dropped requests
 *
 * 3. Load testing during restart:
 *    # Terminal 1: Start server
 *    node 02-rolling-restart.js
 *    # Terminal 2: Generate load
 *    while true; do curl -s http://localhost:8000; sleep 0.1; done
 *    # Terminal 3: Trigger restart
 *    kill -SIGUSR2 <master_pid>
 *    # Observe: No failed requests!
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Health Checks:
 *    - Implement proper health check endpoint
 *    - Include readiness vs liveness checks
 *    - Verify all dependencies before signaling ready
 *
 * 2. Deployment Integration:
 *    - Integrate with CI/CD pipeline
 *    - Automate version management
 *    - Add pre-deployment validation
 *
 * 3. Monitoring:
 *    - Track restart duration
 *    - Monitor error rates during restart
 *    - Alert on failed restarts
 *
 * 4. Rollback Strategy:
 *    - Keep ability to rollback to previous version
 *    - Test rollback procedure regularly
 *    - Automate rollback on error threshold
 */
