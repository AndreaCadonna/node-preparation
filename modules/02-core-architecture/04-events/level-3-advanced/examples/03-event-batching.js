/**
 * Example 3: Event Batching and Aggregation
 *
 * This example demonstrates:
 * - Batching high-frequency events
 * - Debouncing event emissions
 * - Throttling event rates
 * - Aggregating event data
 * - Window-based batching
 */

const EventEmitter = require('events');

console.log('=== Event Batching and Aggregation ===\n');

// ============================================================================
// Part 1: Basic Event Batching
// ============================================================================

console.log('--- Part 1: Basic Event Batching ---\n');

class BatchedEmitter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.batchInterval = options.batchInterval || 100;
    this.batches = new Map();
  }

  /**
   * Emit an event that will be batched
   * Multiple calls within the batch interval will be combined
   */
  batchEmit(event, data) {
    // Initialize batch if not exists
    if (!this.batches.has(event)) {
      this.batches.set(event, []);

      // Schedule batch emission
      setTimeout(() => {
        const batch = this.batches.get(event);
        this.batches.delete(event);

        // Emit the batched event
        this.emit(event, batch);
      }, this.batchInterval);
    }

    // Add data to current batch
    this.batches.get(event).push(data);
  }

  /**
   * Get current batch size for an event
   */
  getBatchSize(event) {
    return this.batches.has(event) ? this.batches.get(event).length : 0;
  }
}

const batchedEmitter = new BatchedEmitter({ batchInterval: 50 });

batchedEmitter.on('data', (batch) => {
  console.log(`Received batch of ${batch.length} items:`, batch);
});

console.log('Emitting 10 individual events rapidly...');

for (let i = 1; i <= 10; i++) {
  batchedEmitter.batchEmit('data', { id: i, value: i * 10 });
}

setTimeout(() => {
  console.log('✅ All events were batched into a single emission\n');
  continuePart2();
}, 100);

// ============================================================================
// Part 2: Debouncing Events
// ============================================================================

function continuePart2() {
  console.log('--- Part 2: Debouncing Events ---\n');

  class DebouncedEmitter extends EventEmitter {
    constructor(options = {}) {
      super();
      this.debounceTime = options.debounceTime || 300;
      this.timers = new Map();
    }

    /**
     * Emit event only after the specified delay with no new emissions
     * Useful for search input, window resize, etc.
     */
    debounceEmit(event, data) {
      // Clear existing timer
      if (this.timers.has(event)) {
        clearTimeout(this.timers.get(event));
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.timers.delete(event);
        this.emit(event, data);
      }, this.debounceTime);

      this.timers.set(event, timer);
    }

    /**
     * Cancel pending debounced event
     */
    cancelDebounce(event) {
      if (this.timers.has(event)) {
        clearTimeout(this.timers.get(event));
        this.timers.delete(event);
      }
    }
  }

  const debouncedEmitter = new DebouncedEmitter({ debounceTime: 100 });

  let emissionCount = 0;
  debouncedEmitter.on('search', (query) => {
    emissionCount++;
    console.log(`Search executed (${emissionCount}): "${query}"`);
  });

  console.log('Simulating rapid search input:');
  console.log('  Typing: "n" -> "no" -> "nod" -> "node" -> "nodejs"');

  const searches = ['n', 'no', 'nod', 'node', 'nodejs'];
  searches.forEach((query, index) => {
    setTimeout(() => {
      console.log(`  User typed: "${query}"`);
      debouncedEmitter.debounceEmit('search', query);
    }, index * 30);
  });

  setTimeout(() => {
    console.log(`\n✅ Only final search was executed (debounced ${searches.length - 1} intermediate searches)\n`);
    continuePart3();
  }, 500);
}

// ============================================================================
// Part 3: Throttling Events
// ============================================================================

function continuePart3() {
  console.log('--- Part 3: Throttling Events ---\n');

  class ThrottledEmitter extends EventEmitter {
    constructor(options = {}) {
      super();
      this.throttleTime = options.throttleTime || 1000;
      this.lastEmitTime = new Map();
      this.pendingEmits = new Map();
    }

    /**
     * Emit event at most once per throttle period
     * First call emits immediately, subsequent calls are throttled
     */
    throttleEmit(event, data) {
      const now = Date.now();
      const lastEmit = this.lastEmitTime.get(event) || 0;
      const timeSinceLastEmit = now - lastEmit;

      if (timeSinceLastEmit >= this.throttleTime) {
        // Emit immediately
        this.emit(event, data);
        this.lastEmitTime.set(event, now);

        // Clear any pending emit
        if (this.pendingEmits.has(event)) {
          clearTimeout(this.pendingEmits.get(event));
          this.pendingEmits.delete(event);
        }
      } else {
        // Schedule emit for later (with latest data)
        if (this.pendingEmits.has(event)) {
          clearTimeout(this.pendingEmits.get(event));
        }

        const delay = this.throttleTime - timeSinceLastEmit;
        const timer = setTimeout(() => {
          this.emit(event, data);
          this.lastEmitTime.set(event, Date.now());
          this.pendingEmits.delete(event);
        }, delay);

        this.pendingEmits.set(event, timer);
      }
    }
  }

  const throttledEmitter = new ThrottledEmitter({ throttleTime: 100 });

  let scrollCount = 0;
  throttledEmitter.on('scroll', (position) => {
    scrollCount++;
    console.log(`Scroll handler called (${scrollCount}): position ${position}`);
  });

  console.log('Simulating rapid scroll events (20 events in 50ms):');

  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      throttledEmitter.throttleEmit('scroll', i * 10);
    }, i * 2.5);
  }

  setTimeout(() => {
    console.log(`\n✅ Throttled 20 events down to ~2-3 handler calls\n`);
    continuePart4();
  }, 300);
}

// ============================================================================
// Part 4: Window-Based Aggregation
// ============================================================================

function continuePart4() {
  console.log('--- Part 4: Window-Based Event Aggregation ---\n');

  class WindowAggregator extends EventEmitter {
    constructor(options = {}) {
      super();
      this.windowSize = options.windowSize || 1000;
      this.windows = new Map();
    }

    /**
     * Aggregate events in time windows with custom aggregation function
     */
    aggregateEmit(event, data, aggregateFn) {
      if (!this.windows.has(event)) {
        this.windows.set(event, {
          data: [],
          timer: null
        });

        const window = this.windows.get(event);
        window.timer = setTimeout(() => {
          const aggregated = aggregateFn(window.data);
          this.emit(event, aggregated);
          this.windows.delete(event);
        }, this.windowSize);
      }

      this.windows.get(event).data.push(data);
    }
  }

  const aggregator = new WindowAggregator({ windowSize: 100 });

  // Example 1: Aggregate numeric values
  aggregator.on('metrics', (stats) => {
    console.log('Aggregated Metrics:');
    console.log(`  Count: ${stats.count}`);
    console.log(`  Sum: ${stats.sum}`);
    console.log(`  Average: ${stats.avg.toFixed(2)}`);
    console.log(`  Min: ${stats.min}`);
    console.log(`  Max: ${stats.max}`);
  });

  console.log('Sending 50 metric values...\n');

  for (let i = 0; i < 50; i++) {
    const value = Math.floor(Math.random() * 100);
    aggregator.aggregateEmit('metrics', value, (values) => {
      return {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });
  }

  setTimeout(() => {
    console.log('\n✅ 50 individual values aggregated into summary statistics\n');
    continuePart5();
  }, 150);
}

// ============================================================================
// Part 5: Advanced Batching with Size and Time Limits
// ============================================================================

function continuePart5() {
  console.log('--- Part 5: Smart Batching (Size + Time Limits) ---\n');

  class SmartBatcher extends EventEmitter {
    constructor(options = {}) {
      super();
      this.maxBatchSize = options.maxBatchSize || 100;
      this.maxBatchTime = options.maxBatchTime || 1000;
      this.batches = new Map();
    }

    batchEmit(event, data) {
      if (!this.batches.has(event)) {
        this.batches.set(event, {
          items: [],
          timer: this.createTimer(event)
        });
      }

      const batch = this.batches.get(event);
      batch.items.push(data);

      // Flush if batch is full
      if (batch.items.length >= this.maxBatchSize) {
        this.flush(event);
      }
    }

    createTimer(event) {
      return setTimeout(() => {
        this.flush(event);
      }, this.maxBatchTime);
    }

    flush(event) {
      const batch = this.batches.get(event);
      if (!batch || batch.items.length === 0) return;

      // Clear timer
      clearTimeout(batch.timer);

      // Emit batch
      this.emit(event, {
        items: batch.items,
        count: batch.items.length,
        flushedAt: Date.now()
      });

      // Clean up
      this.batches.delete(event);
    }

    /**
     * Manually flush all pending batches
     */
    flushAll() {
      const events = Array.from(this.batches.keys());
      events.forEach(event => this.flush(event));
    }
  }

  const smartBatcher = new SmartBatcher({
    maxBatchSize: 10,
    maxBatchTime: 200
  });

  smartBatcher.on('logs', (batch) => {
    console.log(`📦 Batch received: ${batch.count} items`);
    console.log(`   First item: ${JSON.stringify(batch.items[0])}`);
    console.log(`   Last item: ${JSON.stringify(batch.items[batch.items.length - 1])}`);
  });

  console.log('Sending logs with smart batching:');
  console.log('(Flushes when batch reaches 10 items OR after 200ms)\n');

  // Send 25 logs rapidly (will create 3 batches)
  for (let i = 1; i <= 25; i++) {
    smartBatcher.batchEmit('logs', {
      level: 'info',
      message: `Log entry ${i}`,
      timestamp: Date.now()
    });
  }

  setTimeout(() => {
    console.log('\n📊 Batching Summary:');
    console.log('   - First 10 items: Flushed immediately (size limit)');
    console.log('   - Second 10 items: Flushed immediately (size limit)');
    console.log('   - Last 5 items: Flushed after timeout (time limit)');

    console.log('\n' + '='.repeat(60));
    console.log('Event Batching Patterns Summary:');
    console.log('='.repeat(60));
    console.log('1. Basic Batching: Collect events over time window');
    console.log('2. Debouncing: Only emit after activity stops');
    console.log('3. Throttling: Limit emission rate');
    console.log('4. Window Aggregation: Combine data with custom logic');
    console.log('5. Smart Batching: Combine size and time constraints');
    console.log('='.repeat(60));
  }, 300);
}

/*
 * Key Takeaways:
 *
 * 1. BATCHING BENEFITS:
 *    - Reduces event handler invocations
 *    - Improves performance for high-frequency events
 *    - Enables bulk processing
 *    - Reduces network/database calls
 *
 * 2. WHEN TO USE EACH PATTERN:
 *    - Batching: Database writes, API calls, log aggregation
 *    - Debouncing: Search input, form validation, window resize
 *    - Throttling: Scroll handlers, mouse move, progress updates
 *    - Aggregation: Metrics collection, analytics, monitoring
 *
 * 3. TRADE-OFFS:
 *    - Adds latency (events not processed immediately)
 *    - More complex error handling
 *    - Need to handle shutdown (flush pending batches)
 *    - Memory overhead for buffering
 *
 * 4. PRODUCTION CONSIDERATIONS:
 *    - Choose appropriate batch sizes and intervals
 *    - Implement graceful shutdown (flush on exit)
 *    - Monitor batch efficiency
 *    - Handle errors in batch processing
 *    - Consider max memory for batches
 */
