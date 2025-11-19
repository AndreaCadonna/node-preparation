/**
 * Exercise 2: Build a High-Performance Event Bus
 *
 * Task:
 * Build a high-performance event bus with the following features:
 *
 * 1. Event batching for high-frequency events
 * 2. Performance metrics (event count, average time)
 * 3. Namespace support
 * 4. Event middleware
 * 5. Benchmarking capability
 *
 * Requirements:
 * - Implement batching for specified events (collect over time window)
 * - Track metrics: emission count, average processing time
 * - Support namespaced events (e.g., 'user:login', 'order:created')
 * - Allow middleware functions to process events before emission
 * - Provide a benchmark() method to test performance
 */

const EventEmitter = require('events');

// YOUR CODE HERE

class HighPerformanceEventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    // Initialize:
    // - Batching configuration (window size, max batch size)
    // - Metrics storage
    // - Middleware chain
    // - Namespace registry
  }

  /**
   * Emit an event with optional batching
   */
  emit(event, ...args) {
    // TODO: Implement
    // 1. Run middleware chain
    // 2. Check if event should be batched
    // 3. Record metrics
    // 4. Emit event
  }

  /**
   * Enable batching for specific events
   */
  enableBatching(event, windowMs = 100) {
    // TODO: Implement
    // Collect events and emit in batches
  }

  /**
   * Add middleware
   */
  use(middleware) {
    // TODO: Implement
    // Add to middleware chain
  }

  /**
   * Get metrics for an event
   */
  getMetrics(event) {
    // TODO: Implement
    // Return: count, avgTime, totalTime
  }

  /**
   * Benchmark event emission
   */
  benchmark(event, iterations = 10000) {
    // TODO: Implement
    // Measure time for N iterations
    // Return ops/second
  }
}

// Test your implementation:

const bus = new HighPerformanceEventBus();

// Add middleware
bus.use((context, next) => {
  // Add timestamp to all events
  context.timestamp = Date.now();
  next();
});

// Enable batching for high-frequency events
bus.enableBatching('data:update', 50);

// Add listeners
bus.on('data:update', (batch) => {
  console.log(`Received batch of ${batch.length} updates`);
});

bus.on('user:login', (user) => {
  console.log(`User logged in: ${user.name}`);
});

// Test batching
console.log('Testing event batching:');
for (let i = 0; i < 10; i++) {
  bus.emit('data:update', { id: i, value: Math.random() });
}

// Test regular events
setTimeout(() => {
  console.log('\nTesting regular events:');
  bus.emit('user:login', { name: 'Alice' });
  bus.emit('user:login', { name: 'Bob' });

  // Show metrics
  setTimeout(() => {
    console.log('\nMetrics:');
    console.log('data:update:', bus.getMetrics('data:update'));
    console.log('user:login:', bus.getMetrics('user:login'));

    // Benchmark
    console.log('\nBenchmarking:');
    const result = bus.benchmark('test:event', 100000);
    console.log(`Performance: ${result} ops/second`);
  }, 100);
}, 100);

/*
 * Expected output:
 * Testing event batching:
 * Received batch of 10 updates
 *
 * Testing regular events:
 * User logged in: Alice
 * User logged in: Bob
 *
 * Metrics:
 * data:update: { count: 1, avgTime: 0.05, totalTime: 0.05 }
 * user:login: { count: 2, avgTime: 0.02, totalTime: 0.04 }
 *
 * Benchmarking:
 * Performance: 500000 ops/second
 */

// After completing, compare with: solutions/exercise-2-solution.js
