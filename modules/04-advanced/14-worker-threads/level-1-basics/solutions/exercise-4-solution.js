/**
 * Exercise 4 Solution: Error Handling and Recovery
 *
 * This solution demonstrates:
 * - Comprehensive error handling in worker threads
 * - Processing multiple task types with different failure modes
 * - Catching and reporting errors gracefully
 * - Continuing execution after errors (not crashing)
 * - Tracking success/failure statistics
 * - Structured error responses with context
 * - Best practices for robust worker thread applications
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  // === MAIN THREAD CODE ===

  console.log('Exercise 4: Error Handling\n');

  // Define various tasks - some will succeed, some will fail
  const tasks = [
    { id: 1, type: 'divide', a: 10, b: 2 },
    { id: 2, type: 'divide', a: 10, b: 0 },           // Will fail: division by zero
    { id: 3, type: 'parse', data: '{"key":"value"}' },
    { id: 4, type: 'parse', data: '{invalid}' },       // Will fail: invalid JSON
    { id: 5, type: 'process', items: [1, 2, 3] },
    { id: 6, type: 'process', items: 'not-an-array' }  // Will fail: invalid input
  ];

  // Statistics tracking
  const stats = {
    total: tasks.length,
    success: 0,
    errors: 0,
    results: []
  };

  // Create worker
  const worker = new Worker(__filename);

  // Counter to track completed tasks
  let completedTasks = 0;

  // Listen for results from worker
  worker.on('message', (response) => {
    completedTasks++;

    if (response.success) {
      // Task completed successfully
      stats.success++;
      console.log(`✓ Task ${response.id}: ${response.type} - Success`);
      console.log(`  Result: ${JSON.stringify(response.result)}`);
      stats.results.push(response);
    } else {
      // Task failed with error
      stats.errors++;
      console.log(`✗ Task ${response.id}: ${response.type} - Error`);
      console.log(`  Error: ${response.error}`);
      if (response.errorDetails) {
        console.log(`  Details: ${response.errorDetails}`);
      }
      stats.results.push(response);
    }
    console.log(''); // Blank line for readability

    // Check if all tasks are complete
    if (completedTasks === tasks.length) {
      displaySummary();
      worker.postMessage({ type: 'shutdown' });
    }
  });

  // Handle worker-level errors (uncaught exceptions)
  // These are serious errors that couldn't be caught in the worker's try-catch
  worker.on('error', (err) => {
    console.error('CRITICAL: Uncaught worker error:', err.message);
    console.error('This indicates a bug in the worker code');
    displaySummary();
  });

  // Handle worker exit
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker exited with error code ${code}`);
    } else {
      console.log('Worker exited cleanly');
    }
  });

  // Display final summary
  function displaySummary() {
    console.log('=== SUMMARY ===');
    console.log(`Total tasks: ${stats.total}`);
    console.log(`Successful: ${stats.success} (${(stats.success/stats.total*100).toFixed(1)}%)`);
    console.log(`Errors: ${stats.errors} (${(stats.errors/stats.total*100).toFixed(1)}%)`);

    // Group errors by type
    const errorTypes = {};
    stats.results.filter(r => !r.success).forEach(r => {
      errorTypes[r.type] = (errorTypes[r.type] || 0) + 1;
    });

    if (Object.keys(errorTypes).length > 0) {
      console.log('\nErrors by type:');
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
  }

  // Send all tasks to worker
  console.log(`Sending ${tasks.length} tasks to worker...\n`);
  tasks.forEach(task => {
    worker.postMessage(task);
  });

} else {
  // === WORKER THREAD CODE ===

  console.log('Worker: Started and ready to process tasks\n');

  // Listen for tasks from main thread
  parentPort.on('message', async (task) => {
    // Handle shutdown message
    if (task.type === 'shutdown') {
      console.log('Worker: Shutdown requested');
      process.exit(0);
    }

    // Process the task with error handling
    try {
      let result;

      // Route to appropriate handler based on task type
      switch (task.type) {
        case 'divide':
          result = handleDivision(task);
          break;

        case 'parse':
          result = handleParsing(task);
          break;

        case 'process':
          result = handleProcessing(task);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Send success response
      parentPort.postMessage({
        id: task.id,
        type: task.type,
        success: true,
        result
      });

    } catch (error) {
      // Send error response
      // Note: We catch the error and send it as a message
      // This allows the main thread to handle it gracefully
      parentPort.postMessage({
        id: task.id,
        type: task.type,
        success: false,
        error: error.message,
        errorDetails: error.stack.split('\n')[0] // First line of stack trace
      });
    }
  });

  // Task handler functions
  // Each function validates input and throws descriptive errors

  function handleDivision(task) {
    const { a, b } = task;

    // Validate inputs
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new TypeError('Division requires numeric inputs');
    }

    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }

    if (!isFinite(a) || !isFinite(b)) {
      throw new Error('Division requires finite numbers');
    }

    const result = a / b;
    return { operation: `${a} / ${b}`, result };
  }

  function handleParsing(task) {
    const { data } = task;

    // Validate input
    if (typeof data !== 'string') {
      throw new TypeError('Parse requires string input');
    }

    if (data.trim() === '') {
      throw new Error('Cannot parse empty string');
    }

    // Try to parse JSON
    try {
      const parsed = JSON.parse(data);
      return {
        parsed,
        keys: Object.keys(parsed),
        type: Array.isArray(parsed) ? 'array' : typeof parsed
      };
    } catch (parseError) {
      throw new Error(`JSON parsing failed: ${parseError.message}`);
    }
  }

  function handleProcessing(task) {
    const { items } = task;

    // Validate input
    if (!Array.isArray(items)) {
      throw new TypeError('Process requires array input');
    }

    if (items.length === 0) {
      throw new Error('Cannot process empty array');
    }

    // Process the array
    const sum = items.reduce((acc, val) => {
      if (typeof val !== 'number') {
        throw new TypeError(`Array contains non-numeric value: ${val}`);
      }
      return acc + val;
    }, 0);

    return {
      count: items.length,
      sum,
      average: sum / items.length,
      items: items
    };
  }
}

/**
 * KEY CONCEPTS EXPLAINED:
 *
 * 1. Error Handling Strategy:
 *    - Validate inputs before processing
 *    - Use try-catch around task execution
 *    - Send errors as messages (not thrown exceptions)
 *    - Include error context (task id, type, details)
 *    - Worker continues running after errors
 *
 * 2. Types of Errors in Workers:
 *    a) Caught errors (try-catch) → sent as messages
 *    b) Uncaught errors → trigger 'error' event in main thread
 *    c) Syntax errors → worker fails to start
 *    d) System errors → worker crashes
 *
 * 3. Error Response Structure:
 *    - success: boolean flag
 *    - error: human-readable message
 *    - errorDetails: technical details (stack trace, etc.)
 *    - id/type: context to identify failed task
 *
 * 4. Resilience Patterns:
 *    - Worker stays alive despite individual task failures
 *    - Main thread tracks statistics and continues
 *    - Clear separation between recoverable and critical errors
 *    - Graceful degradation rather than complete failure
 *
 * 5. Input Validation:
 *    - Always validate in worker (don't trust inputs)
 *    - Check types, ranges, and constraints
 *    - Provide descriptive error messages
 *    - Fail fast with clear errors
 *
 * ALTERNATIVE APPROACHES:
 *
 * 1. Retry logic for transient failures:
 *    async function processWithRetry(task, maxRetries = 3) {
 *      for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *        try {
 *          return await processTask(task);
 *        } catch (error) {
 *          if (attempt === maxRetries) throw error;
 *          console.log(`Retry ${attempt}/${maxRetries}`);
 *          await sleep(1000 * attempt);
 *        }
 *      }
 *    }
 *
 * 2. Circuit breaker pattern:
 *    class CircuitBreaker {
 *      constructor(threshold = 5) {
 *        this.failures = 0;
 *        this.threshold = threshold;
 *        this.state = 'closed'; // closed, open, half-open
 *      }
 *      async execute(fn) {
 *        if (this.state === 'open') {
 *          throw new Error('Circuit breaker is open');
 *        }
 *        try {
 *          const result = await fn();
 *          this.onSuccess();
 *          return result;
 *        } catch (error) {
 *          this.onFailure();
 *          throw error;
 *        }
 *      }
 *    }
 *
 * 3. Task timeout:
 *    function processWithTimeout(task, timeoutMs = 5000) {
 *      return Promise.race([
 *        processTask(task),
 *        new Promise((_, reject) =>
 *          setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
 *        )
 *      ]);
 *    }
 *
 * 4. Error categorization:
 *    class TaskError extends Error {
 *      constructor(message, category, recoverable = true) {
 *        super(message);
 *        this.category = category; // 'validation', 'computation', 'system'
 *        this.recoverable = recoverable;
 *      }
 *    }
 *
 * 5. Separate error worker:
 *    // Dedicated worker for error logging and analysis
 *    const errorWorker = new Worker('./error-handler.js');
 *    errorWorker.postMessage({ type: 'log-error', error, context });
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Logging: Use proper logging framework (winston, pino)
 * 2. Monitoring: Track error rates, types, and patterns
 * 3. Alerting: Notify on critical error thresholds
 * 4. Dead Letter Queue: Store failed tasks for later retry
 * 5. Error Budget: Define acceptable error rates
 * 6. Graceful Degradation: Partial functionality vs complete failure
 * 7. Error Recovery: Automatic retry, fallback strategies
 * 8. Documentation: Document error codes and handling procedures
 *
 * TESTING STRATEGIES:
 *
 * 1. Test each error condition explicitly
 * 2. Verify error messages are descriptive
 * 3. Ensure worker doesn't crash on errors
 * 4. Test edge cases (null, undefined, empty, invalid types)
 * 5. Verify error statistics are accurate
 * 6. Test concurrent errors (multiple failing tasks)
 * 7. Test recovery after errors
 */
