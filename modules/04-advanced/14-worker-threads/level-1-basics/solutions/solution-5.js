/**
 * Solution 5: Parallel Fibonacci Calculator
 *
 * This solution demonstrates:
 * - Serial vs parallel execution comparison
 * - Performance measurement
 * - Worker creation for parallel tasks
 * - Speedup calculation
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

// Fibonacci function (intentionally slow for demonstration)
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

if (isMainThread) {
  console.log('Exercise 5 Solution: Parallel Fibonacci Calculator\n');

  const numbers = [35, 36, 37, 38, 39, 40];

  // === SERIAL CALCULATION ===
  async function serialCalculation() {
    console.log('=== Serial Calculation ===');

    const start = performance.now();
    const results = [];

    for (const n of numbers) {
      const result = fibonacci(n);
      results.push({ n, result });
      console.log(`fib(${n}) = ${result}`);
    }

    const end = performance.now();
    const duration = end - start;

    console.log(`Time: ${duration.toFixed(2)}ms\n`);

    return { results, duration };
  }

  // === PARALLEL CALCULATION ===
  async function parallelCalculation() {
    console.log('=== Parallel Calculation ===');

    const start = performance.now();

    // Create a worker for each number
    const promises = numbers.map(n => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { n }
        });

        worker.on('message', (result) => {
          console.log(`fib(${n}) = ${result}`);
          resolve({ n, result });
          worker.terminate();
        });

        worker.on('error', reject);

        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker exited with code ${code}`));
          }
        });
      });
    });

    // Wait for all workers to complete
    const results = await Promise.all(promises);

    const end = performance.now();
    const duration = end - start;

    console.log(`Time: ${duration.toFixed(2)}ms\n`);

    return { results, duration };
  }

  // === RUN COMPARISON ===
  async function runComparison() {
    const serial = await serialCalculation();
    const parallel = await parallelCalculation();

    const speedup = serial.duration / parallel.duration;

    console.log('=== Comparison ===');
    console.log(`Serial time: ${serial.duration.toFixed(2)}ms`);
    console.log(`Parallel time: ${parallel.duration.toFixed(2)}ms`);
    console.log(`Speedup: ${speedup.toFixed(2)}x faster`);
    console.log(`Efficiency: ${((speedup / numbers.length) * 100).toFixed(1)}%`);
  }

  runComparison().catch(console.error);

} else {
  // === WORKER THREAD CODE ===
  const { n } = workerData;

  // Calculate Fibonacci
  const result = fibonacci(n);

  // Send result back
  parentPort.postMessage(result);
}

/**
 * EXPECTED RESULTS:
 *
 * Serial: ~3000-4000ms (depends on CPU)
 * Parallel: ~600-800ms with 6 cores
 * Speedup: ~4-6x (depends on number of CPU cores)
 *
 * KEY OBSERVATIONS:
 *
 * 1. Parallel is much faster for CPU-intensive tasks
 * 2. Speedup depends on number of CPU cores
 * 3. Overhead of creating workers is minimal compared to computation
 * 4. All cores are utilized in parallel version
 *
 * BONUS IMPROVEMENTS:
 *
 * 1. Use worker pool:
 *    const pool = new WorkerPool(__filename, 4);
 *    const results = await Promise.all(
 *      numbers.map(n => pool.execute({ n }))
 *    );
 *
 * 2. Add progress reporting:
 *    worker.on('message', (msg) => {
 *      if (msg.type === 'progress') {
 *        console.log(`Progress: ${msg.percent}%`);
 *      }
 *    });
 *
 * 3. Memoization for efficiency:
 *    const memo = new Map();
 *    function fib(n) {
 *      if (memo.has(n)) return memo.get(n);
 *      // ... calculate and memo.set(n, result)
 *    }
 */
