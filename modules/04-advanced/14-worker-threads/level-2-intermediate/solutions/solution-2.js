/**
 * Solution 2: Optimize Data Transfer with Transferables
 *
 * This solution demonstrates:
 * - Performance comparison: clone vs transfer
 * - Using transferable objects correctly
 * - Measuring transfer time
 * - Handling transferred buffers
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Transferable Objects Solution ===\n');

  const bufferSizeMB = 50;
  const bufferSize = bufferSizeMB * 1024 * 1024;

  async function testClone() {
    console.log(`Test 1: Clone (regular postMessage) - ${bufferSizeMB}MB`);
    console.log('-----------------------------------');

    // Create buffer
    const buffer = new ArrayBuffer(bufferSize);
    const view = new Uint8Array(buffer);
    view.fill(42);

    console.log('Buffer size before:', buffer.byteLength, 'bytes');

    const worker = new Worker(__filename);

    const start = performance.now();

    // Clone buffer (regular postMessage)
    worker.postMessage({ buffer });

    const result = await new Promise((resolve) => {
      worker.on('message', resolve);
    });

    const end = performance.now();

    console.log('Transfer time:', (end - start).toFixed(2), 'ms');
    console.log('Buffer size after:', buffer.byteLength, 'bytes (still accessible)');
    console.log('');

    await worker.terminate();

    return end - start;
  }

  async function testTransfer() {
    console.log(`Test 2: Transfer (transferable) - ${bufferSizeMB}MB`);
    console.log('-----------------------------------');

    // Create buffer
    const buffer = new ArrayBuffer(bufferSize);
    const view = new Uint8Array(buffer);
    view.fill(42);

    console.log('Buffer size before:', buffer.byteLength, 'bytes');

    const worker = new Worker(__filename);

    const start = performance.now();

    // Transfer buffer (zero-copy)
    worker.postMessage({ buffer }, [buffer]);

    const result = await new Promise((resolve) => {
      worker.on('message', resolve);
    });

    const end = performance.now();

    console.log('Transfer time:', (end - start).toFixed(2), 'ms');
    console.log('Buffer size after:', buffer.byteLength, 'bytes (transferred, unusable)');
    console.log('');

    await worker.terminate();

    return end - start;
  }

  async function runComparison() {
    const cloneTime = await testClone();
    const transferTime = await testTransfer();

    console.log('=== Performance Comparison ===');
    console.log(`Clone: ${cloneTime.toFixed(2)}ms`);
    console.log(`Transfer: ${transferTime.toFixed(2)}ms`);
    console.log(`Improvement: ${(cloneTime / transferTime).toFixed(2)}x faster`);
    console.log('');
    console.log('Note: Transfer is O(1) while clone is O(n)');
    console.log('Larger buffers show even more improvement!');
  }

  runComparison().catch(console.error);

} else {
  // Worker code
  parentPort.on('message', ({ buffer }) => {
    // Process buffer (simple transformation)
    const view = new Uint8Array(buffer);

    // Apply transformation to sample points (not all, for speed)
    for (let i = 0; i < view.length; i += 100) {
      view[i] = view[i] ^ 0xFF; // Bitwise NOT
    }

    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < Math.min(1000, view.length); i++) {
      checksum += view[i];
    }

    // Send back (clone, since main thread needs to measure time)
    parentPort.postMessage({
      buffer,
      checksum,
      processed: true
    });
  });
}

/**
 * EXPECTED RESULTS:
 *
 * Test 1 (Clone):   ~50-100ms for 50MB
 * Test 2 (Transfer): <1ms for 50MB
 * Improvement: ~100-200x faster
 *
 * KEY POINTS:
 * 1. Transferables are MUCH faster for large data
 * 2. Transfer time is constant regardless of size
 * 3. Original buffer becomes unusable after transfer
 * 4. Use transferables for large binary data
 *
 * BONUS: Ping-Pong Pattern
 *
 * for (let i = 0; i < 10; i++) {
 *   worker.postMessage({ buffer }, [buffer]);
 *   buffer = await waitForBuffer(worker);
 * }
 *
 * Buffer bounces back and forth with zero copying!
 */
