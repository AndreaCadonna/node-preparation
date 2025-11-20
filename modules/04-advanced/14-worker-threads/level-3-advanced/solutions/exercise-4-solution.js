/**
 * Solution 4: Auto-Scaling Worker Pool
 *
 * This solution demonstrates:
 * - Dynamic worker pool that scales based on workload
 * - Queue depth monitoring and CPU utilization
 * - Scale up/down decisions with cool-down periods
 * - Worker lifecycle management
 * - Exponential moving averages for metrics
 *
 * Key Concepts:
 * - Auto-scaling: Automatically adjust resources to match demand
 * - Queue depth: Number of pending tasks waiting for workers
 * - Cool-down: Prevent rapid scaling oscillations (thrashing)
 * - Worker utilization: Percentage of time workers are busy
 * - Graceful scaling: Add/remove workers without disrupting tasks
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Auto-Scaling Worker Pool Solution ===\n');

  /**
   * Auto-scaling worker pool with intelligent scaling decisions
   */
  class AutoScalingPool {
    constructor(workerScript, minWorkers = 2, maxWorkers = 8) {
      this.workerScript = workerScript;
      this.minWorkers = minWorkers;
      this.maxWorkers = maxWorkers;

      // Worker management
      this.workers = new Map(); // workerId -> { worker, state, tasks, metrics }
      this.nextWorkerId = 0;
      this.taskQueue = [];
      this.pendingTasks = new Map(); // taskId -> { resolve, reject, startTime }

      // Scaling metrics
      this.metrics = {
        tasksProcessed: 0,
        tasksFailed: 0,
        totalQueueTime: 0,
        totalProcessingTime: 0,
        lastScaleTime: Date.now(),
        scaleUpCount: 0,
        scaleDownCount: 0,
        queueDepthEMA: 0, // Exponential moving average
        utilizationEMA: 0
      };

      // Scaling configuration
      this.config = {
        scaleUpQueueThreshold: 10,    // Scale up if queue > 10
        scaleDownIdleThreshold: 2,     // Scale down if 2+ workers idle
        coolDownPeriodMs: 2000,        // Wait 2s between scaling actions
        checkIntervalMs: 500,          // Check metrics every 500ms
        emaAlpha: 0.3                  // EMA smoothing factor
      };

      // Initialize pool with minimum workers
      console.log(`Initializing pool with ${minWorkers} workers...\n`);
      for (let i = 0; i < minWorkers; i++) {
        this.addWorker();
      }

      // Start monitoring
      this.startScalingMonitor();
    }

    /**
     * Add a new worker to the pool
     */
    addWorker() {
      const workerId = this.nextWorkerId++;
      const worker = new Worker(this.workerScript);

      const workerInfo = {
        worker,
        workerId,
        state: 'idle', // idle | busy
        tasksCompleted: 0,
        tasksFailed: 0,
        currentTask: null,
        createdAt: Date.now()
      };

      // Handle worker messages
      worker.on('message', (result) => {
        this.handleTaskComplete(workerId, result);
      });

      worker.on('error', (error) => {
        console.error(`Worker ${workerId} error:`, error);
        this.handleWorkerError(workerId, error);
      });

      worker.on('exit', (code) => {
        if (code !== 0 && this.workers.has(workerId)) {
          console.error(`Worker ${workerId} exited unexpectedly with code ${code}`);
        }
      });

      this.workers.set(workerId, workerInfo);
      return workerId;
    }

    /**
     * Remove a worker from the pool (graceful)
     */
    async removeWorker(workerId) {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) return;

      // Wait if worker is busy
      if (workerInfo.state === 'busy') {
        // In production, you'd wait for current task to complete
        // For simplicity, we'll wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Terminate worker
      await workerInfo.worker.terminate();
      this.workers.delete(workerId);
    }

    /**
     * Start periodic monitoring and scaling checks
     */
    startScalingMonitor() {
      this.monitorInterval = setInterval(() => {
        this.updateMetrics();
        this.checkScaling();
        this.displayStatus();
      }, this.config.checkIntervalMs);
    }

    /**
     * Update metrics with exponential moving average
     */
    updateMetrics() {
      const queueDepth = this.taskQueue.length;
      const alpha = this.config.emaAlpha;

      // Update EMA for queue depth
      this.metrics.queueDepthEMA = alpha * queueDepth + (1 - alpha) * this.metrics.queueDepthEMA;

      // Calculate worker utilization
      const busyWorkers = Array.from(this.workers.values())
        .filter(w => w.state === 'busy').length;
      const utilization = this.workers.size > 0 ? busyWorkers / this.workers.size : 0;

      // Update EMA for utilization
      this.metrics.utilizationEMA = alpha * utilization + (1 - alpha) * this.metrics.utilizationEMA;
    }

    /**
     * Check if scaling action is needed
     */
    checkScaling() {
      const now = Date.now();
      const timeSinceLastScale = now - this.metrics.lastScaleTime;

      // Respect cool-down period
      if (timeSinceLastScale < this.config.coolDownPeriodMs) {
        return;
      }

      // Check if should scale up
      if (this.shouldScaleUp()) {
        this.scaleUp();
        this.metrics.lastScaleTime = now;
        return;
      }

      // Check if should scale down
      if (this.shouldScaleDown()) {
        this.scaleDown();
        this.metrics.lastScaleTime = now;
        return;
      }
    }

    /**
     * Determine if pool should scale up
     */
    shouldScaleUp() {
      // Don't scale beyond max
      if (this.workers.size >= this.maxWorkers) {
        return false;
      }

      const queueDepth = this.taskQueue.length;
      const busyWorkers = Array.from(this.workers.values())
        .filter(w => w.state === 'busy').length;

      // Scale up if:
      // 1. Queue is backing up (> threshold)
      // 2. All workers are busy
      // 3. High utilization EMA
      return (
        queueDepth > this.config.scaleUpQueueThreshold ||
        (busyWorkers === this.workers.size && queueDepth > 0) ||
        this.metrics.utilizationEMA > 0.9
      );
    }

    /**
     * Determine if pool should scale down
     */
    shouldScaleDown() {
      // Don't scale below min
      if (this.workers.size <= this.minWorkers) {
        return false;
      }

      const queueDepth = this.taskQueue.length;
      const idleWorkers = Array.from(this.workers.values())
        .filter(w => w.state === 'idle').length;

      // Scale down if:
      // 1. Queue is empty
      // 2. Multiple workers are idle (> threshold)
      // 3. Low utilization EMA
      return (
        queueDepth === 0 &&
        idleWorkers >= this.config.scaleDownIdleThreshold &&
        this.metrics.utilizationEMA < 0.3
      );
    }

    /**
     * Scale up: Add a worker
     */
    scaleUp() {
      const oldSize = this.workers.size;
      const workerId = this.addWorker();
      const newSize = this.workers.size;

      this.metrics.scaleUpCount++;

      console.log(
        `\n[SCALE UP] Adding worker ${workerId} (${oldSize} → ${newSize}) - ` +
        `Reason: Queue=${this.taskQueue.length}, Util=${(this.metrics.utilizationEMA * 100).toFixed(0)}%`
      );

      // Try to assign queued task immediately
      this.assignTasks();
    }

    /**
     * Scale down: Remove a worker
     */
    async scaleDown() {
      const oldSize = this.workers.size;

      // Find an idle worker to remove
      const idleWorker = Array.from(this.workers.entries())
        .find(([id, info]) => info.state === 'idle');

      if (!idleWorker) return;

      const [workerId, workerInfo] = idleWorker;
      await this.removeWorker(workerId);

      const newSize = this.workers.size;
      this.metrics.scaleDownCount++;

      console.log(
        `\n[SCALE DOWN] Removing worker ${workerId} (${oldSize} → ${newSize}) - ` +
        `Reason: Idle workers, low utilization`
      );
    }

    /**
     * Execute a task
     */
    async execute(task) {
      return new Promise((resolve, reject) => {
        const taskId = this.metrics.tasksProcessed + this.metrics.tasksFailed;

        // Add to pending tasks
        this.pendingTasks.set(taskId, {
          resolve,
          reject,
          task,
          taskId,
          queuedAt: performance.now()
        });

        // Add to queue
        this.taskQueue.push(taskId);

        // Try to assign immediately
        this.assignTasks();
      });
    }

    /**
     * Assign tasks to available workers
     */
    assignTasks() {
      while (this.taskQueue.length > 0) {
        // Find an idle worker
        const idleWorker = Array.from(this.workers.entries())
          .find(([id, info]) => info.state === 'idle');

        if (!idleWorker) break; // No idle workers

        const [workerId, workerInfo] = idleWorker;
        const taskId = this.taskQueue.shift();
        const taskInfo = this.pendingTasks.get(taskId);

        if (!taskInfo) continue; // Task was cancelled

        // Assign task to worker
        workerInfo.state = 'busy';
        workerInfo.currentTask = taskId;

        // Calculate queue time
        const queueTime = performance.now() - taskInfo.queuedAt;
        this.metrics.totalQueueTime += queueTime;

        // Send task to worker
        taskInfo.startedAt = performance.now();
        workerInfo.worker.postMessage(taskInfo.task);
      }
    }

    /**
     * Handle task completion
     */
    handleTaskComplete(workerId, result) {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) return;

      const taskId = workerInfo.currentTask;
      const taskInfo = this.pendingTasks.get(taskId);

      if (taskInfo) {
        const processingTime = performance.now() - taskInfo.startedAt;
        this.metrics.totalProcessingTime += processingTime;

        if (result.completed) {
          this.metrics.tasksProcessed++;
          workerInfo.tasksCompleted++;
          taskInfo.resolve(result);
        } else {
          this.metrics.tasksFailed++;
          workerInfo.tasksFailed++;
          taskInfo.reject(new Error('Task failed'));
        }

        this.pendingTasks.delete(taskId);
      }

      // Mark worker as idle
      workerInfo.state = 'idle';
      workerInfo.currentTask = null;

      // Assign next task if available
      this.assignTasks();
    }

    /**
     * Handle worker error
     */
    handleWorkerError(workerId, error) {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo || !workerInfo.currentTask) return;

      const taskId = workerInfo.currentTask;
      const taskInfo = this.pendingTasks.get(taskId);

      if (taskInfo) {
        this.metrics.tasksFailed++;
        taskInfo.reject(error);
        this.pendingTasks.delete(taskId);
      }

      workerInfo.state = 'idle';
      workerInfo.currentTask = null;
    }

    /**
     * Display current status
     */
    displayStatus() {
      const busyCount = Array.from(this.workers.values())
        .filter(w => w.state === 'busy').length;
      const idleCount = this.workers.size - busyCount;

      process.stdout.write(
        `\r[Status] Workers: ${this.workers.size} (busy: ${busyCount}, idle: ${idleCount}) | ` +
        `Queue: ${this.taskQueue.length} | ` +
        `Processed: ${this.metrics.tasksProcessed} | ` +
        `Util: ${(this.metrics.utilizationEMA * 100).toFixed(0)}%    `
      );
    }

    /**
     * Get pool metrics
     */
    getMetrics() {
      const avgQueueTime = this.metrics.tasksProcessed > 0
        ? (this.metrics.totalQueueTime / this.metrics.tasksProcessed).toFixed(2)
        : 0;

      const avgProcessingTime = this.metrics.tasksProcessed > 0
        ? (this.metrics.totalProcessingTime / this.metrics.tasksProcessed).toFixed(2)
        : 0;

      return {
        currentWorkers: this.workers.size,
        minWorkers: this.minWorkers,
        maxWorkers: this.maxWorkers,
        queueDepth: this.taskQueue.length,
        tasksProcessed: this.metrics.tasksProcessed,
        tasksFailed: this.metrics.tasksFailed,
        scaleUpEvents: this.metrics.scaleUpCount,
        scaleDownEvents: this.metrics.scaleDownCount,
        avgQueueTimeMs: avgQueueTime,
        avgProcessingTimeMs: avgProcessingTime,
        currentUtilization: (this.metrics.utilizationEMA * 100).toFixed(1) + '%'
      };
    }

    /**
     * Terminate pool
     */
    async terminate() {
      clearInterval(this.monitorInterval);

      console.log('\n\nTerminating worker pool...');

      // Terminate all workers
      const terminatePromises = Array.from(this.workers.keys()).map(id =>
        this.removeWorker(id)
      );

      await Promise.all(terminatePromises);

      console.log('All workers terminated.');
    }
  }

  /**
   * Test workload with different load patterns
   */
  async function test() {
    const pool = new AutoScalingPool(__filename, 2, 8);

    console.log('Starting workload test with 3 waves...\n');

    // Wave 1: Low load (should stay at min workers)
    console.log('\n=== Wave 1: Low Load (5 tasks) ===\n');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        pool.execute({ id: i, duration: 500 })
      )
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Wave 2: High load (should scale up)
    console.log('\n\n=== Wave 2: High Load (30 tasks) ===\n');
    const wave2Start = performance.now();

    const wave2Promises = Array.from({ length: 30 }, (_, i) =>
      pool.execute({ id: i + 5, duration: 500 })
    );

    // Wait for scaling to occur
    await new Promise(resolve => setTimeout(resolve, 3000));

    await Promise.all(wave2Promises);

    const wave2Duration = performance.now() - wave2Start;
    console.log(`\nWave 2 completed in ${wave2Duration.toFixed(0)}ms`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wave 3: Low load (should scale down)
    console.log('\n\n=== Wave 3: Low Load (5 tasks) ===\n');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        pool.execute({ id: i + 35, duration: 500 })
      )
    );

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Display final metrics
    console.log('\n\n=== Final Metrics ===');
    const metrics = pool.getMetrics();
    console.log(JSON.stringify(metrics, null, 2));

    console.log('\n=== Scaling Summary ===');
    console.log(`Scale up events: ${metrics.scaleUpEvents}`);
    console.log(`Scale down events: ${metrics.scaleDownEvents}`);
    console.log(`Final worker count: ${metrics.currentWorkers}`);
    console.log(`Average queue time: ${metrics.avgQueueTimeMs}ms`);
    console.log(`Average processing time: ${metrics.avgProcessingTimeMs}ms`);

    await pool.terminate();
  }

  test().catch(console.error);

} else {
  /**
   * Worker code: Simulates task processing
   * Provided by the exercise (no modification needed)
   */
  parentPort.on('message', async ({ id, duration }) => {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, duration));

    parentPort.postMessage({ id, completed: true });
  });
}

/**
 * EDUCATIONAL NOTES:
 *
 * 1. AUTO-SCALING PRINCIPLES:
 *    - Scale UP: When demand exceeds capacity
 *      * Queue is backing up
 *      * All workers are busy
 *      * High utilization trend
 *    - Scale DOWN: When capacity exceeds demand
 *      * Queue is empty
 *      * Workers are idle
 *      * Low utilization trend
 *
 * 2. COOL-DOWN PERIOD:
 *    Prevents "thrashing" (rapid scale up/down):
 *      Without cool-down:
 *        Scale up → Queue empties → Scale down → Queue fills → Scale up → ...
 *      With cool-down:
 *        Scale up → Wait 2s → Observe trend → Make informed decision
 *
 * 3. EXPONENTIAL MOVING AVERAGE (EMA):
 *    Smooths metrics to avoid reacting to momentary spikes:
 *      EMA = α × current + (1-α) × previous_EMA
 *      α = 0.3 means 30% current, 70% history
 *    Benefits:
 *      - Reduces noise in scaling decisions
 *      - Gives more weight to recent trends
 *      - Simple to compute (no window storage needed)
 *
 * 4. SCALING THRESHOLDS:
 *    Configuration values that trigger scaling:
 *      - Queue threshold: 10 tasks (tune based on task duration)
 *      - Idle threshold: 2 workers (don't scale down too aggressively)
 *      - Utilization: 90% for scale up, 30% for scale down
 *    Tuning tips:
 *      - High thresholds: More stable, slower response
 *      - Low thresholds: More responsive, more oscillation
 *
 * 5. WORKER LIFECYCLE:
 *    - Creation: Instantiate Worker, setup event handlers
 *    - Assignment: Move from idle to busy, assign task
 *    - Completion: Process result, return to idle
 *    - Removal: Wait for idle state, gracefully terminate
 *
 * 6. QUEUE MANAGEMENT:
 *    - FIFO queue: Fair ordering, predictable behavior
 *    - Task assignment: As soon as worker becomes idle
 *    - Queue time tracking: Measure how long tasks wait
 *    - Backpressure: Queue depth indicates system load
 *
 * 7. METRICS FOR MONITORING:
 *    Essential metrics:
 *      - Queue depth: Indicates if scaling needed
 *      - Worker utilization: Percentage of workers busy
 *      - Task throughput: Tasks completed per second
 *      - Queue time: How long tasks wait
 *      - Processing time: How long tasks take to execute
 *
 * 8. PRODUCTION CONSIDERATIONS:
 *    - CPU usage monitoring: Check os.loadavg()
 *    - Memory pressure: Monitor process.memoryUsage()
 *    - Graceful shutdown: Wait for in-flight tasks
 *    - Worker health checks: Detect and replace hung workers
 *    - Predictive scaling: Use historical patterns
 *    - Time-based scaling: Scale up before known peak times
 *
 * 9. ALTERNATIVE SCALING STRATEGIES:
 *    - Target tracking: Maintain target utilization (e.g., 70%)
 *    - Step scaling: Add/remove multiple workers at once
 *    - Scheduled scaling: Scale based on time of day
 *    - Predictive: Use ML to forecast load
 *    - Manual: Allow operators to set worker count
 *
 * 10. PERFORMANCE OPTIMIZATION:
 *     - Worker pooling: Reuse workers instead of create/destroy
 *     - Task batching: Send multiple tasks to one worker
 *     - Affinity: Route similar tasks to same worker (cache locality)
 *     - Priority queues: Process high-priority tasks first
 *     - Load balancing: Distribute tasks evenly
 *
 * 11. COMMON PITFALLS:
 *     - Thrashing: Scale too quickly without cool-down
 *     - Under-provisioning: Min workers too low for baseline load
 *     - Over-provisioning: Max workers too high, waste resources
 *     - Delayed scaling: Thresholds too high, slow response
 *     - Memory leaks: Workers not properly cleaned up
 *
 * 12. REAL-WORLD APPLICATIONS:
 *     - Web servers: Scale based on request rate
 *     - Data processing: Scale based on queue depth
 *     - Video encoding: Scale based on upload rate
 *     - API gateways: Scale based on latency targets
 *     - Batch jobs: Scale up for job, scale down when done
 */
