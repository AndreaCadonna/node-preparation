/**
 * Example 6: Worker Pool with Task Queue Management
 *
 * This example demonstrates a worker pool pattern for managing CPU-intensive
 * tasks. The master maintains a task queue and distributes work to available
 * workers, similar to a thread pool in other languages.
 *
 * Key Concepts:
 * - Task queue management
 * - Worker availability tracking
 * - Load balancing strategies
 * - Result aggregation
 * - Backpressure handling
 *
 * Run this: node 06-worker-pools.js
 * Submit tasks: curl -X POST http://localhost:8000/task -d '{"n":40}'
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// Configuration
const PORT = 8000;
const numCPUs = os.cpus().length;
const MAX_QUEUE_SIZE = 100;

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting worker pool\n`);

  /**
   * Task Queue Manager
   * Manages task distribution to workers
   */
  class WorkerPool {
    constructor(numWorkers) {
      this.workers = new Map();
      this.taskQueue = [];
      this.pendingTasks = new Map();
      this.completedTasks = new Map();
      this.stats = {
        tasksSubmitted: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalProcessingTime: 0
      };

      // Initialize workers
      for (let i = 0; i < numWorkers; i++) {
        this.addWorker();
      }
    }

    /**
     * Add a worker to the pool
     */
    addWorker() {
      const worker = cluster.fork();

      this.workers.set(worker.id, {
        worker,
        available: true,
        currentTask: null,
        tasksCompleted: 0,
        totalProcessingTime: 0,
        startTime: Date.now()
      });

      console.log(`[Master] Added worker ${worker.id} to pool (${this.workers.size}/${numCPUs})`);

      // Handle messages from worker
      worker.on('message', (message) => {
        this.handleWorkerMessage(worker.id, message);
      });

      // Assign pending tasks if any
      this.assignTasks();

      return worker;
    }

    /**
     * Submit a task to the pool
     */
    submitTask(task) {
      if (this.taskQueue.length >= MAX_QUEUE_SIZE) {
        throw new Error('Task queue is full');
      }

      const taskId = crypto.randomUUID();
      const taskWithId = {
        id: taskId,
        ...task,
        submittedAt: Date.now()
      };

      this.taskQueue.push(taskWithId);
      this.pendingTasks.set(taskId, {
        task: taskWithId,
        status: 'queued'
      });

      this.stats.tasksSubmitted++;

      console.log(`[Master] Task ${taskId} queued (queue size: ${this.taskQueue.length})`);

      // Try to assign task immediately
      this.assignTasks();

      return taskId;
    }

    /**
     * Assign tasks to available workers
     */
    assignTasks() {
      // Find available workers
      const availableWorkers = Array.from(this.workers.values())
        .filter(w => w.available);

      // Assign tasks to available workers
      while (this.taskQueue.length > 0 && availableWorkers.length > 0) {
        const worker = availableWorkers.shift();
        const task = this.taskQueue.shift();

        this.assignTaskToWorker(worker, task);
      }
    }

    /**
     * Assign a specific task to a worker
     */
    assignTaskToWorker(workerInfo, task) {
      workerInfo.available = false;
      workerInfo.currentTask = task.id;

      const pending = this.pendingTasks.get(task.id);
      if (pending) {
        pending.status = 'processing';
        pending.workerId = workerInfo.worker.id;
        pending.startedAt = Date.now();
      }

      workerInfo.worker.send({
        type: 'task',
        task
      });

      console.log(`[Master] Assigned task ${task.id} to worker ${workerInfo.worker.id}`);
    }

    /**
     * Handle messages from workers
     */
    handleWorkerMessage(workerId, message) {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) return;

      switch (message.type) {
        case 'task-complete':
          this.handleTaskComplete(workerInfo, message);
          break;

        case 'task-error':
          this.handleTaskError(workerInfo, message);
          break;

        case 'ready':
          console.log(`[Master] Worker ${workerId} ready`);
          break;

        default:
          console.log(`[Master] Unknown message from worker ${workerId}:`, message.type);
      }
    }

    /**
     * Handle task completion
     */
    handleTaskComplete(workerInfo, message) {
      const { taskId, result, processingTime } = message;

      console.log(`[Master] Task ${taskId} completed by worker ${workerInfo.worker.id} (${processingTime}ms)`);

      // Update worker info
      workerInfo.available = true;
      workerInfo.currentTask = null;
      workerInfo.tasksCompleted++;
      workerInfo.totalProcessingTime += processingTime;

      // Update task tracking
      const pending = this.pendingTasks.get(taskId);
      if (pending) {
        this.completedTasks.set(taskId, {
          ...pending,
          result,
          completedAt: Date.now(),
          processingTime
        });
        this.pendingTasks.delete(taskId);
      }

      // Update stats
      this.stats.tasksCompleted++;
      this.stats.totalProcessingTime += processingTime;

      // Assign next task if available
      this.assignTasks();
    }

    /**
     * Handle task error
     */
    handleTaskError(workerInfo, message) {
      const { taskId, error } = message;

      console.log(`[Master] Task ${taskId} failed on worker ${workerInfo.worker.id}: ${error}`);

      // Update worker info
      workerInfo.available = true;
      workerInfo.currentTask = null;

      // Update task tracking
      const pending = this.pendingTasks.get(taskId);
      if (pending) {
        this.completedTasks.set(taskId, {
          ...pending,
          error,
          completedAt: Date.now(),
          failed: true
        });
        this.pendingTasks.delete(taskId);
      }

      // Update stats
      this.stats.tasksFailed++;

      // Assign next task if available
      this.assignTasks();
    }

    /**
     * Get task result
     */
    getTaskResult(taskId) {
      // Check if completed
      if (this.completedTasks.has(taskId)) {
        return this.completedTasks.get(taskId);
      }

      // Check if pending
      if (this.pendingTasks.has(taskId)) {
        return this.pendingTasks.get(taskId);
      }

      return null;
    }

    /**
     * Get pool statistics
     */
    getStats() {
      const workerStats = Array.from(this.workers.values()).map(w => ({
        id: w.worker.id,
        available: w.available,
        currentTask: w.currentTask,
        tasksCompleted: w.tasksCompleted,
        avgProcessingTime: w.tasksCompleted > 0
          ? (w.totalProcessingTime / w.tasksCompleted).toFixed(2)
          : 0
      }));

      return {
        pool: {
          totalWorkers: this.workers.size,
          availableWorkers: Array.from(this.workers.values()).filter(w => w.available).length,
          busyWorkers: Array.from(this.workers.values()).filter(w => !w.available).length
        },
        queue: {
          pending: this.taskQueue.length,
          processing: this.pendingTasks.size,
          completed: this.completedTasks.size
        },
        stats: {
          ...this.stats,
          avgProcessingTime: this.stats.tasksCompleted > 0
            ? (this.stats.totalProcessingTime / this.stats.tasksCompleted).toFixed(2)
            : 0
        },
        workers: workerStats
      };
    }

    /**
     * Shutdown the pool
     */
    shutdown() {
      console.log('[Master] Shutting down worker pool...');

      this.workers.forEach((info) => {
        info.worker.kill('SIGTERM');
      });
    }
  }

  // Create worker pool
  const pool = new WorkerPool(numCPUs);

  /**
   * HTTP API Server
   */
  const server = http.createServer((req, res) => {
    // Parse request
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'POST' && url.pathname === '/task') {
      // Submit new task
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const taskData = JSON.parse(body);
          const taskId = pool.submitTask(taskData);

          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            taskId,
            status: 'submitted',
            message: 'Task queued for processing'
          }));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/task/')) {
      // Get task result
      const taskId = url.pathname.split('/')[2];
      const result = pool.getTaskResult(taskId);

      if (!result) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Task not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/stats') {
      // Get pool statistics
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(pool.getStats(), null, 2));
      return;
    }

    // Default response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Worker Pool API

POST /task       - Submit a task
GET  /task/:id   - Get task result
GET  /stats      - Get pool statistics

Example:
curl -X POST http://localhost:${PORT}/task -d '{"type":"fibonacci","n":40}'
`);
  });

  server.listen(PORT, () => {
    console.log(`[Master] API server listening on http://localhost:${PORT}`);
  });

  /**
   * Handle worker exits
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} exited unexpectedly`);

    const workerInfo = pool.workers.get(worker.id);
    if (workerInfo && workerInfo.currentTask) {
      // Re-queue the task that was being processed
      const taskId = workerInfo.currentTask;
      const pending = pool.pendingTasks.get(taskId);

      if (pending) {
        console.log(`[Master] Re-queuing task ${taskId}`);
        pool.taskQueue.unshift(pending.task);
      }
    }

    // Remove dead worker
    pool.workers.delete(worker.id);

    // Add new worker
    pool.addWorker();
  });

  /**
   * Periodic stats reporting
   */
  setInterval(() => {
    const stats = pool.getStats();
    console.log(`\n[Master] Pool Stats: ${stats.pool.availableWorkers}/${stats.pool.totalWorkers} available, ` +
                `Queue: ${stats.queue.pending} pending, ${stats.queue.processing} processing, ` +
                `${stats.queue.completed} completed`);
  }, 10000);

  /**
   * Cleanup on exit
   */
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    console.log('\n[Master] Shutting down...');
    pool.shutdown();
    server.close();
    setTimeout(() => process.exit(0), 5000);
  }

  console.log('\n[Master] Worker pool ready');
  console.log(`[Master] ${numCPUs} workers initialized\n`);

} else {
  // === WORKER PROCESS ===

  console.log(`[Worker ${cluster.worker.id}] Started (PID ${process.pid})`);

  /**
   * Task processors
   * Different task types can be handled differently
   */
  const taskProcessors = {
    /**
     * Calculate Fibonacci number (CPU intensive)
     */
    fibonacci: (n) => {
      function fib(num) {
        if (num <= 1) return num;
        return fib(num - 1) + fib(num - 2);
      }
      return fib(n);
    },

    /**
     * Prime number check
     */
    isPrime: (n) => {
      if (n <= 1) return false;
      if (n <= 3) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;

      for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
      }
      return true;
    },

    /**
     * Hash computation
     */
    hash: (data) => {
      return crypto.createHash('sha256').update(data).digest('hex');
    },

    /**
     * Sleep (for testing)
     */
    sleep: async (ms) => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return `Slept for ${ms}ms`;
    }
  };

  /**
   * Process a task
   */
  async function processTask(task) {
    const startTime = Date.now();

    try {
      console.log(`[Worker ${cluster.worker.id}] Processing task ${task.id} (type: ${task.type})`);

      // Get task processor
      const processor = taskProcessors[task.type];
      if (!processor) {
        throw new Error(`Unknown task type: ${task.type}`);
      }

      // Execute task
      const result = await processor(task.n || task.data || task.ms);
      const processingTime = Date.now() - startTime;

      // Send result to master
      if (process.send) {
        process.send({
          type: 'task-complete',
          taskId: task.id,
          result,
          processingTime
        });
      }

      console.log(`[Worker ${cluster.worker.id}] Completed task ${task.id} in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error(`[Worker ${cluster.worker.id}] Task ${task.id} failed:`, error.message);

      if (process.send) {
        process.send({
          type: 'task-error',
          taskId: task.id,
          error: error.message,
          processingTime
        });
      }
    }
  }

  /**
   * Handle messages from master
   */
  process.on('message', (message) => {
    if (message.type === 'task') {
      processTask(message.task);
    }
  });

  /**
   * Signal ready
   */
  if (process.send) {
    process.send({ type: 'ready' });
  }
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Worker Pool Pattern:
 *    - Maintain pool of workers
 *    - Queue tasks when all workers busy
 *    - Distribute work to available workers
 *    - Track worker availability
 *
 * 2. Task Queue:
 *    - FIFO queue for pending tasks
 *    - Limit queue size (backpressure)
 *    - Track task states (queued, processing, completed)
 *    - Re-queue failed tasks
 *
 * 3. Load Balancing:
 *    - Assign tasks to first available worker
 *    - Track worker utilization
 *    - Balance work across workers
 *
 * 4. Result Management:
 *    - Track completed tasks
 *    - Provide task status endpoint
 *    - Clean up old results
 *
 * 5. Error Handling:
 *    - Handle worker crashes
 *    - Re-queue interrupted tasks
 *    - Report task failures
 *
 * TESTING:
 *
 * 1. Submit tasks:
 *    curl -X POST http://localhost:8000/task -d '{"type":"fibonacci","n":40}'
 *
 * 2. Check task status:
 *    curl http://localhost:8000/task/<task-id>
 *
 * 3. View pool stats:
 *    curl http://localhost:8000/stats
 *
 * 4. Load testing:
 *    for i in {30..45}; do
 *      curl -X POST http://localhost:8000/task -d "{\"type\":\"fibonacci\",\"n\":$i}" &
 *    done
 *    wait
 *
 * 5. Test different task types:
 *    curl -X POST http://localhost:8000/task -d '{"type":"isPrime","n":1000000007}'
 *    curl -X POST http://localhost:8000/task -d '{"type":"hash","data":"hello world"}'
 *    curl -X POST http://localhost:8000/task -d '{"type":"sleep","ms":5000}'
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Persistence:
 *    - Persist task queue to database
 *    - Survive master restarts
 *    - Implement task retry logic
 *
 * 2. Priority Queues:
 *    - Support task priorities
 *    - Multiple queues for different priorities
 *    - SLA-based scheduling
 *
 * 3. Result Storage:
 *    - Store results externally (Redis, DB)
 *    - Implement result expiration
 *    - Clean up old results
 *
 * 4. Monitoring:
 *    - Track queue depth
 *    - Monitor worker health
 *    - Alert on queue buildup
 *    - Track processing times
 */
