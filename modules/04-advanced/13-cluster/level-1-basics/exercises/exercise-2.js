/**
 * Exercise 2: Fork Specific Number of Workers
 *
 * Objective:
 * Create a cluster that forks workers equal to the number of CPU cores.
 * Display system information and worker details.
 *
 * Requirements:
 * 1. Import cluster and os modules
 * 2. Get the number of CPU cores
 * 3. Log system information (number of CPUs, platform, architecture)
 * 4. Fork one worker per CPU core
 * 5. Keep track of all workers in an array
 * 6. After all workers are created, log:
 *    - Total number of workers created
 *    - List of all worker IDs and PIDs
 *
 * Expected Output:
 * === System Information ===
 * CPUs: 4
 * Platform: linux
 * Architecture: x64
 *
 * === Creating Workers ===
 * Created worker 1, PID: 12346
 * Created worker 2, PID: 12347
 * Created worker 3, PID: 12348
 * Created worker 4, PID: 12349
 *
 * === Cluster Summary ===
 * Total workers: 4
 * Worker IDs: 1, 2, 3, 4
 *
 * Hints:
 * - Use os.cpus().length for CPU count
 * - Use os.platform() and os.arch() for system info
 * - Store worker references: const workers = []
 * - Loop to create workers: for (let i = 0; i < numCPUs; i++)
 */

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  // TODO: Implement master process logic
  // 1. Get number of CPUs
  // 2. Display system information
  // 3. Fork workers (one per CPU)
  // 4. Track workers in array
  // 5. Display cluster summary

} else {
  // TODO: Implement worker process logic
  // Workers can just log they've started

}

/**
 * Bonus Challenges:
 * 1. Calculate and log total memory available vs memory per worker
 * 2. Add a function to display real-time worker status
 * 3. Allow overriding CPU count via environment variable
 *    Example: NUM_WORKERS=2 node exercise-2.js
 */
