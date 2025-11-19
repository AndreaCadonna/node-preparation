/**
 * Exercise 1: Implement Graceful Shutdown with Timeout
 *
 * Objective:
 * Create a clustered HTTP server with proper graceful shutdown that:
 * - Stops accepting new connections on shutdown
 * - Waits for active connections to complete
 * - Forces shutdown after timeout if connections don't close
 * - Tracks and reports active connections
 *
 * Requirements:
 * 1. Create a cluster with 2 workers
 * 2. Each worker runs an HTTP server on port 8000
 * 3. Implement connection tracking
 * 4. Handle SIGTERM/SIGINT for graceful shutdown
 * 5. Reject new requests during shutdown (return 503)
 * 6. Wait up to 10 seconds for connections to close
 * 7. Force close remaining connections after timeout
 * 8. Log shutdown progress
 *
 * Expected Behavior:
 * - Normal operation: All requests succeed
 * - During shutdown:
 *   - Existing requests complete normally
 *   - New requests get 503 response
 *   - Server waits for active connections
 *   - Timeout forces cleanup if needed
 *
 * Test:
 * 1. Start server: node exercise-1.js
 * 2. Make slow request: curl http://localhost:8000/slow
 * 3. Immediately press Ctrl+C
 * 4. Observe graceful shutdown
 *
 * Bonus Challenges:
 * 1. Add shutdown metrics (connections drained, timeout used, etc.)
 * 2. Implement different shutdown timeouts for different signal types
 * 3. Add a /health endpoint that returns unhealthy during shutdown
 * 4. Track and log request completion during shutdown
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds
const NUM_WORKERS = 2;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} starting`);

  // TODO: Track workers with metadata
  const workers = new Map();

  // TODO: Fork NUM_WORKERS workers
  // Store each worker in the workers Map with metadata:
  // - worker: the worker object
  // - shuttingDown: boolean flag
  // - startTime: Date.now()

  // TODO: Handle worker exit events
  // cluster.on('exit', (worker, code, signal) => {
  //   - Log the exit
  //   - Check if it was a graceful shutdown or crash
  //   - Restart worker if it crashed unexpectedly
  // })

  // TODO: Implement coordinated shutdown
  function masterShutdown(signal) {
    // 1. Log shutdown initiation
    // 2. Mark all workers as shutting down
    // 3. Send shutdown message to all workers
    // 4. Set timeout to force kill after SHUTDOWN_TIMEOUT
    // 5. Wait for all workers to exit
    // 6. Exit master process
  }

  // TODO: Register signal handlers
  // process.on('SIGTERM', () => masterShutdown('SIGTERM'));
  // process.on('SIGINT', () => masterShutdown('SIGINT'));

  console.log('Cluster ready. Press Ctrl+C for graceful shutdown');

} else {
  // === WORKER PROCESS ===

  // TODO: Initialize state
  let isShuttingDown = false;
  const connections = new Set();

  // TODO: Create HTTP server
  const server = http.createServer((req, res) => {
    // TODO: Reject requests during shutdown
    // if (isShuttingDown) {
    //   res.writeHead(503, { 'Connection': 'close' });
    //   res.end('Service Unavailable - Server is shutting down\n');
    //   return;
    // }

    // TODO: Handle different endpoints
    if (req.url === '/slow') {
      // Slow endpoint - 5 second response
      // Use setTimeout to simulate slow processing
      // Return response after delay
    } else if (req.url === '/fast') {
      // Fast endpoint - immediate response
    } else {
      // Default endpoint - 1 second response
    }
  });

  // TODO: Track connections
  // server.on('connection', (socket) => {
  //   - Add socket to connections Set
  //   - Remove socket when it closes
  // })

  // TODO: Implement graceful shutdown
  async function workerShutdown() {
    // 1. Check if already shutting down
    // 2. Set isShuttingDown flag
    // 3. Log shutdown start with connection count
    // 4. Stop accepting new connections (server.close())
    // 5. Wait for connections to close naturally
    // 6. Set timeout to force close after SHUTDOWN_TIMEOUT
    // 7. Destroy remaining connections on timeout
    // 8. Send shutdown-complete message to master
    // 9. Exit process
  }

  // TODO: Handle shutdown signals
  // Listen for messages from master
  // process.on('message', (msg) => {
  //   if (msg.type === 'shutdown') {
  //     workerShutdown();
  //   }
  // });

  // Also handle direct signals
  // process.on('SIGTERM', workerShutdown);
  // process.on('SIGINT', workerShutdown);

  // TODO: Start server
  // server.listen(PORT, () => {
  //   console.log(`Worker ${cluster.worker.id} listening on port ${PORT}`);
  // });
}

/**
 * HINTS:
 *
 * Connection Tracking:
 * ```javascript
 * const connections = new Set();
 * server.on('connection', (socket) => {
 *   connections.add(socket);
 *   socket.on('close', () => connections.delete(socket));
 * });
 * ```
 *
 * Waiting for Connections:
 * ```javascript
 * server.close(() => {
 *   console.log('Server closed');
 * });
 *
 * const checkInterval = setInterval(() => {
 *   if (connections.size === 0) {
 *     clearInterval(checkInterval);
 *     // All connections closed
 *   }
 * }, 100);
 * ```
 *
 * Force Close Connections:
 * ```javascript
 * connections.forEach((socket) => {
 *   socket.destroy();
 * });
 * ```
 */

/**
 * TESTING:
 *
 * 1. Basic shutdown:
 *    node exercise-1.js
 *    # Wait a moment, then Ctrl+C
 *    # Should shutdown gracefully
 *
 * 2. Shutdown with active connection:
 *    # Terminal 1:
 *    node exercise-1.js
 *
 *    # Terminal 2:
 *    curl http://localhost:8000/slow &
 *    # Immediately switch to Terminal 1 and press Ctrl+C
 *    # Observe: Request completes before shutdown
 *
 * 3. Shutdown timeout:
 *    # Modify SHUTDOWN_TIMEOUT to 3000 (3 seconds)
 *    # Make slow request (5 seconds)
 *    # Shutdown should force close after 3 seconds
 *
 * 4. New request rejection:
 *    # Terminal 1:
 *    node exercise-1.js
 *
 *    # Terminal 2:
 *    curl http://localhost:8000/slow &
 *    # Immediately:
 *    curl http://localhost:8000/fast
 *    # Second request should get 503
 */
