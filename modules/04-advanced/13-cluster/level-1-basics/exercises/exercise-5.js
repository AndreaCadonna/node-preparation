/**
 * Exercise 5: Worker Communication
 *
 * Objective:
 * Implement inter-process communication between master and workers.
 * Workers will report their status, and master will send commands.
 *
 * Requirements:
 * 1. Create a cluster with 3 workers
 * 2. Workers should:
 *    - Send a "ready" message when they start
 *    - Send status updates every 3 seconds (memory usage, uptime)
 *    - Listen for "ping" messages and respond with "pong"
 * 3. Master should:
 *    - Receive and log all worker messages
 *    - Send a "ping" to all workers every 5 seconds
 *    - Display a summary of worker statuses
 *
 * Message Format:
 * Worker to Master:
 * { type: 'ready', workerId: 1, pid: 12345 }
 * { type: 'status', workerId: 1, memory: 25000000, uptime: 10 }
 * { type: 'pong', workerId: 1, timestamp: 1234567890 }
 *
 * Master to Worker:
 * { type: 'ping', timestamp: 1234567890 }
 *
 * Expected Output:
 * [Master] Worker 1 ready (PID: 12345)
 * [Master] Worker 2 ready (PID: 12346)
 * [Master] Worker 3 ready (PID: 12347)
 * [Master] Status from Worker 1: Memory: 24 MB, Uptime: 3s
 * [Master] Sending ping to all workers
 * [Master] Pong from Worker 1
 * [Master] Pong from Worker 2
 * [Master] Pong from Worker 3
 *
 * Hints:
 * - Master sends: worker.send(message)
 * - Worker sends: process.send(message)
 * - Master receives: cluster.on('message', (worker, msg) => {...})
 * - Worker receives: process.on('message', (msg) => {...})
 * - Memory: process.memoryUsage().heapUsed
 * - Uptime: process.uptime()
 */

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log(`[Master] PID: ${process.pid}\n`);

  // TODO: Implement master logic
  // 1. Fork 3 workers
  // 2. Listen for messages from workers
  // 3. Handle different message types (ready, status, pong)
  // 4. Send ping to all workers every 5 seconds
  // 5. Display worker status summary

} else {
  // TODO: Implement worker logic
  // 1. Send "ready" message on startup
  // 2. Send status updates every 3 seconds
  // 3. Listen for "ping" messages
  // 4. Respond to ping with "pong"

}

/**
 * Bonus Challenges:
 * 1. Implement a "shutdown" command:
 *    - Master sends shutdown to specific worker
 *    - Worker gracefully exits
 *    - Master restarts it
 *
 * 2. Add a health check system:
 *    - Master sends health check every 10 seconds
 *    - Workers must respond within 2 seconds
 *    - If no response, master kills and restarts worker
 *
 * 3. Implement worker-to-worker communication:
 *    - Worker sends message to master with target worker ID
 *    - Master routes message to target worker
 *    - Target worker responds
 *
 * 4. Create a simple task distribution system:
 *    - Master has a task queue
 *    - Workers request tasks
 *    - Master assigns tasks to workers
 *    - Workers report task completion
 *
 * 5. Build a monitoring dashboard:
 *    - Collect metrics from all workers
 *    - Display in a formatted table
 *    - Update every second
 */
