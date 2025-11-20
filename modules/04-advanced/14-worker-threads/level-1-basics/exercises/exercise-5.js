/**
 * Exercise 5: Parallel Fibonacci Calculator
 *
 * TASK:
 * Calculate multiple Fibonacci numbers in parallel using worker threads.
 * Compare performance with single-threaded calculation.
 *
 * REQUIREMENTS:
 * 1. Calculate Fibonacci for numbers 35-40 (6 numbers)
 * 2. First: Calculate serially (one after another)
 * 3. Second: Calculate in parallel (all at once with workers)
 * 4. Measure and compare execution times
 * 5. Display speedup achieved
 *
 * BONUS:
 * - Use worker pool instead of creating 6 workers
 * - Add progress reporting
 * - Calculate larger Fibonacci numbers
 * - Visualize results
 *
 * EXPECTED OUTPUT:
 * === Serial Calculation ===
 * fib(35) = 9227465
 * fib(36) = 14930352
 * ... (all 6)
 * Time: 3500ms
 *
 * === Parallel Calculation ===
 * fib(35) = 9227465
 * fib(36) = 14930352
 * ... (all 6)
 * Time: 650ms
 *
 * Speedup: 5.38x faster
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

// Fibonacci function (slow recursive version for demonstration)
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

if (isMainThread) {
  console.log('Exercise 5: Parallel Fibonacci Calculator\n');

  // TODO: Implement serial vs parallel comparison
  // 1. Calculate Fibonacci 35-40 serially
  // 2. Measure time
  // 3. Calculate same numbers in parallel with workers
  // 4. Measure time
  // 5. Calculate and display speedup

  const numbers = [35, 36, 37, 38, 39, 40];

  // Your code here...

} else {
  // TODO: Implement worker calculation
  // 1. Get number from workerData
  // 2. Calculate Fibonacci
  // 3. Send result back

  // Your code here...
}
