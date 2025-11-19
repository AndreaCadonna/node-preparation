/**
 * Solution 1: Build a Custom Event-Driven Class
 *
 * This solution demonstrates:
 * - Extending EventEmitter properly
 * - Emitting events at appropriate lifecycle points
 * - Handling errors gracefully
 * - Processing async tasks sequentially
 */

const EventEmitter = require('events');

class TaskQueue extends EventEmitter {
  constructor() {
    super(); // MUST call super() before using 'this'
    this.tasks = [];
  }

  addTask(task) {
    // Add task to queue
    this.tasks.push(task);

    // Emit event
    this.emit('task:added', task);
  }

  async processQueue() {
    // Process each task sequentially
    while (this.tasks.length > 0) {
      const task = this.tasks.shift(); // Remove first task

      // Emit processing event
      this.emit('task:processing', task);

      try {
        // Execute the task
        await task.execute();

        // Emit success event
        this.emit('task:completed', task);

      } catch (error) {
        // Emit failure event with error
        this.emit('task:failed', {
          task,
          error
        });

        // Continue processing other tasks
        // (don't let one failure stop the queue)
      }
    }

    // All tasks processed
    this.emit('queue:empty');
  }
}

// Test the TaskQueue
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
 * Key Implementation Details:
 *
 * 1. super() must be called first in constructor
 * 2. Use this.emit() to trigger events
 * 3. try-catch handles task errors without stopping queue
 * 4. async/await enables sequential task processing
 * 5. shift() removes and returns first element
 * 6. Events provide hooks for external monitoring
 * 7. Error event includes both task and error info
 * 8. Queue continues even when tasks fail
 */
