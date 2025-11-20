/**
 * Exercise 3: Implement a Mutex Lock for Critical Sections
 *
 * TASK:
 * Implement a mutex (mutual exclusion) lock using SharedArrayBuffer and Atomics
 * to protect critical sections of code from concurrent access.
 *
 * REQUIREMENTS:
 * 1. Implement a Mutex class with lock() and unlock() methods
 * 2. Create 4 workers that access a shared counter
 * 3. Each worker performs 1000 read-modify-write operations
 * 4. Without mutex: race conditions cause incorrect result
 * 5. With mutex: operations are serialized and result is correct
 *
 * BONUS:
 * - Add tryLock() with timeout
 * - Implement deadlock detection
 * - Track lock contention statistics
 * - Support recursive locks
 *
 * EXPECTED OUTPUT:
 * === Test WITHOUT Mutex (Race Conditions) ===
 * Worker 0: completed
 * Worker 1: completed
 * Worker 2: completed
 * Worker 3: completed
 * Final counter: 3847 (INCORRECT - expected 4000)
 *
 * === Test WITH Mutex (Thread Safe) ===
 * Worker 0: completed
 * Worker 1: completed
 * Worker 2: completed
 * Worker 3: completed
 * Final counter: 4000 (CORRECT ✓)
 *
 * Lock Statistics:
 * - Total locks acquired: 4000
 * - Average wait time: 0.5ms
 * - Max wait time: 2.3ms
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// Mutex implementation using SharedArrayBuffer
class Mutex {
  constructor(sharedBuffer, offset = 0) {
    // TODO: Initialize mutex
    // - Use sharedBuffer at given offset
    // - Lock state: 0 = unlocked, 1 = locked
    // - Track owner and statistics
  }

  lock() {
    // TODO: Implement lock acquisition
    // - Try to acquire lock atomically
    // - Use Atomics.wait() if already locked
    // - Update lock statistics
  }

  unlock() {
    // TODO: Implement lock release
    // - Release lock atomically
    // - Use Atomics.notify() to wake waiting threads
  }

  tryLock(timeoutMs = 0) {
    // BONUS: Implement lock with timeout
  }
}

if (isMainThread) {
  console.log('=== Mutex Lock Exercise ===\n');

  // TODO: Implement test cases
  // 1. Test WITHOUT mutex (show race conditions)
  //    - Create shared counter
  //    - Create 4 workers
  //    - Each worker does 1000 read-modify-write operations
  //    - Show incorrect final count
  //
  // 2. Test WITH mutex (show correct behavior)
  //    - Create shared counter and mutex
  //    - Create 4 workers
  //    - Each worker uses mutex to protect operations
  //    - Show correct final count

  async function testWithoutMutex() {
    console.log('=== Test WITHOUT Mutex (Race Conditions) ===\n');

    // Your code here...
  }

  async function testWithMutex() {
    console.log('\n=== Test WITH Mutex (Thread Safe) ===\n');

    // Your code here...
  }

  async function run() {
    await testWithoutMutex();
    await testWithMutex();
  }

  run().catch(console.error);

} else {
  // Worker code
  const { sharedBuffer, useMutex, iterations } = workerData;

  // TODO: Implement worker logic
  // - If useMutex: acquire lock before each operation
  // - Perform read-modify-write on shared counter
  // - If useMutex: release lock after operation
  // - Report completion

  // Your code here...
}
