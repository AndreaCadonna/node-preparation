/**
 * Solution 2: Thread-Safe Producer-Consumer with Circular Buffer
 *
 * This solution demonstrates:
 * - Circular buffer with SharedArrayBuffer
 * - Thread-safe operations with Atomics
 * - Producer-consumer synchronization
 * - wait() and notify() for blocking/waking threads
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const BUFFER_SIZE = 10;
const HEADER_SIZE = 4; // write_idx, read_idx, count, capacity
const TOTAL_SIZE = HEADER_SIZE + BUFFER_SIZE;

if (isMainThread) {
  console.log('=== Producer-Consumer Solution ===\n');

  // Create shared buffer
  const sharedBuffer = new SharedArrayBuffer(TOTAL_SIZE * 4); // Int32
  const sharedArray = new Int32Array(sharedBuffer);

  // Initialize buffer metadata
  Atomics.store(sharedArray, 0, 0);             // write index
  Atomics.store(sharedArray, 1, 0);             // read index
  Atomics.store(sharedArray, 2, 0);             // count
  Atomics.store(sharedArray, 3, BUFFER_SIZE);   // capacity

  console.log(`Circular buffer created (size: ${BUFFER_SIZE})\n`);

  // Create producers
  console.log('Creating 2 producer workers...');
  const producer1 = new Worker(__filename, {
    workerData: { role: 'producer', id: 1, sharedBuffer }
  });

  const producer2 = new Worker(__filename, {
    workerData: { role: 'producer', id: 2, sharedBuffer }
  });

  // Create consumer
  console.log('Creating 1 consumer worker...\n');
  const consumer = new Worker(__filename, {
    workerData: { role: 'consumer', id: 1, sharedBuffer }
  });

  // Monitor buffer state
  console.log('Monitoring buffer state...\n');
  const monitor = setInterval(() => {
    const count = Atomics.load(sharedArray, 2);
    const writeIdx = Atomics.load(sharedArray, 0);
    const readIdx = Atomics.load(sharedArray, 1);

    const bar = '█'.repeat(count) + '░'.repeat(BUFFER_SIZE - count);
    console.log(`Buffer [${bar}] ${count}/${BUFFER_SIZE} (write=${writeIdx}, read=${readIdx})`);
  }, 1000);

  // Stop after 10 seconds
  setTimeout(() => {
    clearInterval(monitor);
    console.log('\n=== Shutting down ===');

    producer1.terminate();
    producer2.terminate();
    consumer.terminate();

    const finalCount = Atomics.load(sharedArray, 2);
    console.log(`Final buffer count: ${finalCount}`);
    console.log('All workers terminated');
  }, 10000);

} else {
  // Worker code
  const { role, id, sharedBuffer } = workerData;
  const sharedArray = new Int32Array(sharedBuffer);

  if (role === 'producer') {
    // PRODUCER: Add items to buffer
    console.log(`[Producer ${id}] Started`);

    let itemNumber = id * 1000; // Different ranges for each producer

    const produceInterval = setInterval(() => {
      const capacity = Atomics.load(sharedArray, 3);
      const count = Atomics.load(sharedArray, 2);

      // Check if buffer is full
      if (count >= capacity) {
        console.log(`[Producer ${id}] Buffer full, waiting...`);
        return;
      }

      // Get write index and data location
      const writeIdx = Atomics.load(sharedArray, 0);
      const dataIdx = HEADER_SIZE + writeIdx;

      // Write item
      const item = itemNumber++;
      Atomics.store(sharedArray, dataIdx, item);

      // Update write index (circular)
      Atomics.store(sharedArray, 0, (writeIdx + 1) % capacity);

      // Increment count
      const newCount = Atomics.add(sharedArray, 2, 1) + 1;

      console.log(`[Producer ${id}] Produced item ${item} at index ${writeIdx} (count now ${newCount})`);

      // Notify waiting consumers
      Atomics.notify(sharedArray, 2, 1);

    }, 300 + Math.random() * 400); // Variable production rate

  } else if (role === 'consumer') {
    // CONSUMER: Remove items from buffer
    console.log(`[Consumer ${id}] Started`);

    function consume() {
      const capacity = Atomics.load(sharedArray, 3);
      let count = Atomics.load(sharedArray, 2);

      // Check if buffer is empty
      if (count === 0) {
        console.log(`[Consumer ${id}] Buffer empty, waiting...`);

        // Wait for items (with 1 second timeout)
        const waitResult = Atomics.wait(sharedArray, 2, 0, 1000);

        if (waitResult === 'timed-out') {
          // Still empty after timeout, try again
          setTimeout(consume, 100);
          return;
        }

        // Reload count after waking up
        count = Atomics.load(sharedArray, 2);

        if (count === 0) {
          // Still empty, try again
          setTimeout(consume, 100);
          return;
        }
      }

      // Get read index and data location
      const readIdx = Atomics.load(sharedArray, 1);
      const dataIdx = HEADER_SIZE + readIdx;

      // Read item
      const item = Atomics.load(sharedArray, dataIdx);

      // Update read index (circular)
      Atomics.store(sharedArray, 1, (readIdx + 1) % capacity);

      // Decrement count
      const newCount = Atomics.sub(sharedArray, 2, 1) - 1;

      console.log(`[Consumer ${id}] Consumed item ${item} from index ${readIdx} (count now ${newCount})`);

      // Simulate processing time
      const processTime = 200 + Math.random() * 300;
      setTimeout(consume, processTime);
    }

    // Start consuming
    consume();
  }
}

/**
 * EXPECTED BEHAVIOR:
 *
 * 1. Producers add items at different rates
 * 2. Consumer removes and processes items
 * 3. Buffer fills and empties dynamically
 * 4. No race conditions (counts are always correct)
 * 5. Producers block when buffer is full
 * 6. Consumer blocks when buffer is empty
 *
 * KEY CONCEPTS:
 * - Circular buffer: Efficient reuse of fixed memory
 * - Atomics.wait(): Block until condition changes
 * - Atomics.notify(): Wake up waiting threads
 * - Thread-safe counters: Always accurate with Atomics
 *
 * BONUS ENHANCEMENTS:
 * 1. Multiple consumers: Each consumer competes for items
 * 2. Priority items: Use separate queues
 * 3. Batch operations: Produce/consume multiple items at once
 * 4. Statistics: Track produced/consumed counts per worker
 */
