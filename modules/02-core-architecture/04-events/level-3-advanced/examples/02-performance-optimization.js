/**
 * Example 2: Performance Optimization
 *
 * This example demonstrates:
 * - Benchmarking event emitters
 * - Performance impact of listener counts
 * - Optimizing high-frequency events
 * - Comparing different patterns
 * - Measuring event overhead
 */

const EventEmitter = require('events');

console.log('=== Event Emitter Performance Optimization ===\n');

// ============================================================================
// Part 1: Benchmarking Event Emitters
// ============================================================================

console.log('--- Part 1: Basic Performance Benchmark ---\n');

class PerformanceBenchmark {
  static benchmark(name, fn, iterations = 100000) {
    // Warm up
    for (let i = 0; i < 1000; i++) fn();

    // Actual benchmark
    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      fn();
    }

    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    const opsPerSecond = Math.floor((iterations / duration) * 1000);

    console.log(`${name}:`);
    console.log(`  Total: ${duration.toFixed(2)}ms`);
    console.log(`  Per operation: ${(duration / iterations * 1000).toFixed(3)}μs`);
    console.log(`  Operations/sec: ${opsPerSecond.toLocaleString()}`);
    console.log();

    return { duration, opsPerSecond };
  }
}

// Test 1: Emit with no listeners
const emptyEmitter = new EventEmitter();
PerformanceBenchmark.benchmark(
  'Emit with NO listeners',
  () => emptyEmitter.emit('test', 'data'),
  100000
);

// Test 2: Emit with 1 listener
const singleEmitter = new EventEmitter();
singleEmitter.on('test', (data) => {});
PerformanceBenchmark.benchmark(
  'Emit with 1 listener',
  () => singleEmitter.emit('test', 'data'),
  100000
);

// Test 3: Emit with 10 listeners
const multiEmitter = new EventEmitter();
for (let i = 0; i < 10; i++) {
  multiEmitter.on('test', (data) => {});
}
PerformanceBenchmark.benchmark(
  'Emit with 10 listeners',
  () => multiEmitter.emit('test', 'data'),
  100000
);

// Test 4: Emit with 100 listeners
const heavyEmitter = new EventEmitter();
heavyEmitter.setMaxListeners(150);
for (let i = 0; i < 100; i++) {
  heavyEmitter.on('test', (data) => {});
}
PerformanceBenchmark.benchmark(
  'Emit with 100 listeners',
  () => heavyEmitter.emit('test', 'data'),
  100000
);

// ============================================================================
// Part 2: High-Performance Event Emitter
// ============================================================================

console.log('--- Part 2: High-Performance Event Emitter ---\n');

class HighPerformanceEmitter extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.enableMetrics = false;
  }

  emit(event, ...args) {
    if (!this.enableMetrics) {
      return super.emit(event, ...args);
    }

    const start = process.hrtime.bigint();
    const result = super.emit(event, ...args);
    const duration = process.hrtime.bigint() - start;

    this.recordMetric(event, duration);
    return result;
  }

  recordMetric(event, duration) {
    if (!this.metrics.has(event)) {
      this.metrics.set(event, {
        count: 0,
        totalTime: 0n,
        minTime: duration,
        maxTime: duration
      });
    }

    const metric = this.metrics.get(event);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = duration < metric.minTime ? duration : metric.minTime;
    metric.maxTime = duration > metric.maxTime ? duration : metric.maxTime;
  }

  getMetrics(event) {
    const metric = this.metrics.get(event);
    if (!metric) return null;

    const avgTime = Number(metric.totalTime / BigInt(metric.count));

    return {
      event: String(event),
      count: metric.count,
      avgTimeNs: avgTime,
      avgTimeUs: (avgTime / 1000).toFixed(3),
      minTimeUs: (Number(metric.minTime) / 1000).toFixed(3),
      maxTimeUs: (Number(metric.maxTime) / 1000).toFixed(3),
      totalTimeMs: (Number(metric.totalTime) / 1000000).toFixed(3)
    };
  }

  getAllMetrics() {
    const results = [];
    this.metrics.forEach((_, event) => {
      results.push(this.getMetrics(event));
    });
    return results.sort((a, b) => b.count - a.count);
  }

  resetMetrics() {
    this.metrics.clear();
  }
}

const perfEmitter = new HighPerformanceEmitter();
perfEmitter.enableMetrics = true;

// Add listeners with varying complexity
perfEmitter.on('fast', () => {});

perfEmitter.on('medium', (data) => {
  const x = data.split('').reverse().join('');
});

perfEmitter.on('slow', (data) => {
  let result = '';
  for (let i = 0; i < 100; i++) {
    result += data;
  }
});

console.log('Running performance tests with metrics...\n');

// Emit events
for (let i = 0; i < 10000; i++) {
  perfEmitter.emit('fast');
  if (i % 10 === 0) perfEmitter.emit('medium', 'test data');
  if (i % 100 === 0) perfEmitter.emit('slow', 'test');
}

console.log('Performance Metrics:');
console.table(perfEmitter.getAllMetrics());

// ============================================================================
// Part 3: Event Pooling for High Frequency
// ============================================================================

console.log('\n--- Part 3: Event Pooling Pattern ---\n');

class EventPool {
  constructor(size = 1000) {
    this.pool = [];
    this.size = size;

    for (let i = 0; i < size; i++) {
      this.pool.push({
        type: null,
        data: null,
        timestamp: 0,
        inUse: false
      });
    }

    this.index = 0;
  }

  acquire(type, data) {
    // Find free event object
    const event = this.pool[this.index];
    event.type = type;
    event.data = data;
    event.timestamp = Date.now();
    event.inUse = true;

    this.index = (this.index + 1) % this.size;
    return event;
  }

  release(event) {
    event.type = null;
    event.data = null;
    event.inUse = false;
  }
}

class PooledEmitter extends EventEmitter {
  constructor() {
    super();
    this.pool = new EventPool();
  }

  emitPooled(event, data) {
    const pooledEvent = this.pool.acquire(event, data);
    this.emit(event, pooledEvent);
    this.pool.release(pooledEvent);
  }
}

// Benchmark comparison
console.log('Comparing pooled vs regular event emission:\n');

const regularEmitter = new EventEmitter();
regularEmitter.on('data', (data) => {});

PerformanceBenchmark.benchmark(
  'Regular emit (creates new object each time)',
  () => regularEmitter.emit('data', { value: 123, timestamp: Date.now() }),
  100000
);

const pooledEmitter = new PooledEmitter();
pooledEmitter.on('data', (event) => {});

PerformanceBenchmark.benchmark(
  'Pooled emit (reuses objects)',
  () => pooledEmitter.emitPooled('data', { value: 123 }),
  100000
);

// ============================================================================
// Part 4: Lazy Listener Invocation
// ============================================================================

console.log('--- Part 4: Lazy Listener Optimization ---\n');

class LazyEmitter extends EventEmitter {
  constructor() {
    super();
    this.lazyEvents = new Set();
  }

  /**
   * Mark an event as lazy - listeners only called if someone is listening
   */
  setLazy(event) {
    this.lazyEvents.add(event);
  }

  emit(event, ...args) {
    // For lazy events, check if anyone is listening first
    if (this.lazyEvents.has(event) && this.listenerCount(event) === 0) {
      return false;
    }

    return super.emit(event, ...args);
  }
}

const lazyEmitter = new LazyEmitter();
lazyEmitter.setLazy('expensive');

console.log('Testing lazy event emission:\n');

function expensiveDataPreparation() {
  // Simulate expensive operation
  let result = '';
  for (let i = 0; i < 1000; i++) {
    result += 'data';
  }
  return result;
}

// Without listeners - should be fast
PerformanceBenchmark.benchmark(
  'Lazy emit with NO listeners (skips preparation)',
  () => {
    const data = lazyEmitter.listenerCount('expensive') > 0
      ? expensiveDataPreparation()
      : null;
    lazyEmitter.emit('expensive', data);
  },
  10000
);

// With listeners - does the work
lazyEmitter.on('expensive', (data) => {});

PerformanceBenchmark.benchmark(
  'Lazy emit with listener (does preparation)',
  () => {
    const data = lazyEmitter.listenerCount('expensive') > 0
      ? expensiveDataPreparation()
      : null;
    lazyEmitter.emit('expensive', data);
  },
  10000
);

// ============================================================================
// Part 5: Async Event Performance
// ============================================================================

console.log('--- Part 5: Async Event Handling ---\n');

class AsyncEmitter extends EventEmitter {
  async emitAsync(event, ...args) {
    const listeners = this.listeners(event);

    // Execute all listeners in parallel
    await Promise.all(
      listeners.map(listener => {
        try {
          return Promise.resolve(listener(...args));
        } catch (error) {
          this.emit('error', error);
        }
      })
    );
  }

  async emitAsyncSerial(event, ...args) {
    const listeners = this.listeners(event);

    // Execute listeners sequentially
    for (const listener of listeners) {
      try {
        await Promise.resolve(listener(...args));
      } catch (error) {
        this.emit('error', error);
      }
    }
  }
}

async function demonstrateAsyncPerformance() {
  const asyncEmitter = new AsyncEmitter();

  // Add async listeners
  asyncEmitter.on('process', async (data) => {
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  asyncEmitter.on('process', async (data) => {
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  asyncEmitter.on('process', async (data) => {
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  console.log('Testing parallel async event handling...');
  let start = Date.now();
  await asyncEmitter.emitAsync('process', 'data');
  console.log(`Parallel execution: ${Date.now() - start}ms (should be ~10ms)\n`);

  console.log('Testing serial async event handling...');
  start = Date.now();
  await asyncEmitter.emitAsyncSerial('process', 'data');
  console.log(`Serial execution: ${Date.now() - start}ms (should be ~30ms)\n`);
}

demonstrateAsyncPerformance().then(() => {
  console.log('='.repeat(60));
  console.log('Performance Optimization Tips:');
  console.log('='.repeat(60));
  console.log('1. Minimize the number of listeners when possible');
  console.log('2. Use once() for one-time handlers');
  console.log('3. Remove listeners when no longer needed');
  console.log('4. Consider event pooling for high-frequency events');
  console.log('5. Use lazy evaluation for expensive data preparation');
  console.log('6. Profile your event-heavy code');
  console.log('7. Consider alternatives for very high-frequency updates');
  console.log('8. Use async parallel execution when handlers are independent');
  console.log('='.repeat(60));
});

/*
 * Key Takeaways:
 *
 * 1. PERFORMANCE CHARACTERISTICS:
 *    - Emitting with no listeners is very fast
 *    - Each listener adds overhead
 *    - 10-100 listeners is usually fine
 *    - 1000+ listeners may need optimization
 *
 * 2. OPTIMIZATION STRATEGIES:
 *    - Event pooling for high-frequency events
 *    - Lazy evaluation of event data
 *    - Remove unused listeners
 *    - Batch events when possible
 *    - Use metrics to identify hotspots
 *
 * 3. ASYNC CONSIDERATIONS:
 *    - Parallel execution for independent handlers
 *    - Serial execution when order matters
 *    - Error handling in async listeners
 *
 * 4. BENCHMARKING:
 *    - Always warm up before measuring
 *    - Use process.hrtime.bigint() for precision
 *    - Run multiple iterations
 *    - Compare alternatives
 *    - Profile in production-like conditions
 */
