/**
 * Exercise 4 Solution: Performance Benchmarking and Optimization
 *
 * This solution demonstrates:
 * - Performance testing with different pool sizes
 * - Measuring throughput, latency, and total time
 * - Finding optimal worker count for workload
 * - Statistical analysis of performance data
 * - Visualization of benchmark results
 *
 * KEY CONCEPTS:
 * - Benchmark Methodology: Consistent testing across configurations
 * - Performance Metrics: Throughput, latency, completion time
 * - Optimal Pool Size: Balance between parallelism and overhead
 * - CPU vs I/O Workloads: Different optimal configurations
 * - Amdahl's Law: Diminishing returns from parallelism
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');
const os = require('os');

if (isMainThread) {
  console.log('=== Worker Pool Performance Benchmark ===\n');
  console.log(`System: ${os.cpus().length} CPU cores\n`);

  /**
   * Simple WorkerPool for benchmarking
   * Focused on performance measurement
   */
  class BenchmarkWorkerPool {
    constructor(workerScript, poolSize) {
      this.workerScript = workerScript;
      this.poolSize = poolSize;
      this.workers = [];
      this.taskQueue = [];
      this.nextTaskId = 0;

      this.createPool();
    }

    createPool() {
      for (let i = 0; i < this.poolSize; i++) {
        const workerInfo = {
          id: i,
          worker: new Worker(this.workerScript),
          busy: false,
          currentTask: null
        };

        workerInfo.worker.on('message', (result) => {
          this.handleWorkerMessage(workerInfo, result);
        });

        workerInfo.worker.on('error', (err) => {
          console.error(`Worker ${i} error:`, err.message);
        });

        this.workers.push(workerInfo);
      }
    }

    async execute(data) {
      return new Promise((resolve, reject) => {
        const task = {
          id: this.nextTaskId++,
          data,
          resolve,
          reject,
          startTime: performance.now()
        };

        const availableWorker = this.workers.find(w => !w.busy);

        if (availableWorker) {
          this.assignTask(availableWorker, task);
        } else {
          this.taskQueue.push(task);
        }
      });
    }

    assignTask(workerInfo, task) {
      workerInfo.busy = true;
      workerInfo.currentTask = task;
      workerInfo.worker.postMessage(task.data);
    }

    handleWorkerMessage(workerInfo, result) {
      const task = workerInfo.currentTask;

      if (task) {
        task.resolve(result);
      }

      workerInfo.busy = false;
      workerInfo.currentTask = null;

      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this.assignTask(workerInfo, nextTask);
      }
    }

    async terminate() {
      // Wait for active tasks
      while (this.workers.some(w => w.busy)) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await Promise.all(
        this.workers.map(w => w.worker.terminate())
      );
    }
  }

  /**
   * Run benchmark for a specific pool size
   */
  async function benchmarkPoolSize(poolSize, taskCount = 100) {
    const pool = new BenchmarkWorkerPool(__filename, poolSize);

    // Create tasks (fibonacci calculations)
    const tasks = Array.from({ length: taskCount }, (_, i) => ({
      n: 35,
      taskId: i
    }));

    // Measure total execution time
    const startTime = performance.now();

    // Track individual task latencies
    const latencies = [];

    // Execute all tasks
    const results = await Promise.all(
      tasks.map(async (task) => {
        const taskStart = performance.now();
        const result = await pool.execute(task);
        const taskEnd = performance.now();

        latencies.push(result.duration);

        return result;
      })
    );

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Calculate metrics
    const throughput = (taskCount / totalTime) * 1000; // tasks per second
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    // Cleanup
    await pool.terminate();

    return {
      poolSize,
      totalTime: totalTime.toFixed(2),
      throughput: throughput.toFixed(2),
      avgLatency: avgLatency.toFixed(2),
      minLatency: minLatency.toFixed(2),
      maxLatency: maxLatency.toFixed(2),
      taskCount
    };
  }

  /**
   * Display results in a formatted table
   */
  function displayResults(results) {
    console.log('\n=== Benchmark Results ===\n');
    console.log('┌──────────┬─────────────┬──────────────┬──────────────┬─────────────┬─────────────┐');
    console.log('│ Pool     │ Total Time  │ Throughput   │ Avg Latency  │ Min Latency │ Max Latency │');
    console.log('│ Size     │ (ms)        │ (tasks/sec)  │ (ms)         │ (ms)        │ (ms)        │');
    console.log('├──────────┼─────────────┼──────────────┼──────────────┼─────────────┼─────────────┤');

    results.forEach(r => {
      console.log(
        `│ ${String(r.poolSize).padEnd(8)} │ ` +
        `${String(r.totalTime).padEnd(11)} │ ` +
        `${String(r.throughput).padEnd(12)} │ ` +
        `${String(r.avgLatency).padEnd(12)} │ ` +
        `${String(r.minLatency).padEnd(11)} │ ` +
        `${String(r.maxLatency).padEnd(11)} │`
      );
    });

    console.log('└──────────┴─────────────┴──────────────┴──────────────┴─────────────┴─────────────┘');
  }

  /**
   * Find and display optimal configuration
   */
  function analyzeResults(results) {
    console.log('\n=== Analysis ===\n');

    // Find fastest configuration
    const fastest = results.reduce((min, r) =>
      parseFloat(r.totalTime) < parseFloat(min.totalTime) ? r : min
    );

    // Find highest throughput
    const highestThroughput = results.reduce((max, r) =>
      parseFloat(r.throughput) > parseFloat(max.throughput) ? r : max
    );

    // Find lowest latency
    const lowestLatency = results.reduce((min, r) =>
      parseFloat(r.avgLatency) < parseFloat(min.avgLatency) ? r : min
    );

    console.log('Fastest Completion:');
    console.log(`  Pool Size: ${fastest.poolSize} workers`);
    console.log(`  Total Time: ${fastest.totalTime}ms`);
    console.log();

    console.log('Highest Throughput:');
    console.log(`  Pool Size: ${highestThroughput.poolSize} workers`);
    console.log(`  Throughput: ${highestThroughput.throughput} tasks/sec`);
    console.log();

    console.log('Lowest Latency:');
    console.log(`  Pool Size: ${lowestLatency.poolSize} workers`);
    console.log(`  Avg Latency: ${lowestLatency.avgLatency}ms`);
    console.log();

    // Calculate efficiency (compared to single worker)
    const baseline = results.find(r => r.poolSize === 1);
    if (baseline) {
      console.log('Speedup vs Single Worker:');
      results.forEach(r => {
        if (r.poolSize !== 1) {
          const speedup = (parseFloat(baseline.totalTime) / parseFloat(r.totalTime)).toFixed(2);
          const efficiency = ((speedup / r.poolSize) * 100).toFixed(1);
          console.log(`  ${r.poolSize} workers: ${speedup}x speedup (${efficiency}% efficiency)`);
        }
      });
    }

    // Recommendations
    console.log('\n=== Recommendations ===\n');

    const cpuCount = os.cpus().length;
    console.log(`Your system has ${cpuCount} CPU cores.`);

    if (fastest.poolSize <= cpuCount) {
      console.log(`✓ Optimal pool size (${fastest.poolSize}) matches CPU cores well.`);
    } else {
      console.log(`! Optimal pool size (${fastest.poolSize}) exceeds CPU cores.`);
      console.log(`  This may indicate I/O-bound tasks or context switching benefits.`);
    }

    console.log();
    console.log('General Guidelines:');
    console.log('  • CPU-bound tasks: Pool size ≈ CPU core count');
    console.log('  • I/O-bound tasks: Pool size > CPU core count');
    console.log('  • Mixed workloads: Test different configurations');
    console.log('  • Consider memory constraints for large pools');
  }

  /**
   * Generate ASCII chart for visual comparison
   */
  function displayChart(results) {
    console.log('\n=== Throughput Chart ===\n');

    const maxThroughput = Math.max(...results.map(r => parseFloat(r.throughput)));
    const chartWidth = 50;

    results.forEach(r => {
      const throughput = parseFloat(r.throughput);
      const barLength = Math.round((throughput / maxThroughput) * chartWidth);
      const bar = '█'.repeat(barLength);

      console.log(`${String(r.poolSize).padStart(2)} workers │ ${bar} ${r.throughput} tasks/sec`);
    });

    console.log();
  }

  /**
   * Main benchmark execution
   */
  async function runBenchmarks() {
    console.log('Running benchmarks...\n');

    // Test configurations
    const poolSizes = [1, 2, 4, 8, 16];
    const taskCount = 100;

    console.log(`Configuration:`);
    console.log(`  Tasks: ${taskCount} fibonacci(35) calculations`);
    console.log(`  Pool sizes: ${poolSizes.join(', ')}`);
    console.log();

    const results = [];

    // Run benchmark for each pool size
    for (const poolSize of poolSizes) {
      console.log(`Testing pool size: ${poolSize} workers...`);

      const result = await benchmarkPoolSize(poolSize, taskCount);
      results.push(result);

      console.log(`  Completed in ${result.totalTime}ms`);
      console.log(`  Throughput: ${result.throughput} tasks/sec`);
      console.log();

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Display results
    displayResults(results);
    displayChart(results);
    analyzeResults(results);

    console.log('\n=== Benchmark Complete ===\n');
  }

  runBenchmarks().catch(console.error);

} else {
  /**
   * Worker Thread Code
   *
   * Performs CPU-intensive fibonacci calculation
   * Returns result with timing information
   */
  parentPort.on('message', ({ n, taskId }) => {
    const startTime = performance.now();

    // CPU-intensive calculation
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
 * LEARNING NOTES:
 *
 * 1. PERFORMANCE METRICS:
 *
 *    Total Time: How long to complete all tasks
 *    - Lower is better
 *    - Includes overhead and queuing
 *
 *    Throughput: Tasks completed per second
 *    - Higher is better
 *    - Indicates overall processing capacity
 *
 *    Latency: Time for individual task
 *    - Lower is better
 *    - Avg, min, max provide distribution insight
 *
 * 2. OPTIMAL POOL SIZE:
 *
 *    For CPU-bound tasks:
 *    - Optimal ≈ CPU core count
 *    - More workers = more context switching
 *    - Diminishing returns beyond cores
 *
 *    For I/O-bound tasks:
 *    - Optimal > CPU core count
 *    - Workers can wait for I/O
 *    - Test to find sweet spot
 *
 * 3. AMDAHL'S LAW:
 *
 *    Speedup = 1 / (S + P/N)
 *    - S = serial portion of work
 *    - P = parallel portion of work
 *    - N = number of processors
 *
 *    Example: 95% parallel work, 4 cores
 *    Speedup = 1 / (0.05 + 0.95/4) = 3.48x
 *
 * 4. EFFICIENCY CALCULATION:
 *
 *    Efficiency = Speedup / Number of Workers
 *    - 100% = perfect scaling
 *    - < 100% = overhead (normal)
 *    - Decreases with more workers
 *
 *    Example: 4 workers, 3x speedup
 *    Efficiency = 3/4 = 75%
 *
 * 5. FACTORS AFFECTING PERFORMANCE:
 *
 *    Worker Creation Overhead:
 *    - ~50ms per worker startup
 *    - Pool reuse amortizes this cost
 *
 *    Message Passing Overhead:
 *    - Small for simple data
 *    - Large for complex objects
 *    - Use transferables for buffers
 *
 *    Context Switching:
 *    - OS switches between workers
 *    - More workers = more switching
 *    - Becomes bottleneck beyond CPU count
 *
 * 6. BENCHMARKING BEST PRACTICES:
 *
 *    ✓ Run multiple iterations
 *    ✓ Use realistic workloads
 *    ✓ Measure warm-up separately
 *    ✓ Account for variance
 *    ✓ Test under load
 *    ✗ Don't test with trivial tasks
 *    ✗ Don't ignore outliers without investigation
 *
 * BONUS: TESTING DIFFERENT WORKLOAD TYPES
 *
 * // CPU-bound (fibonacci)
 * function cpuBound(n) {
 *   return fibonacci(n);
 * }
 *
 * // I/O-bound (simulated)
 * function ioBound() {
 *   return new Promise(resolve => {
 *     setTimeout(() => resolve('done'), 100);
 *   });
 * }
 *
 * // Mixed workload
 * function mixedWorkload() {
 *   if (Math.random() < 0.5) {
 *     return cpuBound(30);
 *   } else {
 *     return ioBound();
 *   }
 * }
 *
 * Results will show different optimal pool sizes:
 * - CPU-bound: 4 workers (matches cores)
 * - I/O-bound: 16+ workers (can wait)
 * - Mixed: 8-12 workers (balance)
 *
 * BONUS: MEMORY USAGE TRACKING
 *
 * const used = process.memoryUsage();
 * console.log({
 *   rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,
 *   heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
 *   heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
 *   external: `${(used.external / 1024 / 1024).toFixed(2)} MB`
 * });
 *
 * BONUS: STATISTICAL ANALYSIS
 *
 * function calculateStats(latencies) {
 *   latencies.sort((a, b) => a - b);
 *
 *   return {
 *     min: latencies[0],
 *     max: latencies[latencies.length - 1],
 *     mean: latencies.reduce((a, b) => a + b) / latencies.length,
 *     median: latencies[Math.floor(latencies.length / 2)],
 *     p95: latencies[Math.floor(latencies.length * 0.95)],
 *     p99: latencies[Math.floor(latencies.length * 0.99)]
 *   };
 * }
 */
