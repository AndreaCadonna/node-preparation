/**
 * Exercise 4: Performance Benchmarking and Optimization
 *
 * TASK:
 * Benchmark different worker pool configurations and find the optimal
 * setup for your system.
 *
 * REQUIREMENTS:
 * 1. Test different pool sizes (1, 2, 4, 8, 16 workers)
 * 2. Run identical workload for each configuration
 * 3. Measure: throughput, average latency, total time
 * 4. Identify optimal pool size for the workload
 * 5. Display results in a comparison table
 *
 * WORKLOAD:
 * - 100 CPU-intensive tasks
 * - Each task calculates fibonacci(35)
 *
 * BONUS:
 * - Test with different task types (I/O vs CPU)
 * - Measure memory usage per configuration
 * - Test worker reuse vs creation overhead
 * - Visualize results with ASCII chart
 *
 * EXPECTED OUTPUT:
 * === Performance Benchmark ===
 *
 * Pool Size: 1
 * Total Time: 12500ms
 * Throughput: 8.0 tasks/sec
 * Avg Latency: 125ms
 *
 * Pool Size: 2
 * Total Time: 6400ms
 * Throughput: 15.6 tasks/sec
 * Avg Latency: 64ms
 *
 * ... (all pool sizes)
 *
 * OPTIMAL: 4 workers (fastest completion time)
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');
const os = require('os');

if (isMainThread) {
  console.log('=== Worker Pool Performance Benchmark ===\n');
  console.log(`System: ${os.cpus().length} CPU cores\n`);

  // TODO: Implement performance benchmarking
  // 1. Create a simple worker pool class
  // 2. Test with different pool sizes: [1, 2, 4, 8, 16]
  // 3. For each pool size:
  //    - Run 100 fibonacci(35) tasks
  //    - Measure total time, throughput, avg latency
  // 4. Display comparison table
  // 5. Identify and display optimal configuration

  // Your code here...

} else {
  // Worker code (provided)
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
