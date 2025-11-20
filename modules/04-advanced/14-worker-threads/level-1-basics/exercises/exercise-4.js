/**
 * Exercise 4: Error Handling and Recovery
 *
 * TASK:
 * Create a worker that handles multiple types of errors gracefully.
 *
 * REQUIREMENTS:
 * 1. Worker processes different task types
 * 2. Some tasks will fail with errors
 * 3. Worker catches errors and reports them to main thread
 * 4. Main thread handles errors and continues processing
 * 5. Track successful vs failed tasks
 *
 * TASK TYPES:
 * - 'divide': Divide two numbers (may fail with division by zero)
 * - 'parse': Parse JSON (may fail with invalid JSON)
 * - 'process': Process array (may fail with invalid input)
 *
 * BONUS:
 * - Implement retry logic for failed tasks
 * - Add task timeout
 * - Log errors with context
 *
 * EXPECTED OUTPUT:
 * Task 1: divide - Success: 10 / 2 = 5
 * Task 2: divide - Error: Division by zero
 * Task 3: parse - Success: {"key":"value"}
 * Task 4: parse - Error: Unexpected token
 * Summary: 2 success, 2 errors
 */

const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  console.log('Exercise 4: Error Handling\n');

  // TODO: Implement error handling system
  // 1. Create worker
  // 2. Send various tasks (some will fail)
  // 3. Handle both success and error responses
  // 4. Track statistics
  // 5. Display summary

  const tasks = [
    { id: 1, type: 'divide', a: 10, b: 2 },
    { id: 2, type: 'divide', a: 10, b: 0 },    // Will fail
    { id: 3, type: 'parse', data: '{"key":"value"}' },
    { id: 4, type: 'parse', data: '{invalid}' }, // Will fail
    { id: 5, type: 'process', items: [1, 2, 3] }
  ];

  // Your code here...

} else {
  // TODO: Implement worker with error handling
  // 1. Process each task type
  // 2. Catch errors for each operation
  // 3. Send back success or error response
  // 4. Include error details in response

  // Your code here...
}
