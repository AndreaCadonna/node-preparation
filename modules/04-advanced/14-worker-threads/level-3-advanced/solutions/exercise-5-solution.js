/**
 * Solution 5: Production-Ready Worker Pool with Full Observability
 *
 * This solution demonstrates:
 * - Production-grade worker pool with comprehensive monitoring
 * - Prometheus-style metrics export
 * - Health check endpoints (liveness/readiness)
 * - Graceful shutdown with timeout
 * - Circuit breaker pattern for fault tolerance
 * - Histogram buckets for latency tracking
 * - Request/response correlation
 *
 * Key Concepts:
 * - Observability: Metrics, logs, traces for system insight
 * - Health Checks: Liveness (alive?) and Readiness (ready for traffic?)
 * - Circuit Breaker: Fail fast when error rate is high
 * - Graceful Shutdown: Clean termination without dropping tasks
 * - Metrics Export: Prometheus format for monitoring integration
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Production Worker Pool Solution ===\n');

  /**
   * Circuit breaker states
   */
  const CircuitState = {
    CLOSED: 'CLOSED',       // Normal operation
    OPEN: 'OPEN',           // Blocking requests (too many failures)
    HALF_OPEN: 'HALF_OPEN'  // Testing recovery
  };

  /**
   * Production-grade worker pool with full observability
   */
  class ProductionWorkerPool {
    constructor(workerScript, poolSize = 4) {
      this.workerScript = workerScript;
      this.poolSize = poolSize;
      this.workers = [];
      this.taskQueue = [];
      this.pendingTasks = new Map();
      this.nextTaskId = 0;

      // Shutdown state
      this.isShuttingDown = false;
      this.acceptingTasks = true;

      // Initialize components
      this.initializeWorkers();
      this.initializeMetrics();
      this.initCircuitBreaker();
      this.setupGracefulShutdown();

      console.log(`Pool initialized with ${poolSize} workers\n`);
    }

    /**
     * Initialize worker pool
     */
    initializeWorkers() {
      for (let i = 0; i < this.poolSize; i++) {
        const worker = new Worker(this.workerScript);

        const workerInfo = {
          worker,
          workerId: i,
          state: 'idle',
          tasksCompleted: 0,
          tasksFailed: 0,
          currentTask: null
        };

        worker.on('message', (result) => {
          this.handleTaskComplete(i, result);
        });

        worker.on('error', (error) => {
          console.error(`[ERROR] Worker ${i}:`, error.message);
          this.handleTaskError(i, error);
        });

        this.workers.push(workerInfo);
      }
    }

    /**
     * Initialize metrics storage
     */
    initializeMetrics() {
      this.metrics = {
        // Counters
        tasksTotal: {
          completed: 0,
          failed: 0,
          rejected: 0
        },

        // Histogram buckets for task duration (in seconds)
        durationBuckets: {
          '0.01': 0,  // 10ms
          '0.05': 0,  // 50ms
          '0.1': 0,   // 100ms
          '0.5': 0,   // 500ms
          '1.0': 0,   // 1s
          '5.0': 0,   // 5s
          '+Inf': 0
        },

        // Duration sum for average calculation
        durationSum: 0,

        // Gauges (current values)
        activeWorkers: this.poolSize,
        queueDepth: 0,
        inFlightTasks: 0,

        // Timestamps
        startTime: Date.now(),
        lastTaskTime: Date.now()
      };
    }

    /**
     * Record successful task completion
     */
    recordTaskComplete(durationSeconds) {
      this.metrics.tasksTotal.completed++;
      this.metrics.durationSum += durationSeconds;
      this.metrics.lastTaskTime = Date.now();

      // Update histogram buckets
      const buckets = Object.keys(this.metrics.durationBuckets).map(parseFloat);
      for (const bucket of buckets) {
        if (durationSeconds <= bucket || bucket === Infinity) {
          this.metrics.durationBuckets[bucket.toString()]++;
        }
      }
    }

    /**
     * Record failed task
     */
    recordTaskFailed() {
      this.metrics.tasksTotal.failed++;
      this.metrics.lastTaskTime = Date.now();
    }

    /**
     * Record rejected task (circuit breaker)
     */
    recordTaskRejected() {
      this.metrics.tasksTotal.rejected++;
    }

    /**
     * Export metrics in Prometheus format
     */
    getMetrics() {
      const lines = [];

      // Task counters
      lines.push('# HELP tasks_total Total number of tasks processed');
      lines.push('# TYPE tasks_total counter');
      lines.push(`tasks_total{status="completed"} ${this.metrics.tasksTotal.completed}`);
      lines.push(`tasks_total{status="failed"} ${this.metrics.tasksTotal.failed}`);
      lines.push(`tasks_total{status="rejected"} ${this.metrics.tasksTotal.rejected}`);
      lines.push('');

      // Duration histogram
      lines.push('# HELP task_duration_seconds Task processing duration');
      lines.push('# TYPE task_duration_seconds histogram');

      for (const [bucket, count] of Object.entries(this.metrics.durationBuckets)) {
        const bucketStr = bucket === 'Infinity' ? '+Inf' : bucket;
        lines.push(`task_duration_seconds_bucket{le="${bucketStr}"} ${count}`);
      }

      const totalTasks = this.metrics.tasksTotal.completed + this.metrics.tasksTotal.failed;
      lines.push(`task_duration_seconds_count ${totalTasks}`);
      lines.push(`task_duration_seconds_sum ${this.metrics.durationSum.toFixed(3)}`);
      lines.push('');

      // Active workers gauge
      lines.push('# HELP worker_pool_active_workers Current number of active workers');
      lines.push('# TYPE worker_pool_active_workers gauge');
      lines.push(`worker_pool_active_workers ${this.metrics.activeWorkers}`);
      lines.push('');

      // Queue depth gauge
      lines.push('# HELP worker_pool_queue_depth Current queue depth');
      lines.push('# TYPE worker_pool_queue_depth gauge');
      lines.push(`worker_pool_queue_depth ${this.metrics.queueDepth}`);
      lines.push('');

      // In-flight tasks gauge
      lines.push('# HELP worker_pool_inflight_tasks Current in-flight tasks');
      lines.push('# TYPE worker_pool_inflight_tasks gauge');
      lines.push(`worker_pool_inflight_tasks ${this.metrics.inFlightTasks}`);
      lines.push('');

      // Circuit breaker state
      lines.push('# HELP circuit_breaker_state Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)');
      lines.push('# TYPE circuit_breaker_state gauge');
      const stateValue = this.circuitBreaker.state === CircuitState.CLOSED ? 0
        : this.circuitBreaker.state === CircuitState.OPEN ? 1 : 2;
      lines.push(`circuit_breaker_state ${stateValue}`);
      lines.push('');

      return lines.join('\n');
    }

    /**
     * Initialize circuit breaker
     */
    initCircuitBreaker() {
      this.circuitBreaker = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),

        // Configuration
        config: {
          failureThreshold: 5,        // Open after 5 failures
          failureRateThreshold: 0.5,  // Open if 50% of requests fail
          successThreshold: 3,        // Close after 3 consecutive successes
          openTimeoutMs: 5000,        // Try half-open after 5s
          windowSize: 10              // Consider last 10 requests
        },

        // Request history (for failure rate calculation)
        requestHistory: []
      };
    }

    /**
     * Update circuit breaker based on task result
     */
    updateCircuitBreaker(success) {
      const cb = this.circuitBreaker;
      const history = cb.requestHistory;

      // Add to history
      history.push({ success, timestamp: Date.now() });

      // Keep only recent requests (window)
      if (history.length > cb.config.windowSize) {
        history.shift();
      }

      if (success) {
        cb.successCount++;
        cb.failureCount = 0; // Reset consecutive failures

        // If HALF_OPEN and enough successes, close circuit
        if (cb.state === CircuitState.HALF_OPEN &&
            cb.successCount >= cb.config.successThreshold) {
          this.transitionCircuitBreaker(CircuitState.CLOSED, 'Recovered - consecutive successes');
          cb.successCount = 0;
        }
      } else {
        cb.failureCount++;
        cb.successCount = 0; // Reset consecutive successes
        cb.lastFailureTime = Date.now();

        // Calculate failure rate
        const failures = history.filter(r => !r.success).length;
        const failureRate = history.length > 0 ? failures / history.length : 0;

        // Open circuit if failure threshold exceeded
        if (cb.state === CircuitState.CLOSED) {
          if (cb.failureCount >= cb.config.failureThreshold ||
              failureRate >= cb.config.failureRateThreshold) {
            this.transitionCircuitBreaker(
              CircuitState.OPEN,
              `Failure rate: ${(failureRate * 100).toFixed(0)}%`
            );
          }
        }

        // If HALF_OPEN and failure, reopen circuit
        if (cb.state === CircuitState.HALF_OPEN) {
          this.transitionCircuitBreaker(CircuitState.OPEN, 'Test request failed');
        }
      }

      // Auto-transition from OPEN to HALF_OPEN after timeout
      if (cb.state === CircuitState.OPEN) {
        const timeSinceOpen = Date.now() - cb.lastStateChange;
        if (timeSinceOpen > cb.config.openTimeoutMs) {
          this.transitionCircuitBreaker(CircuitState.HALF_OPEN, 'Attempting recovery');
        }
      }
    }

    /**
     * Transition circuit breaker state
     */
    transitionCircuitBreaker(newState, reason) {
      const cb = this.circuitBreaker;
      const oldState = cb.state;

      if (oldState === newState) return;

      cb.state = newState;
      cb.lastStateChange = Date.now();

      console.log(`\n[CIRCUIT BREAKER] ${oldState} → ${newState}`);
      console.log(`[CIRCUIT BREAKER] Reason: ${reason}`);

      if (newState === CircuitState.OPEN) {
        console.log(`[CIRCUIT BREAKER] Blocking new requests`);
      }
    }

    /**
     * Check if circuit breaker allows task execution
     */
    shouldAcceptTask() {
      const cb = this.circuitBreaker;

      switch (cb.state) {
        case CircuitState.CLOSED:
          return true; // Normal operation

        case CircuitState.OPEN:
          return false; // Reject all requests

        case CircuitState.HALF_OPEN:
          // Allow test request (one at a time)
          return this.metrics.inFlightTasks === 0;

        default:
          return false;
      }
    }

    /**
     * Health check: Liveness
     * Is the service alive and not crashed?
     */
    checkLiveness() {
      const isAlive = this.workers.every(w => w.worker.threadId > 0);

      return {
        status: isAlive ? 'healthy' : 'unhealthy',
        timestamp: Date.now(),
        uptime: Date.now() - this.metrics.startTime,
        checks: {
          workers: isAlive ? 'ok' : 'failed'
        }
      };
    }

    /**
     * Health check: Readiness
     * Is the service ready to accept traffic?
     */
    checkReadiness() {
      const checks = {
        workers: 'ok',
        circuitBreaker: 'ok',
        queue: 'ok',
        shutdown: 'ok'
      };

      // Check if workers are available
      const idleWorkers = this.workers.filter(w => w.state === 'idle').length;
      if (idleWorkers === 0 && this.taskQueue.length > this.poolSize * 2) {
        checks.workers = 'degraded';
      }

      // Check circuit breaker
      if (this.circuitBreaker.state === CircuitState.OPEN) {
        checks.circuitBreaker = 'open';
      }

      // Check queue depth
      if (this.taskQueue.length > this.poolSize * 5) {
        checks.queue = 'overloaded';
      }

      // Check shutdown state
      if (this.isShuttingDown || !this.acceptingTasks) {
        checks.shutdown = 'shutting_down';
      }

      const isReady = Object.values(checks).every(v => v === 'ok');

      return {
        status: isReady ? 'healthy' : 'unhealthy',
        timestamp: Date.now(),
        checks
      };
    }

    /**
     * Execute a task with full observability
     */
    async execute(task) {
      // Check shutdown state
      if (!this.acceptingTasks) {
        this.recordTaskRejected();
        throw new Error('Pool is shutting down, not accepting new tasks');
      }

      // Check circuit breaker
      if (!this.shouldAcceptTask()) {
        this.recordTaskRejected();
        throw new Error('Circuit breaker is OPEN, request rejected');
      }

      return new Promise((resolve, reject) => {
        const taskId = this.nextTaskId++;

        const taskInfo = {
          taskId,
          task,
          resolve,
          reject,
          queuedAt: performance.now(),
          startedAt: null
        };

        this.pendingTasks.set(taskId, taskInfo);
        this.taskQueue.push(taskId);
        this.metrics.queueDepth = this.taskQueue.length;

        // Try to assign immediately
        this.assignTasks();
      });
    }

    /**
     * Assign tasks to available workers
     */
    assignTasks() {
      while (this.taskQueue.length > 0) {
        const idleWorker = this.workers.find(w => w.state === 'idle');
        if (!idleWorker) break;

        const taskId = this.taskQueue.shift();
        const taskInfo = this.pendingTasks.get(taskId);

        if (!taskInfo) continue;

        // Assign to worker
        idleWorker.state = 'busy';
        idleWorker.currentTask = taskId;
        taskInfo.startedAt = performance.now();

        this.metrics.queueDepth = this.taskQueue.length;
        this.metrics.inFlightTasks++;

        // Send task
        idleWorker.worker.postMessage(taskInfo.task);
      }
    }

    /**
     * Handle task completion
     */
    handleTaskComplete(workerId, result) {
      const workerInfo = this.workers[workerId];
      const taskId = workerInfo.currentTask;
      const taskInfo = this.pendingTasks.get(taskId);

      if (!taskInfo) return;

      const duration = (performance.now() - taskInfo.startedAt) / 1000; // seconds

      if (result.success) {
        // Success
        console.log(`[Task ${result.id}] Completed in ${(duration * 1000).toFixed(0)}ms`);

        this.recordTaskComplete(duration);
        this.updateCircuitBreaker(true);

        workerInfo.tasksCompleted++;
        taskInfo.resolve(result);
      } else {
        // Failure
        console.log(`[Task ${result.id}] Failed: ${result.error}`);

        this.recordTaskFailed();
        this.updateCircuitBreaker(false);

        workerInfo.tasksFailed++;
        taskInfo.reject(new Error(result.error));
      }

      // Calculate failure rate for display
      const history = this.circuitBreaker.requestHistory;
      if (history.length >= 3) {
        const failures = history.filter(r => !r.success).length;
        const failureRate = (failures / history.length * 100).toFixed(0);
        console.log(`[CIRCUIT] Failure rate: ${failureRate}% (${failures}/${history.length})`);
      }

      this.pendingTasks.delete(taskId);
      workerInfo.state = 'idle';
      workerInfo.currentTask = null;
      this.metrics.inFlightTasks--;

      // Assign next task
      this.assignTasks();
    }

    /**
     * Handle task error
     */
    handleTaskError(workerId, error) {
      const workerInfo = this.workers[workerId];
      const taskId = workerInfo.currentTask;
      const taskInfo = this.pendingTasks.get(taskId);

      if (taskInfo) {
        this.recordTaskFailed();
        this.updateCircuitBreaker(false);

        workerInfo.tasksFailed++;
        taskInfo.reject(error);
        this.pendingTasks.delete(taskId);
      }

      workerInfo.state = 'idle';
      workerInfo.currentTask = null;
      this.metrics.inFlightTasks--;
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
      // Handle SIGTERM and SIGINT
      const shutdownHandler = () => {
        console.log('\n[SHUTDOWN] Signal received');
        this.gracefulShutdown().catch(console.error);
      };

      process.on('SIGTERM', shutdownHandler);
      process.on('SIGINT', shutdownHandler);
    }

    /**
     * Graceful shutdown with timeout
     */
    async gracefulShutdown(timeoutMs = 30000) {
      if (this.isShuttingDown) return;

      console.log('\n=== Initiating Graceful Shutdown ===\n');

      this.isShuttingDown = true;
      this.acceptingTasks = false;

      console.log('[SHUTDOWN] Stopped accepting new tasks');

      // Wait for in-flight tasks
      const inFlightCount = this.metrics.inFlightTasks;
      if (inFlightCount > 0) {
        console.log(`[SHUTDOWN] Waiting for ${inFlightCount} in-flight tasks...`);

        const startTime = Date.now();

        while (this.metrics.inFlightTasks > 0) {
          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            console.log('[SHUTDOWN] Timeout reached, forcing shutdown');
            break;
          }

          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.metrics.inFlightTasks === 0) {
          console.log('[SHUTDOWN] All in-flight tasks completed');
        }
      }

      // Terminate workers
      console.log(`[SHUTDOWN] Terminating ${this.workers.length} workers...`);

      const terminatePromises = this.workers.map(w =>
        w.worker.terminate()
      );

      await Promise.all(terminatePromises);

      console.log('[SHUTDOWN] All workers terminated');
      console.log('[SHUTDOWN] Shutdown complete\n');

      // Exit process
      process.exit(0);
    }
  }

  /**
   * Test the production worker pool
   */
  async function test() {
    const pool = new ProductionWorkerPool(__filename, 4);

    // Display initial health checks
    console.log('[HEALTH] Liveness:', pool.checkLiveness().status);
    console.log('[HEALTH] Readiness:', pool.checkReadiness().status);
    console.log('');

    // Test tasks with some failures
    const tasks = [
      { id: 1, shouldFail: false },
      { id: 2, shouldFail: false },
      { id: 3, shouldFail: true },   // Trigger failures
      { id: 4, shouldFail: false },
      { id: 5, shouldFail: false },
      { id: 6, shouldFail: true },
      { id: 7, shouldFail: true },
      { id: 8, shouldFail: true },   // Circuit should open
      { id: 9, shouldFail: false },
      { id: 10, shouldFail: false },
      { id: 11, shouldFail: false },
      { id: 12, shouldFail: false }
    ];

    console.log('Processing tasks...\n');

    for (const task of tasks) {
      try {
        await pool.execute(task);
      } catch (error) {
        console.log(`[Task ${task.id}] Rejected: ${error.message}`);
      }

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Wait a bit for circuit breaker recovery
    console.log('\n[CIRCUIT] Waiting for recovery...\n');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Try a few more tasks after recovery
    console.log('Testing circuit breaker recovery...\n');
    for (let i = 13; i <= 15; i++) {
      try {
        await pool.execute({ id: i, shouldFail: false });
      } catch (error) {
        console.log(`[Task ${i}] Rejected: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Export metrics
    console.log('\n=== Metrics Export ===\n');
    console.log(pool.getMetrics());

    // Final health check
    console.log('=== Final Health Check ===\n');
    console.log('[HEALTH] Liveness:', JSON.stringify(pool.checkLiveness(), null, 2));
    console.log('[HEALTH] Readiness:', JSON.stringify(pool.checkReadiness(), null, 2));

    // Graceful shutdown
    await pool.gracefulShutdown();
  }

  test().catch(console.error);

} else {
  /**
   * Worker code: Simulates task processing with potential failures
   * Provided by the exercise
   */
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
 * EDUCATIONAL NOTES:
 *
 * 1. OBSERVABILITY PILLARS:
 *    Three pillars of observability:
 *      - Metrics: Numerical measurements (counters, gauges, histograms)
 *      - Logs: Timestamped event records
 *      - Traces: Request flow through system
 *    This solution focuses on metrics and structured logging.
 *
 * 2. PROMETHEUS METRICS:
 *    Four metric types:
 *      - Counter: Monotonically increasing (tasks_total)
 *      - Gauge: Can go up/down (queue_depth, active_workers)
 *      - Histogram: Distribution of values (task_duration_seconds)
 *      - Summary: Similar to histogram with quantiles
 *
 * 3. HISTOGRAM BUCKETS:
 *    Buckets define latency thresholds:
 *      le="0.1" means "less than or equal to 0.1 seconds"
 *      Cumulative: Each bucket includes all smaller buckets
 *      Example: If le="0.5" is 10, then 10 requests took ≤500ms
 *
 * 4. HEALTH CHECKS:
 *    Liveness probe:
 *      - "Is the application running?"
 *      - Fails if: process crashed, deadlocked, hung
 *      - Action: Restart application
 *
 *    Readiness probe:
 *      - "Can it handle traffic?"
 *      - Fails if: dependencies down, overloaded, initializing
 *      - Action: Remove from load balancer
 *
 * 5. CIRCUIT BREAKER PATTERN:
 *    Prevents cascading failures in distributed systems.
 *
 *    States:
 *      - CLOSED: Normal operation, requests flow through
 *      - OPEN: Too many failures, block requests (fail fast)
 *      - HALF_OPEN: Testing recovery, allow test requests
 *
 *    Benefits:
 *      - Fail fast (don't wait for timeout)
 *      - Give failing service time to recover
 *      - Prevent resource exhaustion
 *      - Automatic recovery testing
 *
 * 6. CIRCUIT BREAKER CONFIGURATION:
 *    Key parameters:
 *      - Failure threshold: How many failures to open (5)
 *      - Failure rate: What % of requests failing (50%)
 *      - Success threshold: Consecutive successes to close (3)
 *      - Open timeout: How long to stay open (5s)
 *      - Window size: How many requests to consider (10)
 *
 * 7. GRACEFUL SHUTDOWN:
 *    Steps:
 *      1. Stop accepting new requests (acceptingTasks = false)
 *      2. Wait for in-flight requests to complete
 *      3. Terminate workers cleanly
 *      4. Exit process
 *
 *    Why important:
 *      - Don't drop in-flight requests
 *      - Clean up resources
 *      - Proper connection closure
 *      - Data integrity
 *
 * 8. SHUTDOWN TIMEOUT:
 *    After timeout, force shutdown:
 *      - Some tasks may be hung
 *      - External systems may be down
 *      - Can't wait forever
 *      - Typically: 30-60 seconds
 *
 * 9. PRODUCTION BEST PRACTICES:
 *    - Export metrics on /metrics endpoint (not console)
 *    - Use structured logging (JSON format)
 *    - Include correlation IDs for request tracing
 *    - Set up alerting on key metrics
 *    - Monitor error rates, latencies, queue depth
 *    - Regular health check intervals (e.g., every 5s)
 *
 * 10. MONITORING ALERTS:
 *     Critical alerts:
 *       - High error rate (>5%)
 *       - High latency (p99 > threshold)
 *       - Queue backing up (depth > 2x workers)
 *       - Circuit breaker open
 *       - Workers crashing
 *       - Health check failures
 *
 * 11. METRICS CARDINALITY:
 *     Be careful with labels:
 *       - Good: status="completed" (few values)
 *       - Bad: user_id="12345" (unbounded values)
 *       - High cardinality = high memory usage
 *       - Keep labels to 10-20 unique values max
 *
 * 12. CORRELATION AND TRACING:
 *     In production, add:
 *       - Request ID (trace entire request)
 *       - Span ID (trace within service)
 *       - Parent span (distributed tracing)
 *       - Use OpenTelemetry for standardization
 *
 * 13. RATE LIMITING:
 *     Additional fault tolerance:
 *       - Limit requests per second
 *       - Prevent overload
 *       - Token bucket algorithm
 *       - Per-client quotas
 *
 * 14. BACKPRESSURE:
 *     When queue fills up:
 *       - Reject new requests (fail fast)
 *       - Return 503 Service Unavailable
 *       - Client should retry with backoff
 *       - Better than accepting and timing out
 *
 * 15. REAL-WORLD INTEGRATIONS:
 *     - Prometheus: Scrape /metrics endpoint
 *     - Grafana: Visualize metrics
 *     - AlertManager: Route alerts
 *     - ELK Stack: Centralized logging
 *     - Jaeger/Zipkin: Distributed tracing
 *     - DataDog/NewRelic: All-in-one APM
 *
 * 16. PERFORMANCE CONSIDERATIONS:
 *     - Metrics collection overhead: <1% CPU typically
 *     - Batch metric updates when possible
 *     - Avoid blocking operations in metric recording
 *     - Use gauges for current state (cheap)
 *     - Histograms are expensive (many counters)
 *
 * 17. KUBERNETES INTEGRATION:
 *     livenessProbe:
 *       httpGet:
 *         path: /health/liveness
 *         port: 8080
 *       periodSeconds: 10
 *
 *     readinessProbe:
 *       httpGet:
 *         path: /health/readiness
 *         port: 8080
 *       periodSeconds: 5
 *
 *     preStop hook:
 *       exec:
 *         command: ["/bin/sh", "-c", "sleep 5"]
 *       # Give time for load balancer to deregister
 *
 * 18. TESTING OBSERVABILITY:
 *     - Chaos engineering: Inject failures
 *     - Load testing: Verify metrics scale
 *     - Failure testing: Trigger circuit breaker
 *     - Shutdown testing: Verify graceful shutdown
 *     - Alert testing: Verify alerts fire correctly
 */
