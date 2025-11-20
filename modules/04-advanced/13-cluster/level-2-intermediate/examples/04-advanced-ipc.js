/**
 * Example 4: Advanced Inter-Process Communication (IPC)
 *
 * This example demonstrates advanced IPC patterns in clustered applications:
 * - Request-response pattern
 * - Message broadcasting
 * - Message queuing
 * - Worker-to-worker communication via master
 * - Structured message protocols
 *
 * Key Concepts:
 * - Request-response with timeouts
 * - Message correlation IDs
 * - Broadcasting patterns
 * - Worker coordination
 * - Message routing
 *
 * Run this: node 04-advanced-ipc.js
 * Test: curl http://localhost:8000/stats
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// Configuration
const PORT = 8000;
const REQUEST_TIMEOUT = 5000;
const numCPUs = Math.min(os.cpus().length, 4);

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting cluster with advanced IPC\n`);

  // Pending requests awaiting responses
  const pendingRequests = new Map();

  /**
   * Message router - routes messages to appropriate handlers
   */
  class MessageRouter {
    constructor() {
      this.handlers = new Map();
    }

    /**
     * Register a message handler
     */
    on(type, handler) {
      this.handlers.set(type, handler);
    }

    /**
     * Route incoming message
     */
    route(workerId, message) {
      const handler = this.handlers.get(message.type);
      if (handler) {
        handler(workerId, message);
      } else {
        console.log(`[Master] Unknown message type: ${message.type}`);
      }
    }
  }

  const router = new MessageRouter();

  /**
   * Request-Response Pattern Helper
   * Sends a request to a worker and waits for response
   */
  function sendRequest(workerId, type, data, timeout = REQUEST_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const worker = cluster.workers[workerId];

      if (!worker) {
        reject(new Error(`Worker ${workerId} not found`));
        return;
      }

      // Set up timeout
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error(`Request timeout for ${type}`));
      }, timeout);

      // Store pending request
      pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timer);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        timestamp: Date.now()
      });

      // Send request
      worker.send({
        type,
        requestId,
        data
      });

      console.log(`[Master] Sent request ${requestId} (${type}) to worker ${workerId}`);
    });
  }

  /**
   * Broadcast message to all workers
   */
  function broadcast(type, data) {
    const workerIds = Object.keys(cluster.workers);
    console.log(`[Master] Broadcasting ${type} to ${workerIds.length} workers`);

    workerIds.forEach(id => {
      cluster.workers[id].send({
        type,
        data,
        broadcast: true
      });
    });
  }

  /**
   * Send message to specific worker
   */
  function sendToWorker(workerId, type, data) {
    const worker = cluster.workers[workerId];
    if (worker) {
      worker.send({ type, data });
      console.log(`[Master] Sent ${type} to worker ${workerId}`);
    }
  }

  /**
   * Route message between workers
   */
  function routeWorkerMessage(fromWorkerId, toWorkerId, type, data) {
    const toWorker = cluster.workers[toWorkerId];
    if (toWorker) {
      toWorker.send({
        type,
        data,
        fromWorker: fromWorkerId
      });
      console.log(`[Master] Routed ${type} from worker ${fromWorkerId} to worker ${toWorkerId}`);
    }
  }

  /**
   * Register message handlers
   */

  // Handle response to a request
  router.on('response', (workerId, message) => {
    const { requestId, data, error } = message;
    const pending = pendingRequests.get(requestId);

    if (pending) {
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(data);
      }
      pendingRequests.delete(requestId);
      console.log(`[Master] Received response for request ${requestId}`);
    }
  });

  // Handle stats request
  router.on('stats-request', async (workerId, message) => {
    const { requestId } = message;

    try {
      // Gather stats from all workers
      const workerIds = Object.keys(cluster.workers);
      const statsPromises = workerIds.map(id =>
        sendRequest(parseInt(id), 'get-stats', {})
      );

      const allStats = await Promise.all(statsPromises);

      // Send aggregated stats back to requesting worker
      sendToWorker(workerId, 'response', {
        requestId,
        data: {
          workers: allStats,
          total: {
            workers: workerIds.length,
            totalRequests: allStats.reduce((sum, s) => sum + s.requestCount, 0),
            totalMemory: allStats.reduce((sum, s) => sum + s.memoryUsage, 0)
          }
        }
      });
    } catch (error) {
      sendToWorker(workerId, 'response', {
        requestId,
        error: error.message
      });
    }
  });

  // Handle worker stats response
  router.on('stats-response', (workerId, message) => {
    router.route(workerId, { ...message, type: 'response' });
  });

  // Handle worker-to-worker message
  router.on('worker-message', (fromWorkerId, message) => {
    const { toWorker, data } = message;
    routeWorkerMessage(fromWorkerId, toWorker, 'worker-message', {
      ...data,
      fromWorker: fromWorkerId
    });
  });

  // Handle log messages
  router.on('log', (workerId, message) => {
    console.log(`[Master] Log from worker ${workerId}: ${message.data.message}`);
  });

  /**
   * Fork workers
   */
  const workers = [];
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);

    console.log(`[Master] Forked worker ${worker.id} (PID ${worker.process.pid})`);

    // Set up message handling
    worker.on('message', (message) => {
      router.route(worker.id, message);
    });
  }

  /**
   * Handle worker exits
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} exited`);

    // Clean up pending requests for this worker
    pendingRequests.forEach((pending, requestId) => {
      pending.reject(new Error(`Worker exited`));
      pendingRequests.delete(requestId);
    });

    // Restart worker
    const newWorker = cluster.fork();
    newWorker.on('message', (message) => {
      router.route(newWorker.id, message);
    });
  });

  /**
   * Periodic broadcasts for demonstration
   */
  setInterval(() => {
    broadcast('ping', { timestamp: Date.now() });
  }, 10000);

  /**
   * Cleanup on exit
   */
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    console.log('\n[Master] Shutting down...');
    Object.values(cluster.workers).forEach(worker => {
      worker.kill('SIGTERM');
    });
    setTimeout(() => process.exit(0), 5000);
  }

  console.log(`[Master] Cluster ready with advanced IPC`);
  console.log(`[Master] Server running on http://localhost:${PORT}\n`);

} else {
  // === WORKER PROCESS ===

  // Worker state
  let requestCount = 0;
  let messageQueue = [];
  const pendingRequests = new Map();

  /**
   * Send request to master and wait for response
   */
  function sendRequest(type, data, timeout = REQUEST_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timer);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });

      if (process.send) {
        process.send({
          type,
          requestId,
          data
        });
      }
    });
  }

  /**
   * Send message to another worker via master
   */
  function sendToWorker(workerId, data) {
    if (process.send) {
      process.send({
        type: 'worker-message',
        toWorker: workerId,
        data
      });
    }
  }

  /**
   * Log to master
   */
  function logToMaster(message) {
    if (process.send) {
      process.send({
        type: 'log',
        data: { message }
      });
    }
  }

  /**
   * Handle incoming messages
   */
  process.on('message', (message) => {
    const { type, requestId, data, broadcast, fromWorker } = message;

    switch (type) {
      case 'get-stats':
        // Respond with worker stats
        const memUsage = process.memoryUsage();
        if (process.send) {
          process.send({
            type: 'stats-response',
            requestId,
            data: {
              workerId: cluster.worker.id,
              pid: process.pid,
              requestCount,
              memoryUsage: memUsage.heapUsed,
              uptime: process.uptime()
            }
          });
        }
        break;

      case 'response':
        // Handle response to our request
        const pending = pendingRequests.get(requestId);
        if (pending) {
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(data);
          }
          pendingRequests.delete(requestId);
        }
        break;

      case 'ping':
        // Handle broadcast ping
        if (broadcast) {
          console.log(`[Worker ${cluster.worker.id}] Received broadcast ping`);
        }
        break;

      case 'worker-message':
        // Handle message from another worker
        console.log(`[Worker ${cluster.worker.id}] Received message from worker ${fromWorker}:`, data);
        messageQueue.push({ from: fromWorker, data, timestamp: Date.now() });
        break;

      default:
        console.log(`[Worker ${cluster.worker.id}] Unknown message type: ${type}`);
    }
  });

  /**
   * HTTP Server
   */
  const server = http.createServer(async (req, res) => {
    requestCount++;

    try {
      if (req.url === '/stats') {
        // Request aggregated stats from master
        console.log(`[Worker ${cluster.worker.id}] Requesting cluster stats`);

        const stats = await sendRequest('stats-request', {});

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats, null, 2));
        return;
      }

      if (req.url === '/messages') {
        // Return message queue
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          worker: cluster.worker.id,
          messages: messageQueue,
          count: messageQueue.length
        }, null, 2));
        return;
      }

      if (req.url.startsWith('/send/')) {
        // Send message to another worker
        const targetWorker = parseInt(req.url.split('/')[2]);

        if (targetWorker && targetWorker !== cluster.worker.id) {
          sendToWorker(targetWorker, {
            message: `Hello from worker ${cluster.worker.id}`,
            timestamp: Date.now()
          });

          res.writeHead(200);
          res.end(`Message sent to worker ${targetWorker}\n`);
        } else {
          res.writeHead(400);
          res.end('Invalid worker ID\n');
        }
        return;
      }

      if (req.url === '/log') {
        // Send log to master
        logToMaster(`Test log from worker ${cluster.worker.id}`);
        res.writeHead(200);
        res.end('Log sent to master\n');
        return;
      }

      // Default endpoint
      res.writeHead(200);
      res.end(`Worker ${cluster.worker.id} (PID ${process.pid}) - Request #${requestCount}\n`);

    } catch (error) {
      console.error(`[Worker ${cluster.worker.id}] Error:`, error);
      res.writeHead(500);
      res.end('Internal Server Error\n');
    }
  });

  server.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id}] Listening on port ${PORT}`);
    logToMaster(`Worker ${cluster.worker.id} started`);
  });
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Request-Response Pattern:
 *    - Use correlation IDs to match responses
 *    - Always implement timeouts
 *    - Clean up pending requests on failure
 *    - Use Promises for async handling
 *
 * 2. Message Routing:
 *    - Master acts as message router
 *    - Workers can't communicate directly
 *    - All worker-to-worker messages go through master
 *    - Implement message type handlers
 *
 * 3. Broadcasting:
 *    - Send same message to all workers
 *    - Useful for configuration updates
 *    - Mark broadcast messages clearly
 *    - Consider message size
 *
 * 4. Message Structure:
 *    - Use consistent message format
 *    - Include type field for routing
 *    - Add metadata (timestamps, IDs)
 *    - Version your message protocols
 *
 * 5. Error Handling:
 *    - Handle timeout scenarios
 *    - Clean up on worker exit
 *    - Validate message format
 *    - Implement retry logic where appropriate
 *
 * TESTING:
 *
 * 1. Get aggregated stats:
 *    curl http://localhost:8000/stats
 *
 * 2. Send worker-to-worker message:
 *    curl http://localhost:8000/send/2
 *    curl http://localhost:8000/messages
 *
 * 3. Send log to master:
 *    curl http://localhost:8000/log
 *
 * 4. Load test IPC:
 *    for i in {1..100}; do curl http://localhost:8000/stats; done
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Message Size:
 *    - IPC has message size limits
 *    - Chunk large messages
 *    - Consider external message queue for large data
 *
 * 2. Message Queuing:
 *    - Implement proper queuing for high volume
 *    - Add backpressure handling
 *    - Monitor queue sizes
 *
 * 3. Serialization:
 *    - Be careful with object serialization
 *    - Functions and circular refs can't be sent
 *    - Use JSON or protocol buffers
 *
 * 4. Performance:
 *    - IPC has overhead
 *    - Batch messages when possible
 *    - Consider external storage for shared state
 */
