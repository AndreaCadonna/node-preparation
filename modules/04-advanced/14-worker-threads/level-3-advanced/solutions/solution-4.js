/**
 * Solution 4: Build an Auto-Scaling Worker Pool
 *
 * This solution demonstrates:
 * - Automatic scaling based on workload
 * - Queue depth monitoring
 * - Worker utilization tracking
 * - Scale-up and scale-down policies
 * - Cool-down periods to prevent thrashing
 * - Comprehensive metrics
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Auto-Scaling Worker Pool ===\n');
  console.log(`System: ${os.cpus().length} CPU cores\n`);

  class AutoScalingPool {
    constructor(workerScript, minWorkers = 2, maxWorkers = 8) {
      this.workerScript = workerScript;
      this.minWorkers = minWorkers;
      this.maxWorkers = maxWorkers;

      this.workers = new Map();
      this.availableWorkers = [];
      this.queue = [];
      this.nextWorkerId = 1;

      // Scaling configuration
      this.config = {
        scaleUpThreshold: 10,      // Scale up if queue > 10
        scaleDownThreshold: 2,     // Scale down if idle workers > 2
        coolDownPeriod: 3000,      // 3 seconds between scaling actions
        checkInterval: 1000        // Check every 1 second
      };

      // Metrics
      this.metrics = {
        tasksProcessed: 0,
        scaleUpEvents: 0,
        scaleDownEvents: 0,
        lastScaleTime: 0,
        peakWorkers: minWorkers,
        peakQueueDepth: 0
      };

      // Initialize with minimum workers
      console.log(`Pool initialized with ${minWorkers} workers\n`);
      for (let i = 0; i < minWorkers; i++) {
        this.addWorker();
      }

      // Start auto-scaling monitor
      this.startScalingMonitor();
    }

    addWorker() {
      const workerId = this.nextWorkerId++;
      const worker = new Worker(this.workerScript);

      const workerInfo = {
        id: workerId,
        worker,
        status: 'idle',
        tasksCompleted: 0
      };

      this.workers.set(workerId, workerInfo);
      this.availableWorkers.push(workerId);

      // Handle messages
      worker.on('message', (result) => {
        const workerInfo = this.workers.get(workerId);
        if (workerInfo) {
          workerInfo.tasksCompleted++;
          workerInfo.status = 'idle';
          this.metrics.tasksProcessed++;

          // Resolve task promise
          if (workerInfo.currentTask) {
            workerInfo.currentTask.resolve(result);
            delete workerInfo.currentTask;
          }

          // Make worker available
          this.availableWorkers.push(workerId);

          // Process next task
          this.processQueue();
        }
      });

      worker.on('error', (err) => {
        console.error(`Worker ${workerId} error:`, err.message);
      });

      return workerId;
    }

    removeWorker() {
      // Find an idle worker to remove
      const workerId = this.availableWorkers.find(id => {
        const workerInfo = this.workers.get(id);
        return workerInfo && workerInfo.status === 'idle';
      });

      if (!workerId) return false;

      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) return false;

      // Remove from available list
      const index = this.availableWorkers.indexOf(workerId);
      if (index > -1) {
        this.availableWorkers.splice(index, 1);
      }

      // Terminate worker
      workerInfo.worker.terminate();
      this.workers.delete(workerId);

      return true;
    }

    startScalingMonitor() {
      this.scalingInterval = setInterval(() => {
        this.checkScaling();
      }, this.config.checkInterval);
    }

    checkScaling() {
      const now = performance.now();
      const timeSinceLastScale = now - this.metrics.lastScaleTime;

      // Cool-down period: don't scale too frequently
      if (timeSinceLastScale < this.config.coolDownPeriod) {
        return;
      }

      if (this.shouldScaleUp()) {
        this.scaleUp();
      } else if (this.shouldScaleDown()) {
        this.scaleDown();
      }
    }

    shouldScaleUp() {
      // Scale up if:
      // 1. Queue has many tasks waiting
      // 2. All workers are busy
      // 3. Haven't reached max workers

      if (this.workers.size >= this.maxWorkers) {
        return false;
      }

      const queueDepth = this.queue.length;
      const idleWorkers = this.availableWorkers.length;

      return queueDepth > this.config.scaleUpThreshold ||
             (queueDepth > 0 && idleWorkers === 0);
    }

    shouldScaleDown() {
      // Scale down if:
      // 1. Queue is empty
      // 2. Multiple idle workers
      // 3. Haven't reached min workers

      if (this.workers.size <= this.minWorkers) {
        return false;
      }

      const queueDepth = this.queue.length;
      const idleWorkers = this.availableWorkers.length;

      return queueDepth === 0 && idleWorkers > this.config.scaleDownThreshold;
    }

    scaleUp() {
      const currentSize = this.workers.size;
      this.addWorker();

      this.metrics.scaleUpEvents++;
      this.metrics.lastScaleTime = performance.now();
      this.metrics.peakWorkers = Math.max(this.metrics.peakWorkers, this.workers.size);

      console.log(`[SCALE UP] Adding worker (${currentSize} → ${this.workers.size}) - Reason: High queue depth (${this.queue.length})`);

      this.logStatus();
    }

    scaleDown() {
      const currentSize = this.workers.size;

      if (this.removeWorker()) {
        this.metrics.scaleDownEvents++;
        this.metrics.lastScaleTime = performance.now();

        console.log(`[SCALE DOWN] Removing worker (${currentSize} → ${this.workers.size}) - Reason: Idle workers (${this.availableWorkers.length})`);

        this.logStatus();
      }
    }

    async execute(task) {
      return new Promise((resolve, reject) => {
        const enrichedTask = {
          ...task,
          resolve,
          reject
        };

        // Update queue metrics
        this.metrics.peakQueueDepth = Math.max(
          this.metrics.peakQueueDepth,
          this.queue.length + 1
        );

        if (this.availableWorkers.length > 0) {
          this.runTask(enrichedTask);
        } else {
          this.queue.push(enrichedTask);
        }
      });
    }

    runTask(task) {
      const workerId = this.availableWorkers.shift();
      const workerInfo = this.workers.get(workerId);

      if (!workerInfo) {
        this.queue.unshift(task);
        return;
      }

      workerInfo.status = 'busy';
      workerInfo.currentTask = task;

      workerInfo.worker.postMessage(task);
    }

    processQueue() {
      if (this.queue.length > 0 && this.availableWorkers.length > 0) {
        const task = this.queue.shift();
        this.runTask(task);
      }
    }

    logStatus() {
      const busyWorkers = this.workers.size - this.availableWorkers.length;
      console.log(`  Queue: ${this.queue.length}, Workers: ${this.workers.size} (busy: ${busyWorkers}, idle: ${this.availableWorkers.length})\n`);
    }

    getMetrics() {
      return {
        currentWorkers: this.workers.size,
        minWorkers: this.minWorkers,
        maxWorkers: this.maxWorkers,
        queueDepth: this.queue.length,
        idleWorkers: this.availableWorkers.length,
        tasksProcessed: this.metrics.tasksProcessed,
        scaleUpEvents: this.metrics.scaleUpEvents,
        scaleDownEvents: this.metrics.scaleDownEvents,
        peakWorkers: this.metrics.peakWorkers,
        peakQueueDepth: this.metrics.peakQueueDepth
      };
    }

    async terminate() {
      clearInterval(this.scalingInterval);

      const terminatePromises = Array.from(this.workers.values()).map(
        workerInfo => workerInfo.worker.terminate()
      );

      await Promise.all(terminatePromises);
    }
  }

  // Test workload
  async function test() {
    const pool = new AutoScalingPool(__filename, 2, 8);

    // Wave 1: Low load
    console.log('Wave 1: Sending 5 tasks (low load)...\n');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        pool.execute({ id: i, duration: 500 })
      )
    );

    pool.logStatus();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Wave 2: High load (should trigger scale-up)
    console.log('Wave 2: Sending 30 tasks (high load)...\n');

    const wave2Promises = Array.from({ length: 30 }, (_, i) =>
      pool.execute({ id: i + 5, duration: 500 })
    );

    // Log status while processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    pool.logStatus();

    await Promise.all(wave2Promises);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Wave 3: Low load (should trigger scale-down)
    console.log('Wave 3: Sending 5 tasks (low load)...\n');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        pool.execute({ id: i + 35, duration: 500 })
      )
    );

    // Wait for scale-down
    await new Promise(resolve => setTimeout(resolve, 5000));

    pool.logStatus();

    // Display final metrics
    console.log('\n=== Final Metrics ===\n');
    const metrics = pool.getMetrics();
    Object.entries(metrics).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      const formatted = label.charAt(0).toUpperCase() + label.slice(1);
      console.log(`${formatted}: ${value}`);
    });

    await pool.terminate();
    console.log('\nPool terminated');
  }

  test().catch(console.error);

} else {
  // === WORKER THREAD CODE ===
  parentPort.on('message', async ({ id, duration }) => {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, duration));

    parentPort.postMessage({ id, completed: true });
  });
}

/**
 * EXPECTED OUTPUT:
 *
 * System: 8 CPU cores
 *
 * Pool initialized with 2 workers
 *
 * Wave 1: Sending 5 tasks (low load)...
 * Queue: 0, Workers: 2 (busy: 0, idle: 2)
 *
 * Wave 2: Sending 30 tasks (high load)...
 * [SCALE UP] Adding worker (2 → 3) - Reason: High queue depth (15)
 *   Queue: 14, Workers: 3 (busy: 3, idle: 0)
 *
 * [SCALE UP] Adding worker (3 → 4) - Reason: High queue depth (12)
 *   Queue: 11, Workers: 4 (busy: 4, idle: 0)
 *
 * [SCALE UP] Adding worker (4 → 5) - Reason: High queue depth (10)
 *   Queue: 9, Workers: 5 (busy: 5, idle: 0)
 *
 * Wave 3: Sending 5 tasks (low load)...
 *
 * [SCALE DOWN] Removing worker (5 → 4) - Reason: Idle workers (3)
 *   Queue: 0, Workers: 4 (busy: 0, idle: 4)
 *
 * [SCALE DOWN] Removing worker (4 → 3) - Reason: Idle workers (3)
 *   Queue: 0, Workers: 3 (busy: 0, idle: 3)
 *
 * [SCALE DOWN] Removing worker (3 → 2) - Reason: Idle workers (3)
 *   Queue: 0, Workers: 2 (busy: 0, idle: 2)
 *
 * === Final Metrics ===
 * Current workers: 2
 * Tasks processed: 40
 * Scale up events: 3
 * Scale down events: 3
 * Peak workers: 5
 * Peak queue depth: 28
 *
 * KEY FEATURES:
 *
 * 1. Dynamic Scaling:
 *    - Monitors queue depth and worker utilization
 *    - Scales up when demand increases
 *    - Scales down when demand decreases
 *
 * 2. Cool-down Period:
 *    - Prevents rapid scaling (thrashing)
 *    - Waits 3 seconds between scaling actions
 *    - Allows system to stabilize
 *
 * 3. Scaling Policies:
 *    - Scale up: queue > threshold OR (queue > 0 AND no idle workers)
 *    - Scale down: queue empty AND multiple idle workers
 *    - Respects min/max worker limits
 *
 * 4. Metrics Tracking:
 *    - Peak values for capacity planning
 *    - Scaling event counts
 *    - Current system state
 *
 * PRODUCTION ENHANCEMENTS:
 *
 * 1. Advanced Scaling Algorithms:
 *    - Exponential moving average of queue depth
 *    - Predictive scaling based on time patterns
 *    - Machine learning for workload prediction
 *
 * 2. Resource-Based Scaling:
 *    - Monitor CPU usage
 *    - Monitor memory pressure
 *    - Scale based on system resources
 *
 * 3. Cost Optimization:
 *    - Aggressive scale-down for cost savings
 *    - Reserved capacity for baseline load
 *    - Spot instances for burst capacity
 *
 * 4. Multi-Tier Pools:
 *    - Fast workers for quick tasks
 *    - Heavy workers for intensive tasks
 *    - Scale each tier independently
 */
