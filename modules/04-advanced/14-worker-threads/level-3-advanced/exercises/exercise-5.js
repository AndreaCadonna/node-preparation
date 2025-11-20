/**
 * Exercise 5: Production-Ready Worker Pool with Full Observability
 *
 * TASK:
 * Build a production-grade worker pool with comprehensive monitoring,
 * health checks, graceful shutdown, and metrics export.
 *
 * REQUIREMENTS:
 * 1. Worker pool with health monitoring
 * 2. Prometheus-style metrics:
 *    - Task duration histogram
 *    - Active workers gauge
 *    - Task counters (completed/failed)
 *    - Queue depth gauge
 * 3. Health check endpoint simulation:
 *    - /health/liveness (is service alive?)
 *    - /health/readiness (can accept traffic?)
 * 4. Graceful shutdown:
 *    - Stop accepting new tasks
 *    - Wait for in-flight tasks
 *    - Terminate workers cleanly
 *    - Timeout for forced shutdown
 * 5. Circuit breaker:
 *    - Open after 50% failure rate
 *    - Half-open for recovery testing
 *    - Close when recovered
 *
 * BONUS:
 * - Export metrics to actual Prometheus
 * - Add distributed tracing
 * - Implement rate limiting
 * - Add request replay capability
 *
 * EXPECTED OUTPUT:
 * === Production Worker Pool ===
 *
 * [HEALTH] Liveness: HEALTHY
 * [HEALTH] Readiness: HEALTHY
 *
 * Processing tasks...
 * Task 1: completed in 120ms
 * Task 2: completed in 135ms
 * Task 3: failed (simulated error)
 * Task 4: completed in 142ms
 *
 * [CIRCUIT] Failure rate: 25% (OK)
 *
 * Task 10: failed
 * Task 11: failed
 * Task 12: failed
 * [CIRCUIT] OPEN - Too many failures (50%)
 * [CIRCUIT] Blocking new requests
 *
 * === Metrics Export ===
 * # TYPE tasks_total counter
 * tasks_total{status="completed"} 20
 * tasks_total{status="failed"} 10
 *
 * # TYPE task_duration_seconds histogram
 * task_duration_seconds_bucket{le="0.1"} 5
 * task_duration_seconds_bucket{le="0.5"} 18
 * task_duration_seconds_bucket{le="1.0"} 20
 *
 * # TYPE worker_pool_active_workers gauge
 * worker_pool_active_workers 4
 *
 * # TYPE worker_pool_queue_depth gauge
 * worker_pool_queue_depth 0
 *
 * === Initiating Graceful Shutdown ===
 * [SHUTDOWN] Stopping new task acceptance
 * [SHUTDOWN] Waiting for 3 in-flight tasks...
 * [SHUTDOWN] All tasks completed
 * [SHUTDOWN] Terminating 4 workers...
 * [SHUTDOWN] Shutdown complete
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Production Worker Pool Exercise ===\n');

  class ProductionWorkerPool {
    constructor(workerScript, poolSize = 4) {
      // TODO: Initialize production pool
      // - Create workers
      // - Initialize metrics
      // - Setup health checks
      // - Initialize circuit breaker
      // - Setup graceful shutdown handlers
    }

    // === METRICS ===

    initializeMetrics() {
      // TODO: Initialize metrics storage
      // - Task counters (completed, failed)
      // - Duration histogram buckets
      // - Active workers gauge
      // - Queue depth gauge
    }

    recordTaskComplete(duration) {
      // TODO: Record successful task
    }

    recordTaskFailed() {
      // TODO: Record failed task
    }

    getMetrics() {
      // TODO: Return Prometheus-style metrics
      // Format:
      // # TYPE tasks_total counter
      // tasks_total{status="completed"} 20
    }

    // === HEALTH CHECKS ===

    checkLiveness() {
      // TODO: Check if service is alive
      // - Are workers running?
      // - Is main thread responsive?
      return { status: 'healthy', timestamp: Date.now() };
    }

    checkReadiness() {
      // TODO: Check if can accept traffic
      // - Are workers available?
      // - Is circuit breaker closed?
      // - Is queue not overloaded?
      return { status: 'healthy', timestamp: Date.now() };
    }

    // === CIRCUIT BREAKER ===

    initCircuitBreaker() {
      // TODO: Initialize circuit breaker
      // States: CLOSED, OPEN, HALF_OPEN
      // - Track failure rate
      // - Open after threshold
      // - Attempt recovery
    }

    updateCircuitBreaker(success) {
      // TODO: Update based on task result
      // - Calculate failure rate
      // - Transition states
      // - Log state changes
    }

    shouldAcceptTask() {
      // TODO: Check if circuit allows task
      // - CLOSED: accept
      // - OPEN: reject
      // - HALF_OPEN: accept test request
    }

    // === TASK EXECUTION ===

    async execute(task) {
      // TODO: Execute with full observability
      // - Check circuit breaker
      // - Check shutdown state
      // - Add to queue
      // - Track metrics
      // - Update circuit breaker
      // - Return result
    }

    // === GRACEFUL SHUTDOWN ===

    async gracefulShutdown(timeoutMs = 30000) {
      // TODO: Implement graceful shutdown
      // 1. Stop accepting new tasks
      // 2. Wait for in-flight tasks
      // 3. Terminate workers
      // 4. Force shutdown if timeout
      console.log('\n=== Initiating Graceful Shutdown ===\n');
    }
  }

  // Test tasks with failures to trigger circuit breaker
  const tasks = [
    { id: 1, shouldFail: false },
    { id: 2, shouldFail: false },
    { id: 3, shouldFail: true },   // Trigger some failures
    { id: 4, shouldFail: false },
    { id: 5, shouldFail: false },
    { id: 6, shouldFail: true },
    { id: 7, shouldFail: true },
    { id: 8, shouldFail: true },   // Circuit should open
    { id: 9, shouldFail: false },
    { id: 10, shouldFail: false }
  ];

  async function test() {
    const pool = new ProductionWorkerPool(__filename, 4);

    // Check health
    console.log('[HEALTH] Liveness:', pool.checkLiveness().status);
    console.log('[HEALTH] Readiness:', pool.checkReadiness().status);
    console.log('');

    // Process tasks
    console.log('Processing tasks...\n');

    for (const task of tasks) {
      try {
        await pool.execute(task);
      } catch (error) {
        // Circuit breaker may reject
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Export metrics
    console.log('\n=== Metrics Export ===\n');
    console.log(pool.getMetrics());

    // Graceful shutdown
    await pool.gracefulShutdown();
  }

  // Handle SIGTERM/SIGINT for graceful shutdown
  // process.on('SIGTERM', () => pool.gracefulShutdown());

  test().catch(console.error);

} else {
  // Worker code (provided)
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
