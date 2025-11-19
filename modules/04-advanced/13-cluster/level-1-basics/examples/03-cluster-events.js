/**
 * Example 3: Cluster Events
 *
 * This example demonstrates the various events emitted by the cluster module.
 * Understanding these events is essential for managing cluster lifecycle.
 *
 * Key concepts:
 * - Worker lifecycle events
 * - Event listeners
 * - Worker state transitions
 *
 * Run this: node 03-cluster-events.js
 */

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('=== CLUSTER EVENTS DEMONSTRATION ===');
  console.log(`Master PID: ${process.pid}\n`);

  /**
   * Event 1: 'fork'
   * Emitted when a new worker is forked
   * This is the first event in the worker lifecycle
   */
  cluster.on('fork', (worker) => {
    console.log(`[fork] Worker ${worker.id} is being forked`);
  });

  /**
   * Event 2: 'online'
   * Emitted when a worker sends an online message
   * Worker process has started but may not be ready to work yet
   */
  cluster.on('online', (worker) => {
    console.log(`[online] Worker ${worker.id} (PID ${worker.process.pid}) is online`);
  });

  /**
   * Event 3: 'listening'
   * Emitted when a worker calls listen()
   * Worker is now ready to accept connections
   */
  cluster.on('listening', (worker, address) => {
    console.log(`[listening] Worker ${worker.id} is listening on ${address.address}:${address.port}`);
  });

  /**
   * Event 4: 'disconnect'
   * Emitted when a worker disconnects
   * Worker is shutting down but hasn't exited yet
   */
  cluster.on('disconnect', (worker) => {
    console.log(`[disconnect] Worker ${worker.id} has disconnected`);
  });

  /**
   * Event 5: 'exit'
   * Emitted when a worker exits
   * This is the last event in the worker lifecycle
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[exit] Worker ${worker.id} died with code ${code} and signal ${signal}`);
  });

  /**
   * Event 6: 'message'
   * Emitted when master receives a message from a worker
   */
  cluster.on('message', (worker, message) => {
    console.log(`[message] Master received from worker ${worker.id}:`, message);
  });

  console.log('Event listeners registered\n');
  console.log('=== CREATING WORKERS ===\n');

  // Fork 2 workers
  for (let i = 0; i < 2; i++) {
    cluster.fork();
  }

  // After 3 seconds, demonstrate disconnect and exit
  setTimeout(() => {
    console.log('\n=== DEMONSTRATING DISCONNECT AND EXIT ===\n');

    const workerId = 1;
    const worker = cluster.workers[workerId];

    if (worker) {
      console.log(`Disconnecting worker ${workerId}...\n`);
      worker.disconnect(); // This triggers 'disconnect' then 'exit' events
    }
  }, 3000);

  // After 5 seconds, show summary and exit
  setTimeout(() => {
    console.log('\n=== EVENT LIFECYCLE SUMMARY ===');
    console.log('Worker lifecycle events in order:');
    console.log('1. fork      - Worker is being created');
    console.log('2. online    - Worker process has started');
    console.log('3. listening - Worker is ready for connections');
    console.log('4. disconnect- Worker is shutting down');
    console.log('5. exit      - Worker has terminated');
    console.log('\nPress Ctrl+C to exit');
  }, 5000);

} else {
  // Worker process
  const http = require('http');

  console.log(`  Worker ${cluster.worker.id} started (PID ${process.pid})`);

  // Send a message to master
  process.send({ type: 'info', message: 'Worker initialized' });

  // Create HTTP server to trigger 'listening' event
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Response from worker ${cluster.worker.id}\n`);
  });

  server.listen(8000, () => {
    console.log(`  Worker ${cluster.worker.id} is listening on port 8000`);
  });

  // Handle graceful shutdown
  process.on('disconnect', () => {
    console.log(`  Worker ${cluster.worker.id} received disconnect signal`);
    server.close();
  });
}

/**
 * Key Takeaways:
 *
 * 1. Worker Lifecycle Events (in order):
 *    fork → online → listening → disconnect → exit
 *
 * 2. Event Usage:
 *    - 'fork': Track worker creation
 *    - 'online': Know when worker starts
 *    - 'listening': Know when worker is ready
 *    - 'disconnect': Detect graceful shutdown
 *    - 'exit': Detect worker termination
 *    - 'message': Receive worker messages
 *
 * 3. All events fire in the MASTER process
 *    Workers cannot listen to cluster events
 *    Workers use process events instead
 *
 * 4. Event Data:
 *    - All events receive worker object
 *    - 'listening' receives address info
 *    - 'exit' receives exit code and signal
 *    - 'message' receives the message data
 *
 * 5. Practical Uses:
 *    - Logging and monitoring
 *    - Automatic worker restart
 *    - Graceful shutdown handling
 *    - Resource tracking
 *
 * Try this:
 * - Watch the event sequence as workers start
 * - Note the timing of each event
 * - See how disconnect triggers exit
 * - Try sending different messages from workers
 */
