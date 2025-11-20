/**
 * Exercise 2: Optimize Data Transfer with Transferables
 *
 * TASK:
 * Convert a data processing application to use transferable objects
 * for improved performance.
 *
 * REQUIREMENTS:
 * 1. Process a large image buffer (simulated with Uint8Array)
 * 2. Compare performance: clone vs transfer
 * 3. Implement using transferable objects
 * 4. Measure and report performance improvement
 *
 * BONUS:
 * - Handle multiple buffers
 * - Implement ping-pong buffer pattern
 * - Add error handling for detached buffers
 *
 * EXPECTED OUTPUT:
 * Creating 50MB buffer...
 *
 * Test 1: Clone (regular postMessage)
 * Transfer time: XXms
 *
 * Test 2: Transfer (transferable)
 * Transfer time: <1ms
 *
 * Performance improvement: XXXx faster
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Transferable Objects Exercise ===\n');

  const bufferSizeMB = 50;

  // TODO: Implement performance comparison
  // 1. Create large buffer (50MB)
  // 2. Test with clone (regular postMessage)
  // 3. Test with transfer (transferable)
  // 4. Calculate and display improvement

  // Your code here...

} else {
  // Worker code (provided)
  parentPort.on('message', ({ buffer }) => {
    // Process buffer (simple transformation)
    const view = new Uint8Array(buffer);

    // Apply transformation
    for (let i = 0; i < view.length; i += 100) {
      view[i] = view[i] ^ 0xFF;
    }

    // Send back (you need to decide: clone or transfer)
    parentPort.postMessage({ buffer });
  });
}
