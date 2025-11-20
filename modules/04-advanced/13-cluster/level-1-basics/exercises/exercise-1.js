/**
 * Exercise 1: Create Your First Cluster
 *
 * Objective:
 * Create a basic cluster with a master process and 2 worker processes.
 * Log messages from both master and workers to demonstrate understanding.
 *
 * Requirements:
 * 1. Import the cluster module
 * 2. Check if the current process is master or worker
 * 3. If master:
 *    - Log "Master process started with PID: <pid>"
 *    - Fork exactly 2 workers
 *    - Log each worker's ID and PID when created
 * 4. If worker:
 *    - Log "Worker <id> started with PID: <pid>"
 *
 * Expected Output:
 * Master process started with PID: 12345
 * Worker 1 started with PID: 12346
 * Worker 2 started with PID: 12347
 * (PIDs will vary)
 *
 * Hints:
 * - Use cluster.isMaster to check process type
 * - Use cluster.fork() to create workers
 * - Use process.pid to get process ID
 * - Use cluster.worker.id in worker processes
 */

const cluster = require('cluster');

// TODO: Implement your solution here

// Check if master or worker
if (cluster.isMaster) {
  // TODO: Master process logic
  // 1. Log master process started
  // 2. Fork 2 workers
  // 3. Log each worker's info

} else {
  // TODO: Worker process logic
  // 1. Log worker started with ID and PID

}

/**
 * Bonus Challenges:
 * 1. Make the number of workers configurable via command line
 *    Example: node exercise-1.js 3 (creates 3 workers)
 * 2. Add timestamps to log messages
 * 3. Make workers print a message every 2 seconds showing they're alive
 */
