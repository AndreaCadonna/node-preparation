/**
 * Exercise 2: Build a Rolling Restart System
 *
 * Objective:
 * Implement a zero-downtime rolling restart mechanism that updates
 * workers one at a time while maintaining service availability.
 *
 * Requirements:
 * 1. Create a cluster with 4 workers
 * 2. Track worker versions (start with v1.0.0)
 * 3. Implement rolling restart triggered by SIGUSR2
 * 4. Restart workers sequentially (one at a time)
 * 5. Wait for new worker to be ready before killing old worker
 * 6. Increment version number with each restart
 * 7. Include version in HTTP responses
 * 8. Log restart progress
 *
 * Expected Behavior:
 * - All 4 workers start with v1.0.0
 * - On SIGUSR2: restart workers one by one
 * - Version changes: v1.0.0 → v1.1.0 → v1.2.0, etc.
 * - No dropped requests during restart
 * - Always maintain at least 3 workers available
 *
 * Test:
 * 1. Start server: node exercise-2.js
 * 2. Check versions: watch -n 0.5 'curl -s http://localhost:8000'
 * 3. Trigger restart: kill -SIGUSR2 <master_pid>
 * 4. Observe version changes with zero downtime
 *
 * Bonus Challenges:
 * 1. Implement health checks before proceeding to next worker
 * 2. Add rollback capability if new worker fails health checks
 * 3. Support parallel restart (2 workers at a time)
 * 4. Track and report restart duration
 * 5. Implement maximum restart time limit
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const NUM_WORKERS = 4;
let currentVersion = '1.0.0';

if (cluster.isMaster) {
  console.log(`Master ${process.pid} starting`);

  // TODO: Track workers with version info
  const workers = new Map();
  let isRestarting = false;

  // TODO: Function to fork a worker with version
  function forkWorker(version = currentVersion) {
    // 1. Fork worker with version in environment
    //    cluster.fork({ WORKER_VERSION: version })
    // 2. Track worker in Map with:
    //    - worker object
    //    - version
    //    - startTime
    //    - ready: false
    // 3. Listen for 'ready' message from worker
    // 4. Return worker
  }

  // TODO: Initialize workers
  // Fork NUM_WORKERS workers with currentVersion

  // TODO: Handle worker events
  // cluster.on('exit', (worker, code, signal) => {
  //   - Log worker exit
  //   - Remove from workers Map
  //   - If not restarting, fork replacement
  // })

  // TODO: Implement rolling restart
  async function rollingRestart() {
    // 1. Check if already restarting
    // 2. Set isRestarting flag
    // 3. Increment version (e.g., '1.0.0' -> '1.1.0')
    // 4. Log restart start
    // 5. Get list of current worker IDs
    // 6. For each worker:
    //    a. Log restarting worker X of Y
    //    b. Call restartWorker(workerId, newVersion)
    //    c. Wait for completion
    //    d. Optional: brief pause between workers
    // 7. Log restart complete
    // 8. Clear isRestarting flag
  }

  // TODO: Restart a single worker
  async function restartWorker(workerId, newVersion) {
    // 1. Get old worker info
    // 2. Fork new worker with newVersion
    // 3. Wait for new worker to be ready
    //    - Listen for 'ready' message or 'listening' event
    //    - Use Promise with timeout
    // 4. Gracefully shutdown old worker
    //    - worker.disconnect() or send shutdown message
    // 5. Wait for old worker to exit (with timeout)
    // 6. Clean up old worker from Map
  }

  // TODO: Helper to wait for worker ready
  function waitForWorkerReady(worker, timeout = 30000) {
    // Return Promise that resolves when:
    // - Worker sends 'ready' message, OR
    // - Worker emits 'listening' event
    // Reject if:
    // - Timeout reached
    // - Worker exits before ready
  }

  // TODO: Register signal handler
  // process.on('SIGUSR2', () => {
  //   rollingRestart().catch(console.error);
  // });

  // TODO: Handle graceful shutdown
  // process.on('SIGTERM', shutdown);
  // process.on('SIGINT', shutdown);

  console.log(`Cluster ready with ${NUM_WORKERS} workers (v${currentVersion})`);
  console.log(`Send SIGUSR2 to trigger rolling restart: kill -SIGUSR2 ${process.pid}`);

} else {
  // === WORKER PROCESS ===

  const workerVersion = process.env.WORKER_VERSION || '1.0.0';
  const startTime = Date.now();

  // TODO: Create HTTP server
  const server = http.createServer((req, res) => {
    // Return JSON with:
    // - worker: cluster.worker.id
    // - pid: process.pid
    // - version: workerVersion
    // - uptime: Math.floor((Date.now() - startTime) / 1000)
    // - timestamp: new Date().toISOString()
  });

  // TODO: Send ready message after initialization
  server.listen(PORT, () => {
    console.log(`Worker ${cluster.worker.id} listening (v${workerVersion})`);

    // Simulate initialization delay
    setTimeout(() => {
      // Send ready message to master
      // if (process.send) {
      //   process.send({ type: 'ready' });
      // }
    }, 500);
  });

  // TODO: Handle shutdown signals
  // process.on('SIGTERM', gracefulShutdown);
  // process.on('message', (msg) => {
  //   if (msg.type === 'shutdown') gracefulShutdown();
  // });
}

/**
 * HINTS:
 *
 * Version Increment:
 * ```javascript
 * function incrementVersion(version) {
 *   const [major, minor, patch] = version.split('.').map(Number);
 *   return `${major}.${minor + 1}.${patch}`;
 * }
 * ```
 *
 * Waiting for Worker Ready:
 * ```javascript
 * function waitForReady(worker, timeout) {
 *   return new Promise((resolve, reject) => {
 *     const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
 *
 *     worker.on('message', function listener(msg) {
 *       if (msg.type === 'ready') {
 *         clearTimeout(timer);
 *         worker.removeListener('message', listener);
 *         resolve();
 *       }
 *     });
 *   });
 * }
 * ```
 *
 * Sequential Processing:
 * ```javascript
 * for (const workerId of workerIds) {
 *   await restartWorker(workerId, newVersion);
 * }
 * ```
 */

/**
 * TESTING:
 *
 * 1. Start and observe versions:
 *    node exercise-2.js
 *    # In another terminal:
 *    watch -n 0.5 'curl -s http://localhost:8000 | grep version'
 *    # Should show v1.0.0 from all workers
 *
 * 2. Trigger rolling restart:
 *    # Get master PID:
 *    ps aux | grep "exercise-2"
 *    # Send SIGUSR2:
 *    kill -SIGUSR2 <master_pid>
 *    # Watch version change: v1.0.0 → v1.1.0
 *    # All workers should update one by one
 *
 * 3. Load test during restart:
 *    # Terminal 1:
 *    node exercise-2.js
 *
 *    # Terminal 2 - Generate load:
 *    while true; do curl -s http://localhost:8000 | grep version; sleep 0.1; done
 *
 *    # Terminal 3 - Trigger restart:
 *    kill -SIGUSR2 <master_pid>
 *
 *    # Observe: No connection errors, gradual version change
 *
 * 4. Multiple restarts:
 *    kill -SIGUSR2 <master_pid>
 *    # Wait for completion
 *    kill -SIGUSR2 <master_pid>
 *    # Version should be v1.2.0
 */

/**
 * VALIDATION:
 *
 * Your solution should:
 * ✓ Start 4 workers with v1.0.0
 * ✓ On SIGUSR2, restart workers one at a time
 * ✓ Increment version with each restart
 * ✓ Wait for new worker before killing old
 * ✓ Handle requests throughout restart
 * ✓ Log progress clearly
 * ✓ Complete within reasonable time (~20-30 seconds for 4 workers)
 */
