/**
 * Exercise 5 Solution: Worker Communication
 *
 * This solution demonstrates:
 * - Inter-Process Communication (IPC) between master and workers
 * - Message passing patterns
 * - Worker status reporting
 * - Command handling
 * - Building responsive distributed systems
 *
 * Key Concepts Explained:
 * - process.send(): Workers send messages to master
 * - worker.send(): Master sends messages to specific worker
 * - cluster.on('message'): Master receives messages
 * - process.on('message'): Workers receive messages
 * - Structured message formats
 */

const cluster = require('cluster');

if (cluster.isMaster) {
  // === MASTER PROCESS ===

  console.log(`[Master] PID: ${process.pid}\n`);

  const NUM_WORKERS = 3;

  // Store worker status information
  const workerStatus = {};

  console.log('=== Forking Workers ===');

  // Fork workers
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork();

    // Initialize status tracking for this worker
    workerStatus[worker.id] = {
      id: worker.id,
      pid: worker.process.pid,
      ready: false,
      lastStatus: null,
      lastPong: null
    };
  }

  console.log('');

  /*
   * Listen for messages from workers
   * cluster.on('message') receives messages from any worker
   * Parameters:
   * - worker: The worker object that sent the message
   * - message: The message object sent by the worker
   */
  cluster.on('message', (worker, msg) => {
    // Handle different message types
    switch (msg.type) {
      case 'ready':
        handleReadyMessage(worker, msg);
        break;

      case 'status':
        handleStatusMessage(worker, msg);
        break;

      case 'pong':
        handlePongMessage(worker, msg);
        break;

      default:
        console.log(`[Master] Unknown message type from Worker ${worker.id}:`, msg.type);
    }
  });

  /**
   * Handle "ready" message from worker
   * Sent when worker finishes initialization
   */
  function handleReadyMessage(worker, msg) {
    console.log(
      `[Master] Worker ${msg.workerId} ready (PID: ${msg.pid})`
    );

    workerStatus[worker.id].ready = true;

    // Check if all workers are ready
    const allReady = Object.values(workerStatus).every(status => status.ready);
    if (allReady) {
      console.log(`[Master] All ${NUM_WORKERS} workers are ready!\n`);
    }
  }

  /**
   * Handle "status" message from worker
   * Workers send periodic status updates
   */
  function handleStatusMessage(worker, msg) {
    // Format memory in MB for readability
    const memoryMB = (msg.memory / 1024 / 1024).toFixed(2);

    console.log(
      `[Master] Status from Worker ${msg.workerId}: ` +
      `Memory: ${memoryMB} MB, Uptime: ${msg.uptime}s`
    );

    // Store the latest status
    workerStatus[worker.id].lastStatus = {
      memory: msg.memory,
      uptime: msg.uptime,
      timestamp: Date.now()
    };
  }

  /**
   * Handle "pong" message from worker
   * Response to ping messages
   */
  function handlePongMessage(worker, msg) {
    console.log(`[Master] Pong from Worker ${msg.workerId}`);

    // Calculate latency
    const latency = Date.now() - msg.timestamp;
    console.log(`[Master] Latency: ${latency}ms`);

    // Store pong time
    workerStatus[worker.id].lastPong = Date.now();
  }

  /*
   * Send ping to all workers periodically
   * This demonstrates master-to-worker communication
   */
  setInterval(() => {
    console.log('\n[Master] Sending ping to all workers...');

    // Iterate through all workers
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];

      // Send ping message to this worker
      worker.send({
        type: 'ping',
        timestamp: Date.now()
      });
    }
  }, 5000); // Every 5 seconds

  /*
   * Display worker status summary periodically
   * Shows aggregated information about all workers
   */
  setInterval(() => {
    console.log('\n=== Worker Status Summary ===');
    console.log(`Time: ${new Date().toLocaleTimeString()}`);
    console.log(`Active Workers: ${Object.keys(cluster.workers).length}/${NUM_WORKERS}`);
    console.log('');

    for (const id in workerStatus) {
      const status = workerStatus[id];
      const worker = cluster.workers[id];

      if (worker) {
        console.log(`Worker ${id}:`);
        console.log(`  Status: ${status.ready ? 'Ready' : 'Initializing'}`);
        console.log(`  PID: ${status.pid}`);

        if (status.lastStatus) {
          const memMB = (status.lastStatus.memory / 1024 / 1024).toFixed(2);
          console.log(`  Memory: ${memMB} MB`);
          console.log(`  Uptime: ${status.lastStatus.uptime}s`);
        }

        if (status.lastPong) {
          const pongAge = ((Date.now() - status.lastPong) / 1000).toFixed(1);
          console.log(`  Last Pong: ${pongAge}s ago`);
        }
        console.log('');
      }
    }
  }, 15000); // Every 15 seconds

  /*
   * Handle worker exit
   * Clean up status tracking and restart worker
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`\n[Master] Worker ${worker.id} exited (code: ${code})`);

    // Clean up status
    delete workerStatus[worker.id];

    // Restart worker
    console.log('[Master] Starting replacement worker...');
    const newWorker = cluster.fork();

    // Initialize status for new worker
    workerStatus[newWorker.id] = {
      id: newWorker.id,
      pid: newWorker.process.pid,
      ready: false,
      lastStatus: null,
      lastPong: null
    };
  });

} else {
  // === WORKER PROCESS ===

  console.log(`[Worker ${cluster.worker.id}] Starting (PID: ${process.pid})`);

  /*
   * Send "ready" message to master when worker is initialized
   * This signals that the worker is ready to start working
   */
  process.send({
    type: 'ready',
    workerId: cluster.worker.id,
    pid: process.pid
  });

  console.log(`[Worker ${cluster.worker.id}] Sent ready message to master`);

  /*
   * Send status updates to master periodically
   * This allows master to monitor worker health
   */
  setInterval(() => {
    // Gather worker metrics
    const memoryUsage = process.memoryUsage().heapUsed;
    const uptime = Math.floor(process.uptime());

    // Send status message to master
    process.send({
      type: 'status',
      workerId: cluster.worker.id,
      memory: memoryUsage,
      uptime: uptime
    });

    console.log(
      `[Worker ${cluster.worker.id}] Sent status update: ` +
      `${(memoryUsage / 1024 / 1024).toFixed(2)} MB, ${uptime}s uptime`
    );
  }, 3000); // Every 3 seconds

  /*
   * Listen for messages from master
   * process.on('message') receives messages sent by master
   */
  process.on('message', (msg) => {
    switch (msg.type) {
      case 'ping':
        handlePingMessage(msg);
        break;

      default:
        console.log(`[Worker ${cluster.worker.id}] Unknown message:`, msg.type);
    }
  });

  /**
   * Handle "ping" message from master
   * Respond with "pong"
   */
  function handlePingMessage(msg) {
    console.log(`[Worker ${cluster.worker.id}] Received ping`);

    // Respond with pong
    process.send({
      type: 'pong',
      workerId: cluster.worker.id,
      timestamp: msg.timestamp // Echo back timestamp for latency calculation
    });

    console.log(`[Worker ${cluster.worker.id}] Sent pong to master`);
  }

  /*
   * Simulate some work
   * In a real application, this would be:
   * - Handling HTTP requests
   * - Processing jobs from a queue
   * - Performing computations
   * - Managing WebSocket connections
   */
  setInterval(() => {
    // Simulate work by doing nothing
    // Real work would go here
  }, 1000);
}

/**
 * BONUS CHALLENGE SOLUTIONS
 */

/*
// Bonus 1: Implement shutdown command

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log(`[Master] PID: ${process.pid}\n`);

  for (let i = 0; i < 3; i++) {
    cluster.fork();
  }

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'ready') {
      console.log(`[Master] Worker ${worker.id} ready`);
    }
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} exited`);

    if (!worker.exitedAfterDisconnect) {
      console.log('[Master] Restarting crashed worker...');
      cluster.fork();
    }
  });

  // Shutdown specific worker command
  // Example: shutdown worker 2 after 10 seconds
  setTimeout(() => {
    const targetWorkerId = 2;
    const targetWorker = Object.values(cluster.workers).find(w => w.id === targetWorkerId);

    if (targetWorker) {
      console.log(`\n[Master] Sending shutdown command to Worker ${targetWorkerId}`);
      targetWorker.send({ type: 'shutdown' });
    }
  }, 10000);

} else {
  console.log(`[Worker ${cluster.worker.id}] Started`);

  process.send({
    type: 'ready',
    workerId: cluster.worker.id
  });

  // Listen for shutdown command
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      console.log(`[Worker ${cluster.worker.id}] Received shutdown command`);
      console.log(`[Worker ${cluster.worker.id}] Cleaning up...`);

      // Clean up resources
      setTimeout(() => {
        console.log(`[Worker ${cluster.worker.id}] Exiting gracefully`);
        process.exit(0);
      }, 1000);
    }
  });

  // Simulate work
  setInterval(() => {
    console.log(`[Worker ${cluster.worker.id}] Working...`);
  }, 3000);
}
*/

/*
// Bonus 2: Health check system with timeout

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log(`[Master] PID: ${process.pid}\n`);

  const workerHealth = {};

  for (let i = 0; i < 3; i++) {
    const worker = cluster.fork();
    workerHealth[worker.id] = { lastHealthCheck: Date.now() };
  }

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'health-check-response') {
      console.log(`[Master] Worker ${worker.id} is healthy`);
      workerHealth[worker.id].lastHealthCheck = Date.now();
    }
  });

  // Send health checks every 10 seconds
  setInterval(() => {
    console.log('\n[Master] Sending health checks...');

    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      worker.send({ type: 'health-check' });

      // Set timeout for health check response
      setTimeout(() => {
        const lastCheck = workerHealth[id].lastHealthCheck;
        const timeSinceCheck = Date.now() - lastCheck;

        // If no response in 2 seconds, kill worker
        if (timeSinceCheck > 2000) {
          console.log(`[Master] Worker ${id} failed health check. Killing...`);
          worker.kill();
        }
      }, 2000);
    }
  }, 10000);

  cluster.on('exit', (worker) => {
    console.log(`[Master] Worker ${worker.id} died. Restarting...`);
    delete workerHealth[worker.id];

    const newWorker = cluster.fork();
    workerHealth[newWorker.id] = { lastHealthCheck: Date.now() };
  });

} else {
  console.log(`[Worker ${cluster.worker.id}] Started`);

  process.on('message', (msg) => {
    if (msg.type === 'health-check') {
      console.log(`[Worker ${cluster.worker.id}] Health check received`);

      // Respond to health check
      process.send({
        type: 'health-check-response',
        workerId: cluster.worker.id
      });
    }
  });
}
*/

/*
// Bonus 3: Worker-to-worker communication via master

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log(`[Master] PID: ${process.pid}\n`);

  for (let i = 0; i < 3; i++) {
    cluster.fork();
  }

  // Route messages between workers
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'worker-message') {
      console.log(`[Master] Routing message from Worker ${worker.id} to Worker ${msg.targetWorkerId}`);

      const targetWorker = Object.values(cluster.workers).find(w => w.id === msg.targetWorkerId);

      if (targetWorker) {
        targetWorker.send({
          type: 'worker-message',
          fromWorkerId: worker.id,
          data: msg.data
        });
      } else {
        console.log(`[Master] Target worker ${msg.targetWorkerId} not found`);
      }
    }
  });

} else {
  console.log(`[Worker ${cluster.worker.id}] Started`);

  // Send message to another worker
  if (cluster.worker.id === 1) {
    setTimeout(() => {
      console.log(`[Worker 1] Sending message to Worker 2`);
      process.send({
        type: 'worker-message',
        targetWorkerId: 2,
        data: { message: 'Hello from Worker 1!' }
      });
    }, 3000);
  }

  // Receive messages from other workers
  process.on('message', (msg) => {
    if (msg.type === 'worker-message') {
      console.log(`[Worker ${cluster.worker.id}] Received message from Worker ${msg.fromWorkerId}:`, msg.data);

      // Send response back
      process.send({
        type: 'worker-message',
        targetWorkerId: msg.fromWorkerId,
        data: { message: `Response from Worker ${cluster.worker.id}` }
      });
    }
  });
}
*/

/*
// Bonus 4: Task distribution system

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log(`[Master] PID: ${process.pid}\n`);

  // Task queue
  const taskQueue = [];
  for (let i = 1; i <= 20; i++) {
    taskQueue.push({ id: i, data: `Task ${i}` });
  }

  // Track assigned tasks
  const assignedTasks = {};

  for (let i = 0; i < 3; i++) {
    cluster.fork();
  }

  // Handle task requests and completions
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'ready') {
      console.log(`[Master] Worker ${worker.id} is ready`);
      assignTask(worker);
    } else if (msg.type === 'task-complete') {
      console.log(`[Master] Worker ${worker.id} completed task ${msg.taskId}`);
      delete assignedTasks[msg.taskId];
      assignTask(worker);
    } else if (msg.type === 'request-task') {
      assignTask(worker);
    }
  });

  function assignTask(worker) {
    if (taskQueue.length > 0) {
      const task = taskQueue.shift();
      assignedTasks[task.id] = { workerId: worker.id, task };

      console.log(`[Master] Assigning task ${task.id} to Worker ${worker.id}`);
      worker.send({
        type: 'task',
        task: task
      });
    } else {
      console.log(`[Master] No more tasks for Worker ${worker.id}`);
      worker.send({ type: 'no-tasks' });
    }
  }

  cluster.on('exit', (worker) => {
    console.log(`[Master] Worker ${worker.id} died`);

    // Reassign its tasks
    for (const [taskId, assignment] of Object.entries(assignedTasks)) {
      if (assignment.workerId === worker.id) {
        taskQueue.unshift(assignment.task);
        delete assignedTasks[taskId];
      }
    }

    cluster.fork();
  });

} else {
  console.log(`[Worker ${cluster.worker.id}] Started`);

  // Signal ready
  process.send({
    type: 'ready',
    workerId: cluster.worker.id
  });

  // Handle tasks
  process.on('message', (msg) => {
    if (msg.type === 'task') {
      console.log(`[Worker ${cluster.worker.id}] Processing task ${msg.task.id}`);

      // Simulate work (1-3 seconds)
      setTimeout(() => {
        console.log(`[Worker ${cluster.worker.id}] Completed task ${msg.task.id}`);

        process.send({
          type: 'task-complete',
          taskId: msg.task.id,
          workerId: cluster.worker.id
        });
      }, Math.random() * 2000 + 1000);

    } else if (msg.type === 'no-tasks') {
      console.log(`[Worker ${cluster.worker.id}] No more tasks available`);
    }
  });
}
*/

/**
 * LEARNING POINTS
 *
 * 1. IPC Basics:
 *    - process.send() in workers sends to master
 *    - worker.send() in master sends to specific worker
 *    - Messages are JavaScript objects (JSON-serializable)
 *    - IPC channel is established automatically by cluster module
 *
 * 2. Message Patterns:
 *    - Request-Response: ping-pong pattern
 *    - Event Notification: status updates
 *    - Command: master commanding workers
 *    - Broadcast: master to all workers
 *
 * 3. Message Structure:
 *    - Always include message 'type' field
 *    - Include sender identification
 *    - Add timestamps for latency tracking
 *    - Keep messages small and focused
 *
 * 4. Communication Flow:
 *    - Master ↔ Worker: Direct via IPC
 *    - Worker ↔ Worker: Via master (routing)
 *    - Master can broadcast to all workers
 *    - Workers can only send to master
 *
 * 5. Use Cases:
 *    - Health monitoring
 *    - Configuration updates
 *    - Graceful shutdown coordination
 *    - Task distribution
 *    - Metrics collection
 */

/**
 * PRODUCTION BEST PRACTICES
 *
 * 1. Message Design:
 *    ✅ Use typed messages (type field)
 *    ✅ Keep messages small
 *    ✅ Include version for schema evolution
 *    ✅ Validate message structure
 *
 * 2. Error Handling:
 *    ✅ Handle invalid messages
 *    ✅ Set timeouts for responses
 *    ✅ Implement retry logic
 *    ✅ Log communication errors
 *
 * 3. Performance:
 *    ✅ Don't overuse messaging
 *    ✅ Batch updates when possible
 *    ✅ Use external stores for large data
 *    ✅ Monitor message frequency
 *
 * 4. Monitoring:
 *    ✅ Track message latency
 *    ✅ Monitor message volume
 *    ✅ Log important messages
 *    ✅ Alert on communication failures
 *
 * 5. Patterns:
 *    ✅ Implement heartbeat/ping for liveness
 *    ✅ Use status messages for health
 *    ✅ Support graceful shutdown commands
 *    ✅ Enable runtime configuration updates
 */

/**
 * COMMON PATTERNS
 *
 * 1. Health Check Pattern:
 *    Master sends periodic health checks
 *    Workers must respond within timeout
 *    Non-responsive workers are restarted
 *
 * 2. Status Reporting Pattern:
 *    Workers send periodic status updates
 *    Master aggregates and displays
 *    Used for monitoring dashboards
 *
 * 3. Command Pattern:
 *    Master sends commands to workers
 *    Workers execute and respond
 *    Used for configuration updates, shutdowns
 *
 * 4. Request-Response Pattern:
 *    One side sends request
 *    Other side processes and responds
 *    Include request ID for matching
 *
 * 5. Broadcast Pattern:
 *    Master sends to all workers
 *    Used for config updates, shutdowns
 *    Workers may or may not respond
 */
