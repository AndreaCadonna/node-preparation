/**
 * Solution 1: Thread-Safe Counter with SharedArrayBuffer
 *
 * This solution demonstrates:
 * - SharedArrayBuffer for shared memory between threads
 * - Atomics API for thread-safe operations
 * - Lock-free concurrent programming
 * - Per-worker statistics tracking
 *
 * Key Concepts:
 * - SharedArrayBuffer: Enables sharing memory across workers
 * - Atomics.add(): Atomic increment operation (prevents race conditions)
 * - Int32Array: View over SharedArrayBuffer for integer operations
 * - Lock-free operations: No mutex needed, hardware guarantees atomicity
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  console.log('=== Thread-Safe Counter Solution ===\n');

  /**
   * Main thread orchestrates the thread-safe counter test
   *
   * Buffer Layout:
   * [0] = main counter (shared across all workers)
   * [1-4] = per-worker counters (for statistics)
   * [5-8] = per-worker min values tracked
   * [9-12] = per-worker max values tracked
   */
  async function runThreadSafeCounter() {
    const NUM_WORKERS = 4;
    const INCREMENTS_PER_WORKER = 10000;
    const EXPECTED_TOTAL = NUM_WORKERS * INCREMENTS_PER_WORKER;

    // Create SharedArrayBuffer
    // Size: 13 int32 values * 4 bytes = 52 bytes
    // [0] = counter, [1-4] = worker stats, [5-8] = mins, [9-12] = maxs
    const sharedBuffer = new SharedArrayBuffer(13 * Int32Array.BYTES_PER_ELEMENT);
    const sharedArray = new Int32Array(sharedBuffer);

    // Initialize shared counter to 0
    sharedArray[0] = 0;

    // Initialize min values to max int32, max values to 0
    for (let i = 0; i < NUM_WORKERS; i++) {
      sharedArray[5 + i] = 2147483647; // Max int32 (for min tracking)
      sharedArray[9 + i] = 0; // Initialize max to 0
    }

    console.log(`Initial counter: ${sharedArray[0]}`);
    console.log(`Starting ${NUM_WORKERS} workers, each incrementing ${INCREMENTS_PER_WORKER} times\n`);

    // Create workers
    const workers = [];
    const workerPromises = [];

    for (let i = 0; i < NUM_WORKERS; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          sharedBuffer,
          workerId: i,
          iterations: INCREMENTS_PER_WORKER
        }
      });

      workers.push(worker);

      // Wrap worker in a promise
      const workerPromise = new Promise((resolve, reject) => {
        worker.on('message', (msg) => {
          if (msg.type === 'progress') {
            // Progress updates
            process.stdout.write(`\rWorker ${msg.workerId}: ${msg.completed}/${msg.total} increments`);
          } else if (msg.type === 'complete') {
            console.log(`\nWorker ${msg.workerId}: completed ${msg.increments} increments`);
            resolve(msg);
          }
        });

        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker ${i} exited with code ${code}`));
          }
        });
      });

      workerPromises.push(workerPromise);
    }

    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);

    // Verify final count
    const finalCount = sharedArray[0];
    console.log(`\n\nFinal counter: ${finalCount}`);
    console.log(`Expected: ${EXPECTED_TOTAL}`);

    // Display per-worker statistics
    console.log('\n=== Per-Worker Statistics ===');
    for (let i = 0; i < NUM_WORKERS; i++) {
      console.log(`Worker ${i}:`);
      console.log(`  - Total increments: ${sharedArray[1 + i]}`);
      console.log(`  - Min value seen: ${sharedArray[5 + i]}`);
      console.log(`  - Max value seen: ${sharedArray[9 + i]}`);
    }

    // Validate result
    if (finalCount === EXPECTED_TOTAL) {
      console.log('\n✓ SUCCESS: Counter is exactly correct!');
      console.log('  Thread-safe operations using Atomics prevented all race conditions.');
    } else {
      console.log(`\n✗ FAILURE: Counter is incorrect (expected ${EXPECTED_TOTAL})`);
      console.log('  This should not happen with proper Atomics usage!');
    }

    // Clean up workers
    workers.forEach(worker => worker.terminate());
  }

  // Run the test
  runThreadSafeCounter().catch(console.error);

} else {
  /**
   * Worker thread: Performs thread-safe counter increments
   *
   * Each worker:
   * 1. Gets the shared buffer from workerData
   * 2. Creates an Int32Array view
   * 3. Performs atomic increments using Atomics.add()
   * 4. Tracks local statistics
   * 5. Reports progress and completion
   */
  const { sharedBuffer, workerId, iterations } = workerData;
  const sharedArray = new Int32Array(sharedBuffer);

  console.log(`Worker ${workerId}: starting increments...`);

  // Track local statistics
  let localIncrements = 0;
  let localMin = 2147483647;
  let localMax = 0;

  // Perform increments
  const PROGRESS_INTERVAL = 2000; // Report progress every 2000 increments

  for (let i = 0; i < iterations; i++) {
    // Atomic increment: This is the key operation!
    // Atomics.add(array, index, value) atomically adds value to array[index]
    // and returns the OLD value before addition
    const oldValue = Atomics.add(sharedArray, 0, 1);
    const newValue = oldValue + 1;

    // Track min and max values we've seen
    if (newValue < localMin) localMin = newValue;
    if (newValue > localMax) localMax = newValue;

    localIncrements++;

    // Report progress periodically
    if (localIncrements % PROGRESS_INTERVAL === 0) {
      parentPort.postMessage({
        type: 'progress',
        workerId,
        completed: localIncrements,
        total: iterations
      });
    }
  }

  // Update per-worker statistics in shared memory
  // [1-4]: per-worker counters
  Atomics.store(sharedArray, 1 + workerId, localIncrements);

  // [5-8]: per-worker mins (use Atomics.compareExchange for thread-safe min)
  let currentMin = Atomics.load(sharedArray, 5 + workerId);
  while (localMin < currentMin) {
    const prevMin = Atomics.compareExchange(
      sharedArray,
      5 + workerId,
      currentMin,
      localMin
    );
    if (prevMin === currentMin) break; // Successfully updated
    currentMin = prevMin; // Retry with new value
  }

  // [9-12]: per-worker maxs (use Atomics.compareExchange for thread-safe max)
  let currentMax = Atomics.load(sharedArray, 9 + workerId);
  while (localMax > currentMax) {
    const prevMax = Atomics.compareExchange(
      sharedArray,
      9 + workerId,
      currentMax,
      localMax
    );
    if (prevMax === currentMax) break; // Successfully updated
    currentMax = prevMax; // Retry with new value
  }

  // Report completion
  parentPort.postMessage({
    type: 'complete',
    workerId,
    increments: localIncrements,
    minSeen: localMin,
    maxSeen: localMax
  });
}

/**
 * EDUCATIONAL NOTES:
 *
 * 1. WHY ATOMICS ARE NECESSARY:
 *    Without Atomics, the increment operation would be:
 *      const value = sharedArray[0];
 *      sharedArray[0] = value + 1;
 *    This is THREE separate operations (read, add, write) that can interleave
 *    between threads, causing race conditions.
 *
 * 2. ATOMICS.ADD VS ATOMICS.STORE:
 *    - Atomics.add(): Atomic read-modify-write (perfect for counters)
 *    - Atomics.store(): Atomic write only (use for simple assignments)
 *    - Atomics.load(): Atomic read only (use for reading shared values)
 *
 * 3. ATOMICS.COMPAREEXCHANGE:
 *    Used for lock-free algorithms like updating min/max values
 *    Pattern: "If current value is X, replace it with Y"
 *    If another thread changed the value, retry with new current value
 *
 * 4. PERFORMANCE CONSIDERATIONS:
 *    - Atomic operations are very fast (usually single CPU instructions)
 *    - Much faster than mutex locks
 *    - Scale well with multiple cores
 *    - No context switching overhead
 *
 * 5. WHEN TO USE SHAREDARRAYBUFFER:
 *    - High-frequency shared state (counters, flags, buffers)
 *    - Low-latency communication between workers
 *    - Lock-free data structures
 *    - Performance-critical concurrent operations
 *
 * 6. MEMORY ORDERING:
 *    Atomics operations provide sequential consistency:
 *    - All operations appear to execute in a single, global order
 *    - No need to worry about CPU reordering or cache coherency
 *
 * 7. ALTERNATIVE APPROACHES:
 *    - Message passing (simpler but slower for high-frequency updates)
 *    - Mutex locks (easier to reason about but slower)
 *    - SharedArrayBuffer + Atomics (fastest but requires careful design)
 */
