/**
 * Example 1: Graceful Shutdown Implementation
 *
 * This example demonstrates how to implement graceful shutdown in a clustered
 * application. Graceful shutdown ensures:
 * - Existing requests complete before shutdown
 * - No new requests are accepted during shutdown
 * - Resources are cleaned up properly
 * - Controlled and predictable shutdown process
 *
 * Key Concepts:
 * - Connection draining
 * - Shutdown timeouts
 * - Signal handling (SIGTERM, SIGINT)
 * - Worker cleanup
 * - Resource management
 *
 * Run this: node 01-graceful-shutdown.js
 * Test: curl http://localhost:8000/slow (in another terminal)
 *        Then Ctrl+C and watch graceful shutdown
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds max wait for connections to close
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting cluster with ${numCPUs} workers`);

  // Track workers for coordinated shutdown
  const workers = new Map();

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    forkWorker();
  }

  function forkWorker() {
    const worker = cluster.fork();
    workers.set(worker.id, {
      worker,
      shuttingDown: false,
      startTime: Date.now()
    });

    console.log(`[Master] Worker ${worker.id} (PID ${worker.process.pid}) started`);

    // Listen for worker messages
    worker.on('message', (msg) => {
      if (msg.type === 'shutdown-complete') {
        console.log(`[Master] Worker ${worker.id} completed graceful shutdown`);
        workers.delete(worker.id);
      }
    });
  }

  // Handle cluster exit events
  cluster.on('exit', (worker, code, signal) => {
    const workerInfo = workers.get(worker.id);

    if (workerInfo && !workerInfo.shuttingDown) {
      // Worker crashed unexpectedly - restart it
      console.log(`[Master] Worker ${worker.id} died unexpectedly (code: ${code}, signal: ${signal})`);
      console.log(`[Master] Restarting worker...`);
      workers.delete(worker.id);
      forkWorker();
    } else {
      // Worker shutdown gracefully
      console.log(`[Master] Worker ${worker.id} exited cleanly`);
    }
  });

  /**
   * Graceful Master Shutdown
   * This function coordinates shutdown of all workers
   */
  function gracefulShutdown(signal) {
    console.log(`\n[Master] Received ${signal}, initiating graceful shutdown...`);
    console.log(`[Master] Shutting down ${workers.size} workers`);

    // Mark all workers as shutting down
    workers.forEach((info, id) => {
      info.shuttingDown = true;
      info.worker.send({ type: 'shutdown' });
    });

    // Set timeout to force shutdown if workers don't exit gracefully
    const forceShutdownTimer = setTimeout(() => {
      console.log(`[Master] Shutdown timeout reached, forcing exit`);
      workers.forEach((info) => {
        info.worker.kill('SIGKILL');
      });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    // Check if all workers have exited
    const checkInterval = setInterval(() => {
      if (workers.size === 0) {
        clearInterval(checkInterval);
        clearTimeout(forceShutdownTimer);
        console.log(`[Master] All workers shutdown gracefully`);
        console.log(`[Master] Master exiting`);
        process.exit(0);
      }
    }, 100);
  }

  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  console.log(`[Master] Cluster ready. Press Ctrl+C for graceful shutdown\n`);

} else {
  // === WORKER PROCESS ===

  // Track active connections for graceful shutdown
  const connections = new Set();
  let isShuttingDown = false;

  /**
   * Create HTTP server with connection tracking
   */
  const server = http.createServer((req, res) => {
    // Reject new requests during shutdown
    if (isShuttingDown) {
      res.writeHead(503, { 'Connection': 'close' });
      res.end('Service Unavailable - Server is shutting down');
      return;
    }

    console.log(`[Worker ${cluster.worker.id}] Handling ${req.method} ${req.url}`);

    // Simulate different response times
    if (req.url === '/slow') {
      // Slow endpoint - 5 second response
      setTimeout(() => {
        res.writeHead(200);
        res.end(`Slow response from worker ${cluster.worker.id}\n`);
      }, 5000);
    } else if (req.url === '/fast') {
      // Fast endpoint - immediate response
      res.writeHead(200);
      res.end(`Fast response from worker ${cluster.worker.id}\n`);
    } else {
      // Normal endpoint - 1 second response
      setTimeout(() => {
        res.writeHead(200);
        res.end(`Response from worker ${cluster.worker.id}\n`);
      }, 1000);
    }
  });

  /**
   * Track all connections
   * This allows us to properly close them during shutdown
   */
  server.on('connection', (socket) => {
    connections.add(socket);

    socket.on('close', () => {
      connections.delete(socket);
    });
  });

  /**
   * Worker Graceful Shutdown
   * This function handles the worker shutdown process
   */
  function gracefulShutdown() {
    if (isShuttingDown) return; // Prevent multiple shutdown calls

    isShuttingDown = true;
    console.log(`[Worker ${cluster.worker.id}] Starting graceful shutdown...`);
    console.log(`[Worker ${cluster.worker.id}] Active connections: ${connections.size}`);

    // Stop accepting new connections
    server.close(() => {
      console.log(`[Worker ${cluster.worker.id}] Server closed, no longer accepting connections`);

      // Notify master that shutdown is complete
      if (process.send) {
        process.send({ type: 'shutdown-complete' });
      }

      console.log(`[Worker ${cluster.worker.id}] Graceful shutdown complete`);
      process.exit(0);
    });

    // Set timeout to force close connections if they don't close naturally
    setTimeout(() => {
      console.log(`[Worker ${cluster.worker.id}] Shutdown timeout, destroying ${connections.size} active connections`);

      // Destroy all remaining connections
      connections.forEach((socket) => {
        socket.destroy();
      });
    }, SHUTDOWN_TIMEOUT);
  }

  // Listen for shutdown message from master
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      gracefulShutdown();
    }
  });

  // Handle direct signals (if worker receives them)
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Start server
  server.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id}] Server listening on port ${PORT}`);
  });
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Graceful Shutdown Process:
 *    - Stop accepting new connections
 *    - Allow existing requests to complete
 *    - Close resources (database connections, file handles, etc.)
 *    - Exit cleanly
 *
 * 2. Shutdown Timeout:
 *    - Always set a maximum wait time
 *    - Force shutdown if timeout is reached
 *    - Prevents hanging processes
 *
 * 3. Connection Tracking:
 *    - Keep track of all active connections
 *    - Allows monitoring and forced cleanup
 *    - Essential for proper shutdown
 *
 * 4. Signal Handling:
 *    - SIGTERM: Graceful shutdown request (kill, systemd, Docker)
 *    - SIGINT: User interrupt (Ctrl+C)
 *    - Handle both for robustness
 *
 * 5. Master-Worker Coordination:
 *    - Master coordinates shutdown across all workers
 *    - Workers notify master when shutdown complete
 *    - Master waits for all workers before exiting
 *
 * 6. Preventing Race Conditions:
 *    - Check isShuttingDown flag before handling requests
 *    - Prevent multiple shutdown calls with flag
 *    - Return 503 status for new requests during shutdown
 *
 * TESTING:
 *
 * 1. Test graceful shutdown:
 *    - Start server
 *    - Make slow request: curl http://localhost:8000/slow
 *    - Immediately press Ctrl+C
 *    - Observe that request completes before shutdown
 *
 * 2. Test timeout:
 *    - Modify SHUTDOWN_TIMEOUT to 3000 (3 seconds)
 *    - Make slow request (5 seconds)
 *    - Press Ctrl+C
 *    - Observe forced shutdown after 3 seconds
 *
 * 3. Test new request rejection:
 *    - Make slow request
 *    - Press Ctrl+C to start shutdown
 *    - Immediately make another request
 *    - Observe 503 Service Unavailable response
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Health Checks:
 *    - Update load balancer health check to return unhealthy during shutdown
 *    - Prevents new connections from load balancer
 *
 * 2. Database Connections:
 *    - Close database connection pools during shutdown
 *    - Wait for pending queries to complete
 *
 * 3. Logging:
 *    - Log shutdown events for debugging
 *    - Include timing information
 *
 * 4. Metrics:
 *    - Track shutdown duration
 *    - Monitor forced shutdowns
 *    - Alert on timeout events
 */
