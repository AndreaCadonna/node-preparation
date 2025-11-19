/**
 * Exercise 1 Solution: Create Your First Cluster
 *
 * This solution demonstrates the fundamental concepts of Node.js clustering:
 * - Process identification (master vs worker)
 * - Forking worker processes
 * - Basic logging and process information
 *
 * Key Concepts Explained:
 * - cluster.isMaster: Returns true if current process is the master
 * - cluster.fork(): Creates a new worker process
 * - process.pid: Returns the process ID of the current process
 * - cluster.worker.id: Returns the unique ID of the worker process
 */

const cluster = require('cluster');

// Check if this is the master process or a worker process
if (cluster.isMaster) {
  // === MASTER PROCESS ===
  // The master process is responsible for forking workers
  // and managing the cluster lifecycle

  console.log(`Master process started with PID: ${process.pid}`);

  // Fork exactly 2 workers as required
  // Each fork() creates a new Node.js process running this same file
  for (let i = 0; i < 2; i++) {
    const worker = cluster.fork();

    // Log worker information when it's created
    // worker.process.pid gives us the process ID of the forked worker
    console.log(`Worker ${worker.id} started with PID: ${worker.process.pid}`);
  }

  /*
   * Understanding the Flow:
   * 1. Master process starts and executes this block
   * 2. cluster.fork() creates 2 new Node.js processes
   * 3. Each new process runs this same file from the beginning
   * 4. In the new processes, cluster.isMaster is false, so they execute the else block
   * 5. Master logs when each worker is created
   */

} else {
  // === WORKER PROCESS ===
  // This code runs in each worker process

  // In worker processes, cluster.worker gives us information about this worker
  // cluster.worker.id is a unique identifier assigned by the cluster module
  console.log(`Worker ${cluster.worker.id} started with PID: ${process.pid}`);

  /*
   * Worker Process Notes:
   * - Each worker is a separate Node.js process
   * - Workers can run independently and handle different tasks
   * - Workers share the same code but have separate memory spaces
   * - Each worker has its own process.pid
   * - Worker IDs start from 1 and increment
   */
}

/*
 * Expected Output:
 * Master process started with PID: 12345
 * Worker 1 started with PID: 12346
 * Worker 2 started with PID: 12347
 *
 * Note: PIDs will vary each time you run the program
 * The order of worker log messages may vary due to process timing
 */

/**
 * BONUS CHALLENGE SOLUTIONS
 * Uncomment the sections below to implement bonus features
 */

/*
// Bonus 1: Configurable number of workers via command line
// Usage: node exercise-1-solution.js 3

const cluster = require('cluster');

if (cluster.isMaster) {
  // Get number of workers from command line, default to 2
  const numWorkers = parseInt(process.argv[2]) || 2;

  console.log(`Master process started with PID: ${process.pid}`);
  console.log(`Creating ${numWorkers} workers...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    console.log(`Worker ${worker.id} started with PID: ${worker.process.pid}`);
  }
} else {
  console.log(`Worker ${cluster.worker.id} started with PID: ${process.pid}`);
}
*/

/*
// Bonus 2: Add timestamps to log messages

const cluster = require('cluster');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

if (cluster.isMaster) {
  log(`Master process started with PID: ${process.pid}`);

  for (let i = 0; i < 2; i++) {
    const worker = cluster.fork();
    log(`Worker ${worker.id} started with PID: ${worker.process.pid}`);
  }
} else {
  log(`Worker ${cluster.worker.id} started with PID: ${process.pid}`);
}
*/

/*
// Bonus 3: Workers print heartbeat messages

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log(`Master process started with PID: ${process.pid}`);

  for (let i = 0; i < 2; i++) {
    const worker = cluster.fork();
    console.log(`Worker ${worker.id} started with PID: ${worker.process.pid}`);
  }
} else {
  console.log(`Worker ${cluster.worker.id} started with PID: ${process.pid}`);

  // Send heartbeat every 2 seconds
  setInterval(() => {
    console.log(`Worker ${cluster.worker.id} is alive - ${new Date().toLocaleTimeString()}`);
  }, 2000);
}

// To run this, press Ctrl+C to stop after observing the heartbeats
*/

/**
 * LEARNING POINTS
 *
 * 1. Process Separation:
 *    - Master and workers are completely separate processes
 *    - They have different PIDs and separate memory spaces
 *    - Communication between them requires IPC (Inter-Process Communication)
 *
 * 2. Code Sharing:
 *    - All processes run the same code file
 *    - cluster.isMaster determines which code path to execute
 *    - This pattern is fundamental to all clustering applications
 *
 * 3. Worker IDs vs PIDs:
 *    - Worker IDs are logical identifiers (1, 2, 3, ...)
 *    - PIDs are OS-level process identifiers (unique numbers)
 *    - Use worker IDs for application logic, PIDs for debugging
 *
 * 4. Process Creation:
 *    - cluster.fork() is similar to child_process.fork()
 *    - It creates a new Node.js process with IPC channel
 *    - Worker creation is asynchronous
 *
 * 5. Typical Use Cases:
 *    - Web servers (distribute HTTP requests)
 *    - CPU-intensive tasks (parallel processing)
 *    - High-availability applications (fault tolerance)
 */

/**
 * COMMON MISTAKES TO AVOID
 *
 * 1. Infinite forking:
 *    ❌ cluster.fork() without checking cluster.isMaster
 *    ✅ Always fork only in master process
 *
 * 2. Assuming synchronous execution:
 *    ❌ Expecting workers to be ready immediately after fork()
 *    ✅ Use events like 'online' or 'listening' to know when ready
 *
 * 3. Confusing worker.id with worker.process.pid:
 *    - worker.id is a cluster-specific identifier
 *    - worker.process.pid is the OS process ID
 *
 * 4. Not handling worker exits:
 *    ❌ Forking workers without monitoring their lifecycle
 *    ✅ Listen for 'exit' events and implement restart logic
 */
