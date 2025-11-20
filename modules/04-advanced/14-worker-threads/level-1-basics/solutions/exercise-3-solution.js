/**
 * Exercise 3 Solution: Ping-Pong Communication
 *
 * This solution demonstrates:
 * - Bidirectional communication between main and worker threads
 * - State management across multiple message exchanges
 * - Graceful shutdown with custom messages
 * - Message sequencing and tracking
 * - Timing measurements for performance analysis
 * - Coordinated message exchange patterns
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  // === MAIN THREAD CODE ===

  console.log('Exercise 3: Ping-Pong Communication\n');

  // State management: track number of exchanges
  let exchangeCount = 0;
  const maxExchanges = 5;

  // BONUS: Track timing for each exchange
  const timings = [];
  let pingStartTime;

  // Create worker
  const worker = new Worker(__filename);

  // Listen for messages from worker
  worker.on('message', (message) => {
    const { type, count, timestamp } = message;

    if (type === 'pong') {
      // Calculate round-trip time
      const roundTripTime = Date.now() - pingStartTime;
      timings.push(roundTripTime);

      console.log(`Main: Received pong ${count} (round-trip: ${roundTripTime}ms)`);

      // Check if we've completed all exchanges
      if (count >= maxExchanges) {
        console.log(`\nMain: ${maxExchanges} exchanges complete, shutting down`);

        // Display timing statistics
        const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
        console.log(`\nTiming Statistics:`);
        console.log(`  Total exchanges: ${timings.length}`);
        console.log(`  Average round-trip: ${avgTime.toFixed(2)}ms`);
        console.log(`  Min: ${Math.min(...timings)}ms`);
        console.log(`  Max: ${Math.max(...timings)}ms`);

        // Send shutdown message to worker
        worker.postMessage({ type: 'shutdown' });

        // Note: Worker will exit gracefully, then 'exit' event fires
      } else {
        // Send next ping
        sendPing(count + 1);
      }
    } else if (type === 'shutdown-ack') {
      console.log('Main: Worker acknowledged shutdown');
    }
  });

  // Function to send ping message
  function sendPing(count) {
    console.log(`Main: Sending ping ${count}`);
    pingStartTime = Date.now(); // BONUS: Track when ping was sent
    worker.postMessage({
      type: 'ping',
      count,
      timestamp: Date.now()
    });
  }

  // Handle errors
  worker.on('error', (err) => {
    console.error('Main: Worker error:', err.message);
  });

  // Handle exit
  worker.on('exit', (code) => {
    console.log(`Main: Worker exited with code ${code}`);
  });

  // Start the ping-pong exchange
  sendPing(1);

} else {
  // === WORKER THREAD CODE ===

  console.log('Worker: Started and ready');

  // Listen for messages from main thread
  parentPort.on('message', (message) => {
    const { type, count, timestamp } = message;

    if (type === 'ping') {
      // Received ping, respond with pong
      console.log(`Worker: Received ping ${count}, sending pong`);

      // BONUS: Calculate message latency
      const latency = Date.now() - timestamp;
      if (latency > 0) {
        console.log(`Worker: Message latency: ${latency}ms`);
      }

      // Send pong response
      parentPort.postMessage({
        type: 'pong',
        count,
        timestamp: Date.now()
      });

    } else if (type === 'shutdown') {
      // Graceful shutdown requested
      console.log('Worker: Shutdown requested, exiting gracefully');

      // Acknowledge shutdown
      parentPort.postMessage({ type: 'shutdown-ack' });

      // Exit cleanly
      process.exit(0);
    }
  });

  // BONUS: Implement timeout detection
  // If no message received for 5 seconds, worker could log a warning
  let lastMessageTime = Date.now();
  const timeoutCheck = setInterval(() => {
    const timeSinceLastMessage = Date.now() - lastMessageTime;
    if (timeSinceLastMessage > 5000) {
      console.log('Worker: Warning - No message received for 5 seconds');
      clearInterval(timeoutCheck);
    }
  }, 1000);

  // Update lastMessageTime when messages arrive
  parentPort.on('message', () => {
    lastMessageTime = Date.now();
  });
}

/**
 * KEY CONCEPTS EXPLAINED:
 *
 * 1. Bidirectional Communication:
 *    - Both main and worker can send/receive messages
 *    - Messages can trigger responses, creating a dialogue
 *    - Important for interactive or long-running tasks
 *
 * 2. Message Structure:
 *    - Using objects with 'type' field helps distinguish message purposes
 *    - Include metadata like count, timestamp, id for tracking
 *    - Makes code more maintainable and debuggable
 *
 * 3. State Management:
 *    - Main thread tracks exchange count
 *    - Each message includes count to maintain synchronization
 *    - Important when messages might arrive out of order (in complex scenarios)
 *
 * 4. Graceful Shutdown:
 *    - Don't just call worker.terminate() - it's abrupt
 *    - Send shutdown message, let worker clean up, then exit
 *    - Worker can finish critical tasks before exiting
 *
 * 5. Coordination Patterns:
 *    - Request-Response: Main sends ping, waits for pong
 *    - State Machine: Each pong triggers next ping
 *    - Termination: Shutdown signal breaks the cycle
 *
 * ALTERNATIVE APPROACHES:
 *
 * 1. Timeout handling in main thread:
 *    const timeout = setTimeout(() => {
 *      console.log('Main: Worker timeout, terminating');
 *      worker.terminate();
 *    }, 5000);
 *
 *    worker.on('message', (msg) => {
 *      clearTimeout(timeout);
 *      // ... handle message
 *      // Set new timeout for next message
 *    });
 *
 * 2. Promise-based ping-pong:
 *    function ping(count) {
 *      return new Promise((resolve) => {
 *        worker.once('message', (msg) => {
 *          if (msg.type === 'pong') resolve(msg);
 *        });
 *        worker.postMessage({ type: 'ping', count });
 *      });
 *    }
 *
 *    async function runExchange() {
 *      for (let i = 1; i <= 5; i++) {
 *        await ping(i);
 *      }
 *    }
 *
 * 3. Worker pool pattern:
 *    // Keep worker alive for multiple ping-pong sessions
 *    worker.postMessage({ type: 'start-session', exchanges: 5 });
 *    // Worker manages entire session internally
 *
 * 4. Event-driven with EventEmitter:
 *    class PingPongWorker extends EventEmitter {
 *      constructor() {
 *        this.worker = new Worker(__filename);
 *        this.worker.on('message', msg => this.emit(msg.type, msg));
 *      }
 *      ping(count) {
 *        this.worker.postMessage({ type: 'ping', count });
 *      }
 *    }
 *
 * USE CASES FOR THIS PATTERN:
 *
 * - Real-time progress updates from long-running tasks
 * - Interactive computation where main thread provides input based on results
 * - Monitoring and health checks for worker threads
 * - Iterative algorithms that need coordination between threads
 * - Training loops in ML where main thread evaluates and worker computes
 *
 * COMMON PITFALLS:
 *
 * 1. Not handling all message types - causes silent failures
 * 2. Forgetting to send shutdown signal - worker runs forever
 * 3. Race conditions if not tracking message sequence
 * 4. Not implementing timeouts - can hang if worker fails
 * 5. Blocking worker with console.log - can slow down exchange
 */
