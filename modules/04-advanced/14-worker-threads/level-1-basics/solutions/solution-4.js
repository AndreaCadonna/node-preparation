/**
 * Solution 4: Error Handling and Recovery
 *
 * This solution demonstrates:
 * - Comprehensive error handling in workers
 * - Structured error reporting
 * - Continuing execution after errors
 * - Error statistics tracking
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  console.log('Exercise 4 Solution: Error Handling\n');

  const worker = new Worker(__filename);

  const tasks = [
    { id: 1, type: 'divide', a: 10, b: 2 },
    { id: 2, type: 'divide', a: 10, b: 0 },           // Division by zero
    { id: 3, type: 'parse', data: '{"key":"value"}' },
    { id: 4, type: 'parse', data: '{invalid json}' }, // Invalid JSON
    { id: 5, type: 'process', items: [1, 2, 3] },
    { id: 6, type: 'process', items: 'not-an-array' } // Invalid input
  ];

  let completed = 0;
  let successCount = 0;
  let errorCount = 0;

  // Handle responses from worker
  worker.on('message', (response) => {
    completed++;

    if (response.success) {
      successCount++;
      console.log(`✓ Task ${response.taskId} (${response.type}): Success`);
      console.log(`  Result: ${JSON.stringify(response.result)}`);
    } else {
      errorCount++;
      console.log(`✗ Task ${response.taskId} (${response.type}): Error`);
      console.log(`  Error: ${response.error}`);
    }

    console.log('');

    // When all tasks complete
    if (completed === tasks.length) {
      console.log('=== Summary ===');
      console.log(`Total tasks: ${tasks.length}`);
      console.log(`Successful: ${successCount}`);
      console.log(`Errors: ${errorCount}`);
      console.log(`Success rate: ${((successCount / tasks.length) * 100).toFixed(1)}%`);

      worker.terminate();
    }
  });

  // Handle worker-level errors
  worker.on('error', (err) => {
    console.error('Fatal worker error:', err);
  });

  // Send all tasks to worker
  tasks.forEach(task => {
    worker.postMessage(task);
  });

} else {
  // === WORKER THREAD CODE ===

  parentPort.on('message', (task) => {
    const response = {
      taskId: task.id,
      type: task.type,
      success: false,
      result: null,
      error: null
    };

    try {
      switch (task.type) {
        case 'divide':
          // Validate inputs
          if (task.b === 0) {
            throw new Error('Division by zero is not allowed');
          }

          response.result = task.a / task.b;
          response.success = true;
          break;

        case 'parse':
          // Parse JSON (will throw on invalid JSON)
          response.result = JSON.parse(task.data);
          response.success = true;
          break;

        case 'process':
          // Process array
          if (!Array.isArray(task.items)) {
            throw new Error('Items must be an array');
          }

          response.result = {
            count: task.items.length,
            sum: task.items.reduce((acc, val) => acc + val, 0),
            avg: task.items.reduce((acc, val) => acc + val, 0) / task.items.length
          };
          response.success = true;
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

    } catch (err) {
      // Catch any errors and report them
      response.success = false;
      response.error = err.message;
    }

    // Send response back to main thread
    parentPort.postMessage(response);
  });
}

/**
 * KEY POINTS:
 *
 * 1. Always use try-catch in workers
 * 2. Send structured responses (success/error)
 * 3. Include error details for debugging
 * 4. Continue processing after errors
 * 5. Track statistics
 *
 * BONUS FEATURES:
 *
 * 1. Retry logic:
 *    if (!response.success && task.retries < 3) {
 *      task.retries++;
 *      setTimeout(() => worker.postMessage(task), 1000);
 *    }
 *
 * 2. Task timeout:
 *    const timeout = setTimeout(() => {
 *      response.error = 'Task timeout';
 *      parentPort.postMessage(response);
 *    }, 5000);
 */
