/**
 * Exercise 3 Solution: Handle Worker Exits
 *
 * This solution demonstrates:
 * - Listening for worker exit events
 * - Automatic worker restart on failure
 * - Building resilient clustered applications
 * - Understanding exit codes and signals
 *
 * Key Concepts Explained:
 * - cluster.on('exit'): Event fired when any worker dies
 * - Exit codes: 0 = normal, non-zero = error
 * - Signals: SIGTERM, SIGKILL, etc.
 * - Automatic restart strategy
 */

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('Master: Starting cluster');
  console.log(`Master PID: ${process.pid}\n`);

  // === MASTER PROCESS ===

  // Create 3 workers as specified
  const NUM_WORKERS = 3;

  console.log('=== Forking Workers ===');
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork();
    console.log(`Master: Created worker ${worker.id} (PID: ${worker.process.pid})`);
  }

  console.log('');

  /*
   * The 'exit' event is emitted when a worker dies
   * Parameters:
   * - worker: The worker object that exited
   * - code: Exit code (0 = normal, non-zero = error)
   * - signal: Signal that caused termination (e.g., 'SIGTERM', 'SIGKILL')
   */
  cluster.on('exit', (worker, code, signal) => {
    // Log detailed exit information
    console.log(`\n=== Worker Exit Event ===`);
    console.log(`Worker ${worker.id} (PID: ${worker.process.pid}) exited`);

    // Determine why the worker exited
    if (signal) {
      console.log(`Reason: Killed by signal ${signal}`);
    } else if (code !== 0) {
      console.log(`Reason: Exited with error code ${code}`);
    } else {
      console.log(`Reason: Normal exit (code 0)`);
    }

    /*
     * Exit Code Meanings:
     * - 0: Success / normal exit
     * - 1: Uncaught fatal exception
     * - 3: Internal JavaScript parse error
     * - 4: Internal JavaScript evaluation failure
     * - 5: Fatal error in V8
     * - 6: Non-function internal exception handler
     * - 7: Internal exception handler runtime failure
     * - 8: Unused (used to be uncaught exception)
     * - 9: Invalid argument
     * - 10: Internal JavaScript runtime failure
     * - 12: Invalid debug argument
     * - >128: Signal exits (128 + signal number)
     *
     * Common Signals:
     * - SIGTERM (15): Graceful termination
     * - SIGKILL (9): Forced termination
     * - SIGINT (2): Interrupt (Ctrl+C)
     */

    // Restart the worker
    console.log('Master: Restarting worker...');
    const newWorker = cluster.fork();
    console.log(`Master: Created worker ${newWorker.id} (PID: ${newWorker.process.pid})`);
  });

  /*
   * Automatic Restart Strategy:
   * - Immediately restart crashed workers
   * - Maintains cluster size
   * - Ensures high availability
   * - New worker gets a new ID
   */

  // Optional: Listen for other cluster events
  cluster.on('online', (worker) => {
    // Fired when worker is running (after fork)
    console.log(`Master: Worker ${worker.id} is online`);
  });

  cluster.on('listening', (worker, address) => {
    // Fired when worker calls server.listen()
    console.log(`Master: Worker ${worker.id} is listening on ${address.address}:${address.port}`);
  });

  cluster.on('disconnect', (worker) => {
    // Fired when worker IPC channel is disconnected
    console.log(`Master: Worker ${worker.id} disconnected`);
  });

} else {
  // === WORKER PROCESS ===

  console.log(`Worker ${cluster.worker.id} started (PID: ${process.pid})`);

  /*
   * Simulate random crashes to demonstrate auto-restart
   * In production, crashes would be due to:
   * - Uncaught exceptions
   * - Memory leaks
   * - Unhandled promise rejections
   * - Resource exhaustion
   * - External signals
   */

  // Generate random delay between 5-10 seconds
  const minDelay = 5000;  // 5 seconds
  const maxDelay = 10000; // 10 seconds
  const crashDelay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);

  console.log(`Worker ${cluster.worker.id}: Will crash in ${(crashDelay / 1000).toFixed(1)}s`);

  // Schedule the crash
  setTimeout(() => {
    console.log(`Worker ${cluster.worker.id} is exiting...`);

    // Exit with code 1 to simulate an error
    // In real scenarios, this would be an uncaught exception
    process.exit(1);

    /*
     * Alternative ways to simulate crashes:
     *
     * 1. Throw uncaught exception:
     *    throw new Error('Simulated crash');
     *
     * 2. Unhandled promise rejection:
     *    Promise.reject(new Error('Async error'));
     *
     * 3. Memory exhaustion:
     *    const arr = [];
     *    while (true) arr.push(new Array(1000000));
     *
     * 4. Process kill:
     *    process.kill(process.pid, 'SIGTERM');
     */
  }, crashDelay);

  /*
   * Best Practice: Handle errors gracefully
   * In production, you should:
   * - Catch and handle expected errors
   * - Log errors before exiting
   * - Clean up resources
   * - Notify monitoring systems
   */
}

/**
 * BONUS CHALLENGE SOLUTIONS
 */

/*
// Bonus 1: Track restart counts per worker slot

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('Master: Starting cluster with restart tracking\n');

  const NUM_WORKERS = 3;

  // Track restarts by worker slot (not by worker ID)
  // Each slot represents a position in the cluster
  const restartCounts = {};

  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork();
    restartCounts[worker.id] = 0;
    console.log(`Master: Created worker ${worker.id}`);
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`\nWorker ${worker.id} exited (code: ${code})`);

    const newWorker = cluster.fork();
    // Inherit restart count (conceptually tracking the "slot")
    restartCounts[newWorker.id] = (restartCounts[worker.id] || 0) + 1;

    console.log(`Master: Restarted as worker ${newWorker.id}`);
    console.log(`Total restarts for this slot: ${restartCounts[newWorker.id]}`);
  });

} else {
  console.log(`Worker ${cluster.worker.id} started`);

  setTimeout(() => {
    console.log(`Worker ${cluster.worker.id} exiting...`);
    process.exit(1);
  }, Math.random() * 5000 + 5000);
}
*/

/*
// Bonus 2: Prevent restart loops (max 5 restarts per minute)

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('Master: Starting cluster with restart limits\n');

  const NUM_WORKERS = 3;

  // Track restart times for each worker slot
  const restartHistory = new Map();

  function canRestart(workerId) {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (!restartHistory.has(workerId)) {
      restartHistory.set(workerId, []);
    }

    const history = restartHistory.get(workerId);

    // Remove restarts older than 1 minute
    const recentRestarts = history.filter(time => now - time < oneMinute);
    restartHistory.set(workerId, recentRestarts);

    // Check if we've exceeded the limit
    if (recentRestarts.length >= 5) {
      return false;
    }

    // Record this restart
    recentRestarts.push(now);
    return true;
  }

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`\nWorker ${worker.id} exited (code: ${code})`);

    if (canRestart(worker.id)) {
      console.log(`Master: Restarting worker...`);
      cluster.fork();
    } else {
      console.log(`Master: ⚠ Worker ${worker.id} crashed too many times. Not restarting.`);
      console.log(`This prevents restart loops. Manual intervention required.`);
    }
  });

} else {
  console.log(`Worker ${cluster.worker.id} started`);

  // Crash quickly to demonstrate restart limit
  setTimeout(() => {
    console.log(`Worker ${cluster.worker.id} exiting...`);
    process.exit(1);
  }, 1000);
}
*/

/*
// Bonus 3: Handle different exit codes differently

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('Master: Starting cluster with smart restart logic\n');

  const NUM_WORKERS = 3;

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`\nWorker ${worker.id} exited`);
    console.log(`Code: ${code}, Signal: ${signal}`);

    // Different strategies based on exit reason
    if (code === 0) {
      // Normal exit - don't restart
      console.log('Master: Normal exit, not restarting');
    } else if (code === 1) {
      // Error exit - restart immediately
      console.log('Master: Error exit, restarting immediately');
      cluster.fork();
    } else if (code === 2) {
      // Intentional restart - restart after delay
      console.log('Master: Intentional restart, waiting 2s...');
      setTimeout(() => {
        console.log('Master: Restarting now');
        cluster.fork();
      }, 2000);
    } else if (signal === 'SIGTERM') {
      // Graceful shutdown - don't restart
      console.log('Master: Graceful shutdown, not restarting');
    } else {
      // Unknown - restart with caution
      console.log('Master: Unknown exit reason, restarting with delay');
      setTimeout(() => cluster.fork(), 1000);
    }
  });

} else {
  console.log(`Worker ${cluster.worker.id} started`);

  // Randomly exit with different codes
  const exitCodes = [0, 1, 2];
  const exitCode = exitCodes[Math.floor(Math.random() * exitCodes.length)];

  setTimeout(() => {
    console.log(`Worker ${cluster.worker.id} exiting with code ${exitCode}...`);
    process.exit(exitCode);
  }, Math.random() * 5000 + 3000);
}
*/

/*
// Bonus 4: Graceful shutdown on SIGTERM

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('Master: Starting cluster\n');

  const NUM_WORKERS = 3;

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    if (!worker.exitedAfterDisconnect) {
      // Worker crashed unexpectedly - restart it
      console.log(`Worker ${worker.id} crashed. Restarting...`);
      cluster.fork();
    } else {
      // Worker exited intentionally - don't restart
      console.log(`Worker ${worker.id} exited gracefully`);
    }
  });

  // Handle SIGTERM for graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nMaster: Received SIGTERM, shutting down gracefully...');

    // Disconnect all workers
    for (const id in cluster.workers) {
      cluster.workers[id].disconnect();
    }

    // Exit master after workers are done
    setTimeout(() => {
      console.log('Master: All workers disconnected, exiting');
      process.exit(0);
    }, 5000);
  });

} else {
  console.log(`Worker ${cluster.worker.id} started`);

  // Simulate work
  setInterval(() => {
    console.log(`Worker ${cluster.worker.id} is working...`);
  }, 2000);

  // Handle graceful shutdown
  process.on('disconnect', () => {
    console.log(`Worker ${cluster.worker.id}: Disconnect signal received`);
    // Clean up resources, close connections, etc.
    console.log(`Worker ${cluster.worker.id}: Cleaning up...`);
    // Then exit
    process.exit(0);
  });
}

// Test: Send SIGTERM to master process
// kill -TERM <master_pid>
*/

/**
 * LEARNING POINTS
 *
 * 1. Exit Event Handling:
 *    - Always listen for 'exit' events in production
 *    - Exit event fires for all worker deaths
 *    - Provides exit code and signal information
 *    - Use this for automatic restart logic
 *
 * 2. Exit Codes:
 *    - Code 0 = success/normal
 *    - Non-zero = error
 *    - Different codes can indicate different failure types
 *    - Use codes to determine restart strategy
 *
 * 3. Restart Strategy:
 *    - Immediate restart for unexpected crashes
 *    - Delayed restart to prevent restart loops
 *    - No restart for intentional exits
 *    - Rate limiting to prevent thrashing
 *
 * 4. Worker Identity:
 *    - Worker IDs are reassigned on restart
 *    - Track by slot/position, not ID
 *    - Store worker metadata externally if needed
 *    - PIDs change on every restart
 *
 * 5. Resilience Patterns:
 *    - Automatic restart for high availability
 *    - Restart limits prevent infinite loops
 *    - Graceful degradation when problems persist
 *    - Monitoring and alerting for repeated failures
 */

/**
 * PRODUCTION BEST PRACTICES
 *
 * 1. Restart Logic:
 *    ✅ Always restart crashed workers
 *    ✅ Implement restart rate limiting
 *    ✅ Log exit reasons for debugging
 *    ✅ Alert on repeated failures
 *
 * 2. Graceful Shutdown:
 *    ✅ Handle SIGTERM for clean exits
 *    ✅ Close connections before exiting
 *    ✅ Finish in-flight requests
 *    ✅ Set timeouts for shutdown
 *
 * 3. Error Handling:
 *    ✅ Catch and log errors before exit
 *    ✅ Use uncaughtException handler
 *    ✅ Handle unhandledRejection
 *    ✅ Implement proper error boundaries
 *
 * 4. Monitoring:
 *    ✅ Track restart frequency
 *    ✅ Monitor worker health
 *    ✅ Alert on anomalies
 *    ✅ Keep restart history
 *
 * 5. Testing:
 *    ✅ Test restart behavior
 *    ✅ Verify graceful shutdown
 *    ✅ Simulate various failure modes
 *    ✅ Load test with failures
 */
