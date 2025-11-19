/**
 * Exercise 1: Build a Custom Event-Driven Class
 *
 * Task:
 * Create a TaskQueue class that extends EventEmitter to manage asynchronous tasks.
 * The queue should emit events at key lifecycle points and handle errors properly.
 *
 * Requirements:
 * 1. Create a TaskQueue class that extends EventEmitter
 * 2. Implement addTask(task) method that:
 *    - Adds a task to the queue
 *    - Emits 'task:added' event with task info
 * 3. Implement processQueue() method that:
 *    - Processes tasks one by one
 *    - Emits 'task:processing' when starting a task
 *    - Emits 'task:completed' when a task finishes successfully
 *    - Emits 'task:failed' if a task throws an error
 *    - Emits 'queue:empty' when all tasks are done
 * 4. Handle errors gracefully - don't let one failed task stop the queue
 * 5. Emit an 'error' event for unexpected errors
 *
 * Hints:
 * - Don't forget to call super() in the constructor
 * - Use try-catch for error handling
 * - Tasks can be async functions
 * - Process tasks sequentially using async/await
 */

const EventEmitter = require('events');

// YOUR CODE HERE
// Create the TaskQueue class

class TaskQueue {
  // TODO: Extend EventEmitter

  constructor() {
    // TODO: Call super()
    // TODO: Initialize tasks array
  }

  addTask(task) {
    // TODO: Add task to queue
    // TODO: Emit 'task:added' event
  }

  async processQueue() {
    // TODO: Process each task in the queue
    // TODO: Emit events at appropriate points
    // TODO: Handle errors properly
  }
}


// Test your TaskQueue
const queue = new TaskQueue();

// Set up event listeners
queue.on('task:added', (task) => {
  console.log('[Event] Task added:', task.name);
});

queue.on('task:processing', (task) => {
  console.log('[Event] Processing:', task.name);
});

queue.on('task:completed', (task) => {
  console.log('[Event] Completed:', task.name);
});

queue.on('task:failed', ({ task, error }) => {
  console.log('[Event] Failed:', task.name, '-', error.message);
});

queue.on('queue:empty', () => {
  console.log('[Event] Queue is empty!');
});

queue.on('error', (error) => {
  console.error('[Error]:', error.message);
});

// Add some tasks
queue.addTask({
  name: 'Task 1',
  execute: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('  -> Task 1 executed');
  }
});

queue.addTask({
  name: 'Task 2 (will fail)',
  execute: async () => {
    throw new Error('Task 2 failed!');
  }
});

queue.addTask({
  name: 'Task 3',
  execute: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('  -> Task 3 executed');
  }
});

// Process the queue
queue.processQueue();

/*
 * Expected output:
 * [Event] Task added: Task 1
 * [Event] Task added: Task 2 (will fail)
 * [Event] Task added: Task 3
 * [Event] Processing: Task 1
 *   -> Task 1 executed
 * [Event] Completed: Task 1
 * [Event] Processing: Task 2 (will fail)
 * [Event] Failed: Task 2 (will fail) - Task 2 failed!
 * [Event] Processing: Task 3
 *   -> Task 3 executed
 * [Event] Completed: Task 3
 * [Event] Queue is empty!
 */

// After completing, compare with: solutions/exercise-1-solution.js
