/**
 * Exercise 2 Solution: Build a High-Performance Event Bus
 */

const EventEmitter = require('events');

class HighPerformanceEventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.setMaxListeners(Infinity);

    // Batching configuration
    this.batchConfig = new Map();
    this.batches = new Map();

    // Metrics
    this.metrics = new Map();

    // Middleware
    this.middleware = [];

    // Namespaces
    this.namespaces = new Map();
  }

  emit(event, ...args) {
    const start = process.hrtime.bigint();

    // Create context for middleware
    const context = {
      event,
      args,
      timestamp: null,
      cancelled: false
    };

    // Run middleware
    for (const mw of this.middleware) {
      mw(context, () => {});
      if (context.cancelled) {
        return false;
      }
    }

    // Check if event should be batched
    if (this.batchConfig.has(event)) {
      this.addToBatch(event, context.args[0]);
      return true;
    }

    // Emit event
    const result = super.emit(event, ...context.args);

    // Record metrics
    const duration = process.hrtime.bigint() - start;
    this.recordMetric(event, duration);

    return result;
  }

  enableBatching(event, windowMs = 100) {
    this.batchConfig.set(event, { windowMs });
  }

  addToBatch(event, data) {
    if (!this.batches.has(event)) {
      this.batches.set(event, []);

      const config = this.batchConfig.get(event);
      setTimeout(() => {
        const batch = this.batches.get(event);
        this.batches.delete(event);
        super.emit(event, batch);
      }, config.windowMs);
    }

    this.batches.get(event).push(data);
  }

  use(middleware) {
    this.middleware.push(middleware);
  }

  recordMetric(event, duration) {
    if (!this.metrics.has(event)) {
      this.metrics.set(event, {
        count: 0,
        totalTime: 0n
      });
    }

    const metric = this.metrics.get(event);
    metric.count++;
    metric.totalTime += duration;
  }

  getMetrics(event) {
    const metric = this.metrics.get(event);
    if (!metric) {
      return { count: 0, avgTime: 0, totalTime: 0 };
    }

    const avgTime = Number(metric.totalTime / BigInt(metric.count)) / 1000000;
    const totalTime = Number(metric.totalTime) / 1000000;

    return {
      count: metric.count,
      avgTime: avgTime.toFixed(2),
      totalTime: totalTime.toFixed(2)
    };
  }

  benchmark(event, iterations = 10000) {
    const emitter = new EventEmitter();
    emitter.on(event, () => {});

    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      emitter.emit(event, { data: i });
    }

    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;

    return Math.floor((iterations / duration) * 1000);
  }
}

// Test implementation
const bus = new HighPerformanceEventBus();

// Add middleware
bus.use((context, next) => {
  context.timestamp = Date.now();
  next();
});

// Enable batching
bus.enableBatching('data:update', 50);

// Add listeners
bus.on('data:update', (batch) => {
  console.log(`Received batch of ${batch.length} updates`);
});

bus.on('user:login', (user) => {
  console.log(`User logged in: ${user.name}`);
});

console.log('Testing event batching:');
for (let i = 0; i < 10; i++) {
  bus.emit('data:update', { id: i, value: Math.random() });
}

setTimeout(() => {
  console.log('\nTesting regular events:');
  bus.emit('user:login', { name: 'Alice' });
  bus.emit('user:login', { name: 'Bob' });

  setTimeout(() => {
    console.log('\nMetrics:');
    console.log('user:login:', bus.getMetrics('user:login'));

    console.log('\nBenchmarking:');
    const result = bus.benchmark('test:event', 100000);
    console.log(`Performance: ${result.toLocaleString()} ops/second`);
  }, 100);
}, 100);
