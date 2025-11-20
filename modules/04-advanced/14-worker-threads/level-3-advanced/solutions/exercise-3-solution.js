/**
 * Solution 3: Mutex Lock for Critical Sections
 *
 * This solution demonstrates:
 * - Implementing a mutex using SharedArrayBuffer and Atomics
 * - Protecting critical sections from race conditions
 * - Lock contention and statistics tracking
 * - Comparison: with vs without mutex
 *
 * Key Concepts:
 * - Mutex (Mutual Exclusion): Only one thread can hold lock at a time
 * - Critical Section: Code that must not be executed concurrently
 * - Lock Acquisition: Wait until lock is available, then claim it
 * - Lock Release: Free the lock and notify waiting threads
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

/**
 * Mutex implementation using SharedArrayBuffer and Atomics
 *
 * Buffer Layout:
 * [0] = lock state (0 = unlocked, 1 = locked)
 * [1] = total locks acquired (statistics)
 * [2] = total wait time in microseconds
 * [3] = max wait time in microseconds
 */
class Mutex {
  constructor(sharedBuffer, offset = 0) {
    this.buffer = new Int32Array(sharedBuffer);
    this.offset = offset;
    this.lockIdx = offset + 0;
    this.countIdx = offset + 1;
    this.totalWaitIdx = offset + 2;
    this.maxWaitIdx = offset + 3;

    // Initialize lock state
    Atomics.store(this.buffer, this.lockIdx, 0); // unlocked
    Atomics.store(this.buffer, this.countIdx, 0);
    Atomics.store(this.buffer, this.totalWaitIdx, 0);
    Atomics.store(this.buffer, this.maxWaitIdx, 0);
  }

  /**
   * Acquire the lock (blocking)
   * Waits until lock is available, then claims it
   */
  lock() {
    const startTime = performance.now();

    // Try to acquire lock using compare-and-exchange
    // Loop until we successfully change lock from 0 (unlocked) to 1 (locked)
    while (true) {
      // Attempt to acquire lock atomically
      const oldValue = Atomics.compareExchange(
        this.buffer,
        this.lockIdx,
        0, // expected value (unlocked)
        1  // new value (locked)
      );

      if (oldValue === 0) {
        // Successfully acquired lock!
        const waitTime = performance.now() - startTime;

        // Update statistics
        Atomics.add(this.buffer, this.countIdx, 1);

        const waitTimeMicros = Math.floor(waitTime * 1000);
        Atomics.add(this.buffer, this.totalWaitIdx, waitTimeMicros);

        // Update max wait time (requires CAS loop)
        let currentMax = Atomics.load(this.buffer, this.maxWaitIdx);
        while (waitTimeMicros > currentMax) {
          const prevMax = Atomics.compareExchange(
            this.buffer,
            this.maxWaitIdx,
            currentMax,
            waitTimeMicros
          );
          if (prevMax === currentMax) break;
          currentMax = prevMax;
        }

        return; // Lock acquired
      }

      // Lock is held by another thread, wait for it to be released
      // Use Atomics.wait() to efficiently wait (no busy spinning)
      Atomics.wait(this.buffer, this.lockIdx, 1, 10); // Wait max 10ms
    }
  }

  /**
   * Try to acquire lock with timeout
   * Returns true if lock acquired, false if timeout
   */
  tryLock(timeoutMs = 0) {
    const startTime = performance.now();

    while (true) {
      // Try to acquire lock
      const oldValue = Atomics.compareExchange(
        this.buffer,
        this.lockIdx,
        0,
        1
      );

      if (oldValue === 0) {
        // Successfully acquired lock
        Atomics.add(this.buffer, this.countIdx, 1);
        return true;
      }

      // Check timeout
      if (performance.now() - startTime > timeoutMs) {
        return false; // Timeout
      }

      // Wait briefly before retrying
      Atomics.wait(this.buffer, this.lockIdx, 1, 10);
    }
  }

  /**
   * Release the lock
   * Frees the lock and wakes one waiting thread
   */
  unlock() {
    // Release the lock
    Atomics.store(this.buffer, this.lockIdx, 0);

    // Notify one waiting thread
    // Using notify(1) wakes exactly one waiter (fair scheduling)
    Atomics.notify(this.buffer, this.lockIdx, 1);
  }

  /**
   * Get lock statistics
   */
  getStats() {
    const totalLocks = Atomics.load(this.buffer, this.countIdx);
    const totalWaitMicros = Atomics.load(this.buffer, this.totalWaitIdx);
    const maxWaitMicros = Atomics.load(this.buffer, this.maxWaitIdx);

    return {
      totalLocks,
      avgWaitMs: totalLocks > 0 ? (totalWaitMicros / totalLocks / 1000).toFixed(3) : 0,
      maxWaitMs: (maxWaitMicros / 1000).toFixed(3)
    };
  }
}

if (isMainThread) {
  console.log('=== Mutex Lock Solution ===\n');

  /**
   * Test WITHOUT mutex - demonstrates race conditions
   */
  async function testWithoutMutex() {
    console.log('=== Test WITHOUT Mutex (Race Conditions) ===\n');

    const NUM_WORKERS = 4;
    const ITERATIONS = 1000;

    // Shared counter (no mutex protection)
    const sharedBuffer = new SharedArrayBuffer(4);
    const counter = new Int32Array(sharedBuffer);
    counter[0] = 0;

    // Create workers
    const workers = [];
    for (let i = 0; i < NUM_WORKERS; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          sharedBuffer,
          useMutex: false,
          workerId: i,
          iterations: ITERATIONS
        }
      });

      workers.push(worker);
    }

    // Wait for completion
    await Promise.all(
      workers.map(worker => new Promise((resolve) => {
        worker.on('message', (msg) => {
          if (msg.type === 'complete') {
            console.log(`Worker ${msg.workerId}: completed`);
            resolve();
          }
        });
      }))
    );

    const finalCount = counter[0];
    const expected = NUM_WORKERS * ITERATIONS;

    console.log(`\nFinal counter: ${finalCount}`);
    console.log(`Expected: ${expected}`);

    if (finalCount !== expected) {
      console.log(`✗ INCORRECT - Lost ${expected - finalCount} updates due to race conditions!`);
      console.log('  Multiple threads read-modify-write without synchronization.');
    } else {
      console.log('✓ Somehow correct (lucky timing - race condition still exists!)');
    }

    // Cleanup
    workers.forEach(w => w.terminate());
  }

  /**
   * Test WITH mutex - demonstrates correct synchronization
   */
  async function testWithMutex() {
    console.log('\n=== Test WITH Mutex (Thread Safe) ===\n');

    const NUM_WORKERS = 4;
    const ITERATIONS = 1000;

    // Shared buffer: [counter, lock, stats...]
    const sharedBuffer = new SharedArrayBuffer(20 * Int32Array.BYTES_PER_ELEMENT);
    const counter = new Int32Array(sharedBuffer);
    counter[0] = 0; // Counter at index 0

    // Create mutex starting at index 1
    const mutex = new Mutex(sharedBuffer, 1);

    // Create workers
    const workers = [];
    for (let i = 0; i < NUM_WORKERS; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          sharedBuffer,
          useMutex: true,
          mutexOffset: 1,
          workerId: i,
          iterations: ITERATIONS
        }
      });

      workers.push(worker);
    }

    // Wait for completion
    await Promise.all(
      workers.map(worker => new Promise((resolve) => {
        worker.on('message', (msg) => {
          if (msg.type === 'complete') {
            console.log(`Worker ${msg.workerId}: completed ${msg.operations} operations`);
            resolve();
          }
        });
      }))
    );

    const finalCount = counter[0];
    const expected = NUM_WORKERS * ITERATIONS;

    console.log(`\nFinal counter: ${finalCount}`);
    console.log(`Expected: ${expected}`);

    if (finalCount === expected) {
      console.log('✓ CORRECT - Mutex prevented all race conditions!');
    } else {
      console.log(`✗ INCORRECT - This should not happen with proper mutex!`);
    }

    // Display lock statistics
    const stats = mutex.getStats();
    console.log('\n=== Lock Statistics ===');
    console.log(`Total locks acquired: ${stats.totalLocks}`);
    console.log(`Average wait time: ${stats.avgWaitMs}ms`);
    console.log(`Max wait time: ${stats.maxWaitMs}ms`);

    // Calculate lock contention
    const contentionRate = ((stats.totalLocks - expected) / stats.totalLocks * 100).toFixed(1);
    console.log(`Lock contention: ${contentionRate}% of lock attempts had to wait`);

    // Cleanup
    workers.forEach(w => w.terminate());
  }

  /**
   * Run both tests
   */
  async function run() {
    await testWithoutMutex();
    await testWithMutex();

    console.log('\n=== Summary ===');
    console.log('Without mutex: Race conditions cause incorrect results');
    console.log('With mutex: Critical sections are properly protected');
    console.log('\nKey takeaway: Always protect shared mutable state!');
  }

  run().catch(console.error);

} else {
  /**
   * Worker code: Performs read-modify-write operations
   * With or without mutex protection
   */
  const { sharedBuffer, useMutex, mutexOffset, workerId, iterations } = workerData;
  const counter = new Int32Array(sharedBuffer);

  let mutex = null;
  if (useMutex) {
    mutex = new Mutex(sharedBuffer, mutexOffset);
  }

  let operations = 0;

  // Perform iterations
  for (let i = 0; i < iterations; i++) {
    if (useMutex) {
      // CORRECT: Use mutex to protect critical section
      mutex.lock();
      try {
        // Critical section: read-modify-write
        const value = counter[0];
        // Simulate some processing
        let dummy = 0;
        for (let j = 0; j < 10; j++) {
          dummy += j;
        }
        counter[0] = value + 1;
        operations++;
      } finally {
        mutex.unlock();
      }
    } else {
      // INCORRECT: No protection - race condition!
      // Multiple threads can interleave between read and write
      const value = counter[0];

      // Simulate some processing (increases chance of race condition)
      let dummy = 0;
      for (let j = 0; j < 10; j++) {
        dummy += j;
      }

      counter[0] = value + 1;
      operations++;
    }
  }

  // Report completion
  parentPort.postMessage({
    type: 'complete',
    workerId,
    operations
  });
}

/**
 * EDUCATIONAL NOTES:
 *
 * 1. WHY MUTEXES ARE NEEDED:
 *    Read-modify-write operations are NOT atomic:
 *      const value = counter[0];  // Thread A reads 5
 *      // Thread B reads 5, increments to 6, writes 6
 *      counter[0] = value + 1;    // Thread A writes 6 (should be 7!)
 *    Result: Lost update! One increment is lost.
 *
 * 2. MUTEX GUARANTEES:
 *    - Only one thread holds lock at a time (mutual exclusion)
 *    - Other threads wait until lock is released
 *    - Operations inside lock are serialized
 *    - No race conditions in critical section
 *
 * 3. ATOMICS.COMPAREEXCHANGE FOR LOCK:
 *    Atomics.compareExchange(array, idx, expected, new):
 *    - Only sets new value if current value equals expected
 *    - Returns the actual old value
 *    - For mutex: Try to change 0→1 (unlocked→locked)
 *    - If returns 0: we acquired lock
 *    - If returns 1: someone else has lock, try again
 *
 * 4. ATOMICS.WAIT FOR EFFICIENT WAITING:
 *    Without wait():
 *      while (Atomics.compareExchange(...) !== 0) {}  // Busy waiting - wastes CPU!
 *
 *    With wait():
 *      while (true) {
 *        if (Atomics.compareExchange(...) === 0) break;
 *        Atomics.wait(...); // Sleep until notified - efficient!
 *      }
 *
 * 5. ATOMICS.NOTIFY TO WAKE THREADS:
 *    When releasing lock:
 *      Atomics.store(lockIdx, 0);     // Release lock
 *      Atomics.notify(lockIdx, 1);    // Wake ONE waiting thread
 *
 *    Why notify(1) not notifyAll()?
 *    - Only one thread can acquire lock anyway
 *    - Others will immediately wait again
 *    - notify(1) is more efficient (less "thundering herd")
 *
 * 6. CRITICAL SECTION BEST PRACTICES:
 *    - Keep critical sections SHORT
 *    - Don't call blocking operations inside locks
 *    - Don't acquire multiple locks (deadlock risk)
 *    - Always release locks (use try/finally)
 *    - Consider lock-free alternatives (Atomics.add for counters)
 *
 * 7. PERFORMANCE IMPACT:
 *    - Mutexes serialize operations (no parallelism in critical section)
 *    - Lock contention increases with:
 *      * More threads
 *      * Longer critical sections
 *      * More frequent lock acquisition
 *    - Minimize lock scope for better performance
 *
 * 8. ALTERNATIVE APPROACHES:
 *    For simple operations:
 *      - Atomics.add(): Lock-free increment
 *      - Atomics.sub(): Lock-free decrement
 *      - Atomics.exchange(): Lock-free swap
 *
 *    For complex operations:
 *      - Mutex (this solution)
 *      - Semaphores (for resource counting)
 *      - Read-write locks (multiple readers, one writer)
 *
 * 9. DEADLOCK PREVENTION:
 *    If acquiring multiple locks:
 *      - Always acquire in same order
 *      - Or use tryLock() with timeout
 *      - Or use lock hierarchy
 *
 * 10. WHEN TO USE MUTEX:
 *     Use mutex when:
 *     - Multiple operations must be atomic together
 *     - Read-modify-write cycles
 *     - Complex data structure updates
 *     - No lock-free alternative exists
 *
 *     Avoid mutex when:
 *     - Simple atomic operations (use Atomics.add/sub/etc)
 *     - Lock-free algorithms available
 *     - Message passing is feasible
 *     - Performance critical (consider alternatives)
 *
 * 11. REAL-WORLD USAGE:
 *     - Database transaction logs
 *     - Shared cache updates
 *     - Resource pool management
 *     - Event queue manipulation
 *     - Any shared mutable state
 */
