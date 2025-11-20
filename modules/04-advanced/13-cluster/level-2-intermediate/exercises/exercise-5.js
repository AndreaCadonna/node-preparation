/**
 * Exercise 5: Worker Pool with Task Distribution
 *
 * Objective:
 * Build a worker pool that manages a task queue and distributes
 * CPU-intensive tasks across available workers.
 *
 * Requirements:
 * 1. Create a cluster with 4 workers
 * 2. Master maintains a task queue (FIFO)
 * 3. Track worker availability (busy/available)
 * 4. Assign tasks to available workers
 * 5. Queue tasks when all workers are busy
 * 6. Track task state (queued, processing, completed, failed)
 * 7. Implement backpressure (max queue size: 20)
 * 8. Support multiple task types
 *
 * HTTP API:
 * - POST /task - Submit a task (body: {type, n})
 *   - Types: 'fibonacci', 'prime', 'hash'
 * - GET /task/:id - Get task status and result
 * - GET /stats - Pool statistics
 *
 * Task Types:
 * - fibonacci: Calculate nth Fibonacci number (recursive)
 * - prime: Check if n is prime
 * - hash: Generate hash of random data
 *
 * Expected Behavior:
 * - Submit task → Returns taskId immediately
 * - Task queued if all workers busy
 * - Workers process tasks in FIFO order
 * - Can check task status by taskId
 * - Returns 429 if queue is full
 *
 * Test:
 * 1. Start: node exercise-5.js
 * 2. Submit task: curl -X POST http://localhost:8000/task -d '{"type":"fibonacci","n":40}'
 * 3. Check status: curl http://localhost:8000/task/<task-id>
 * 4. View stats: curl http://localhost:8000/stats
 *
 * Bonus Challenges:
 * 1. Add task priorities
 * 2. Implement task cancellation
 * 3. Add progress reporting for long tasks
 * 4. Support task dependencies
 * 5. Implement fair scheduling across task types
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// Configuration
const PORT = 8000;
const NUM_WORKERS = 4;
const MAX_QUEUE_SIZE = 20;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} starting worker pool\n`);

  // TODO: Initialize worker pool state
  const workers = new Map(); // workerId -> { worker, available, currentTask, tasksCompleted }
  const taskQueue = []; // Pending tasks
  const pendingTasks = new Map(); // taskId -> { status: 'processing', workerId, ... }
  const completedTasks = new Map(); // taskId -> { result, completedAt, ... }

  // TODO: Track statistics
  const stats = {
    tasksSubmitted: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    totalProcessingTime: 0
  };

  // TODO: Fork workers
  function createWorker() {
    // 1. Fork worker
    // 2. Add to workers Map:
    //    - worker
    //    - available: true
    //    - currentTask: null
    //    - tasksCompleted: 0
    // 3. Setup message handlers:
    //    - 'ready': Mark worker as ready
    //    - 'task-complete': Handle task completion
    //    - 'task-error': Handle task error
    // 4. Try to assign tasks
  }

  // TODO: Submit task
  function submitTask(task) {
    // 1. Check queue size (reject if >= MAX_QUEUE_SIZE)
    // 2. Generate taskId
    // 3. Add to task queue with:
    //    - id
    //    - type
    //    - data (n or other params)
    //    - submittedAt
    // 4. Add to pendingTasks with status: 'queued'
    // 5. Increment stats.tasksSubmitted
    // 6. Try to assign tasks
    // 7. Return taskId
  }

  // TODO: Assign tasks to available workers
  function assignTasks() {
    // While there are tasks AND available workers:
    // 1. Find an available worker
    // 2. Get next task from queue (FIFO)
    // 3. Assign task to worker:
    //    - Mark worker as busy
    //    - Set worker.currentTask
    //    - Update task status to 'processing'
    //    - Send task to worker
  }

  // TODO: Handle task completion
  function handleTaskComplete(workerId, message) {
    // 1. Get worker info
    // 2. Mark worker as available
    // 3. Clear currentTask
    // 4. Increment worker.tasksCompleted
    // 5. Move task from pending to completed
    // 6. Update stats
    // 7. Try to assign next task
  }

  // TODO: Handle task error
  function handleTaskError(workerId, message) {
    // Similar to complete but:
    // - Mark task as failed
    // - Increment stats.tasksFailed
    // - Store error in completed tasks
  }

  // TODO: Get task result
  function getTaskResult(taskId) {
    // Check pendingTasks (still processing)
    // Check completedTasks (done)
    // Return null if not found
  }

  // TODO: Get pool statistics
  function getPoolStats() {
    // Return:
    // - Total workers, available, busy
    // - Queue size, pending, completed
    // - Stats (submitted, completed, failed)
    // - Per-worker stats
  }

  // TODO: Create HTTP server for task submission
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'POST' && url.pathname === '/task') {
      // TODO: Submit task
      // 1. Parse request body
      // 2. Validate task type and parameters
      // 3. Call submitTask()
      // 4. Return taskId or error

    } else if (req.method === 'GET' && url.pathname.startsWith('/task/')) {
      // TODO: Get task status
      // 1. Extract taskId from URL
      // 2. Call getTaskResult(taskId)
      // 3. Return result or 404

    } else if (req.method === 'GET' && url.pathname === '/stats') {
      // TODO: Return pool statistics
      // Call getPoolStats() and return JSON

    } else {
      // Default response with usage instructions
      res.writeHead(200);
      res.end('Worker Pool API\n...');
    }
  });

  // TODO: Initialize workers
  // Create NUM_WORKERS workers

  // TODO: Handle worker exits
  // cluster.on('exit', (worker) => {
  //   - Log exit
  //   - If worker had currentTask, re-queue it
  //   - Remove worker from pool
  //   - Create new worker
  // })

  server.listen(PORT, () => {
    console.log(`Master listening on port ${PORT}`);
  });

} else {
  // === WORKER PROCESS ===

  console.log(`Worker ${cluster.worker.id} started (PID ${process.pid})`);

  // TODO: Task processors
  const taskProcessors = {
    fibonacci: (n) => {
      // Recursive Fibonacci (intentionally slow for n > 35)
      // function fib(num) {
      //   if (num <= 1) return num;
      //   return fib(num - 1) + fib(num - 2);
      // }
      // return fib(n);
    },

    prime: (n) => {
      // Check if n is prime
      // if (n <= 1) return false;
      // if (n <= 3) return true;
      // if (n % 2 === 0 || n % 3 === 0) return false;
      // for (let i = 5; i * i <= n; i += 6) {
      //   if (n % i === 0 || n % (i + 2) === 0) return false;
      // }
      // return true;
    },

    hash: (iterations) => {
      // Generate hash multiple times
      // let result = 'start';
      // for (let i = 0; i < iterations; i++) {
      //   result = crypto.createHash('sha256').update(result).digest('hex');
      // }
      // return result;
    }
  };

  // TODO: Process task
  async function processTask(task) {
    // 1. Get processor for task.type
    // 2. If no processor, throw error
    // 3. Start timer
    // 4. Execute processor
    // 5. Calculate processing time
    // 6. Send 'task-complete' to master with result
    // 7. On error, send 'task-error' to master
  }

  // TODO: Handle messages from master
  // process.on('message', (msg) => {
  //   if (msg.type === 'task') {
  //     processTask(msg.task);
  //   }
  // });

  // TODO: Signal ready
  // if (process.send) {
  //   process.send({ type: 'ready' });
  // }
}

/**
 * HINTS:
 *
 * Task Queue Management:
 * ```javascript
 * // Add to queue
 * taskQueue.push(task);
 *
 * // Get next task (FIFO)
 * const task = taskQueue.shift();
 *
 * // Check if worker available
 * const available = Array.from(workers.values())
 *   .find(w => w.available);
 * ```
 *
 * Assign Task to Worker:
 * ```javascript
 * function assignTaskToWorker(workerInfo, task) {
 *   workerInfo.available = false;
 *   workerInfo.currentTask = task.id;
 *
 *   // Update task status
 *   const pending = pendingTasks.get(task.id);
 *   pending.status = 'processing';
 *   pending.workerId = workerInfo.worker.id;
 *
 *   // Send to worker
 *   workerInfo.worker.send({
 *     type: 'task',
 *     task
 *   });
 * }
 * ```
 *
 * Parse Request Body:
 * ```javascript
 * let body = '';
 * req.on('data', chunk => body += chunk);
 * req.on('end', () => {
 *   const data = JSON.parse(body);
 *   // Process data
 * });
 * ```
 */

/**
 * TESTING:
 *
 * 1. Submit fibonacci tasks:
 *    curl -X POST http://localhost:8000/task -d '{"type":"fibonacci","n":35}'
 *    curl -X POST http://localhost:8000/task -d '{"type":"fibonacci","n":40}'
 *    # Note the task IDs
 *
 * 2. Check task status:
 *    curl http://localhost:8000/task/<task-id>
 *    # Should show: queued → processing → completed
 *
 * 3. View statistics:
 *    curl http://localhost:8000/stats
 *    # Shows queue size, worker status, completion stats
 *
 * 4. Load test:
 *    for i in {30..45}; do
 *      curl -X POST http://localhost:8000/task \
 *        -d "{\"type\":\"fibonacci\",\"n\":$i}" &
 *    done
 *    wait
 *    # All tasks should complete
 *
 * 5. Test backpressure:
 *    # Submit more than MAX_QUEUE_SIZE tasks rapidly
 *    for i in {1..25}; do
 *      curl -X POST http://localhost:8000/task \
 *        -d '{"type":"fibonacci","n":42}' &
 *    done
 *    # Should get 429 errors after queue is full
 *
 * 6. Different task types:
 *    curl -X POST http://localhost:8000/task -d '{"type":"prime","n":1000000007}'
 *    curl -X POST http://localhost:8000/task -d '{"type":"hash","n":10000}'
 */

/**
 * VALIDATION:
 *
 * Your solution should:
 * ✓ Start 4 workers
 * ✓ Queue tasks in FIFO order
 * ✓ Assign tasks to available workers
 * ✓ Track task states (queued, processing, completed)
 * ✓ Support fibonacci, prime, hash task types
 * ✓ Implement backpressure (reject when queue full)
 * ✓ Return task ID on submission
 * ✓ Allow checking task status by ID
 * ✓ Provide pool statistics
 * ✓ Handle worker crashes (re-queue task)
 */
