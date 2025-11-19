/**
 * Example 2: Worker Identification
 *
 * This example shows different ways to identify and track worker processes.
 * Understanding worker identification is crucial for managing clusters.
 *
 * Key concepts:
 * - Worker IDs vs Process IDs
 * - Accessing worker information
 * - Tracking worker references
 *
 * Run this: node 02-worker-identification.js
 */

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  console.log('=== MASTER PROCESS ===');
  console.log(`Master PID: ${process.pid}\n`);

  // Keep track of workers
  const workers = [];

  // Fork 4 workers
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork();
    workers.push(worker);

    console.log(`Forked worker:`);
    console.log(`  - Worker ID: ${worker.id}`);
    console.log(`  - Process ID: ${worker.process.pid}`);
    console.log(`  - Worker state: ${worker.state}`);
    console.log();
  }

  console.log('=== WORKER INFORMATION ===\n');

  // Access all workers via cluster.workers object
  console.log('All workers (via cluster.workers):');
  for (const id in cluster.workers) {
    const worker = cluster.workers[id];
    console.log(`Worker ${id}: PID ${worker.process.pid}, State: ${worker.state}`);
  }

  console.log(`\nTotal workers: ${Object.keys(cluster.workers).length}`);

  // You can also access workers from the array we created
  console.log('\nWorkers from array:');
  workers.forEach((worker, index) => {
    console.log(`Worker ${index}: ID ${worker.id}, PID ${worker.process.pid}`);
  });

  // Demonstrate worker lifecycle states
  console.log('\n=== WORKER STATES ===');
  console.log('Possible worker states:');
  console.log('  - "online": Worker is running');
  console.log('  - "listening": Worker is listening for connections');
  console.log('  - "disconnected": Worker is disconnected');
  console.log('  - "dead": Worker has exited');

  // Wait a moment, then check states again
  setTimeout(() => {
    console.log('\nCurrent worker states:');
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      console.log(`Worker ${id}: ${worker.state}`);
    }

    console.log('\nPress Ctrl+C to exit');
  }, 1000);

} else {
  // Worker process
  console.log('=== WORKER PROCESS ===');
  console.log(`I am a worker!`);
  console.log(`  - My worker ID: ${cluster.worker.id}`);
  console.log(`  - My process ID: ${process.pid}`);
  console.log(`  - I am unique: cluster.isWorker = ${cluster.isWorker}`);
  console.log(`  - I am not master: cluster.isMaster = ${cluster.isMaster}`);
  console.log();

  // Workers can only access their own worker object
  // cluster.workers is undefined in worker processes
  console.log(`  - cluster.workers (in worker): ${cluster.workers}`); // undefined
  console.log(`  - cluster.worker (in worker): [Worker object]`);
}

/**
 * Key Takeaways:
 *
 * 1. Worker Identification:
 *    - Worker ID: Cluster-assigned sequential ID (1, 2, 3, ...)
 *    - Process ID: OS-assigned process identifier (varies)
 *
 * 2. In Master Process:
 *    - Access all workers via cluster.workers
 *    - cluster.workers is an object: { '1': Worker, '2': Worker, ... }
 *    - Can send messages to specific workers
 *
 * 3. In Worker Process:
 *    - Access own worker via cluster.worker
 *    - cluster.workers is undefined
 *    - Can only see own ID and PID
 *
 * 4. Worker States:
 *    - Track lifecycle of each worker
 *    - Useful for monitoring and management
 *
 * 5. Accessing Workers:
 *    - cluster.workers[id] - Get specific worker by ID
 *    - Object.keys(cluster.workers).length - Count workers
 *    - for...in loop - Iterate over all workers
 *
 * Try this:
 * - Note the difference between Worker ID and Process ID
 * - Observe that Worker IDs are sequential (1, 2, 3, 4)
 * - Notice that Process IDs are OS-assigned
 * - Compare master output vs worker output
 */
