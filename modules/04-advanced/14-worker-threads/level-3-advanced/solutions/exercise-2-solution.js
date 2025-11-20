/**
 * Solution 2: Thread-Safe Producer-Consumer with Circular Buffer
 *
 * This solution demonstrates:
 * - Circular buffer implementation with SharedArrayBuffer
 * - Producer-consumer pattern with multiple workers
 * - Atomics.wait() and Atomics.notify() for thread synchronization
 * - Lock-free queue operations
 * - Buffer full/empty handling
 *
 * Key Concepts:
 * - Circular Buffer: Fixed-size ring buffer that wraps around
 * - Atomics.wait(): Block thread until notified (efficient sleeping)
 * - Atomics.notify(): Wake up waiting threads
 * - Producer-Consumer: Classic concurrency pattern for work distribution
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// Buffer configuration
const BUFFER_SIZE = 10; // Number of items the buffer can hold
const METADATA_SIZE = 4; // [writeIdx, readIdx, count, capacity]
const TOTAL_SIZE = METADATA_SIZE + BUFFER_SIZE;

/**
 * Thread-Safe Circular Buffer
 *
 * Buffer Layout in SharedArrayBuffer:
 * [0] = writeIndex (where next item will be written)
 * [1] = readIndex (where next item will be read)
 * [2] = count (number of items currently in buffer)
 * [3] = capacity (maximum items, always BUFFER_SIZE)
 * [4...13] = data array (actual items)
 */
class CircularBuffer {
  constructor(sharedBuffer) {
    this.buffer = new Int32Array(sharedBuffer);
    this.capacity = BUFFER_SIZE;
  }

  /**
   * Enqueue an item (Producer operation)
   * Returns true if successful, false if buffer is full
   */
  enqueue(item, timeoutMs = 1000) {
    const startTime = Date.now();

    while (true) {
      // Check if buffer is full
      const count = Atomics.load(this.buffer, 2);

      if (count < this.capacity) {
        // Buffer has space, try to add item

        // Atomically increment count to reserve a slot
        const oldCount = Atomics.compareExchange(this.buffer, 2, count, count + 1);

        if (oldCount === count) {
          // Successfully reserved a slot

          // Get write index and increment it atomically
          const writeIdx = Atomics.load(this.buffer, 0);
          const nextWriteIdx = (writeIdx + 1) % this.capacity;
          Atomics.store(this.buffer, 0, nextWriteIdx);

          // Write the item
          const dataIdx = METADATA_SIZE + writeIdx;
          Atomics.store(this.buffer, dataIdx, item);

          // Notify one waiting consumer
          Atomics.notify(this.buffer, 2, 1);

          return true;
        }
        // Race condition: another thread modified count, retry
      } else {
        // Buffer is full, wait for space
        if (Date.now() - startTime > timeoutMs) {
          return false; // Timeout
        }

        // Wait for count to change (consumer removes item)
        Atomics.wait(this.buffer, 2, count, 100); // Wait max 100ms
      }
    }
  }

  /**
   * Dequeue an item (Consumer operation)
   * Returns item if successful, null if buffer is empty
   */
  dequeue(timeoutMs = 1000) {
    const startTime = Date.now();

    while (true) {
      // Check if buffer is empty
      const count = Atomics.load(this.buffer, 2);

      if (count > 0) {
        // Buffer has items, try to remove one

        // Atomically decrement count to claim an item
        const oldCount = Atomics.compareExchange(this.buffer, 2, count, count - 1);

        if (oldCount === count) {
          // Successfully claimed an item

          // Get read index and increment it atomically
          const readIdx = Atomics.load(this.buffer, 1);
          const nextReadIdx = (readIdx + 1) % this.capacity;
          Atomics.store(this.buffer, 1, nextReadIdx);

          // Read the item
          const dataIdx = METADATA_SIZE + readIdx;
          const item = Atomics.load(this.buffer, dataIdx);

          // Notify one waiting producer
          Atomics.notify(this.buffer, 2, 1);

          return item;
        }
        // Race condition: another thread modified count, retry
      } else {
        // Buffer is empty, wait for items
        if (Date.now() - startTime > timeoutMs) {
          return null; // Timeout
        }

        // Wait for count to change (producer adds item)
        Atomics.wait(this.buffer, 2, count, 100); // Wait max 100ms
      }
    }
  }

  getCount() {
    return Atomics.load(this.buffer, 2);
  }

  isFull() {
    return this.getCount() === this.capacity;
  }

  isEmpty() {
    return this.getCount() === 0;
  }
}

if (isMainThread) {
  console.log('=== Producer-Consumer Solution ===\n');

  async function runProducerConsumer() {
    // Create shared buffer
    const sharedBuffer = new SharedArrayBuffer(TOTAL_SIZE * Int32Array.BYTES_PER_ELEMENT);
    const buffer = new CircularBuffer(sharedBuffer);

    // Initialize buffer metadata
    const array = new Int32Array(sharedBuffer);
    array[0] = 0; // writeIndex
    array[1] = 0; // readIndex
    array[2] = 0; // count
    array[3] = BUFFER_SIZE; // capacity

    console.log(`Circular buffer created with capacity: ${BUFFER_SIZE}\n`);

    // Create producers
    const NUM_PRODUCERS = 2;
    const producers = [];

    for (let i = 0; i < NUM_PRODUCERS; i++) {
      const producer = new Worker(__filename, {
        workerData: {
          sharedBuffer,
          role: 'producer',
          workerId: i,
          itemsToProduce: 20
        }
      });

      producer.on('message', (msg) => {
        if (msg.type === 'produced') {
          console.log(`[Producer ${msg.workerId}] Produced item ${msg.item} (buffer: ${msg.bufferCount}/${BUFFER_SIZE})`);
        } else if (msg.type === 'complete') {
          console.log(`[Producer ${msg.workerId}] Completed - produced ${msg.totalProduced} items`);
        }
      });

      producer.on('error', console.error);
      producers.push(producer);
    }

    // Create consumer
    const NUM_CONSUMERS = 1;
    const consumers = [];

    for (let i = 0; i < NUM_CONSUMERS; i++) {
      const consumer = new Worker(__filename, {
        workerData: {
          sharedBuffer,
          role: 'consumer',
          workerId: i,
          itemsToConsume: 40 // Total items from all producers
        }
      });

      consumer.on('message', (msg) => {
        if (msg.type === 'consumed') {
          console.log(`[Consumer ${msg.workerId}] Consumed item ${msg.item} (buffer: ${msg.bufferCount}/${BUFFER_SIZE})`);
        } else if (msg.type === 'complete') {
          console.log(`[Consumer ${msg.workerId}] Completed - consumed ${msg.totalConsumed} items`);
        }
      });

      consumer.on('error', console.error);
      consumers.push(consumer);
    }

    // Monitor buffer state periodically
    const monitorInterval = setInterval(() => {
      const count = buffer.getCount();
      const writeIdx = array[0];
      const readIdx = array[1];

      process.stdout.write(`\r[Monitor] Buffer: ${count}/${BUFFER_SIZE} items | Write: ${writeIdx} | Read: ${readIdx}    `);
    }, 500);

    // Run for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Cleanup
    clearInterval(monitorInterval);
    console.log('\n\n=== Final Statistics ===');
    console.log(`Final buffer count: ${buffer.getCount()}`);
    console.log(`Write index: ${array[0]}`);
    console.log(`Read index: ${array[1]}`);

    // Terminate workers
    producers.forEach(p => p.terminate());
    consumers.forEach(c => c.terminate());

    console.log('\nAll workers terminated. Test complete!');
  }

  runProducerConsumer().catch(console.error);

} else {
  /**
   * Worker code: Acts as either producer or consumer
   */
  const { sharedBuffer, role, workerId, itemsToProduce, itemsToConsume } = workerData;
  const buffer = new CircularBuffer(sharedBuffer);

  if (role === 'producer') {
    /**
     * Producer: Generates items and adds them to buffer
     */
    let produced = 0;
    let itemId = workerId * 1000; // Each producer has unique ID range

    const produceInterval = setInterval(() => {
      if (produced >= itemsToProduce) {
        clearInterval(produceInterval);

        parentPort.postMessage({
          type: 'complete',
          workerId,
          totalProduced: produced
        });
        return;
      }

      // Try to enqueue item
      const success = buffer.enqueue(itemId);

      if (success) {
        produced++;

        parentPort.postMessage({
          type: 'produced',
          workerId,
          item: itemId,
          bufferCount: buffer.getCount()
        });

        itemId++;
      }
      // If buffer full, wait and retry on next interval
    }, 100 + Math.random() * 200); // Random production rate

  } else if (role === 'consumer') {
    /**
     * Consumer: Removes items from buffer and processes them
     */
    let consumed = 0;

    const consumeInterval = setInterval(() => {
      if (consumed >= itemsToConsume) {
        clearInterval(consumeInterval);

        parentPort.postMessage({
          type: 'complete',
          workerId,
          totalConsumed: consumed
        });
        return;
      }

      // Try to dequeue item
      const item = buffer.dequeue();

      if (item !== null) {
        consumed++;

        // Simulate processing time
        const processingTime = 10 + Math.random() * 20;

        parentPort.postMessage({
          type: 'consumed',
          workerId,
          item,
          bufferCount: buffer.getCount(),
          processingTime: processingTime.toFixed(2)
        });
      }
      // If buffer empty, wait and retry on next interval
    }, 150 + Math.random() * 100); // Random consumption rate
  }
}

/**
 * EDUCATIONAL NOTES:
 *
 * 1. CIRCULAR BUFFER ADVANTAGES:
 *    - Fixed memory allocation (no dynamic resizing)
 *    - O(1) enqueue and dequeue operations
 *    - Cache-friendly (sequential memory access)
 *    - Perfect for bounded producer-consumer scenarios
 *
 * 2. ATOMICS.WAIT() AND ATOMICS.NOTIFY():
 *    - Efficient thread synchronization (no busy waiting)
 *    - wait() blocks until notify() is called or timeout
 *    - notify(count) wakes up 'count' waiting threads
 *    - Much more efficient than polling in a loop
 *
 * 3. WHY USE COMPAREEXCHANGE:
 *    Atomics.compareExchange(array, index, expectedValue, newValue):
 *    - Atomic "test and set" operation
 *    - Only updates if current value matches expected
 *    - Returns the actual old value
 *    - Used for lock-free algorithms (no mutex needed!)
 *    - If CAS fails, it means another thread changed the value
 *
 * 4. RACE CONDITION HANDLING:
 *    The while(true) loops with CAS handle race conditions:
 *    - Multiple threads may try to enqueue/dequeue simultaneously
 *    - CAS ensures only one succeeds per operation
 *    - Losers retry automatically
 *    - No locks needed (lock-free algorithm)
 *
 * 5. BUFFER FULL/EMPTY SCENARIOS:
 *    - Producers wait when buffer is full (backpressure)
 *    - Consumers wait when buffer is empty
 *    - Atomics.wait() makes waiting efficient (no CPU spinning)
 *    - Notifications wake threads immediately
 *
 * 6. PRODUCTION CONSIDERATIONS:
 *    - Timeout values prevent infinite waiting
 *    - Buffer size should match workload characteristics
 *    - Too small: frequent waits, poor throughput
 *    - Too large: high memory usage, potential latency
 *    - Typical sizes: 16-1024 items depending on item size
 *
 * 7. ALTERNATIVE PATTERNS:
 *    - Multiple consumers: Each claims items atomically
 *    - Priority queues: Multiple buffers per priority level
 *    - Work stealing: Consumers can steal from other queues
 *    - Backpressure: Producers slow down when buffer fills
 *
 * 8. PERFORMANCE CHARACTERISTICS:
 *    - Lock-free: No mutex overhead
 *    - Wait-free enqueue/dequeue (usually completes in fixed steps)
 *    - Scales well with multiple producers/consumers
 *    - Memory bandwidth is often the bottleneck
 *
 * 9. DEBUGGING TIPS:
 *    - Monitor count, writeIdx, readIdx for consistency
 *    - Count should never exceed capacity
 *    - Indices should wrap correctly (modulo capacity)
 *    - Add validation in development builds
 *
 * 10. WHEN TO USE THIS PATTERN:
 *     - High-throughput data pipelines
 *     - Real-time event processing
 *     - Task distribution across workers
 *     - Buffering between fast and slow components
 *     - Audio/video processing pipelines
 */
