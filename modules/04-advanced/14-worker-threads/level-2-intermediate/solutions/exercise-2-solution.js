/**
 * Exercise 2 Solution: Optimize Data Transfer with Transferables
 *
 * This solution demonstrates:
 * - Performance comparison: clone vs transfer
 * - Using transferable objects for zero-copy data transfer
 * - Memory-efficient worker communication
 * - Performance measurement and analysis
 * - Handling detached buffers
 *
 * KEY CONCEPTS:
 * - Transferable Objects: ArrayBuffers that can be transferred ownership
 * - Zero-Copy Transfer: Buffer ownership moves without copying data
 * - Performance Impact: Massive speedup for large data transfers
 * - Buffer Detachment: Original buffer becomes unusable after transfer
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Transferable Objects Exercise ===\n');

  const bufferSizeMB = 50;
  const bufferSize = bufferSizeMB * 1024 * 1024;

  /**
   * Creates a large buffer for testing
   * Filled with random data to simulate real-world scenarios
   */
  function createBuffer(size) {
    console.log(`Creating ${size / 1024 / 1024}MB buffer...`);
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);

    // Fill with some data
    for (let i = 0; i < view.length; i += 1000) {
      view[i] = Math.floor(Math.random() * 256);
    }

    return buffer;
  }

  /**
   * Test 1: Clone (regular postMessage)
   * The buffer is copied, which is slow for large buffers
   */
  async function testClone() {
    console.log('\n--- Test 1: Clone (regular postMessage) ---');

    return new Promise((resolve, reject) => {
      const buffer = createBuffer(bufferSize);
      const worker = new Worker(__filename);

      const startTime = performance.now();

      worker.on('message', ({ buffer: receivedBuffer }) => {
        const endTime = performance.now();
        const transferTime = endTime - startTime;

        console.log(`Transfer time: ${transferTime.toFixed(2)}ms`);

        // Verify original buffer is still accessible (cloned)
        const originalView = new Uint8Array(buffer);
        console.log(`Original buffer still accessible: ${originalView.length > 0}`);

        worker.terminate();
        resolve(transferTime);
      });

      worker.on('error', reject);

      // Send without transfer list (will be cloned)
      worker.postMessage({ buffer });
      console.log('Sent buffer (cloned)');
    });
  }

  /**
   * Test 2: Transfer (transferable objects)
   * The buffer ownership is transferred, zero-copy operation
   */
  async function testTransfer() {
    console.log('\n--- Test 2: Transfer (transferable) ---');

    return new Promise((resolve, reject) => {
      const buffer = createBuffer(bufferSize);
      const worker = new Worker(__filename);

      const startTime = performance.now();

      worker.on('message', ({ buffer: receivedBuffer }) => {
        const endTime = performance.now();
        const transferTime = endTime - startTime;

        console.log(`Transfer time: ${transferTime.toFixed(2)}ms`);

        // Try to access original buffer (should be detached)
        try {
          const originalView = new Uint8Array(buffer);
          console.log(`Original buffer detached (length: ${originalView.length})`);
        } catch (error) {
          console.log('Original buffer is detached (cannot access)');
        }

        worker.terminate();
        resolve(transferTime);
      });

      worker.on('error', reject);

      // Send WITH transfer list (will be transferred, not cloned)
      // The second parameter is the list of transferable objects
      worker.postMessage({ buffer }, [buffer]);
      console.log('Sent buffer (transferred)');

      // At this point, 'buffer' is detached and cannot be used
    });
  }

  /**
   * Test 3: Multiple buffers transfer
   * Demonstrates transferring multiple buffers at once
   */
  async function testMultipleBuffers() {
    console.log('\n--- Test 3: Multiple Buffers Transfer ---');

    return new Promise((resolve, reject) => {
      // Create multiple smaller buffers
      const buffers = [
        createBuffer(10 * 1024 * 1024), // 10MB
        createBuffer(10 * 1024 * 1024), // 10MB
        createBuffer(10 * 1024 * 1024)  // 10MB
      ];

      const worker = new Worker(__filename);

      const startTime = performance.now();

      worker.on('message', ({ buffers: receivedBuffers }) => {
        const endTime = performance.now();
        const transferTime = endTime - startTime;

        console.log(`Transferred ${receivedBuffers.length} buffers`);
        console.log(`Transfer time: ${transferTime.toFixed(2)}ms`);

        worker.terminate();
        resolve(transferTime);
      });

      worker.on('error', reject);

      // Transfer all buffers at once
      // List all buffers in the transfer list
      worker.postMessage({ buffers }, buffers);
      console.log('Sent multiple buffers (transferred)');
    });
  }

  /**
   * Main test execution
   * Runs all tests and compares performance
   */
  async function runTests() {
    try {
      // Test 1: Clone
      const cloneTime = await testClone();

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 2: Transfer
      const transferTime = await testTransfer();

      // Calculate improvement
      const improvement = cloneTime / transferTime;

      console.log('\n=== Performance Comparison ===');
      console.log(`Clone time:    ${cloneTime.toFixed(2)}ms`);
      console.log(`Transfer time: ${transferTime.toFixed(2)}ms`);
      console.log(`Improvement:   ${improvement.toFixed(1)}x faster with transfer`);
      console.log(`Data saved:    ${(bufferSizeMB * 2).toFixed(0)}MB (no copy)`);

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 3: Multiple buffers
      await testMultipleBuffers();

      console.log('\n=== Key Takeaways ===');
      console.log('✓ Transferable objects provide zero-copy transfer');
      console.log('✓ Massive performance improvement for large buffers');
      console.log('✓ Original buffer becomes detached after transfer');
      console.log('✓ Use when buffer is no longer needed in sender');
      console.log('✓ Perfect for image processing, video, audio, large datasets');

    } catch (error) {
      console.error('Test failed:', error);
    }
  }

  runTests();

} else {
  /**
   * Worker Thread Code
   *
   * Processes received buffer(s) and sends back
   */
  parentPort.on('message', (msg) => {
    if (msg.buffer) {
      // Single buffer processing
      const view = new Uint8Array(msg.buffer);

      // Apply transformation (every 100th byte)
      for (let i = 0; i < view.length; i += 100) {
        view[i] = view[i] ^ 0xFF; // XOR with 0xFF
      }

      // Send back - should also be transferred for consistency
      parentPort.postMessage({ buffer: msg.buffer }, [msg.buffer]);

    } else if (msg.buffers) {
      // Multiple buffers processing
      msg.buffers.forEach(buffer => {
        const view = new Uint8Array(buffer);

        // Apply simple transformation
        for (let i = 0; i < view.length; i += 100) {
          view[i] = view[i] ^ 0xFF;
        }
      });

      // Send all buffers back
      parentPort.postMessage({ buffers: msg.buffers }, msg.buffers);
    }
  });
}

/**
 * LEARNING NOTES:
 *
 * 1. WHAT ARE TRANSFERABLE OBJECTS?
 *    - ArrayBuffer and MessagePort can be transferred
 *    - Ownership is moved, not copied
 *    - Zero-copy operation = extremely fast
 *    - Original becomes "detached" (unusable)
 *
 * 2. SYNTAX:
 *    // Regular (clones the buffer)
 *    worker.postMessage({ buffer });
 *
 *    // Transfer (moves ownership)
 *    worker.postMessage({ buffer }, [buffer]);
 *                                     ^^^^^^^
 *                                Transfer list (array of transferables)
 *
 * 3. WHEN TO USE TRANSFERABLES:
 *    ✓ Large binary data (images, video, audio)
 *    ✓ Data processing pipelines
 *    ✓ One-way data flow (sender doesn't need data after)
 *    ✗ Data needed in both threads (use clone)
 *    ✗ Small data (transfer overhead not worth it)
 *
 * 4. PERFORMANCE CHARACTERISTICS:
 *    - Clone time: O(n) - proportional to buffer size
 *    - Transfer time: O(1) - constant time, size independent
 *    - For 50MB: ~100-500ms clone vs <1ms transfer
 *    - Memory savings: 2x (no duplicate copy)
 *
 * 5. DETACHED BUFFERS:
 *    const buffer = new ArrayBuffer(1024);
 *    worker.postMessage({ buffer }, [buffer]);
 *    // buffer is now detached
 *    buffer.byteLength; // 0
 *    new Uint8Array(buffer); // TypeError or empty array
 *
 * 6. COMMON PITFALLS:
 *    - Forgetting transfer list (will clone instead)
 *    - Trying to use buffer after transfer
 *    - Not transferring back from worker (memory leak)
 *    - Transferring nested buffers (won't work automatically)
 *
 * BONUS: PING-PONG BUFFER PATTERN
 *
 * For continuous processing, use two buffers:
 *
 * let buffers = [
 *   new ArrayBuffer(1024),
 *   new ArrayBuffer(1024)
 * ];
 *
 * let currentBuffer = 0;
 *
 * worker.on('message', ({ buffer }) => {
 *   // Received processed buffer back
 *   buffers[currentBuffer] = buffer;
 *
 *   // Switch to other buffer for next operation
 *   currentBuffer = 1 - currentBuffer;
 *
 *   // Send other buffer for processing
 *   worker.postMessage(
 *     { buffer: buffers[currentBuffer] },
 *     [buffers[currentBuffer]]
 *   );
 * });
 *
 * This pattern allows continuous processing without waiting
 * for buffer transfers.
 *
 * BONUS: ERROR HANDLING
 *
 * function safeTransfer(worker, buffer) {
 *   // Check if buffer is already detached
 *   if (buffer.byteLength === 0) {
 *     throw new Error('Cannot transfer detached buffer');
 *   }
 *
 *   try {
 *     worker.postMessage({ buffer }, [buffer]);
 *   } catch (error) {
 *     console.error('Transfer failed:', error);
 *     // Fallback to clone if transfer fails
 *     worker.postMessage({ buffer });
 *   }
 * }
 */
