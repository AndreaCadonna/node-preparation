/**
 * Exercise 1 Solution: Hello Worker
 *
 * This solution demonstrates:
 * - Creating a worker thread using workerData to pass initial data
 * - Worker thread sending messages back to the main thread
 * - Handling messages in the main thread
 * - Proper worker lifecycle management (creation, communication, termination)
 * - Basic error handling for worker threads
 * - Using isMainThread to distinguish between main and worker code
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // === MAIN THREAD CODE ===
  // This code runs in the main Node.js process

  console.log('Exercise 1: Hello Worker\n');

  // The name we want to send to the worker
  const name = 'Alice';
  console.log(`Creating worker with name: ${name}`);

  // Create a new worker thread
  // - __filename makes the worker run THIS file, but the worker executes the else block
  // - workerData is how we pass initial data to the worker (one-time, at creation)
  const worker = new Worker(__filename, {
    workerData: { name }  // Pass name to worker
  });

  // Listen for messages from the worker
  // Workers communicate via postMessage() which triggers 'message' events
  worker.on('message', (greeting) => {
    console.log(`Main: ${greeting}`);
    console.log('Main: Worker greeted successfully');

    // Good practice: terminate the worker when we're done
    // This frees up system resources
    worker.terminate();
  });

  // Handle any errors that occur in the worker
  // Without this, worker errors can crash your application
  worker.on('error', (err) => {
    console.error('Main: Worker error occurred:', err.message);
  });

  // Listen for when the worker exits
  // Code 0 means successful exit, non-zero indicates an error
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Main: Worker stopped with exit code ${code}`);
    } else {
      console.log('Main: Worker exited cleanly');
    }
  });

} else {
  // === WORKER THREAD CODE ===
  // This code runs in the worker thread (separate from main process)

  // Access the data passed via workerData
  // Use optional chaining (?.) and default value in case name isn't provided
  const name = workerData?.name || 'Guest';

  // Add timestamp for the bonus requirement
  const timestamp = new Date().toISOString();

  // Create a personalized greeting
  const greeting = `Hello, ${name}! Nice to meet you. [${timestamp}]`;

  // Log from worker (this helps debug and see worker activity)
  console.log(`Worker: ${greeting}`);

  // Send the greeting back to the main thread
  // parentPort.postMessage() sends data to the main thread
  parentPort.postMessage(greeting);

  // Note: Worker will continue running until terminated by main thread
  // or until it exits naturally (no more code to execute)
}

/**
 * KEY CONCEPTS EXPLAINED:
 *
 * 1. Worker Threads vs Main Thread:
 *    - Main thread: The primary Node.js process
 *    - Worker thread: A separate thread that runs in parallel
 *    - They have separate memory spaces and communicate via messages
 *
 * 2. workerData:
 *    - Used to pass initial data when creating a worker
 *    - One-time transfer at worker creation
 *    - Good for configuration or initial parameters
 *
 * 3. postMessage and 'message' events:
 *    - Used for ongoing communication
 *    - Can send messages multiple times
 *    - Messages are serialized (must be JSON-serializable)
 *
 * 4. Worker Lifecycle:
 *    - Created with new Worker()
 *    - Runs until code completes or worker.terminate() is called
 *    - Triggers 'exit' event when done
 *
 * 5. Why use Worker Threads?
 *    - Run CPU-intensive tasks without blocking the main thread
 *    - Keep your application responsive
 *    - Utilize multiple CPU cores
 *
 * ALTERNATIVE APPROACHES:
 *
 * 1. Send structured data instead of string:
 *    parentPort.postMessage({
 *      type: 'greeting',
 *      message: greeting,
 *      timestamp: Date.now(),
 *      workerId: workerData.workerId
 *    });
 *
 * 2. Validate input in worker:
 *    if (!workerData || !workerData.name) {
 *      throw new Error('Name is required in workerData');
 *    }
 *
 * 3. Keep worker alive for multiple greetings:
 *    parentPort.on('message', (name) => {
 *      const greeting = `Hello, ${name}!`;
 *      parentPort.postMessage(greeting);
 *    });
 *
 * 4. Graceful shutdown:
 *    parentPort.on('message', (msg) => {
 *      if (msg === 'shutdown') {
 *        process.exit(0);
 *      }
 *    });
 */
