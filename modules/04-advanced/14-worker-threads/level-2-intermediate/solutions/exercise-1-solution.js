/**
 * Exercise 1 Solution: Build a Production-Ready Worker Pool
 *
 * This solution demonstrates:
 * - Complete worker pool implementation with queue management
 * - Promise-based API for async task execution
 * - Worker state tracking (busy/available)
 * - Comprehensive statistics collection
 * - Graceful error handling and shutdown
 * - Task distribution algorithm
 *
 * KEY CONCEPTS:
 * - Worker Pool Pattern: Reuse workers instead of creating new ones for each task
 * - Task Queue: Buffer tasks when all workers are busy
 * - Load Balancing: Distribute tasks across available workers
 * - Resource Management: Track and clean up worker resources
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  /**
   * WorkerPool Class
   *
   * Manages a pool of worker threads for efficient task execution.
   * Workers are reused across multiple tasks, reducing overhead.
   */
  class WorkerPool {
    constructor(workerScript, poolSize = 4) {
      this.workerScript = workerScript;
      this.poolSize = poolSize;
      this.workers = [];
      this.taskQueue = [];
      this.nextTaskId = 0;

      // Statistics tracking
      this.stats = {
        tasksCompleted: 0,
        tasksErrored: 0,
        totalProcessingTime: 0,
        peakQueueLength: 0
      };

      // Initialize the worker pool
      this.createPool();
    }

    /**
     * Creates the initial pool of workers
     * Each worker is wrapped with metadata for tracking
     */
    createPool() {
      for (let i = 0; i < this.poolSize; i++) {
        const workerInfo = {
          id: i,
          worker: new Worker(this.workerScript),
          busy: false,
          currentTask: null,
          tasksCompleted: 0
        };

        // Handle successful task completion
        workerInfo.worker.on('message', (result) => {
          this.handleWorkerMessage(workerInfo, result);
        });

        // Handle worker errors (errors in worker code)
        workerInfo.worker.on('error', (err) => {
          this.handleWorkerError(workerInfo, err);
        });

        // Handle worker exit (worker crashed or terminated)
        workerInfo.worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(`Worker ${i} exited with code ${code}`);
          }
        });

        this.workers.push(workerInfo);
      }

      console.log(`Worker pool created with ${this.poolSize} workers`);
    }

    /**
     * Execute a task in the worker pool
     * Returns a Promise that resolves with the task result
     *
     * @param {*} data - Data to send to worker
     * @returns {Promise} - Resolves with worker result
     */
    async execute(data) {
      return new Promise((resolve, reject) => {
        const task = {
          id: this.nextTaskId++,
          data,
          resolve,
          reject,
          startTime: Date.now()
        };

        // Try to find an available worker
        const availableWorker = this.workers.find(w => !w.busy);

        if (availableWorker) {
          // Execute immediately on available worker
          this.assignTask(availableWorker, task);
        } else {
          // All workers busy - queue the task
          this.taskQueue.push(task);

          // Track peak queue length
          if (this.taskQueue.length > this.stats.peakQueueLength) {
            this.stats.peakQueueLength = this.taskQueue.length;
          }

          console.log(`Task ${task.id} queued. Queue length: ${this.taskQueue.length}`);
        }
      });
    }

    /**
     * Assigns a task to a specific worker
     * Marks worker as busy and sends data
     */
    assignTask(workerInfo, task) {
      workerInfo.busy = true;
      workerInfo.currentTask = task;

      console.log(`Worker ${workerInfo.id} executing task ${task.id}`);

      // Send task data to worker
      workerInfo.worker.postMessage(task.data);
    }

    /**
     * Handles successful task completion from worker
     * Updates statistics and processes next queued task
     */
    handleWorkerMessage(workerInfo, result) {
      const task = workerInfo.currentTask;

      if (task) {
        const processingTime = Date.now() - task.startTime;

        // Update statistics
        this.stats.tasksCompleted++;
        this.stats.totalProcessingTime += processingTime;
        workerInfo.tasksCompleted++;

        console.log(`Worker ${workerInfo.id} completed task ${task.id} in ${processingTime}ms`);

        // Resolve the promise (task complete)
        task.resolve(result);
      }

      // Mark worker as available for next task
      workerInfo.busy = false;
      workerInfo.currentTask = null;

      // Process next task from queue if any
      this.processNextTask(workerInfo);
    }

    /**
     * Handles worker errors
     * Rejects the task promise and processes next task
     */
    handleWorkerError(workerInfo, error) {
      const task = workerInfo.currentTask;

      if (task) {
        this.stats.tasksErrored++;

        console.error(`Worker ${workerInfo.id} error on task ${task.id}:`, error.message);

        // Reject the promise (task failed)
        task.reject(error);
      }

      // Mark worker as available
      workerInfo.busy = false;
      workerInfo.currentTask = null;

      // Process next task from queue if any
      this.processNextTask(workerInfo);
    }

    /**
     * Processes the next task from the queue
     * Assigns it to the specified (now available) worker
     */
    processNextTask(workerInfo) {
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        console.log(`Assigning queued task ${nextTask.id} to worker ${workerInfo.id}`);
        this.assignTask(workerInfo, nextTask);
      }
    }

    /**
     * Returns comprehensive pool statistics
     * Useful for monitoring and optimization
     */
    getStats() {
      const busyWorkers = this.workers.filter(w => w.busy).length;
      const availableWorkers = this.workers.filter(w => !w.busy).length;

      return {
        poolSize: this.poolSize,
        busyWorkers,
        availableWorkers,
        queueLength: this.taskQueue.length,
        peakQueueLength: this.stats.peakQueueLength,
        tasksCompleted: this.stats.tasksCompleted,
        tasksErrored: this.stats.tasksErrored,
        avgProcessingTime: this.stats.tasksCompleted > 0
          ? (this.stats.totalProcessingTime / this.stats.tasksCompleted).toFixed(2) + 'ms'
          : '0ms',
        // Per-worker statistics
        workerStats: this.workers.map(w => ({
          id: w.id,
          busy: w.busy,
          tasksCompleted: w.tasksCompleted
        }))
      };
    }

    /**
     * Gracefully terminates the worker pool
     * Waits for active tasks to complete before terminating
     */
    async terminate() {
      console.log('\nTerminating worker pool...');

      // Wait for all active tasks to complete
      while (this.workers.some(w => w.busy)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Terminate all workers
      await Promise.all(
        this.workers.map(w => w.worker.terminate())
      );

      console.log('Worker pool terminated successfully');
    }
  }

  // Test code
  async function test() {
    console.log('=== Worker Pool Solution ===\n');

    const pool = new WorkerPool(__filename, 4);

    console.log('Starting 20 tasks with 4 workers...\n');

    // Create 20 tasks with different inputs
    const tasks = Array.from({ length: 20 }, (_, i) => i + 30);

    const startTime = Date.now();

    // Execute all tasks concurrently
    // Pool will distribute them across workers
    const results = await Promise.all(
      tasks.map(n => pool.execute(n))
    );

    const endTime = Date.now();

    console.log('\n=== Results ===');
    console.log('All tasks completed successfully!');
    console.log(`Total execution time: ${endTime - startTime}ms`);
    console.log('First 5 results:', results.slice(0, 5));

    console.log('\n=== Pool Statistics ===');
    const stats = pool.getStats();
    console.log(JSON.stringify(stats, null, 2));

    await pool.terminate();
  }

  test().catch(console.error);

} else {
  /**
   * Worker Thread Code
   *
   * This code runs in each worker thread.
   * It receives messages from the main thread, processes them,
   * and sends results back.
   */
  parentPort.on('message', (n) => {
    // Calculate fibonacci number
    function fibonacci(num) {
      if (num <= 1) return num;
      return fibonacci(num - 1) + fibonacci(num - 2);
    }

    const result = fibonacci(n);

    // Send result back to main thread
    parentPort.postMessage(result);
  });
}

/**
 * LEARNING NOTES:
 *
 * 1. WORKER POOL BENEFITS:
 *    - Reduces worker creation/destruction overhead
 *    - Reuses workers across multiple tasks
 *    - Limits concurrent resource usage
 *    - Provides predictable performance
 *
 * 2. QUEUE MANAGEMENT:
 *    - Tasks are queued when all workers are busy
 *    - FIFO (First In, First Out) processing order
 *    - Prevents overwhelming the system with too many workers
 *    - Could be enhanced with priority queues
 *
 * 3. PROMISE-BASED API:
 *    - Clean, modern async/await interface
 *    - Integrates well with existing async code
 *    - Handles errors through promise rejection
 *    - Supports Promise.all for concurrent execution
 *
 * 4. STATISTICS TRACKING:
 *    - Monitor pool performance and utilization
 *    - Identify bottlenecks and optimization opportunities
 *    - Track individual worker efficiency
 *    - Measure queue depth and processing times
 *
 * BONUS IMPLEMENTATIONS:
 *
 * 1. Task Timeout:
 *    execute(data, timeout = 30000) {
 *      return Promise.race([
 *        this.executeTask(data),
 *        new Promise((_, reject) =>
 *          setTimeout(() => reject(new Error('Task timeout')), timeout)
 *        )
 *      ]);
 *    }
 *
 * 2. Priority Queue:
 *    // Add priority to task
 *    const task = { ...baseTask, priority: 5 };
 *    // Sort queue by priority
 *    this.taskQueue.sort((a, b) => b.priority - a.priority);
 *
 * 3. Dynamic Scaling:
 *    if (this.taskQueue.length > threshold && this.workers.length < maxSize) {
 *      this.addWorker();
 *    }
 *    if (this.taskQueue.length === 0 && this.workers.length > minSize) {
 *      this.removeWorker();
 *    }
 *
 * 4. Worker Health Monitoring:
 *    setInterval(() => {
 *      this.workers.forEach(w => {
 *        if (w.busy && Date.now() - w.currentTask.startTime > healthTimeout) {
 *          console.warn(`Worker ${w.id} may be stuck`);
 *        }
 *      });
 *    }, 5000);
 */
