/**
 * Solution 3: Implement a Mutex Lock for Critical Sections
 *
 * This solution demonstrates:
 * - Mutex implementation with SharedArrayBuffer
 * - Atomics.compareExchange for lock acquisition
 * - Atomics.wait/notify for blocking
 * - Race condition demonstration
 * - Lock statistics tracking
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

// Mutex implementation using SharedArrayBuffer and Atomics
class Mutex {
  constructor(sharedBuffer, offset = 0) {
    this.int32Array = new Int32Array(sharedBuffer, offset, 2);
    // [0] = lock state (0 = unlocked, 1 = locked)
    // [1] = wait count (number of threads waiting)

    this.stats = {
      locksAcquired: 0,
      totalWaitTime: 0,
      maxWaitTime: 0
    };
  }

  lock() {
    const startTime = performance.now();

    // Try to acquire lock using compare-and-exchange
    while (true) {
      const oldValue = Atomics.compareExchange(this.int32Array, 0, 0, 1);

      if (oldValue === 0) {
        // Successfully acquired lock
        const waitTime = performance.now() - startTime;
        this.stats.locksAcquired++;
        this.stats.totalWaitTime += waitTime;
        this.stats.maxWaitTime = Math.max(this.stats.maxWaitTime, waitTime);
        return;
      }

      // Lock is held by another thread, wait
      Atomics.add(this.int32Array, 1, 1); // Increment wait count

      // Wait for notification (with timeout to prevent infinite wait)
      Atomics.wait(this.int32Array, 0, 1, 100);

      Atomics.sub(this.int32Array, 1, 1); // Decrement wait count
    }
  }

  unlock() {
    // Release the lock
    Atomics.store(this.int32Array, 0, 0);

    // Notify one waiting thread
    Atomics.notify(this.int32Array, 0, 1);
  }

  tryLock(timeoutMs = 0) {
    const startTime = performance.now();

    while (true) {
      const oldValue = Atomics.compareExchange(this.int32Array, 0, 0, 1);

      if (oldValue === 0) {
        // Successfully acquired lock
        return true;
      }

      if (performance.now() - startTime >= timeoutMs) {
        // Timeout
        return false;
      }

      // Wait briefly
      Atomics.wait(this.int32Array, 0, 1, 10);
    }
  }

  getStats() {
    return {
      locksAcquired: this.stats.locksAcquired,
      avgWaitTime: this.stats.locksAcquired > 0
        ? this.stats.totalWaitTime / this.stats.locksAcquired
        : 0,
      maxWaitTime: this.stats.maxWaitTime
    };
  }
}

if (isMainThread) {
  console.log('=== Mutex Lock Solution ===\n');

  // Test WITHOUT mutex (demonstrate race conditions)
  async function testWithoutMutex() {
    console.log('=== Test WITHOUT Mutex (Race Conditions) ===\n');

    const sharedBuffer = new SharedArrayBuffer(4);
    const counter = new Int32Array(sharedBuffer);
    counter[0] = 0;

    const numWorkers = 4;
    const iterations = 1000;

    const workers = Array.from({ length: numWorkers }, (_, i) => {
      return new Worker(__filename, {
        workerData: {
          workerId: i,
          sharedBuffer,
          useMutex: false,
          iterations
        }
      });
    });

    // Wait for all workers to complete
    await Promise.all(
      workers.map(worker => new Promise((resolve, reject) => {
        worker.on('message', (msg) => {
          if (msg.type === 'complete') {
            console.log(`Worker ${msg.workerId}: completed`);
            resolve();
          }
        });
        worker.on('error', reject);
      }))
    );

    // Terminate workers
    await Promise.all(workers.map(w => w.terminate()));

    const expectedCount = numWorkers * iterations;
    const actualCount = counter[0];
    const isCorrect = actualCount === expectedCount;

    console.log(`\nExpected counter: ${expectedCount}`);
    console.log(`Actual counter: ${actualCount} ${isCorrect ? '(CORRECT ✓)' : '(INCORRECT ✗)'}`);

    if (!isCorrect) {
      console.log(`Lost updates: ${expectedCount - actualCount}`);
      console.log('This demonstrates race conditions in concurrent updates!');
    }
  }

  // Test WITH mutex (demonstrate thread safety)
  async function testWithMutex() {
    console.log('\n=== Test WITH Mutex (Thread Safe) ===\n');

    // Shared buffer layout:
    // [0-3]: counter (4 bytes)
    // [4-11]: mutex (8 bytes)
    const sharedBuffer = new SharedArrayBuffer(12);
    const counter = new Int32Array(sharedBuffer, 0, 1);
    counter[0] = 0;

    const numWorkers = 4;
    const iterations = 1000;

    const workers = Array.from({ length: numWorkers }, (_, i) => {
      return new Worker(__filename, {
        workerData: {
          workerId: i,
          sharedBuffer,
          useMutex: true,
          iterations
        }
      });
    });

    // Wait for all workers to complete
    const results = await Promise.all(
      workers.map(worker => new Promise((resolve, reject) => {
        worker.on('message', (msg) => {
          if (msg.type === 'complete') {
            console.log(`Worker ${msg.workerId}: completed`);
            resolve(msg);
          }
        });
        worker.on('error', reject);
      }))
    );

    // Terminate workers
    await Promise.all(workers.map(w => w.terminate()));

    const expectedCount = numWorkers * iterations;
    const actualCount = counter[0];
    const isCorrect = actualCount === expectedCount;

    console.log(`\nExpected counter: ${expectedCount}`);
    console.log(`Actual counter: ${actualCount} ${isCorrect ? '(CORRECT ✓)' : '(INCORRECT ✗)'}`);

    // Aggregate lock statistics
    const totalLocks = results.reduce((sum, r) => sum + r.stats.locksAcquired, 0);
    const avgWaitTime = results.reduce((sum, r) =>
      sum + r.stats.avgWaitTime, 0) / results.length;
    const maxWaitTime = Math.max(...results.map(r => r.stats.maxWaitTime));

    console.log('\n=== Lock Statistics ===');
    console.log(`Total locks acquired: ${totalLocks}`);
    console.log(`Average wait time: ${avgWaitTime.toFixed(2)}ms`);
    console.log(`Max wait time: ${maxWaitTime.toFixed(2)}ms`);
  }

  // Run both tests
  async function run() {
    await testWithoutMutex();
    await testWithMutex();
  }

  run().catch(console.error);

} else {
  // === WORKER THREAD CODE ===
  const { workerId, sharedBuffer, useMutex, iterations } = workerData;

  const counter = new Int32Array(sharedBuffer, 0, 1);
  let mutex;

  if (useMutex) {
    // Mutex is at offset 4 (after counter)
    mutex = new Mutex(sharedBuffer, 4);
  }

  // Perform increments
  for (let i = 0; i < iterations; i++) {
    if (useMutex) {
      // THREAD SAFE: Use mutex to protect critical section
      mutex.lock();

      // Critical section: read-modify-write
      const currentValue = counter[0];
      const newValue = currentValue + 1;
      counter[0] = newValue;

      mutex.unlock();
    } else {
      // UNSAFE: Race condition - read-modify-write is not atomic
      const currentValue = counter[0];

      // Simulate some processing time to increase chance of race
      let sum = 0;
      for (let j = 0; j < 10; j++) {
        sum += j;
      }

      const newValue = currentValue + 1;
      counter[0] = newValue;
    }
  }

  // Report completion
  const message = {
    type: 'complete',
    workerId
  };

  if (useMutex) {
    message.stats = mutex.getStats();
  }

  parentPort.postMessage(message);
}

/**
 * EXPECTED RESULTS:
 *
 * === Test WITHOUT Mutex ===
 * Expected counter: 4000
 * Actual counter: 3847 (INCORRECT ✗)
 * Lost updates: 153
 *
 * This demonstrates race conditions! Multiple threads read the same
 * value, increment it, and write back, causing lost updates.
 *
 * === Test WITH Mutex ===
 * Expected counter: 4000
 * Actual counter: 4000 (CORRECT ✓)
 *
 * Lock Statistics:
 * Total locks acquired: 4000
 * Average wait time: 0.45ms
 * Max wait time: 2.1ms
 *
 * KEY CONCEPTS:
 *
 * 1. Race Condition:
 *    - Multiple threads access shared data
 *    - At least one modifies the data
 *    - No synchronization mechanism
 *    - Result depends on timing
 *
 * 2. Mutex (Mutual Exclusion):
 *    - Only one thread can hold lock
 *    - Others must wait
 *    - Serializes access to critical section
 *    - Prevents race conditions
 *
 * 3. Implementation Details:
 *    - Atomics.compareExchange: atomic test-and-set
 *    - Atomics.wait: block until notified
 *    - Atomics.notify: wake waiting threads
 *    - Lock state in SharedArrayBuffer
 *
 * PERFORMANCE CONSIDERATIONS:
 *
 * 1. Lock contention:
 *    - Multiple threads waiting
 *    - Serialized execution
 *    - Consider lock-free algorithms
 *
 * 2. Lock granularity:
 *    - Fine-grained: more concurrency
 *    - Coarse-grained: simpler code
 *    - Balance based on use case
 *
 * ADVANCED PATTERNS:
 *
 * 1. Read-Write Lock:
 *    - Multiple readers OR one writer
 *    - Better concurrency for read-heavy workloads
 *
 * 2. Semaphore:
 *    - Allow N threads simultaneously
 *    - Count available resources
 *
 * 3. Condition Variable:
 *    - Wait for condition to become true
 *    - Efficient signaling between threads
 */
