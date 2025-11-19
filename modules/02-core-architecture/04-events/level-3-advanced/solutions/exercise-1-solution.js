/**
 * Exercise 1 Solution: Detect and Fix Memory Leaks
 */

const EventEmitter = require('events');

// Simulated task scheduler
const taskScheduler = new EventEmitter();

// Worker class with proper cleanup
class Worker {
  constructor(id, scheduler) {
    this.id = id;
    this.scheduler = scheduler;
    this.isActive = true;

    // Store handler reference for cleanup
    this.taskHandler = this.handleTask.bind(this);

    // Register event listener
    this.scheduler.on('task:assigned', this.taskHandler);

    console.log(`Created worker ${this.id}`);
  }

  handleTask(task) {
    if (this.isActive) {
      console.log(`Worker ${this.id} processing task: ${task.name}`);
    }
  }

  destroy() {
    console.log(`Worker ${this.id} destroyed`);

    // Remove event listener
    this.scheduler.off('task:assigned', this.taskHandler);

    // Clean up references
    this.isActive = false;
    this.taskHandler = null;
  }
}

// Leak Detector
class LeakDetector {
  constructor(emitter, options = {}) {
    this.emitter = emitter;
    this.threshold = options.threshold || 10;
    this.checkInterval = options.checkInterval || 1000;
  }

  startMonitoring() {
    this.monitorTimer = setInterval(() => {
      this.checkForLeaks();
    }, this.checkInterval);

    console.log('Leak detector started');
  }

  checkForLeaks() {
    const eventNames = this.emitter.eventNames();

    eventNames.forEach(event => {
      const count = this.emitter.listenerCount(event);

      if (count > this.threshold) {
        console.warn(`⚠️  WARNING: Potential leak detected!`);
        console.warn(`   Event "${event}" has ${count} listeners (threshold: ${this.threshold})`);
      }
    });
  }

  getStats() {
    const stats = {};
    this.emitter.eventNames().forEach(event => {
      stats[String(event)] = this.emitter.listenerCount(event);
    });
    return stats;
  }

  stopMonitoring() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      console.log('Leak detector stopped');
    }
  }
}

// Test implementation
console.log('=== Memory Leak Detection and Fix ===\n');

const detector = new LeakDetector(taskScheduler, { threshold: 5 });
detector.startMonitoring();

console.log('Creating 10 workers:\n');

const workers = [];
for (let i = 1; i <= 10; i++) {
  workers.push(new Worker(i, taskScheduler));
}

console.log(`\nListener count: ${taskScheduler.listenerCount('task:assigned')}`);

// Wait for leak detection
setTimeout(() => {
  console.log('\nDestroying all workers...\n');

  workers.forEach(worker => worker.destroy());

  console.log(`\nListener count after cleanup: ${taskScheduler.listenerCount('task:assigned')}`);

  if (taskScheduler.listenerCount('task:assigned') === 0) {
    console.log('✅ No memory leaks detected!');
  } else {
    console.warn('⚠️  Memory leak: listeners still registered');
  }

  detector.stopMonitoring();
}, 1500);

/*
 * Output:
 * Leak detector started
 * Creating 10 workers:
 *
 * Created worker 1
 * Created worker 2
 * ...
 * Created worker 10
 *
 * Listener count: 10
 * ⚠️  WARNING: Potential leak detected!
 *    Event "task:assigned" has 10 listeners (threshold: 5)
 *
 * Destroying all workers...
 *
 * Worker 1 destroyed
 * Worker 2 destroyed
 * ...
 * Worker 10 destroyed
 *
 * Listener count after cleanup: 0
 * ✅ No memory leaks detected!
 * Leak detector stopped
 */
