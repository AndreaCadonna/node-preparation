/**
 * Exercise 2 Solution: Number Processor
 *
 * This solution demonstrates:
 * - Sending data to workers using postMessage (not workerData)
 * - Processing data in a worker thread
 * - Calculating multiple statistics on an array
 * - Sending complex objects back to main thread
 * - Handling edge cases (empty arrays)
 * - The difference between workerData (one-time) and postMessage (ongoing)
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  // === MAIN THREAD CODE ===

  console.log('Exercise 2: Number Processor\n');

  const numbers = [5, 12, 8, 130, 44, 67, 23, 91];
  console.log('Processing numbers:', numbers);

  // Create worker (no workerData this time - we'll use postMessage instead)
  const worker = new Worker(__filename);

  // Listen for results from worker
  worker.on('message', (results) => {
    console.log('\nResults:');
    console.log(`  Count: ${results.count}`);
    console.log(`  Sum: ${results.sum}`);
    console.log(`  Average: ${results.average}`);
    console.log(`  Min: ${results.min}`);
    console.log(`  Max: ${results.max}`);

    // Display bonus calculations if available
    if (results.median !== undefined) {
      console.log(`  Median: ${results.median}`);
    }
    if (results.standardDeviation !== undefined) {
      console.log(`  Standard Deviation: ${results.standardDeviation.toFixed(2)}`);
    }

    // Terminate worker after receiving results
    worker.terminate();
  });

  // Handle errors
  worker.on('error', (err) => {
    console.error('Worker error:', err.message);
  });

  // Handle exit
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`);
    }
  });

  // Send the numbers array to the worker
  // Unlike workerData, postMessage can be called anytime after worker creation
  worker.postMessage(numbers);

} else {
  // === WORKER THREAD CODE ===

  // Listen for messages from main thread
  // In this case, we expect to receive an array of numbers
  parentPort.on('message', (numbers) => {
    try {
      // Handle edge case: empty array
      if (!numbers || numbers.length === 0) {
        parentPort.postMessage({
          error: 'No numbers to process',
          count: 0
        });
        return;
      }

      // Calculate basic statistics
      const count = numbers.length;
      const sum = numbers.reduce((acc, num) => acc + num, 0);
      const average = sum / count;
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);

      // BONUS: Calculate median
      // Median is the middle value when numbers are sorted
      const sorted = [...numbers].sort((a, b) => a - b);
      let median;
      const mid = Math.floor(count / 2);
      if (count % 2 === 0) {
        // Even number of elements: average of two middle values
        median = (sorted[mid - 1] + sorted[mid]) / 2;
      } else {
        // Odd number of elements: the middle value
        median = sorted[mid];
      }

      // BONUS: Calculate standard deviation
      // Standard deviation measures how spread out the numbers are
      const variance = numbers.reduce((acc, num) => {
        const diff = num - average;
        return acc + (diff * diff);
      }, 0) / count;
      const standardDeviation = Math.sqrt(variance);

      // Send all results back to main thread as an object
      parentPort.postMessage({
        count,
        sum,
        average,
        min,
        max,
        median,
        standardDeviation
      });

    } catch (error) {
      // If any error occurs during processing, send error info back
      parentPort.postMessage({
        error: error.message
      });
    }
  });
}

/**
 * KEY CONCEPTS EXPLAINED:
 *
 * 1. workerData vs postMessage:
 *    - workerData: One-time data passed at worker creation
 *    - postMessage: Can send data anytime, multiple times
 *    - Use workerData for configuration, postMessage for tasks/data
 *
 * 2. Message Passing:
 *    - Data is serialized (cloned) when sent between threads
 *    - Both threads have separate copies of the data
 *    - Good for safety, but has overhead for large data
 *
 * 3. Error Handling in Workers:
 *    - Try-catch in worker to handle computation errors
 *    - Send error info back via postMessage
 *    - Main thread also listens to 'error' event for uncaught errors
 *
 * 4. Worker Responsibility:
 *    - Workers should do the heavy computation
 *    - Main thread coordinates and displays results
 *    - Keeps main thread responsive
 *
 * ALTERNATIVE APPROACHES:
 *
 * 1. Process multiple arrays:
 *    // Worker stays alive and processes multiple arrays
 *    parentPort.on('message', ({ id, numbers }) => {
 *      const results = calculateStats(numbers);
 *      parentPort.postMessage({ id, results });
 *    });
 *
 * 2. Stream results as they're calculated:
 *    parentPort.postMessage({ type: 'progress', stat: 'sum', value: sum });
 *    parentPort.postMessage({ type: 'progress', stat: 'avg', value: avg });
 *    parentPort.postMessage({ type: 'complete', allStats });
 *
 * 3. Validate input more strictly:
 *    if (!Array.isArray(numbers)) {
 *      throw new TypeError('Expected array of numbers');
 *    }
 *    if (!numbers.every(n => typeof n === 'number')) {
 *      throw new TypeError('All elements must be numbers');
 *    }
 *
 * 4. Use SharedArrayBuffer for very large datasets:
 *    // More advanced - shares memory between threads
 *    // Faster but requires careful synchronization
 *    const sharedBuffer = new SharedArrayBuffer(numbers.length * 8);
 *    const sharedArray = new Float64Array(sharedBuffer);
 *
 * PERFORMANCE NOTES:
 *
 * - For small arrays (< 1000 elements), workers might be slower than single-threaded
 *   due to serialization and thread creation overhead
 * - Workers shine with CPU-intensive calculations on large datasets
 * - This example is educational - real use cases would process millions of numbers
 * - Consider worker pools for many small tasks instead of creating new workers
 */
