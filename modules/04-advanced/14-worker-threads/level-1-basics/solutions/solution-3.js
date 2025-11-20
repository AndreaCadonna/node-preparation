/**
 * Solution 3: Ping-Pong Communication
 *
 * This solution demonstrates:
 * - Bidirectional message exchange
 * - Message sequencing
 * - Graceful shutdown
 * - State management in both threads
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  console.log('Exercise 3 Solution: Ping-Pong Communication\n');

  const worker = new Worker(__filename);

  let pingCount = 0;
  const maxPings = 5;

  // Send initial ping
  function sendPing() {
    pingCount++;
    console.log(`Main: Sending ping ${pingCount}`);

    worker.postMessage({
      type: 'ping',
      count: pingCount,
      timestamp: Date.now()
    });
  }

  // Handle messages from worker
  worker.on('message', (message) => {
    if (message.type === 'pong') {
      const roundTripTime = Date.now() - message.originalTimestamp;
      console.log(`Main: Received pong ${message.count} (round-trip: ${roundTripTime}ms)`);

      if (pingCount < maxPings) {
        // Send next ping
        setTimeout(sendPing, 500);
      } else {
        // All pings complete, shutdown
        console.log(`\nMain: ${maxPings} exchanges complete, shutting down`);

        worker.postMessage({ type: 'shutdown' });
      }

    } else if (message.type === 'shutdown_ack') {
      console.log('Main: Worker acknowledged shutdown');
      worker.terminate();
    }
  });

  // Handle worker errors
  worker.on('error', (err) => {
    console.error('Main: Worker error:', err);
  });

  // Handle worker exit
  worker.on('exit', (code) => {
    console.log(`Main: Worker exited with code ${code}`);
  });

  // Start the ping-pong
  sendPing();

} else {
  // === WORKER THREAD CODE ===
  console.log('Worker: Ready and listening\n');

  parentPort.on('message', (message) => {
    if (message.type === 'ping') {
      console.log(`Worker: Received ping ${message.count}, sending pong`);

      // Simulate some processing
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }

      // Send pong back
      parentPort.postMessage({
        type: 'pong',
        count: message.count,
        originalTimestamp: message.timestamp,
        processed: sum
      });

    } else if (message.type === 'shutdown') {
      console.log('Worker: Shutdown requested, exiting gracefully');

      // Send acknowledgment
      parentPort.postMessage({ type: 'shutdown_ack' });

      // Exit
      process.exit(0);
    }
  });
}

/**
 * ALTERNATIVE APPROACHES:
 *
 * 1. With timeout protection:
 *    const timeout = setTimeout(() => {
 *      console.error('Worker timeout');
 *      worker.terminate();
 *    }, 5000);
 *
 * 2. With message IDs:
 *    Each message has unique ID for tracking
 *
 * 3. With statistics:
 *    Track min/max/avg round-trip times
 */
