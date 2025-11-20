/**
 * Exercise 4: Build an Auto-Scaling Worker Pool
 *
 * TASK:
 * Create a worker pool that automatically scales based on workload and
 * system resources.
 *
 * REQUIREMENTS:
 * 1. Start with 2 workers (minWorkers)
 * 2. Scale up to 8 workers (maxWorkers) based on:
 *    - Queue depth (> 10 tasks waiting)
 *    - CPU availability
 *    - Task processing rate
 * 3. Scale down when:
 *    - Queue is empty
 *    - Workers are idle
 *    - CPU usage is low
 * 4. Prevent thrashing (rapid scale up/down)
 * 5. Track and display scaling events
 *
 * WORKLOAD:
 * - Send tasks in waves:
 *   - Wave 1: 5 tasks (low load)
 *   - Wave 2: 30 tasks (high load, should scale up)
 *   - Wave 3: 5 tasks (low load, should scale down)
 *
 * BONUS:
 * - Use exponential moving average for metrics
 * - Implement cool-down periods
 * - Add predictive scaling
 * - Monitor memory pressure
 *
 * EXPECTED OUTPUT:
 * Pool initialized with 2 workers
 *
 * Wave 1: 5 tasks
 * Queue depth: 3, Workers: 2 (idle: 0)
 *
 * Wave 2: 30 tasks
 * Queue depth: 25, Workers: 2 (idle: 0)
 * [SCALE UP] Adding worker (2 → 3) - Reason: High queue depth
 * [SCALE UP] Adding worker (3 → 4) - Reason: High queue depth
 * [SCALE UP] Adding worker (4 → 5) - Reason: High queue depth
 * Queue depth: 12, Workers: 5 (idle: 0)
 *
 * Wave 3: 5 tasks
 * Queue depth: 0, Workers: 5 (idle: 3)
 * [SCALE DOWN] Removing worker (5 → 4) - Reason: Idle workers
 * [SCALE DOWN] Removing worker (4 → 3) - Reason: Idle workers
 * [SCALE DOWN] Removing worker (3 → 2) - Reason: Idle workers
 * Final: 2 workers
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os');

if (isMainThread) {
  console.log('=== Auto-Scaling Worker Pool Exercise ===\n');

  class AutoScalingPool {
    constructor(workerScript, minWorkers = 2, maxWorkers = 8) {
      // TODO: Initialize pool
      // - Set min/max worker limits
      // - Track queue depth
      // - Track worker states
      // - Setup scaling metrics
      // - Start with minWorkers
    }

    startScalingMonitor() {
      // TODO: Periodically check if scaling is needed
      // - Monitor queue depth
      // - Monitor worker utilization
      // - Check CPU availability
      // - Apply scaling decisions with cool-down
    }

    shouldScaleUp() {
      // TODO: Determine if pool should scale up
      // - Queue depth > threshold
      // - All workers busy
      // - Haven't scaled recently (cool-down)
      // - Haven't reached maxWorkers
    }

    shouldScaleDown() {
      // TODO: Determine if pool should scale down
      // - Queue is empty
      // - Multiple idle workers
      // - Haven't scaled recently (cool-down)
      // - Haven't reached minWorkers
    }

    scaleUp() {
      // TODO: Add a worker
      // - Create new worker
      // - Log scaling event
      // - Update metrics
    }

    scaleDown() {
      // TODO: Remove a worker
      // - Gracefully terminate idle worker
      // - Log scaling event
      // - Update metrics
    }

    async execute(task) {
      // TODO: Execute task with auto-scaling
      // - Add to queue
      // - Assign to available worker
      // - Return promise
    }

    getMetrics() {
      // TODO: Return pool metrics
      // - Current worker count
      // - Queue depth
      // - Idle worker count
      // - Total tasks processed
    }
  }

  // Test workload
  async function test() {
    const pool = new AutoScalingPool(__filename, 2, 8);

    // Wave 1: Low load
    console.log('Wave 1: Sending 5 tasks (low load)...\n');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) => pool.execute({ id: i, duration: 500 }))
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Wave 2: High load
    console.log('\nWave 2: Sending 30 tasks (high load)...\n');
    const wave2 = Array.from({ length: 30 }, (_, i) =>
      pool.execute({ id: i + 5, duration: 500 })
    );

    await new Promise(resolve => setTimeout(resolve, 3000));

    await Promise.all(wave2);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Wave 3: Low load
    console.log('\nWave 3: Sending 5 tasks (low load)...\n');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) => pool.execute({ id: i + 35, duration: 500 }))
    );

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n=== Final Metrics ===');
    console.log(pool.getMetrics());

    await pool.terminate();
  }

  test().catch(console.error);

} else {
  // Worker code (provided)
  parentPort.on('message', async ({ id, duration }) => {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, duration));

    parentPort.postMessage({ id, completed: true });
  });
}
