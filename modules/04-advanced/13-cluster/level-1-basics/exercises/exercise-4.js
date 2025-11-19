/**
 * Exercise 4: Build a Clustered Web Server
 *
 * Objective:
 * Create a clustered HTTP server that distributes requests across workers.
 * This demonstrates the primary use case for clustering.
 *
 * Requirements:
 * 1. Create a cluster with 4 workers
 * 2. Each worker should create an HTTP server on port 3000
 * 3. The HTTP server should:
 *    - Respond with worker ID and PID
 *    - Include request number for that worker
 *    - Return HTTP 200 status
 * 4. Master should:
 *    - Log when each worker is listening
 *    - Log when workers exit
 *    - Restart workers that crash
 *
 * Expected Behavior:
 * - All workers listen on the same port (3000)
 * - Requests are distributed across workers
 * - Each request shows which worker handled it
 * - Workers can crash and be automatically restarted
 *
 * Test:
 * 1. Run: node exercise-4.js
 * 2. In another terminal: curl http://localhost:3000
 * 3. Make multiple requests and see different workers respond
 * 4. Use: for i in {1..10}; do curl http://localhost:3000; done
 *
 * Hints:
 * - Import http module: const http = require('http')
 * - Create server: http.createServer((req, res) => {...})
 * - Listen: server.listen(3000)
 * - Use cluster.on('listening') to know when workers are ready
 * - Track request count: let requestCount = 0;
 */

const cluster = require('cluster');
const http = require('http');

const PORT = 3000;
const NUM_WORKERS = 4;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // TODO: Implement master logic
  // 1. Fork NUM_WORKERS workers
  // 2. Listen for 'listening' event
  // 3. Listen for 'exit' event and restart workers
  // 4. Log appropriate messages

} else {
  // TODO: Implement worker logic
  // 1. Create HTTP server
  // 2. Track request count for this worker
  // 3. Respond with worker info and request count
  // 4. Listen on PORT

}

/**
 * Bonus Challenges:
 * 1. Add an endpoint /stats that returns:
 *    - Worker ID and PID
 *    - Request count
 *    - Memory usage
 *    - Uptime
 * 2. Add an endpoint /crash that causes the worker to crash
 *    (to test automatic restart)
 * 3. Collect and display total request count across all workers
 *    (Hint: use IPC to send counts to master)
 * 4. Add request logging with timestamps
 * 5. Implement a simple load balancing visualization
 */
