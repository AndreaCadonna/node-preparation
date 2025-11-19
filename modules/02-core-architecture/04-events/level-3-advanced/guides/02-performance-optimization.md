# Event Emitter Performance Optimization

Optimizing event-driven systems for high-throughput production applications.

## Table of Contents

1. [Performance Characteristics](#performance-characteristics)
2. [Benchmarking Events](#benchmarking-events)
3. [Optimization Techniques](#optimization-techniques)
4. [Batching and Aggregation](#batching-and-aggregation)
5. [High-Performance Patterns](#high-performance-patterns)
6. [Production Optimization](#production-optimization)

---

## Performance Characteristics

### EventEmitter Overhead

```javascript
const EventEmitter = require('events');

// Baseline: Function call
function directCall(data) { /* process */ }
// Cost: ~1-2ns per call

// Event emission
const emitter = new EventEmitter();
emitter.on('event', (data) => { /* process */ });
emitter.emit('event', data);
// Cost: ~100-500ns per emission

// Overhead: ~50-250x slower than direct call
```

**Why the overhead?**
1. Listener lookup
2. Array iteration
3. Function application
4. Error handling
5. Argument spreading

### Listener Count Impact

```javascript
Listeners | Time per emit | Ops/sec
----------|---------------|----------
0         | ~10ns        | 100M
1         | ~100ns       | 10M
10        | ~500ns       | 2M
100       | ~3μs         | 300K
1000      | ~30μs        | 33K
```

**Takeaway:** Each listener adds overhead. Keep counts reasonable.

---

## Benchmarking Events

### Accurate Benchmarking

```javascript
class EventBenchmark {
  static benchmark(name, setup, test, iterations = 100000) {
    // Setup
    const context = setup();

    // Warmup (JIT optimization)
    for (let i = 0; i < 1000; i++) {
      test(context);
    }

    // Force GC if available
    if (global.gc) global.gc();

    // Actual benchmark
    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      test(context);
    }

    const end = process.hrtime.bigint();
    const totalNs = Number(end - start);
    const avgNs = totalNs / iterations;
    const opsPerSec = Math.floor((iterations / totalNs) * 1e9);

    return {
      name,
      iterations,
      totalMs: (totalNs / 1e6).toFixed(2),
      avgNs: avgNs.toFixed(2),
      avgUs: (avgNs / 1000).toFixed(2),
      opsPerSec: opsPerSec.toLocaleString()
    };
  }
}

// Example usage
const result = EventBenchmark.benchmark(
  'emit with 1 listener',
  () => {
    const emitter = new EventEmitter();
    emitter.on('test', () => {});
    return emitter;
  },
  (emitter) => {
    emitter.emit('test', 'data');
  },
  1000000
);

console.log(result);
// {
//   name: 'emit with 1 listener',
//   iterations: 1000000,
//   totalMs: '245.67',
//   avgNs: '245.67',
//   avgUs: '0.25',
//   opsPerSec: '4,070,500'
// }
```

### Comparison Testing

```javascript
function comparePatterns() {
  const scenarios = [
    {
      name: 'Direct function call',
      setup: () => ({ fn: (x) => x * 2 }),
      test: (ctx) => ctx.fn(42)
    },
    {
      name: 'EventEmitter (1 listener)',
      setup: () => {
        const e = new EventEmitter();
        e.on('calc', (x) => x * 2);
        return e;
      },
      test: (e) => e.emit('calc', 42)
    },
    {
      name: 'EventEmitter (10 listeners)',
      setup: () => {
        const e = new EventEmitter();
        for (let i = 0; i < 10; i++) {
          e.on('calc', (x) => x * 2);
        }
        return e;
      },
      test: (e) => e.emit('calc', 42)
    }
  ];

  const results = scenarios.map(s =>
    EventBenchmark.benchmark(s.name, s.setup, s.test, 1000000)
  );

  console.table(results);
}
```

---

## Optimization Techniques

### 1. Minimize Listener Count

```javascript
// ❌ Inefficient: Many similar listeners
for (let i = 0; i < 100; i++) {
  emitter.on('data', (data) => {
    if (data.userId === i) {
      handleUser(i, data);
    }
  });
}

// ✅ Efficient: Single listener with dispatch
const userHandlers = new Map();

for (let i = 0; i < 100; i++) {
  userHandlers.set(i, (data) => handleUser(i, data));
}

emitter.on('data', (data) => {
  const handler = userHandlers.get(data.userId);
  if (handler) handler(data);
});
```

### 2. Use `once()` for One-Time Events

```javascript
// ❌ Manual removal
const handler = () => {
  console.log('initialized');
  emitter.off('init', handler);
};
emitter.on('init', handler);

// ✅ Automatic removal (faster)
emitter.once('init', () => {
  console.log('initialized');
});
```

### 3. Lazy Event Data Preparation

```javascript
// ❌ Wasteful: Prepare data even if no listeners
function logEvent(type, details) {
  const data = {
    type,
    details,
    timestamp: new Date().toISOString(),
    stack: new Error().stack, // Expensive!
    systemInfo: getSystemInfo() // Expensive!
  };

  emitter.emit('log', data);
}

// ✅ Efficient: Only prepare if listeners exist
function logEvent(type, details) {
  if (emitter.listenerCount('log') === 0) {
    return; // Skip if no one is listening
  }

  const data = {
    type,
    details,
    timestamp: new Date().toISOString(),
    stack: new Error().stack,
    systemInfo: getSystemInfo()
  };

  emitter.emit('log', data);
}
```

### 4. Event Pooling

```javascript
class EventPool {
  constructor(size = 1000) {
    this.pool = Array(size).fill(null).map(() => ({
      type: null,
      data: null,
      timestamp: 0,
      inUse: false
    }));
    this.index = 0;
  }

  acquire(type, data) {
    const event = this.pool[this.index];
    event.type = type;
    event.data = data;
    event.timestamp = Date.now();
    event.inUse = true;

    this.index = (this.index + 1) % this.pool.length;
    return event;
  }

  release(event) {
    event.type = null;
    event.data = null;
    event.inUse = false;
  }
}

// Usage
const pool = new EventPool();

emitter.on('data', (event) => {
  process(event);
  pool.release(event); // Return to pool
});

// Emit using pooled objects
const event = pool.acquire('data', { value: 123 });
emitter.emit('data', event);
```

---

## Batching and Aggregation

### Time-Based Batching

```javascript
class BatchEmitter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.batchWindow = options.batchWindow || 100;
    this.batches = new Map();
  }

  batchEmit(event, data) {
    if (!this.batches.has(event)) {
      this.batches.set(event, []);

      setTimeout(() => {
        const batch = this.batches.get(event);
        this.batches.delete(event);
        this.emit(event, batch);
      }, this.batchWindow);
    }

    this.batches.get(event).push(data);
  }
}

// Reduces 1000 emissions to 1
const batcher = new BatchEmitter({ batchWindow: 100 });

batcher.on('metric', (batch) => {
  // Process 1000 metrics at once
  database.insertMany(batch);
});

for (let i = 0; i < 1000; i++) {
  batcher.batchEmit('metric', { value: i });
}
```

### Size-Based Batching

```javascript
class SmartBatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxSize = options.maxSize || 100;
    this.maxWait = options.maxWait || 1000;
    this.batches = new Map();
  }

  batchEmit(event, data) {
    if (!this.batches.has(event)) {
      this.batches.set(event, {
        items: [],
        timer: setTimeout(() => this.flush(event), this.maxWait)
      });
    }

    const batch = this.batches.get(event);
    batch.items.push(data);

    // Flush if full
    if (batch.items.length >= this.maxSize) {
      clearTimeout(batch.timer);
      this.flush(event);
    }
  }

  flush(event) {
    const batch = this.batches.get(event);
    if (!batch || batch.items.length === 0) return;

    this.emit(event, batch.items);
    this.batches.delete(event);
  }
}
```

---

## High-Performance Patterns

### Pattern 1: Event Filtering at Source

```javascript
// ❌ Inefficient: Emit everything, filter in listeners
emitter.on('user', (user) => {
  if (user.premium) handlePremium(user);
});

emitter.on('user', (user) => {
  if (user.premium) trackPremium(user);
});

// Emit all users (including non-premium)
emitter.emit('user', userData);

// ✅ Efficient: Separate events for filtered data
emitter.on('user:premium', handlePremium);
emitter.on('user:premium', trackPremium);

// Only emit when relevant
if (userData.premium) {
  emitter.emit('user:premium', userData);
}
```

### Pattern 2: Debouncing

```javascript
class DebouncedEmitter extends EventEmitter {
  constructor(wait = 300) {
    super();
    this.wait = wait;
    this.timers = new Map();
  }

  debounceEmit(event, ...args) {
    if (this.timers.has(event)) {
      clearTimeout(this.timers.get(event));
    }

    const timer = setTimeout(() => {
      this.timers.delete(event);
      this.emit(event, ...args);
    }, this.wait);

    this.timers.set(event, timer);
  }
}

// Reduces 100 rapid emissions to 1
const debouncer = new DebouncedEmitter(100);

debouncer.on('search', (query) => {
  performExpensiveSearch(query);
});

// User types "nodejs"
debouncer.debounceEmit('search', 'n');
debouncer.debounceEmit('search', 'no');
debouncer.debounceEmit('search', 'nod');
debouncer.debounceEmit('search', 'node');
debouncer.debounceEmit('search', 'nodejs');
// Only last one actually emits after 100ms
```

### Pattern 3: Throttling

```javascript
class ThrottledEmitter extends EventEmitter {
  constructor(limit = 1000) {
    super();
    this.limit = limit;
    this.lastEmit = new Map();
  }

  throttleEmit(event, ...args) {
    const now = Date.now();
    const last = this.lastEmit.get(event) || 0;

    if (now - last >= this.limit) {
      this.emit(event, ...args);
      this.lastEmit.set(event, now);
    }
  }
}

// Limits to 1 emission per second
const throttler = new ThrottledEmitter(1000);

throttler.on('scroll', (position) => {
  expensiveLayoutRecalc(position);
});

// Even with 100 scroll events/sec, only processes 1/sec
window.addEventListener('scroll', (e) => {
  throttler.throttleEmit('scroll', e.scrollY);
});
```

---

## Production Optimization

### Metrics Collection

```javascript
class InstrumentedEmitter extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.enableMetrics = true;
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
    const m = this.metrics.get(event);
    if (!m) return null;

    return {
      count: m.count,
      avgTimeUs: (Number(m.totalTime / BigInt(m.count)) / 1000).toFixed(2),
      minTimeUs: (Number(m.minTime) / 1000).toFixed(2),
      maxTimeUs: (Number(m.maxTime) / 1000).toFixed(2)
    };
  }
}
```

### Performance Monitoring

```javascript
class PerformanceMonitor {
  constructor(emitter, thresholds = {}) {
    this.emitter = emitter;
    this.slowThreshold = thresholds.slow || 1000000; // 1ms in ns
    this.verySlowThreshold = thresholds.verySlow || 10000000; // 10ms

    this.wrapEmit();
  }

  wrapEmit() {
    const originalEmit = this.emitter.emit.bind(this.emitter);

    this.emitter.emit = (event, ...args) => {
      const start = process.hrtime.bigint();
      const result = originalEmit(event, ...args);
      const duration = Number(process.hrtime.bigint() - start);

      if (duration > this.verySlowThreshold) {
        console.warn(`🐌 VERY SLOW event: ${event} took ${(duration / 1e6).toFixed(2)}ms`);
      } else if (duration > this.slowThreshold) {
        console.warn(`⚠️  Slow event: ${event} took ${(duration / 1e6).toFixed(2)}ms`);
      }

      return result;
    };
  }
}
```

---

## Best Practices

### Performance Checklist

- [ ] Minimize number of listeners
- [ ] Use `once()` for one-time events
- [ ] Batch high-frequency events
- [ ] Debounce/throttle where appropriate
- [ ] Lazy-load expensive event data
- [ ] Pool event objects if needed
- [ ] Monitor performance in production
- [ ] Set up alerts for slow events
- [ ] Profile before optimizing
- [ ] Measure after changes

### When to Optimize

**Optimize when:**
- Events fire > 1000/sec
- Event handlers are slow (>1ms)
- Memory usage is growing
- CPU usage is high
- Latency is user-visible

**Don't optimize when:**
- Events fire < 100/sec
- No performance issues
- Premature optimization
- Code clarity is more important

---

## Summary

**Key Takeaways:**

1. **Event overhead** is ~50-250x slower than direct calls
2. **Each listener adds cost** - keep counts reasonable
3. **Batching** dramatically improves high-frequency events
4. **Lazy evaluation** saves CPU when no listeners
5. **Measure first**, optimize second
6. **Production monitoring** is essential

Remember: EventEmitter is fast enough for most use cases. Optimize only when you have a measured performance problem!
