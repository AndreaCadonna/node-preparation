/**
 * Example 6: Basic Worker Communication (IPC)
 *
 * This example demonstrates Inter-Process Communication (IPC) between
 * master and worker processes. IPC is essential for coordinating
 * distributed work across the cluster.
 *
 * Key concepts:
 * - Sending messages from master to workers
 * - Sending messages from workers to master
 * - Message handling patterns
 * - Command-based communication
 *
 * Run this: node 06-worker-communication.js
 */

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  console.log('=== INTER-PROCESS COMMUNICATION ===\n');
  console.log(`Master PID: ${process.pid}\n`);

  const NUM_WORKERS = 3;
  const workers = [];

  /**
   * Create workers and store references
   */
  console.log('Creating workers...\n');
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    console.log(`✓ Created worker ${worker.id} (PID ${worker.process.pid})`);
  }

  /**
   * Listen for messages from ALL workers
   * Each message includes the worker object that sent it
   */
  cluster.on('message', (worker, message) => {
    console.log(`\n[Master] Received from Worker ${worker.id}:`);
    console.log('  Type:', message.type);
    console.log('  Data:', message.data);

    // Handle different message types
    switch (message.type) {
      case 'ready':
        console.log(`  → Worker ${worker.id} is ready for work`);
        break;

      case 'status':
        console.log(`  → Worker ${worker.id} status update:`, message.data);
        break;

      case 'request_data':
        console.log(`  → Worker ${worker.id} requesting data`);
        // Send data back to the worker
        worker.send({
          type: 'data_response',
          data: { timestamp: Date.now(), config: { timeout: 5000 } }
        });
        break;

      case 'task_complete':
        console.log(`  → Worker ${worker.id} completed task:`, message.data);
        break;

      default:
        console.log(`  → Unknown message type`);
    }
  });

  /**
   * Demonstration: Send messages to workers
   */

  // 1. Send message to all workers (broadcast)
  setTimeout(() => {
    console.log('\n=== BROADCASTING TO ALL WORKERS ===\n');

    for (const id in cluster.workers) {
      cluster.workers[id].send({
        type: 'broadcast',
        data: 'This message goes to all workers'
      });
    }
  }, 2000);

  // 2. Send message to specific worker
  setTimeout(() => {
    console.log('\n=== SENDING TO SPECIFIC WORKER ===\n');

    const targetWorker = cluster.workers[1];
    if (targetWorker) {
      targetWorker.send({
        type: 'task',
        data: { taskId: 'TASK-001', action: 'process_data' }
      });
    }
  }, 4000);

  // 3. Send different messages to each worker
  setTimeout(() => {
    console.log('\n=== SENDING DIFFERENT MESSAGES ===\n');

    workers.forEach((worker, index) => {
      worker.send({
        type: 'individual_task',
        data: { workerId: worker.id, taskNumber: index + 1 }
      });
    });
  }, 6000);

  // 4. Request-response pattern
  setTimeout(() => {
    console.log('\n=== REQUEST-RESPONSE PATTERN ===\n');

    const worker = cluster.workers[2];
    if (worker) {
      // Send request
      worker.send({
        type: 'compute',
        data: { operation: 'sum', values: [1, 2, 3, 4, 5] }
      });

      // Wait for response (already handled in cluster.on('message'))
    }
  }, 8000);

  console.log('\nPress Ctrl+C to exit\n');

} else {
  /**
   * Worker process
   * Handle incoming messages from master
   */

  console.log(`  Worker ${cluster.worker.id} started (PID ${process.pid})`);

  /**
   * Listen for messages from master
   * Workers use process.on('message') instead of cluster.on()
   */
  process.on('message', (message) => {
    console.log(`\n[Worker ${cluster.worker.id}] Received message:`);
    console.log('  Type:', message.type);
    console.log('  Data:', message.data);

    // Handle different message types
    switch (message.type) {
      case 'broadcast':
        console.log(`  → Got broadcast message`);
        break;

      case 'task':
        console.log(`  → Processing task: ${message.data.taskId}`);
        // Simulate task processing
        setTimeout(() => {
          process.send({
            type: 'task_complete',
            data: { taskId: message.data.taskId, result: 'success' }
          });
        }, 1000);
        break;

      case 'individual_task':
        console.log(`  → Processing individual task #${message.data.taskNumber}`);
        break;

      case 'compute':
        console.log(`  → Computing ${message.data.operation}`);
        // Perform computation
        const result = message.data.values.reduce((a, b) => a + b, 0);
        // Send result back
        process.send({
          type: 'compute_result',
          data: { operation: message.data.operation, result }
        });
        break;

      case 'data_response':
        console.log(`  → Received requested data:`, message.data);
        break;

      default:
        console.log(`  → Unknown message type`);
    }
  });

  /**
   * Workers can send messages to master at any time
   */

  // Send ready message
  setTimeout(() => {
    process.send({
      type: 'ready',
      data: { workerId: cluster.worker.id, pid: process.pid }
    });
  }, 1000);

  // Send periodic status updates
  setInterval(() => {
    process.send({
      type: 'status',
      data: {
        workerId: cluster.worker.id,
        memory: process.memoryUsage().heapUsed,
        uptime: process.uptime()
      }
    });
  }, 10000);

  // Request data from master
  setTimeout(() => {
    process.send({
      type: 'request_data',
      data: { what: 'configuration' }
    });
  }, 3000);
}

/**
 * Key Takeaways:
 *
 * 1. Master → Worker Communication:
 *    worker.send(message)           // To specific worker
 *    cluster.workers[id].send(msg)  // By worker ID
 *
 * 2. Worker → Master Communication:
 *    process.send(message)           // From worker to master
 *
 * 3. Receiving Messages:
 *    Master:  cluster.on('message', (worker, msg) => {...})
 *    Worker:  process.on('message', (msg) => {...})
 *
 * 4. Message Structure:
 *    Messages should be plain objects
 *    Include 'type' field for message routing
 *    Include 'data' field for payload
 *    Example: { type: 'task', data: {...} }
 *
 * 5. Communication Patterns:
 *
 *    a) Broadcast:
 *       for (id in cluster.workers) {
 *         cluster.workers[id].send(msg);
 *       }
 *
 *    b) Targeted:
 *       cluster.workers[specificId].send(msg);
 *
 *    c) Request-Response:
 *       // Master sends request
 *       worker.send({ type: 'request', id: 123 });
 *       // Worker sends response
 *       process.send({ type: 'response', id: 123, data: ... });
 *
 *    d) Event-based:
 *       // Worker reports events
 *       process.send({ type: 'event', name: 'user_login' });
 *
 * 6. Use Cases for IPC:
 *    - Sending configuration updates to workers
 *    - Collecting metrics from workers
 *    - Coordinating tasks across workers
 *    - Broadcasting system events
 *    - Implementing graceful shutdown
 *    - Health checks and monitoring
 *
 * 7. Limitations:
 *    - Workers cannot message each other directly
 *    - Must go through master process
 *    - Messages are serialized (no functions/circular refs)
 *    - For shared state, use external store (Redis, DB)
 *
 * 8. Best Practices:
 *    - Use consistent message format
 *    - Include message type for routing
 *    - Handle unknown message types
 *    - Implement timeouts for responses
 *    - Log message traffic for debugging
 *
 * Try this:
 * - Watch messages flow between master and workers
 * - Notice the different communication patterns
 * - Observe request-response pattern
 * - Try modifying message payloads
 * - Add new message types
 */
