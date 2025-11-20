/**
 * Exercise 3: Handle Worker Exits
 *
 * Objective:
 * Implement automatic worker restart when workers crash or exit.
 * This is a fundamental pattern for building resilient clusters.
 *
 * Requirements:
 * 1. Create a cluster with 3 workers
 * 2. Listen for the 'exit' event on cluster
 * 3. When a worker exits:
 *    - Log the worker ID and reason for exit
 *    - Automatically fork a new replacement worker
 *    - Log the new worker's ID
 * 4. In workers:
 *    - After a random delay (5-10 seconds), exit with code 1
 *    - This simulates workers crashing
 *
 * Expected Output:
 * Master: Created worker 1
 * Master: Created worker 2
 * Master: Created worker 3
 * Worker 1 started
 * Worker 2 started
 * Worker 3 started
 * Worker 2 is exiting...
 * Master: Worker 2 exited with code 1
 * Master: Restarting worker...
 * Master: Created worker 4
 * Worker 4 started
 * (Workers continue to crash and restart)
 *
 * Hints:
 * - Use cluster.on('exit', (worker, code, signal) => {...})
 * - Exit code indicates how worker died (0 = normal, non-zero = error)
 * - Use Math.random() for random delay
 * - setTimeout() for delayed exit
 */

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('Master: Starting cluster');

  // TODO: Implement master process logic
  // 1. Fork 3 workers
  // 2. Listen for 'exit' event
  // 3. On exit: log info and restart worker

} else {
  console.log(`Worker ${cluster.worker.id} started`);

  // TODO: Implement worker crash simulation
  // 1. Generate random delay (5-10 seconds)
  // 2. After delay, log "Worker X is exiting..."
  // 3. Exit with code 1

}

/**
 * Bonus Challenges:
 * 1. Track the number of times each worker has been restarted
 * 2. If a worker restarts more than 5 times in 1 minute, stop restarting it
 *    (prevents restart loops)
 * 3. Add different exit codes and handle them differently
 * 4. Implement graceful shutdown on SIGTERM
 */
