/**
 * Solution 5: Production-Ready Worker Pool with Full Observability
 *
 * This solution demonstrates:
 * - Comprehensive monitoring and metrics
 * - Prometheus-style metrics export
 * - Health check endpoints (liveness/readiness)
 * - Circuit breaker pattern
 * - Graceful shutdown with timeout
 * - Production-grade error handling
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Production Worker Pool ===\n');

  class ProductionWorkerPool {
    constructor(workerScript, poolSize = 4) {
      this.workerScript = workerScript;
      this.poolSize = poolSize;
      this.workers = new Map();
      this.availableWorkers = [];
      this.queue = [];
      this.nextWorkerId = 1;
      this.isShuttingDown = false;
      this.inFlightTasks = 0;

      // Initialize subsystems
      this.initializeMetrics();
      this.initCircuitBreaker();

      // Create workers
      for (let i = 0; i < poolSize; i++) {
        this.createWorker();
      }
    }

    // === METRICS ===

    initializeMetrics() {
      this.metrics = {
        // Counters
        tasksCompleted: 0,
        tasksFailed: 0,
        tasksRejected: 0,

        // Duration histogram buckets (in seconds)
        durationBuckets: {
          '0.01': 0,   // 10ms
          '0.05': 0,   // 50ms
          '0.1': 0,    // 100ms
          '0.5': 0,    // 500ms
          '1.0': 0,    // 1s
          '5.0': 0,    // 5s
          'inf': 0     // > 5s
        },

        // Gauges
        activeWorkers: poolSize,
        queueDepth: 0,

        // Timing
        startTime: Date.now()
      };
    }

    recordTaskComplete(durationMs) {
      this.metrics.tasksCompleted++;

      const durationSec = durationMs / 1000;

      // Update histogram
      if (durationSec <= 0.01) this.metrics.durationBuckets['0.01']++;
      else if (durationSec <= 0.05) this.metrics.durationBuckets['0.05']++;
      else if (durationSec <= 0.1) this.metrics.durationBuckets['0.1']++;
      else if (durationSec <= 0.5) this.metrics.durationBuckets['0.5']++;
      else if (durationSec <= 1.0) this.metrics.durationBuckets['1.0']++;
      else if (durationSec <= 5.0) this.metrics.durationBuckets['5.0']++;
      else this.metrics.durationBuckets['inf']++;
    }

    recordTaskFailed() {
      this.metrics.tasksFailed++;
    }

    getMetrics() {
      // Format as Prometheus-style metrics
      const lines = [];

      // Counters
      lines.push('# HELP tasks_total Total number of tasks processed');
      lines.push('# TYPE tasks_total counter');
      lines.push(`tasks_total{status="completed"} ${this.metrics.tasksCompleted}`);
      lines.push(`tasks_total{status="failed"} ${this.metrics.tasksFailed}`);
      lines.push(`tasks_total{status="rejected"} ${this.metrics.tasksRejected}`);
      lines.push('');

      // Histogram
      lines.push('# HELP task_duration_seconds Task duration in seconds');
      lines.push('# TYPE task_duration_seconds histogram');
      let cumulative = 0;
      for (const [bucket, count] of Object.entries(this.metrics.durationBuckets)) {
        cumulative += count;
        lines.push(`task_duration_seconds_bucket{le="${bucket}"} ${cumulative}`);
      }
      lines.push('');

      // Gauges
      lines.push('# HELP worker_pool_active_workers Current number of active workers');
      lines.push('# TYPE worker_pool_active_workers gauge');
      lines.push(`worker_pool_active_workers ${this.metrics.activeWorkers}`);
      lines.push('');

      lines.push('# HELP worker_pool_queue_depth Current queue depth');
      lines.push('# TYPE worker_pool_queue_depth gauge');
      lines.push(`worker_pool_queue_depth ${this.metrics.queueDepth}`);
      lines.push('');

      // Uptime
      const uptimeSeconds = (Date.now() - this.metrics.startTime) / 1000;
      lines.push('# HELP worker_pool_uptime_seconds Pool uptime in seconds');
      lines.push('# TYPE worker_pool_uptime_seconds gauge');
      lines.push(`worker_pool_uptime_seconds ${uptimeSeconds.toFixed(0)}`);

      return lines.join('\n');
    }

    // === HEALTH CHECKS ===

    checkLiveness() {
      // Liveness: Is the service alive?
      // Check if we have any workers
      const isAlive = this.workers.size > 0 && !this.isShuttingDown;

      return {
        status: isAlive ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          workers: this.workers.size,
          shuttingDown: this.isShuttingDown
        }
      };
    }

    checkReadiness() {
      // Readiness: Can we accept traffic?
      // Check circuit breaker, available workers, queue size
      const hasCapacity = this.availableWorkers.length > 0 ||
                          this.queue.length < 100;
      const circuitOk = this.circuitBreaker.state !== 'OPEN';
      const notShuttingDown = !this.isShuttingDown;

      const isReady = hasCapacity && circuitOk && notShuttingDown;

      return {
        status: isReady ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          availableWorkers: this.availableWorkers.length,
          queueDepth: this.queue.length,
          circuitBreakerState: this.circuitBreaker.state,
          shuttingDown: this.isShuttingDown
        }
      };
    }

    // === CIRCUIT BREAKER ===

    initCircuitBreaker() {
      this.circuitBreaker = {
        state: 'CLOSED',           // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        successes: 0,
        threshold: 5,              // Open after 5 failures
        successThreshold: 3,       // Close after 3 successes in half-open
        timeout: 5000,             // Try recovery after 5 seconds
        lastFailureTime: 0,
        windowSize: 10,            // Track last 10 requests
        recentResults: []
      };
    }

    updateCircuitBreaker(success) {
      const cb = this.circuitBreaker;

      // Add to recent results (sliding window)
      cb.recentResults.push(success);
      if (cb.recentResults.length > cb.windowSize) {
        cb.recentResults.shift();
      }

      if (success) {
        cb.successes++;

        if (cb.state === 'HALF_OPEN') {
          if (cb.successes >= cb.successThreshold) {
            this.transitionCircuitBreaker('CLOSED');
          }
        }
      } else {
        cb.failures++;
        cb.lastFailureTime = Date.now();

        // Calculate failure rate in window
        const failures = cb.recentResults.filter(r => !r).length;
        const failureRate = failures / cb.recentResults.length;

        if (cb.state === 'CLOSED' && failureRate >= 0.5) {
          this.transitionCircuitBreaker('OPEN');
        } else if (cb.state === 'HALF_OPEN') {
          this.transitionCircuitBreaker('OPEN');
        }
      }
    }

    transitionCircuitBreaker(newState) {
      const cb = this.circuitBreaker;
      const oldState = cb.state;
      cb.state = newState;

      console.log(`\n[CIRCUIT BREAKER] ${oldState} → ${newState}`);

      if (newState === 'CLOSED') {
        cb.failures = 0;
        cb.successes = 0;
        console.log('[CIRCUIT BREAKER] System recovered, accepting requests\n');
      } else if (newState === 'OPEN') {
        const failures = cb.recentResults.filter(r => !r).length;
        const failureRate = (failures / cb.recentResults.length * 100).toFixed(0);
        console.log(`[CIRCUIT BREAKER] Too many failures (${failureRate}%), blocking requests`);
        console.log(`[CIRCUIT BREAKER] Will attempt recovery in ${cb.timeout}ms\n`);

        // Schedule recovery attempt
        setTimeout(() => {
          if (cb.state === 'OPEN') {
            this.transitionCircuitBreaker('HALF_OPEN');
          }
        }, cb.timeout);
      } else if (newState === 'HALF_OPEN') {
        cb.successes = 0;
        console.log('[CIRCUIT BREAKER] Attempting recovery...\n');
      }
    }

    shouldAcceptTask() {
      const cb = this.circuitBreaker;

      if (cb.state === 'CLOSED') {
        return true;
      } else if (cb.state === 'HALF_OPEN') {
        return true; // Allow test requests
      } else {
        // OPEN: reject requests
        this.metrics.tasksRejected++;
        return false;
      }
    }

    // === WORKER MANAGEMENT ===

    createWorker() {
      const workerId = this.nextWorkerId++;
      const worker = new Worker(this.workerScript);

      const workerInfo = {
        id: workerId,
        worker,
        status: 'idle'
      };

      this.workers.set(workerId, workerInfo);
      this.availableWorkers.push(workerId);

      worker.on('message', (result) => {
        this.handleTaskComplete(workerId, result);
      });

      worker.on('error', (err) => {
        console.error(`[ERROR] Worker ${workerId}:`, err.message);
      });

      return workerId;
    }

    handleTaskComplete(workerId, result) {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) return;

      const task = workerInfo.currentTask;
      if (!task) return;

      this.inFlightTasks--;

      if (result.success) {
        this.recordTaskComplete(result.duration);
        this.updateCircuitBreaker(true);
        console.log(`Task ${result.id}: completed in ${result.duration.toFixed(0)}ms`);
        task.resolve(result);
      } else {
        this.recordTaskFailed();
        this.updateCircuitBreaker(false);
        console.log(`Task ${result.id}: failed (${result.error})`);
        task.reject(new Error(result.error));
      }

      // Make worker available
      workerInfo.status = 'idle';
      workerInfo.currentTask = null;
      this.availableWorkers.push(workerId);

      // Process next task
      this.processQueue();
    }

    // === TASK EXECUTION ===

    async execute(task) {
      // Check circuit breaker
      if (!this.shouldAcceptTask()) {
        throw new Error('Circuit breaker OPEN - request rejected');
      }

      // Check shutdown state
      if (this.isShuttingDown) {
        throw new Error('Pool is shutting down');
      }

      return new Promise((resolve, reject) => {
        const enrichedTask = {
          ...task,
          startTime: performance.now(),
          resolve,
          reject
        };

        this.inFlightTasks++;

        if (this.availableWorkers.length > 0) {
          this.runTask(enrichedTask);
        } else {
          this.queue.push(enrichedTask);
          this.metrics.queueDepth = this.queue.length;
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
        this.metrics.queueDepth = this.queue.length;
        this.runTask(task);
      }
    }

    // === GRACEFUL SHUTDOWN ===

    async gracefulShutdown(timeoutMs = 30000) {
      console.log('[SHUTDOWN] Stopping new task acceptance');
      this.isShuttingDown = true;

      // Wait for in-flight tasks with timeout
      const startTime = Date.now();

      while (this.inFlightTasks > 0) {
        if (Date.now() - startTime > timeoutMs) {
          console.log(`[SHUTDOWN] Timeout reached, forcing shutdown with ${this.inFlightTasks} tasks in-flight`);
          break;
        }

        console.log(`[SHUTDOWN] Waiting for ${this.inFlightTasks} in-flight tasks...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.inFlightTasks === 0) {
        console.log('[SHUTDOWN] All tasks completed');
      }

      // Terminate all workers
      console.log(`[SHUTDOWN] Terminating ${this.workers.size} workers...`);

      const terminatePromises = Array.from(this.workers.values()).map(
        workerInfo => workerInfo.worker.terminate()
      );

      await Promise.all(terminatePromises);

      console.log('[SHUTDOWN] Shutdown complete\n');
    }
  }

  // Test with failures to trigger circuit breaker
  const tasks = [
    { id: 1, shouldFail: false },
    { id: 2, shouldFail: false },
    { id: 3, shouldFail: false },
    { id: 4, shouldFail: true },   // Start failures
    { id: 5, shouldFail: true },
    { id: 6, shouldFail: true },
    { id: 7, shouldFail: true },
    { id: 8, shouldFail: true },   // Circuit should open
    { id: 9, shouldFail: false },  // Will be rejected
    { id: 10, shouldFail: false }  // Will be rejected
  ];

  async function test() {
    const pool = new ProductionWorkerPool(__filename, 4);

    // Check initial health
    console.log('[HEALTH] Liveness:', pool.checkLiveness().status);
    console.log('[HEALTH] Readiness:', pool.checkReadiness().status);
    console.log('\nProcessing tasks...\n');

    // Process tasks
    for (const task of tasks) {
      try {
        await pool.execute(task);
      } catch (error) {
        console.log(`Task ${task.id}: rejected (${error.message})`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Wait for circuit breaker recovery
    console.log('\nWaiting for circuit breaker recovery...\n');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Try more tasks after recovery
    console.log('Trying tasks after recovery...\n');
    const recoveryTasks = [
      { id: 11, shouldFail: false },
      { id: 12, shouldFail: false },
      { id: 13, shouldFail: false }
    ];

    for (const task of recoveryTasks) {
      try {
        await pool.execute(task);
      } catch (error) {
        console.log(`Task ${task.id}: rejected (${error.message})`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Export metrics
    console.log('\n' + '='.repeat(70));
    console.log('\n=== Metrics Export ===\n');
    console.log(pool.getMetrics());

    console.log('\n' + '='.repeat(70));

    // Graceful shutdown
    await pool.gracefulShutdown();
  }

  test().catch(console.error);

} else {
  // === WORKER THREAD CODE ===
  parentPort.on('message', async ({ id, shouldFail }) => {
    // Simulate work
    const duration = 100 + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, duration));

    if (shouldFail) {
      parentPort.postMessage({
        id,
        success: false,
        error: 'Simulated failure',
        duration
      });
    } else {
      parentPort.postMessage({
        id,
        success: true,
        duration
      });
    }
  });
}

/**
 * KEY FEATURES IMPLEMENTED:
 *
 * 1. Comprehensive Metrics:
 *    - Prometheus-style format
 *    - Counters, histograms, gauges
 *    - Ready for Prometheus scraping
 *
 * 2. Health Checks:
 *    - Liveness: Is service running?
 *    - Readiness: Can accept traffic?
 *    - Used by orchestrators (Kubernetes)
 *
 * 3. Circuit Breaker:
 *    - Prevents cascade failures
 *    - Three states: CLOSED, OPEN, HALF_OPEN
 *    - Automatic recovery attempts
 *    - Sliding window for failure rate
 *
 * 4. Graceful Shutdown:
 *    - Stop accepting new tasks
 *    - Wait for in-flight tasks
 *    - Timeout for forced shutdown
 *    - Clean worker termination
 *
 * PRODUCTION DEPLOYMENT:
 *
 * 1. Metrics Export:
 *    const promClient = require('prom-client');
 *    // Register metrics with Prometheus
 *    // Expose /metrics endpoint
 *
 * 2. Distributed Tracing:
 *    const opentelemetry = require('@opentelemetry/api');
 *    // Add trace context to tasks
 *    // Track request flow through system
 *
 * 3. Structured Logging:
 *    const winston = require('winston');
 *    // JSON logs for log aggregation
 *    // Correlation IDs for request tracking
 *
 * 4. Signal Handling:
 *    process.on('SIGTERM', () => {
 *      pool.gracefulShutdown().then(() => process.exit(0));
 *    });
 *
 * 5. Kubernetes Integration:
 *    - Liveness probe: GET /health/liveness
 *    - Readiness probe: GET /health/readiness
 *    - Metrics: GET /metrics
 *    - PreStop hook: gracefulShutdown()
 */
