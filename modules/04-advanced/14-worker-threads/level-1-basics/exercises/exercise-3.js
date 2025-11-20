/**
 * Exercise 3: Ping-Pong Communication
 *
 * TASK:
 * Create a ping-pong message exchange between main thread and worker.
 * Main sends "ping", worker responds "pong", repeat 5 times, then shutdown.
 *
 * REQUIREMENTS:
 * 1. Main thread sends "ping" message
 * 2. Worker receives "ping" and responds with "pong"
 * 3. Main thread receives "pong" and sends next "ping"
 * 4. Repeat 5 times
 * 5. After 5 exchanges, send "shutdown" message
 * 6. Worker gracefully exits
 *
 * BONUS:
 * - Track timing of each exchange
 * - Add message IDs to track sequence
 * - Implement timeout if worker doesn't respond
 *
 * EXPECTED OUTPUT:
 * Main: Sending ping 1
 * Worker: Received ping 1, sending pong
 * Main: Received pong 1
 * Main: Sending ping 2
 * ... (repeat)
 * Main: 5 exchanges complete, shutting down
 * Worker: Shutdown requested, exiting
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  console.log('Exercise 3: Ping-Pong Communication\n');

  // TODO: Implement ping-pong exchange
  // 1. Create worker
  // 2. Send "ping" with count
  // 3. Wait for "pong"
  // 4. Repeat 5 times
  // 5. Send shutdown message
  // 6. Terminate worker

  // Your code here...

} else {
  // TODO: Implement worker logic
  // 1. Listen for messages
  // 2. If "ping", respond with "pong"
  // 3. If "shutdown", exit gracefully

  // Your code here...
}
