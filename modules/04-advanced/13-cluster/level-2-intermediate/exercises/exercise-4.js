/**
 * Exercise 4: Advanced IPC with Request-Response Pattern
 *
 * Objective:
 * Implement advanced inter-process communication patterns including
 * request-response, broadcasting, and worker-to-worker messaging.
 *
 * Requirements:
 * 1. Create a cluster with 3 workers
 * 2. Implement request-response pattern with timeout
 * 3. Implement broadcasting to all workers
 * 4. Enable worker-to-worker communication via master
 * 5. Track message correlation with unique IDs
 * 6. Handle timeouts and errors gracefully
 *
 * HTTP Endpoints:
 * - GET /stats - Aggregate stats from all workers
 * - GET /broadcast - Broadcast message to all workers
 * - GET /send/:workerId - Send message to specific worker
 * - GET /messages - View messages received by this worker
 *
 * Expected Behavior:
 * - /stats: Master requests stats from all workers, aggregates, returns
 * - /broadcast: Master sends message to all workers
 * - /send/2: Worker sends message to worker 2 via master routing
 * - /messages: Worker shows messages it received from other workers
 *
 * Test:
 * 1. Start: node exercise-4.js
 * 2. Get stats: curl http://localhost:8000/stats
 * 3. Broadcast: curl http://localhost:8000/broadcast
 * 4. Send message: curl http://localhost:8000/send/2
 * 5. View messages: curl http://localhost:8000/messages
 *
 * Bonus Challenges:
 * 1. Add message priority queues
 * 2. Implement pub/sub pattern
 * 3. Add message size limits and validation
 * 4. Track message latency and throughput
 * 5. Implement message replay on worker restart
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// Configuration
const PORT = 8000;
const NUM_WORKERS = 3;
const REQUEST_TIMEOUT = 5000; // 5 seconds

if (cluster.isMaster) {
  console.log(`Master ${process.pid} starting with advanced IPC\n`);

  // TODO: Track pending requests
  const pendingRequests = new Map();

  // TODO: Implement request-response helper
  function sendRequest(worker, type, data, timeout = REQUEST_TIMEOUT) {
    // Return Promise that:
    // 1. Generates unique requestId
    // 2. Sets timeout to reject after timeout ms
    // 3. Stores resolve/reject in pendingRequests Map
    // 4. Sends message to worker with requestId
    // 5. Cleans up on resolve/reject/timeout
  }

  // TODO: Handle response messages
  function handleResponse(workerId, message) {
    // 1. Get requestId from message
    // 2. Find pending request in Map
    // 3. If found:
    //    - Clear timeout
    //    - Resolve or reject based on message.error
    //    - Delete from pendingRequests
  }

  // TODO: Implement broadcast function
  function broadcast(type, data) {
    // 1. Get all worker IDs
    // 2. Send message to each worker:
    //    - type
    //    - data
    //    - broadcast: true
    //    - timestamp
  }

  // TODO: Implement worker-to-worker routing
  function routeMessage(fromWorkerId, toWorkerId, type, data) {
    // 1. Get target worker
    // 2. If exists, send message with:
    //    - type
    //    - data
    //    - fromWorker: fromWorkerId
    //    - routed: true
  }

  // TODO: Fork workers
  // For each worker:
  // - Fork worker
  // - Setup message handlers:
  //   - 'stats-request': Aggregate stats from all workers
  //   - 'response': Handle request-response
  //   - 'broadcast-request': Broadcast to all workers
  //   - 'route-message': Route between workers

  // Message handler example:
  // worker.on('message', async (msg) => {
  //   switch (msg.type) {
  //     case 'stats-request':
  //       // Request stats from all workers and aggregate
  //       break;
  //     case 'response':
  //       handleResponse(worker.id, msg);
  //       break;
  //     case 'broadcast-request':
  //       broadcast(msg.broadcastType, msg.data);
  //       break;
  //     case 'route-message':
  //       routeMessage(worker.id, msg.toWorker, msg.messageType, msg.data);
  //       break;
  //   }
  // });

  console.log('Advanced IPC system ready');

} else {
  // === WORKER PROCESS ===

  // TODO: Track worker state
  let requestCount = 0;
  const messageQueue = []; // Messages from other workers
  const pendingRequests = new Map(); // Worker's own pending requests

  // TODO: Implement request helper for worker
  function sendRequest(type, data, timeout = REQUEST_TIMEOUT) {
    // Similar to master's sendRequest
    // Send to master and wait for response
  }

  // TODO: Implement send to other worker
  function sendToWorker(targetWorkerId, messageType, data) {
    // Send route-message to master
    // Master will route to target worker
  }

  // TODO: Create HTTP server
  const server = http.createServer(async (req, res) => {
    requestCount++;

    try {
      if (req.url === '/stats') {
        // TODO: Request aggregated stats from master
        // 1. Send 'stats-request' to master
        // 2. Master will request stats from all workers
        // 3. Master aggregates and returns
        // 4. Return aggregated stats to HTTP client

      } else if (req.url === '/broadcast') {
        // TODO: Trigger broadcast
        // 1. Send 'broadcast-request' to master
        // 2. Master broadcasts to all workers
        // 3. Return success

      } else if (req.url.startsWith('/send/')) {
        // TODO: Send to specific worker
        // 1. Extract targetWorkerId from URL
        // 2. Call sendToWorker(targetWorkerId, type, data)
        // 3. Return success

      } else if (req.url === '/messages') {
        // TODO: Return message queue
        // Return messageQueue array showing:
        // - Messages received from other workers
        // - Timestamps
        // - Sender info

      } else {
        // Default endpoint
        res.writeHead(200);
        res.end(`Worker ${cluster.worker.id} - Request #${requestCount}\n`);
      }

    } catch (error) {
      console.error(`Error:`, error);
      res.writeHead(500);
      res.end('Internal Server Error\n');
    }
  });

  // TODO: Handle incoming messages
  process.on('message', (msg) => {
    // Handle different message types:
    // - 'get-stats': Return worker stats
    // - 'response': Handle response to request
    // - 'broadcast': Handle broadcast message
    // - 'routed': Handle message from another worker

    // Example for routed messages:
    // if (msg.routed) {
    //   messageQueue.push({
    //     from: msg.fromWorker,
    //     type: msg.type,
    //     data: msg.data,
    //     timestamp: Date.now()
    //   });
    // }
  });

  // TODO: Start server
  // server.listen(PORT, () => {
  //   console.log(`Worker ${cluster.worker.id} listening on port ${PORT}`);
  // });
}

/**
 * HINTS:
 *
 * Request-Response Pattern:
 * ```javascript
 * function sendRequest(worker, type, data) {
 *   return new Promise((resolve, reject) => {
 *     const requestId = crypto.randomUUID();
 *
 *     const timer = setTimeout(() => {
 *       pendingRequests.delete(requestId);
 *       reject(new Error('Timeout'));
 *     }, timeout);
 *
 *     pendingRequests.set(requestId, {
 *       resolve: (data) => {
 *         clearTimeout(timer);
 *         resolve(data);
 *       },
 *       reject: (error) => {
 *         clearTimeout(timer);
 *         reject(error);
 *       }
 *     });
 *
 *     worker.send({ type, requestId, data });
 *   });
 * }
 * ```
 *
 * Aggregate Stats:
 * ```javascript
 * const workerIds = Object.keys(cluster.workers);
 * const statsPromises = workerIds.map(id =>
 *   sendRequest(cluster.workers[id], 'get-stats', {})
 * );
 * const allStats = await Promise.all(statsPromises);
 * ```
 *
 * Broadcasting:
 * ```javascript
 * Object.values(cluster.workers).forEach(worker => {
 *   worker.send({
 *     type: 'broadcast',
 *     data: { message: 'Hello all!' },
 *     broadcast: true
 *   });
 * });
 * ```
 */

/**
 * TESTING:
 *
 * 1. Get aggregated stats:
 *    curl http://localhost:8000/stats
 *    # Should return stats from all 3 workers
 *    # Plus aggregated totals
 *
 * 2. Test broadcasting:
 *    curl http://localhost:8000/broadcast
 *    # Check master logs
 *    # Should show broadcast sent to all workers
 *
 * 3. Send worker-to-worker message:
 *    curl http://localhost:8000/send/2
 *    # Then check messages on worker 2:
 *    curl http://localhost:8000/messages
 *    # Should show message from sender worker
 *
 * 4. Load test IPC:
 *    for i in {1..100}; do
 *      curl -s http://localhost:8000/stats &
 *    done
 *    wait
 *    # All requests should complete successfully
 *
 * 5. Test timeout:
 *    # Modify a worker to not respond
 *    # Request should timeout after 5 seconds
 *    # Error should be handled gracefully
 */

/**
 * VALIDATION:
 *
 * Your solution should:
 * ✓ Implement request-response with correlation IDs
 * ✓ Support timeouts on all requests
 * ✓ Aggregate stats from multiple workers
 * ✓ Broadcast messages to all workers
 * ✓ Route messages between workers via master
 * ✓ Handle errors and timeouts gracefully
 * ✓ Clean up pending requests on timeout
 * ✓ Return proper HTTP responses for all endpoints
 */
