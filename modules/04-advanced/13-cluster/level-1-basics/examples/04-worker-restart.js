/**
 * Example 4: Automatic Worker Restart
 *
 * This example demonstrates how to automatically restart workers when they crash.
 * This is a fundamental pattern for building resilient clustered applications.
 *
 * Key concepts:
 * - Handling worker exits
 * - Automatic worker replacement
 * - Maintaining worker count
 * - Fault tolerance
 *
 * Run this: node 04-worker-restart.js
 */

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('=== WORKER RESTART DEMONSTRATION ===');
  console.log(`Master PID: ${process.pid}\n`);

  const NUM_WORKERS = 4;
  let workerRestartCount = 0;

  /**
   * Helper function to fork a new worker
   */
  function createWorker() {
    const worker = cluster.fork();
    console.log(`✓ Created worker ${worker.id} (PID ${worker.process.pid})`);
    return worker;
  }

  /**
   * Initial worker creation
   * Create all workers at startup
   */
  console.log(`Creating ${NUM_WORKERS} initial workers...\n`);
  for (let i = 0; i < NUM_WORKERS; i++) {
    createWorker();
  }

  /**
   * The 'exit' event handler is crucial for resilience
   * It fires whenever a worker process terminates
   */
  cluster.on('exit', (worker, code, signal) => {
    // Log the worker death
    console.log('\n⚠️  WORKER DIED:');
    console.log(`   Worker ID: ${worker.id}`);
    console.log(`   Process ID: ${worker.process.pid}`);
    console.log(`   Exit Code: ${code}`);
    console.log(`   Signal: ${signal}`);

    // Check if worker was killed intentionally or crashed
    if (signal) {
      console.log(`   Cause: Killed by signal (${signal})`);
    } else if (code !== 0) {
      console.log(`   Cause: Crashed with error (code ${code})`);
    } else {
      console.log(`   Cause: Exited normally`);
    }

    // IMPORTANT: Always restart the worker
    // This maintains the worker count and keeps the cluster running
    console.log('   Action: Restarting worker...\n');

    const newWorker = createWorker();
    workerRestartCount++;

    console.log(`✓ Replacement worker created`);
    console.log(`  Old Worker ID: ${worker.id} → New Worker ID: ${newWorker.id}`);
    console.log(`  Total restarts: ${workerRestartCount}\n`);
  });

  /**
   * Monitoring: Show cluster status every 5 seconds
   */
  setInterval(() => {
    const workerCount = Object.keys(cluster.workers).length;
    console.log(`[Status] Active workers: ${workerCount}, Total restarts: ${workerRestartCount}`);
  }, 5000);

  /**
   * Instructions for testing
   */
  setTimeout(() => {
    console.log('\n=== TEST THE RESTART MECHANISM ===');
    console.log('Workers will crash periodically to demonstrate auto-restart');
    console.log('Watch how the master automatically replaces dead workers\n');
  }, 2000);

} else {
  // Worker process
  console.log(`  Worker ${cluster.worker.id} started (PID ${process.pid})`);

  /**
   * Simulate random crashes to demonstrate auto-restart
   * In production, crashes might be caused by:
   * - Unhandled exceptions
   * - Memory leaks
   * - External signals
   * - Hardware failures
   */
  const crashDelay = Math.random() * 10000 + 5000; // 5-15 seconds

  setTimeout(() => {
    console.log(`  💥 Worker ${cluster.worker.id} (PID ${process.pid}) is crashing!`);

    // Simulate different types of crashes
    const crashType = Math.floor(Math.random() * 3);

    switch (crashType) {
      case 0:
        // Crash with error code
        console.log(`  Worker ${cluster.worker.id}: Exiting with error code 1`);
        process.exit(1);
        break;

      case 1:
        // Crash with different error code
        console.log(`  Worker ${cluster.worker.id}: Fatal error, exiting`);
        process.exit(2);
        break;

      case 2:
        // Simulate uncaught exception
        console.log(`  Worker ${cluster.worker.id}: Throwing uncaught exception`);
        throw new Error('Simulated crash!');
        break;
    }
  }, crashDelay);

  /**
   * Workers do their normal work
   * In a real application, this would be your HTTP server,
   * job processor, etc.
   */
  setInterval(() => {
    // Simulate work
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`  Worker ${cluster.worker.id}: Working... (Memory: ${Math.round(used)} MB)`);
  }, 3000);
}

/**
 * Key Takeaways:
 *
 * 1. The 'exit' event is fired when ANY worker dies
 *    - Includes crashes, kills, and normal exits
 *    - Provides exit code and signal information
 *
 * 2. Always restart workers in the exit handler
 *    - Maintains configured worker count
 *    - Keeps cluster operational
 *    - Provides fault tolerance
 *
 * 3. Exit information helps diagnose issues:
 *    - code: 0 = normal exit, non-zero = error
 *    - signal: e.g., 'SIGTERM', 'SIGKILL'
 *    - Use this to log and monitor issues
 *
 * 4. Resilience pattern:
 *    cluster.on('exit', (worker) => {
 *      cluster.fork(); // Simple but effective!
 *    });
 *
 * 5. Worker crashes don't affect other workers
 *    - Each worker is isolated
 *    - Other workers continue serving requests
 *    - Master process stays running
 *
 * 6. Preventing restart loops:
 *    - In production, track restart frequency
 *    - If workers restart too often, alert admins
 *    - May indicate code or resource issues
 *
 * Try this:
 * - Watch workers crash and restart automatically
 * - Note that the master process never dies
 * - Observe that other workers keep running
 * - Kill a worker manually: kill -9 <worker_pid>
 * - See how the worker count stays constant
 */
