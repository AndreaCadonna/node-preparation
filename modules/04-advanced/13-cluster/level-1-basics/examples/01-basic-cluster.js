/**
 * Example 1: Basic Cluster Setup
 *
 * This example demonstrates the most basic cluster setup in Node.js.
 * It creates multiple worker processes that can handle requests in parallel.
 *
 * Key concepts:
 * - Checking if process is master or worker
 * - Forking worker processes
 * - Understanding process separation
 *
 * Run this: node 01-basic-cluster.js
 */

const cluster = require('cluster');
const os = require('os');

// Get number of CPU cores
const numCPUs = os.cpus().length;

console.log(`System has ${numCPUs} CPU cores`);

/**
 * The cluster module allows us to create two types of processes:
 * 1. Master process - Coordinates and manages workers
 * 2. Worker processes - Do the actual work
 */

if (cluster.isMaster) {
  // This code runs ONLY in the master process
  console.log(`Master process ${process.pid} is running`);
  console.log('Creating worker processes...\n');

  // Fork workers - create one worker per CPU core
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`✓ Forked worker ${worker.process.pid}`);
  }

  console.log(`\n✓ Master has forked ${numCPUs} workers`);
  console.log('Press Ctrl+C to exit\n');

} else {
  // This code runs ONLY in worker processes
  console.log(`  → Worker ${process.pid} started`);

  // Each worker does its own work
  // In this example, workers just exist and wait
  // In real applications, workers would handle HTTP requests, etc.

  // Simulate some work
  setInterval(() => {
    console.log(`  → Worker ${process.pid} is alive`);
  }, 5000);
}

/**
 * Key Takeaways:
 *
 * 1. The same script runs in all processes (master + workers)
 * 2. cluster.isMaster identifies the master process
 * 3. cluster.isWorker identifies worker processes
 * 4. cluster.fork() creates a new worker process
 * 5. Each process has a unique process.pid (process ID)
 * 6. Workers run independently with separate memory
 *
 * Output explanation:
 * - You'll see the master process create workers
 * - Each worker announces itself
 * - Workers periodically print they're alive
 * - All processes run simultaneously
 *
 * Try this:
 * - Run the script and observe multiple processes
 * - Check CPU usage in task manager/activity monitor
 * - Note that each worker has a different PID
 * - Try killing a worker: kill -9 <worker_pid>
 */
