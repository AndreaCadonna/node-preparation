/**
 * Exercise 4 Solution: Build a Clustered Web Server
 *
 * This solution demonstrates:
 * - Creating a clustered HTTP server
 * - Load distribution across workers
 * - Shared port binding
 * - Request handling in workers
 * - Production-ready web server clustering
 *
 * Key Concepts Explained:
 * - All workers listen on the same port
 * - OS/Node.js handles load distribution
 * - Each worker has its own request counter
 * - Master manages worker lifecycle
 * - Automatic restart on worker failure
 */

const cluster = require('cluster');
const http = require('http');

// Configuration
const PORT = 3000;
const NUM_WORKERS = 4;

if (cluster.isMaster) {
  // === MASTER PROCESS ===

  console.log(`Master ${process.pid} is running`);
  console.log(`Starting ${NUM_WORKERS} workers...\n`);

  /*
   * Master Process Responsibilities:
   * 1. Fork worker processes
   * 2. Monitor worker health
   * 3. Restart failed workers
   * 4. Handle graceful shutdown
   * 5. Coordinate cluster lifecycle
   *
   * Master does NOT:
   * - Handle HTTP requests
   * - Process application logic
   * - Maintain application state
   */

  // Fork the specified number of workers
  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  /*
   * The 'listening' event fires when a worker calls server.listen()
   * This is useful for knowing when the cluster is fully ready
   */
  cluster.on('listening', (worker, address) => {
    console.log(
      `Worker ${worker.id} (PID: ${worker.process.pid}) is listening on ` +
      `${address.address}:${address.port}`
    );
  });

  /*
   * Handle worker exits and implement automatic restart
   * This ensures the cluster maintains the desired number of workers
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(
      `\nWorker ${worker.id} (PID: ${worker.process.pid}) died ` +
      `(code: ${code}, signal: ${signal})`
    );

    // Determine if we should restart
    if (!worker.exitedAfterDisconnect) {
      // Worker crashed unexpectedly - restart it
      console.log('Starting a new worker to replace the crashed one...');
      const newWorker = cluster.fork();
      console.log(`New worker ${newWorker.id} started\n`);
    } else {
      // Worker exited intentionally (e.g., during graceful shutdown)
      console.log('Worker exited intentionally, not restarting\n');
    }
  });

  /*
   * The 'online' event fires when a worker is running
   * This happens after fork but before the worker is ready to serve requests
   */
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.id} is online`);
  });

  // Display ready message when all workers are listening
  let listenCount = 0;
  cluster.on('listening', () => {
    listenCount++;
    if (listenCount === NUM_WORKERS) {
      console.log(`\n✅ Cluster is ready! All ${NUM_WORKERS} workers are listening`);
      console.log(`🌐 Server is running at http://localhost:${PORT}`);
      console.log(`\nTest with: curl http://localhost:${PORT}`);
      console.log(`Load test: for i in {1..10}; do curl http://localhost:${PORT}; done\n`);
    }
  });

  /*
   * Graceful Shutdown
   * Handle SIGTERM (e.g., from process managers or Ctrl+C)
   */
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    console.log('\n\nReceived shutdown signal. Gracefully shutting down...');

    // Disconnect all workers (allows them to finish current requests)
    for (const id in cluster.workers) {
      cluster.workers[id].disconnect();
    }

    // Force exit after timeout if workers don't exit gracefully
    setTimeout(() => {
      console.log('Forcing shutdown...');
      process.exit(0);
    }, 10000); // 10 second grace period
  }

} else {
  // === WORKER PROCESS ===

  console.log(`Worker ${cluster.worker.id} starting (PID: ${process.pid})...`);

  /*
   * Each worker maintains its own request counter
   * This demonstrates that workers have separate memory spaces
   * Workers cannot directly share variables
   */
  let requestCount = 0;

  /*
   * Create HTTP server
   * Each worker creates its own server instance
   * All workers listen on the SAME port (3000)
   *
   * How does this work?
   * - The cluster module uses SO_REUSEADDR socket option
   * - Multiple processes can bind to the same port
   * - The master process distributes incoming connections
   * - This provides automatic load balancing
   */
  const server = http.createServer((req, res) => {
    // Increment this worker's request counter
    requestCount++;

    /*
     * Prepare response data
     * Show which worker handled the request
     * Include worker's request count
     */
    const responseData = {
      message: 'Hello from clustered server!',
      worker: {
        id: cluster.worker.id,
        pid: process.pid
      },
      request: {
        number: requestCount,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };

    // Log request handling
    console.log(
      `Worker ${cluster.worker.id}: Handled request #${requestCount} - ${req.method} ${req.url}`
    );

    // Send response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseData, null, 2));

    /*
     * Load Distribution:
     * - By making multiple requests, you'll see different workers responding
     * - Distribution is typically round-robin or random
     * - This allows horizontal scaling
     */
  });

  /*
   * Start listening on the port
   * All workers listen on the same port
   * The cluster module handles the "magic" of sharing the port
   */
  server.listen(PORT, () => {
    console.log(`Worker ${cluster.worker.id}: Server listening on port ${PORT}`);
  });

  /*
   * Handle errors
   * Prevent worker from crashing on unhandled errors
   */
  server.on('error', (err) => {
    console.error(`Worker ${cluster.worker.id}: Server error:`, err);
    // In production, you might want to exit and let master restart
    // process.exit(1);
  });

  /*
   * Graceful shutdown for workers
   * When master sends disconnect signal
   */
  process.on('disconnect', () => {
    console.log(`Worker ${cluster.worker.id}: Disconnect signal received`);

    // Stop accepting new connections
    server.close(() => {
      console.log(`Worker ${cluster.worker.id}: Server closed, exiting`);
      process.exit(0);
    });

    // Force exit if server doesn't close in time
    setTimeout(() => {
      console.log(`Worker ${cluster.worker.id}: Forcing exit`);
      process.exit(0);
    }, 5000);
  });

  /*
   * Error handlers to prevent worker crashes
   */
  process.on('uncaughtException', (err) => {
    console.error(`Worker ${cluster.worker.id}: Uncaught exception:`, err);
    // Log error and exit - master will restart
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(`Worker ${cluster.worker.id}: Unhandled rejection:`, reason);
    // Log error and exit - master will restart
    process.exit(1);
  });
}

/**
 * BONUS CHALLENGE SOLUTIONS
 */

/*
// Bonus 1: Add /stats endpoint with detailed worker information

const cluster = require('cluster');
const http = require('http');

const PORT = 3000;
const NUM_WORKERS = 4;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.id} died. Restarting...`);
    cluster.fork();
  });

} else {
  let requestCount = 0;
  const startTime = Date.now();

  const server = http.createServer((req, res) => {
    requestCount++;

    // Route handling
    if (req.url === '/stats') {
      // Detailed stats endpoint
      const stats = {
        worker: {
          id: cluster.worker.id,
          pid: process.pid,
          uptime: Math.floor(process.uptime()),
          uptimeFormatted: formatUptime(process.uptime())
        },
        requests: {
          total: requestCount,
          perSecond: (requestCount / process.uptime()).toFixed(2)
        },
        memory: {
          heapUsed: formatBytes(process.memoryUsage().heapUsed),
          heapTotal: formatBytes(process.memoryUsage().heapTotal),
          rss: formatBytes(process.memoryUsage().rss),
          external: formatBytes(process.memoryUsage().external)
        },
        timestamp: new Date().toISOString()
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats, null, 2));

    } else {
      // Regular endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Hello!',
        worker: cluster.worker.id,
        request: requestCount
      }));
    }

    console.log(`Worker ${cluster.worker.id}: ${req.method} ${req.url}`);
  });

  server.listen(PORT);

  function formatBytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  }
}
*/

/*
// Bonus 2: Add /crash endpoint to test automatic restart

const cluster = require('cluster');
const http = require('http');

const PORT = 3000;
const NUM_WORKERS = 4;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.id} died. Starting replacement...`);
    cluster.fork();
  });

} else {
  let requestCount = 0;

  const server = http.createServer((req, res) => {
    requestCount++;

    if (req.url === '/crash') {
      // Endpoint to deliberately crash the worker
      console.log(`Worker ${cluster.worker.id}: Crash requested, exiting...`);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Worker ${cluster.worker.id} is crashing... Master will restart it.\n`);

      // Exit after sending response
      setTimeout(() => {
        process.exit(1);
      }, 100);

    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Server is running',
        worker: cluster.worker.id,
        pid: process.pid,
        requests: requestCount
      }));
    }
  });

  server.listen(PORT);
  console.log(`Worker ${cluster.worker.id} listening on ${PORT}`);
}

// Test: curl http://localhost:3000/crash
// You'll see the worker crash and master restart it
*/

/*
// Bonus 3: Collect total request count using IPC

const cluster = require('cluster');
const http = require('http');

const PORT = 3000;
const NUM_WORKERS = 4;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Track total requests across all workers
  let totalRequests = 0;
  const workerRequests = {};

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  // Listen for messages from workers
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'requestCount') {
      workerRequests[worker.id] = msg.count;
      totalRequests = Object.values(workerRequests).reduce((a, b) => a + b, 0);

      console.log(`Total requests across all workers: ${totalRequests}`);
    }
  });

  cluster.on('exit', (worker, code, signal) => {
    delete workerRequests[worker.id];
    console.log(`Worker ${worker.id} died. Restarting...`);
    cluster.fork();
  });

  // Display stats periodically
  setInterval(() => {
    console.log('\n=== Cluster Stats ===');
    console.log(`Total Requests: ${totalRequests}`);
    console.log('Per Worker:');
    for (const [id, count] of Object.entries(workerRequests)) {
      console.log(`  Worker ${id}: ${count} requests`);
    }
    console.log('');
  }, 10000);

} else {
  let requestCount = 0;

  const server = http.createServer((req, res) => {
    requestCount++;

    // Send count to master
    process.send({
      type: 'requestCount',
      count: requestCount
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      worker: cluster.worker.id,
      requests: requestCount
    }));
  });

  server.listen(PORT);
  console.log(`Worker ${cluster.worker.id} listening`);
}
*/

/**
 * LEARNING POINTS
 *
 * 1. Port Sharing:
 *    - All workers can listen on the same port
 *    - Cluster module uses SO_REUSEADDR
 *    - Master distributes connections to workers
 *    - No manual load balancing needed
 *
 * 2. Load Distribution:
 *    - Automatic distribution across workers
 *    - Typically round-robin or random
 *    - Can be uneven with keep-alive connections
 *    - External load balancers provide more control
 *
 * 3. Worker Independence:
 *    - Each worker has separate memory space
 *    - Request counters are per-worker
 *    - Shared state requires external storage
 *    - Workers don't communicate directly (use IPC or external store)
 *
 * 4. High Availability:
 *    - Failed workers are automatically restarted
 *    - Other workers continue serving requests
 *    - No downtime during worker restart
 *    - Cluster maintains service availability
 *
 * 5. Scalability:
 *    - Utilize multiple CPU cores
 *    - Handle more concurrent connections
 *    - Better performance under load
 *    - Horizontal scaling on single machine
 */

/**
 * PRODUCTION BEST PRACTICES
 *
 * 1. Worker Count:
 *    ✅ Match CPU core count for CPU-bound tasks
 *    ✅ Can exceed for I/O-bound tasks
 *    ✅ Monitor and adjust based on metrics
 *    ✅ Consider using os.cpus().length
 *
 * 2. Error Handling:
 *    ✅ Catch uncaught exceptions
 *    ✅ Handle unhandled rejections
 *    ✅ Implement request timeouts
 *    ✅ Log all errors
 *
 * 3. Graceful Shutdown:
 *    ✅ Handle SIGTERM/SIGINT
 *    ✅ Close server before exit
 *    ✅ Finish in-flight requests
 *    ✅ Set shutdown timeout
 *
 * 4. Health Checks:
 *    ✅ Implement /health endpoint
 *    ✅ Monitor worker health
 *    ✅ Report to load balancer
 *    ✅ Include dependency checks
 *
 * 5. Monitoring:
 *    ✅ Track requests per worker
 *    ✅ Monitor memory usage
 *    ✅ Log response times
 *    ✅ Alert on anomalies
 *
 * 6. State Management:
 *    ✅ Use Redis for shared sessions
 *    ✅ Use database for persistent data
 *    ✅ Avoid in-memory state
 *    ✅ Design stateless workers when possible
 */
