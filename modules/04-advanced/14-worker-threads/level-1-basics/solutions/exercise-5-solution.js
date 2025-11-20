/**
 * Exercise 5 Solution: Parallel Fibonacci Calculator
 *
 * This solution demonstrates:
 * - Performance comparison between serial and parallel execution
 * - Creating multiple workers simultaneously
 * - Using workerData to pass different parameters to each worker
 * - Coordinating multiple workers and collecting their results
 * - Measuring execution time with performance.now()
 * - Real-world benefits of worker threads for CPU-intensive tasks
 * - Understanding when parallelization provides speedup
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

// Fibonacci function (slow recursive version for demonstration)
// This is intentionally inefficient to show the benefits of parallelization
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

if (isMainThread) {
  // === MAIN THREAD CODE ===

  console.log('Exercise 5: Parallel Fibonacci Calculator\n');

  const numbers = [35, 36, 37, 38, 39, 40];

  // Run both serial and parallel calculations
  (async () => {
    // PART 1: Serial Calculation
    console.log('=== Serial Calculation (Single Thread) ===');
    const serialResults = await calculateSerial(numbers);
    console.log(`Total time: ${serialResults.time}ms\n`);

    // PART 2: Parallel Calculation
    console.log('=== Parallel Calculation (Multiple Workers) ===');
    const parallelResults = await calculateParallel(numbers);
    console.log(`Total time: ${parallelResults.time}ms\n`);

    // PART 3: Comparison
    displayComparison(serialResults, parallelResults);
  })();

  // Calculate Fibonacci numbers serially (one after another)
  async function calculateSerial(numbers) {
    const results = [];
    const startTime = performance.now();

    for (const n of numbers) {
      const result = fibonacci(n);
      console.log(`fib(${n}) = ${result}`);
      results.push({ n, result });
    }

    const endTime = performance.now();
    const time = Math.round(endTime - startTime);

    return { results, time };
  }

  // Calculate Fibonacci numbers in parallel (all at once with workers)
  async function calculateParallel(numbers) {
    const startTime = performance.now();

    // Create a promise for each number
    // Each promise creates a worker, waits for result, then resolves
    const promises = numbers.map(n => {
      return new Promise((resolve, reject) => {
        // Create worker for this specific number
        const worker = new Worker(__filename, {
          workerData: { n }  // Pass the number to calculate
        });

        // Wait for result from worker
        worker.on('message', (result) => {
          console.log(`fib(${n}) = ${result}`);
          resolve({ n, result });
          worker.terminate(); // Clean up
        });

        // Handle errors
        worker.on('error', reject);

        // Handle unexpected exit
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });

    // Wait for all workers to complete
    const results = await Promise.all(promises);

    const endTime = performance.now();
    const time = Math.round(endTime - startTime);

    return { results, time };
  }

  // Display comparison and analysis
  function displayComparison(serialResults, parallelResults) {
    console.log('=== Performance Comparison ===');
    console.log(`Serial time:   ${serialResults.time}ms`);
    console.log(`Parallel time: ${parallelResults.time}ms`);

    const speedup = serialResults.time / parallelResults.time;
    const efficiency = (speedup / numbers.length) * 100;

    console.log(`\nSpeedup: ${speedup.toFixed(2)}x faster`);
    console.log(`Efficiency: ${efficiency.toFixed(1)}%`);

    // Explain the results
    console.log('\n=== Analysis ===');
    if (speedup > 1.5) {
      console.log('✓ Significant speedup achieved with parallelization!');
    } else if (speedup > 1.0) {
      console.log('~ Moderate speedup. Overhead of worker creation is noticeable.');
    } else {
      console.log('✗ No speedup. Task too small for parallelization benefits.');
    }

    console.log(`\nTheoretical max speedup: ${numbers.length}x (${numbers.length} workers)`);
    console.log(`Actual speedup: ${speedup.toFixed(2)}x`);

    const overhead = ((numbers.length / speedup - 1) * 100).toFixed(1);
    console.log(`Parallel overhead: ${overhead}%`);

    console.log('\nNote: Speedup depends on:');
    console.log('  - Number of CPU cores available');
    console.log('  - Task complexity (larger = better speedup)');
    console.log('  - Worker creation overhead');
    console.log('  - System load and other processes');
  }

} else {
  // === WORKER THREAD CODE ===

  // Get the number to calculate from workerData
  const { n } = workerData;

  // Calculate Fibonacci
  const result = fibonacci(n);

  // Send result back to main thread
  parentPort.postMessage(result);

  // Worker will automatically exit after sending message
}

/**
 * KEY CONCEPTS EXPLAINED:
 *
 * 1. CPU-Bound vs I/O-Bound Tasks:
 *    - CPU-bound: Fibonacci calculation - benefits from parallelization
 *    - I/O-bound: File reading, network - doesn't benefit much
 *    - Worker threads are ideal for CPU-bound tasks
 *
 * 2. Amdahl's Law:
 *    - Theoretical speedup = 1 / ((1 - P) + P/N)
 *    - P = portion that can be parallelized
 *    - N = number of processors
 *    - Real speedup is always less due to overhead
 *
 * 3. Parallel Overhead:
 *    - Worker creation time
 *    - Message serialization/deserialization
 *    - Thread synchronization
 *    - Memory duplication
 *
 * 4. When to Use Parallel Execution:
 *    ✓ CPU-intensive calculations
 *    ✓ Independent tasks (no shared state)
 *    ✓ Tasks taking > 100ms each
 *    ✗ Simple/fast operations
 *    ✗ Tasks requiring shared memory access
 *    ✗ I/O-bound operations
 *
 * 5. Performance Measurement:
 *    - Use performance.now() for high-resolution timing
 *    - Measure wall-clock time (not CPU time)
 *    - Run multiple iterations for accuracy
 *    - Account for system variability
 *
 * ALTERNATIVE APPROACHES:
 *
 * 1. Worker Pool (reuse workers):
 *    class WorkerPool {
 *      constructor(size) {
 *        this.workers = [];
 *        this.queue = [];
 *        for (let i = 0; i < size; i++) {
 *          this.workers.push(this.createWorker());
 *        }
 *      }
 *
 *      async execute(data) {
 *        const worker = await this.getAvailableWorker();
 *        return new Promise((resolve) => {
 *          worker.once('message', (result) => {
 *            this.releaseWorker(worker);
 *            resolve(result);
 *          });
 *          worker.postMessage(data);
 *        });
 *      }
 *    }
 *
 * 2. Dynamic load balancing:
 *    // Create workers equal to CPU cores
 *    const numWorkers = require('os').cpus().length;
 *    const pool = new WorkerPool(numWorkers);
 *
 *    // Distribute tasks dynamically
 *    const results = await Promise.all(
 *      numbers.map(n => pool.execute({ n }))
 *    );
 *
 * 3. Progress reporting:
 *    // Worker sends progress updates
 *    for (let i = 1; i <= n; i++) {
 *      if (i % 100000 === 0) {
 *        parentPort.postMessage({ type: 'progress', value: i, total: n });
 *      }
 *    }
 *    parentPort.postMessage({ type: 'complete', result });
 *
 * 4. Memoization for efficiency:
 *    const memo = new Map();
 *    function fibonacciMemo(n) {
 *      if (n <= 1) return n;
 *      if (memo.has(n)) return memo.get(n);
 *      const result = fibonacciMemo(n-1) + fibonacciMemo(n-2);
 *      memo.set(n, result);
 *      return result;
 *    }
 *
 * 5. SharedArrayBuffer for large shared data:
 *    // When workers need access to same large dataset
 *    const sharedBuffer = new SharedArrayBuffer(1024);
 *    const sharedArray = new Uint8Array(sharedBuffer);
 *    // Pass to all workers - zero copy
 *    const worker = new Worker(__filename, {
 *      workerData: { sharedBuffer }
 *    });
 *
 * PERFORMANCE OPTIMIZATION TIPS:
 *
 * 1. Worker Pool:
 *    - Reuse workers instead of creating new ones
 *    - Reduces overhead significantly
 *    - Keep pool size = number of CPU cores
 *
 * 2. Batch Processing:
 *    - Instead of one task per worker
 *    - Send multiple tasks to each worker
 *    - Reduces message passing overhead
 *
 * 3. Task Granularity:
 *    - Tasks should be substantial (>100ms)
 *    - Too small = overhead dominates
 *    - Too large = poor load balancing
 *
 * 4. Memory Management:
 *    - Be mindful of data size being passed
 *    - Large objects are cloned (slow)
 *    - Consider SharedArrayBuffer for large data
 *
 * 5. Profiling:
 *    - Measure actual speedup
 *    - Profile with realistic data
 *    - Test under load
 *
 * REAL-WORLD APPLICATIONS:
 *
 * 1. Image Processing:
 *    - Process different images in parallel
 *    - Apply filters, transformations
 *    - Video frame processing
 *
 * 2. Data Analysis:
 *    - Parallel aggregations
 *    - Statistical calculations
 *    - Machine learning training
 *
 * 3. Cryptography:
 *    - Hash calculations
 *    - Encryption/decryption
 *    - Key generation
 *
 * 4. Scientific Computing:
 *    - Simulations
 *    - Numerical analysis
 *    - Monte Carlo methods
 *
 * 5. Build Tools:
 *    - Parallel compilation
 *    - Asset optimization
 *    - Test execution
 *
 * BENCHMARKING NOTES:
 *
 * Expected results (on a 4-core CPU):
 * - Serial: ~8000-12000ms
 * - Parallel: ~2000-4000ms
 * - Speedup: 2-4x (depends on cores, system load)
 *
 * Why not 6x speedup with 6 workers?
 * 1. Limited by number of CPU cores (typically 4-8)
 * 2. Worker creation overhead
 * 3. Context switching overhead
 * 4. System has other processes running
 * 5. Not all time is parallelizable (Amdahl's Law)
 *
 * EXPERIMENT IDEAS:
 *
 * 1. Try with different problem sizes:
 *    - Small: fib(30-32) - overhead dominates
 *    - Medium: fib(35-40) - good balance
 *    - Large: fib(42-45) - maximum speedup
 *
 * 2. Vary number of workers:
 *    - Test 2, 4, 8, 16 workers
 *    - Find optimal number for your system
 *
 * 3. Compare with worker pool:
 *    - Reuse workers vs create new
 *    - Measure overhead savings
 *
 * 4. Test with different algorithms:
 *    - Prime number search
 *    - Matrix multiplication
 *    - Sorting algorithms
 */
