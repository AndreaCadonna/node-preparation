/**
 * Solution 4: Performance Benchmarking and Optimization
 *
 * This solution demonstrates:
 * - Systematic performance testing
 * - Different pool size configurations
 * - Throughput and latency measurement
 * - Finding optimal configuration
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');
const os = require('os');

if (isMainThread) {
  console.log('=== Worker Pool Performance Benchmark ===\n');
  console.log(`System: ${os.cpus().length} CPU cores\n`);

  // Simple Worker Pool Implementation
  class SimpleWorkerPool {
    constructor(workerScript, poolSize) {
      this.workerScript = workerScript;
      this.poolSize = poolSize;
      this.workers = [];
      this.availableWorkers = [];
      this.queue = [];
      this.taskId = 0;
      this.stats = {
        tasksCompleted: 0,
        totalLatency: 0
      };

      // Create workers
      for (let i = 0; i < poolSize; i++) {
        this.addWorker();
      }
    }

    addWorker() {
      const worker = new Worker(this.workerScript);
      this.workers.push(worker);
      this.availableWorkers.push(worker);

      worker.on('message', (result) => {
        this.stats.tasksCompleted++;
        this.stats.totalLatency += result.duration;

        // Resolve the task promise
        const task = worker.currentTask;
        if (task) {
          task.resolve(result);
          delete worker.currentTask;
        }

        // Make worker available
        this.availableWorkers.push(worker);

        // Process next task in queue
        this.processQueue();
      });

      worker.on('error', (err) => {
        if (worker.currentTask) {
          worker.currentTask.reject(err);
        }
      });
    }

    async execute(data) {
      return new Promise((resolve, reject) => {
        const taskId = this.taskId++;
        const task = { data: { ...data, taskId }, resolve, reject };

        if (this.availableWorkers.length > 0) {
          this.runTask(task);
        } else {
          this.queue.push(task);
        }
      });
    }

    runTask(task) {
      const worker = this.availableWorkers.shift();
      worker.currentTask = task;
      worker.postMessage(task.data);
    }

    processQueue() {
      if (this.queue.length > 0 && this.availableWorkers.length > 0) {
        const task = this.queue.shift();
        this.runTask(task);
      }
    }

    async terminate() {
      await Promise.all(
        this.workers.map(worker => worker.terminate())
      );
    }

    getStats() {
      return {
        tasksCompleted: this.stats.tasksCompleted,
        avgLatency: this.stats.totalLatency / this.stats.tasksCompleted
      };
    }
  }

  // Benchmark function
  async function benchmark(poolSize, numTasks) {
    const pool = new SimpleWorkerPool(__filename, poolSize);

    const startTime = performance.now();

    // Run all tasks
    const tasks = Array.from({ length: numTasks }, (_, i) => ({
      n: 35
    }));

    await Promise.all(tasks.map(task => pool.execute(task)));

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const stats = pool.getStats();
    const throughput = (numTasks / totalTime) * 1000; // tasks per second

    await pool.terminate();

    return {
      poolSize,
      totalTime,
      throughput,
      avgLatency: stats.avgLatency
    };
  }

  // Run benchmarks
  async function runBenchmarks() {
    const poolSizes = [1, 2, 4, 8, 16];
    const numTasks = 100;
    const results = [];

    console.log('Running benchmarks...\n');
    console.log('='.repeat(70));
    console.log('Pool Size | Total Time | Throughput    | Avg Latency');
    console.log('='.repeat(70));

    for (const poolSize of poolSizes) {
      console.log(`\nTesting pool size: ${poolSize}...`);

      const result = await benchmark(poolSize, numTasks);
      results.push(result);

      console.log(
        `${result.poolSize.toString().padEnd(9)} | ` +
        `${result.totalTime.toFixed(0).padStart(10)}ms | ` +
        `${result.throughput.toFixed(1).padStart(10)} t/s | ` +
        `${result.avgLatency.toFixed(0).padStart(8)}ms`
      );
    }

    // Find optimal configuration
    console.log('\n' + '='.repeat(70));
    console.log('\n=== Analysis ===\n');

    const fastest = results.reduce((min, r) =>
      r.totalTime < min.totalTime ? r : min
    );

    const highestThroughput = results.reduce((max, r) =>
      r.throughput > max.throughput ? r : max
    );

    console.log(`Fastest completion: ${fastest.poolSize} workers (${fastest.totalTime.toFixed(0)}ms)`);
    console.log(`Highest throughput: ${highestThroughput.poolSize} workers (${highestThroughput.throughput.toFixed(1)} tasks/sec)`);

    const cpuCount = os.cpus().length;
    const optimalPoolSize = results.find(r => r.poolSize === cpuCount);

    if (optimalPoolSize) {
      console.log(`\nRecommendation: Use ${cpuCount} workers (matches CPU cores)`);
      console.log(`Expected performance: ${optimalPoolSize.throughput.toFixed(1)} tasks/sec`);
    }

    // Calculate efficiency
    const baseline = results[0]; // Single worker
    console.log('\n=== Speedup vs Single Worker ===\n');

    results.slice(1).forEach(result => {
      const speedup = baseline.totalTime / result.totalTime;
      const efficiency = (speedup / result.poolSize) * 100;

      console.log(
        `${result.poolSize} workers: ` +
        `${speedup.toFixed(2)}x faster ` +
        `(${efficiency.toFixed(1)}% efficiency)`
      );
    });
  }

  runBenchmarks().catch(console.error);

} else {
  // === WORKER THREAD CODE ===
  parentPort.on('message', ({ n, taskId }) => {
    const startTime = performance.now();

    function fibonacci(num) {
      if (num <= 1) return num;
      return fibonacci(num - 1) + fibonacci(num - 2);
    }

    const result = fibonacci(n);
    const duration = performance.now() - startTime;

    parentPort.postMessage({
      taskId,
      result,
      duration
    });
  });
}

/**
 * EXPECTED RESULTS (on a 4-core machine):
 *
 * Pool Size | Total Time | Throughput    | Avg Latency
 * ==================================================================
 * 1         |     12500ms |        8.0 t/s |    125ms
 * 2         |      6400ms |       15.6 t/s |     64ms
 * 4         |      3300ms |       30.3 t/s |     33ms  <- OPTIMAL
 * 8         |      3400ms |       29.4 t/s |     34ms
 * 16        |      3500ms |       28.6 t/s |     35ms
 *
 * KEY OBSERVATIONS:
 *
 * 1. Performance scales well up to CPU core count
 * 2. Beyond core count, overhead increases
 * 3. Optimal pool size ≈ number of CPU cores
 * 4. Efficiency decreases with more workers
 *
 * OPTIMIZATION TIPS:
 *
 * 1. CPU-bound tasks: workers = CPU cores
 * 2. I/O-bound tasks: workers > CPU cores
 * 3. Mixed workload: start with CPU cores, tune based on metrics
 * 4. Consider task duration and overhead
 *
 * ADVANCED IMPROVEMENTS:
 *
 * 1. Dynamic pool sizing:
 *    - Measure queue depth
 *    - Add workers when queue grows
 *    - Remove workers when idle
 *
 * 2. Task prioritization:
 *    - High-priority tasks skip queue
 *    - Weighted task distribution
 *
 * 3. Better metrics:
 *    - P50, P95, P99 latency
 *    - Memory usage per worker
 *    - Task completion histogram
 */
