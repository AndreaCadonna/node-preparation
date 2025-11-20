/**
 * Exercise 5: Debugging and Monitoring Workers
 *
 * TASK:
 * Build a monitored worker pool with comprehensive logging, health checks,
 * and crash recovery.
 *
 * REQUIREMENTS:
 * 1. Worker pool with 4 workers
 * 2. Comprehensive logging system:
 *    - Worker lifecycle events (created, idle, busy, terminated)
 *    - Task events (queued, started, completed, failed)
 *    - Performance metrics (task duration, queue size)
 *
 * 3. Health monitoring:
 *    - Track worker status (healthy, unresponsive, crashed)
 *    - Detect hanging workers (tasks > 5 seconds)
 *    - Monitor memory usage
 *
 * 4. Crash recovery:
 *    - Automatically recreate crashed workers
 *    - Retry failed tasks
 *    - Maintain pool health
 *
 * 5. Some tasks should:
 *    - Complete successfully
 *    - Fail with errors
 *    - Hang (simulate with infinite loop)
 *    - Crash the worker (exit)
 *
 * BONUS:
 * - Add structured logging (JSON format)
 * - Export metrics for monitoring systems
 * - Add worker warm-up period
 * - Implement circuit breaker pattern
 *
 * EXPECTED OUTPUT:
 * [INFO] Pool created with 4 workers
 * [INFO] Worker 1 created (PID: 12345)
 * [INFO] Task 1 queued
 * [INFO] Task 1 started on Worker 1
 * [INFO] Task 1 completed in 250ms
 * [ERROR] Task 5 failed: Division by zero
 * [WARN] Worker 2 unresponsive (task timeout)
 * [INFO] Worker 2 terminated and restarted
 * [CRITICAL] Worker 3 crashed (exit code 1)
 * [INFO] Worker 3 recreated
 *
 * === Health Report ===
 * Total Tasks: 20
 * Completed: 15
 * Failed: 3
 * Retried: 2
 * Workers Crashed: 2
 * Average Task Time: 180ms
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Monitored Worker Pool Exercise ===\n');

  // TODO: Implement MonitoredWorkerPool
  class MonitoredWorkerPool {
    constructor(workerScript, poolSize = 4) {
      // Your implementation here
      // - Create workers
      // - Setup logging
      // - Setup health monitoring
      // - Setup crash recovery
    }

    log(level, message, data = {}) {
      // TODO: Implement structured logging
    }

    async execute(task) {
      // TODO: Execute task with monitoring
      // - Log task queued
      // - Assign to worker
      // - Track execution time
      // - Handle errors
      // - Detect timeouts
    }

    monitorHealth() {
      // TODO: Check worker health periodically
      // - Detect unresponsive workers
      // - Check memory usage
      // - Log health status
    }

    handleWorkerCrash(workerId) {
      // TODO: Handle worker crash
      // - Log crash
      // - Recreate worker
      // - Retry pending tasks
    }

    getHealthReport() {
      // TODO: Return comprehensive health metrics
    }
  }

  // Test tasks
  const tasks = [
    { id: 1, type: 'fibonacci', n: 35 },           // Success
    { id: 2, type: 'fibonacci', n: 36 },           // Success
    { id: 3, type: 'divide', a: 10, b: 2 },        // Success
    { id: 4, type: 'divide', a: 10, b: 0 },        // Error: division by zero
    { id: 5, type: 'fibonacci', n: 37 },           // Success
    { id: 6, type: 'hang' },                       // Timeout (hang)
    { id: 7, type: 'crash' },                      // Crash worker
    { id: 8, type: 'fibonacci', n: 35 },           // Success (after recovery)
    { id: 9, type: 'parse', data: '{invalid}' },   // Error: invalid JSON
    { id: 10, type: 'fibonacci', n: 36 }           // Success
  ];

  async function test() {
    const pool = new MonitoredWorkerPool(__filename, 4);

    console.log('Running tasks with monitoring...\n');

    // Run all tasks
    const results = await Promise.allSettled(
      tasks.map(task => pool.execute(task))
    );

    // Display health report
    console.log('\n=== Health Report ===');
    const report = pool.getHealthReport();
    console.log(report);

    await pool.terminate();
  }

  test().catch(console.error);

} else {
  // Worker code (provided)
  const workerId = workerData.workerId;

  parentPort.on('message', (task) => {
    try {
      let result;

      switch (task.type) {
        case 'fibonacci':
          function fibonacci(n) {
            if (n <= 1) return n;
            return fibonacci(n - 1) + fibonacci(n - 2);
          }
          result = fibonacci(task.n);
          break;

        case 'divide':
          if (task.b === 0) throw new Error('Division by zero');
          result = task.a / task.b;
          break;

        case 'parse':
          result = JSON.parse(task.data);
          break;

        case 'hang':
          // Simulate hanging worker
          while (true) {
            // Infinite loop
          }
          break;

        case 'crash':
          // Simulate worker crash
          process.exit(1);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      parentPort.postMessage({
        taskId: task.id,
        success: true,
        result
      });

    } catch (error) {
      parentPort.postMessage({
        taskId: task.id,
        success: false,
        error: error.message
      });
    }
  });
}
