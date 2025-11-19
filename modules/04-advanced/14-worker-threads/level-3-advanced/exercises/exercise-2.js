/**
 * Exercise 2: Implement a Thread-Safe Producer-Consumer with Circular Buffer
 *
 * TASK:
 * Implement a circular buffer using SharedArrayBuffer that allows
 * multiple producers and consumers to safely add and remove items.
 *
 * REQUIREMENTS:
 * 1. Use SharedArrayBuffer for the buffer
 * 2. Implement thread-safe enqueue and dequeue using Atomics
 * 3. Use Atomics.wait() and Atomics.notify() for synchronization
 * 4. Create 2 producer workers and 1 consumer worker
 * 5. Producers add items, consumer removes and processes them
 *
 * BONUS:
 * - Support multiple consumers
 * - Add buffer full/empty handling
 * - Track statistics (items produced/consumed)
 * - Implement timeout for operations
 *
 * BUFFER LAYOUT:
 * [0] = write index
 * [1] = read index
 * [2] = count (number of items in buffer)
 * [3] = capacity
 * [4...] = data
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const BUFFER_SIZE = 10;

if (isMainThread) {
  console.log('=== Producer-Consumer Exercise ===\n');

  // TODO: Implement producer-consumer system
  // 1. Create SharedArrayBuffer for circular buffer
  // 2. Initialize buffer metadata (write index, read index, count, capacity)
  // 3. Create 2 producer workers
  // 4. Create 1 consumer worker
  // 5. Monitor buffer state
  // 6. Clean up after 10 seconds

  // Your code here...

} else {
  // TODO: Implement producer or consumer logic
  // For producers:
  //   - Generate items
  //   - Check if buffer is full
  //   - Add item atomically
  //   - Notify consumers
  //
  // For consumers:
  //   - Check if buffer is empty
  //   - Wait for items if empty
  //   - Remove item atomically
  //   - Process item

  // Your code here...
}
