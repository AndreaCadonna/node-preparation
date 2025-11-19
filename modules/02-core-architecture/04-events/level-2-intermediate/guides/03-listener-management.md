# Listener Lifecycle Management

A comprehensive guide to managing event listeners, preventing memory leaks, and optimizing performance in event-driven applications.

## Table of Contents

1. [Why Listener Management Matters](#why-listener-management-matters)
2. [The Memory Leak Problem](#the-memory-leak-problem)
3. [Maximum Listeners Configuration](#maximum-listeners-configuration)
4. [Listener Cleanup Patterns](#listener-cleanup-patterns)
5. [Tracking Listeners](#tracking-listeners)
6. [Performance Implications](#performance-implications)
7. [Production Monitoring](#production-monitoring)

---

## Why Listener Management Matters

### The Problem

In long-running Node.js applications, poor listener management causes:

**1. Memory Leaks**
- Listeners hold references to functions and closures
- Unused listeners prevent garbage collection
- Memory grows unbounded over time

**2. Performance Degradation**
- More listeners = slower event emission
- Linear time complexity: O(n) where n = listener count
- Can significantly impact hot paths

**3. Unexpected Behavior**
- Old listeners continue executing
- Duplicate listeners process events multiple times
- Hard-to-debug issues in production

### The Solution

Proper listener lifecycle management:
- Add listeners consciously
- Track ownership
- Clean up when done
- Monitor counts
- Set appropriate limits

---

## The Memory Leak Problem

### Common Leak Scenario

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// ❌ MEMORY LEAK!
setInterval(() => {
  // Creates a new listener every second
  emitter.on('data', () => {
    console.log('Processing data');
  });
}, 1000);

// After 1 hour: 3,600 listeners!
// After 1 day: 86,400 listeners!
// Eventually: Out of memory!
```

### Why This Leaks

```javascript
// Each call to .on() adds to internal array
emitter.on('data', handler); // listeners: [handler]
emitter.on('data', handler); // listeners: [handler, handler]
emitter.on('data', handler); // listeners: [handler, handler, handler]

// Listeners accumulate without bound
```

### Detecting Leaks

Node.js warns when listener count exceeds maximum:

```javascript
const emitter = new EventEmitter();

// Default max is 10
for (let i = 0; i < 11; i++) {
  emitter.on('data', () => {});
}

// Warning: Possible EventEmitter memory leak detected.
// 11 data listeners added. Use emitter.setMaxListeners() to increase limit
```

---

## Maximum Listeners Configuration

### Understanding the Limit

```javascript
const EventEmitter = require('events');

// Default max listeners
console.log(EventEmitter.defaultMaxListeners); // 10

const emitter = new EventEmitter();
console.log(emitter.getMaxListeners()); // 10
```

### Setting Per-Emitter Limit

```javascript
const emitter = new EventEmitter();

// Increase limit
emitter.setMaxListeners(50);
console.log(emitter.getMaxListeners()); // 50

// Set unlimited (0 = unlimited)
emitter.setMaxListeners(0);
console.log(emitter.getMaxListeners()); // 0
```

### Setting Global Default

```javascript
// Change default for ALL new emitters
EventEmitter.defaultMaxListeners = 20;

const emitter1 = new EventEmitter();
console.log(emitter1.getMaxListeners()); // 20

const emitter2 = new EventEmitter();
console.log(emitter2.getMaxListeners()); // 20
```

### When to Increase

**Increase the limit when:**
1. You legitimately need many listeners
2. Plugin/module system with many components
3. Event aggregation patterns
4. Microservice event bus

**Example: Plugin System**

```javascript
class PluginSystem extends EventEmitter {
  constructor() {
    super();
    // Expect 50+ plugins listening to lifecycle events
    this.setMaxListeners(100);
    this.plugins = [];
  }

  registerPlugin(plugin) {
    // Each plugin listens to multiple events
    this.on('app:start', plugin.onStart);
    this.on('app:stop', plugin.onStop);
    this.on('request', plugin.onRequest);

    this.plugins.push(plugin);
  }
}
```

### When NOT to Increase

**Don't increase to hide leaks:**

```javascript
// ❌ WRONG: Hiding the real problem
const emitter = new EventEmitter();
emitter.setMaxListeners(0); // Unlimited

setInterval(() => {
  emitter.on('data', () => {}); // Still leaking!
}, 1000);

// ✅ CORRECT: Fix the leak
const handler = () => {};
emitter.on('data', handler); // Add once
```

---

## Listener Cleanup Patterns

### Pattern 1: Explicit Cleanup

```javascript
class Component extends EventEmitter {
  constructor(bus) {
    super();
    this.bus = bus;
    this.handlers = {};
  }

  init() {
    // Store handler references
    this.handlers.data = this.onData.bind(this);
    this.handlers.update = this.onUpdate.bind(this);

    // Add listeners
    this.bus.on('data', this.handlers.data);
    this.bus.on('update', this.handlers.update);
  }

  destroy() {
    // Clean up all listeners
    this.bus.removeListener('data', this.handlers.data);
    this.bus.removeListener('update', this.handlers.update);

    this.handlers = {};
  }

  onData(data) {
    console.log('Data:', data);
  }

  onUpdate(update) {
    console.log('Update:', update);
  }
}

// Usage
const bus = new EventEmitter();
const component = new Component(bus);

component.init();
// ... use component ...
component.destroy(); // Clean up
```

### Pattern 2: Automatic Tracking

```javascript
class ManagedEmitter extends EventEmitter {
  constructor() {
    super();
    this.listenerRegistry = new Map();
  }

  registerListener(owner, event, listener) {
    // Add listener
    this.on(event, listener);

    // Track it
    if (!this.listenerRegistry.has(owner)) {
      this.listenerRegistry.set(owner, []);
    }

    this.listenerRegistry.get(owner).push({
      event,
      listener
    });
  }

  cleanupOwner(owner) {
    const listeners = this.listenerRegistry.get(owner);

    if (!listeners) return 0;

    // Remove all listeners for owner
    let removed = 0;
    listeners.forEach(({ event, listener }) => {
      this.removeListener(event, listener);
      removed++;
    });

    this.listenerRegistry.delete(owner);
    console.log(`Cleaned up ${removed} listeners for ${owner}`);

    return removed;
  }
}

// Usage
const emitter = new ManagedEmitter();

const component1 = 'ComponentA';
emitter.registerListener(component1, 'data', () => {});
emitter.registerListener(component1, 'update', () => {});

// Later: clean up all ComponentA listeners
emitter.cleanupOwner(component1);
```

### Pattern 3: Wrapper with Auto-Cleanup

```javascript
class ComponentManager {
  constructor(emitter) {
    this.emitter = emitter;
    this.active = true;
    this.listeners = [];
  }

  on(event, handler) {
    if (!this.active) {
      throw new Error('Component destroyed');
    }

    // Wrap handler to check if still active
    const wrappedHandler = (...args) => {
      if (this.active) {
        handler(...args);
      }
    };

    this.emitter.on(event, wrappedHandler);
    this.listeners.push({ event, handler: wrappedHandler });
  }

  once(event, handler) {
    if (!this.active) {
      throw new Error('Component destroyed');
    }

    const wrappedHandler = (...args) => {
      if (this.active) {
        handler(...args);
      }
    };

    this.emitter.once(event, wrappedHandler);
  }

  destroy() {
    // Remove all listeners
    this.listeners.forEach(({ event, handler }) => {
      this.emitter.removeListener(event, handler);
    });

    this.listeners = [];
    this.active = false;
  }
}

// Usage
const emitter = new EventEmitter();
const manager = new ComponentManager(emitter);

manager.on('data', (data) => {
  console.log('Data:', data);
});

// Later
manager.destroy(); // Automatic cleanup
```

### Pattern 4: Using AbortSignal (Node 15.4+)

```javascript
const { EventEmitter } = require('events');
const { AbortController } = require('abort-controller');

const emitter = new EventEmitter();
const controller = new AbortController();

// Add listener with AbortSignal
emitter.on('data', (data) => {
  console.log('Data:', data);
}, { signal: controller.signal });

emitter.on('update', (update) => {
  console.log('Update:', update);
}, { signal: controller.signal });

// Later: remove all listeners tied to this signal
controller.abort();
```

---

## Tracking Listeners

### Inspection Methods

```javascript
const emitter = new EventEmitter();

function handler1() {}
function handler2() {}
function handler3() {}

emitter.on('data', handler1);
emitter.on('data', handler2);
emitter.once('data', handler3);

// Get event names
console.log(emitter.eventNames()); // ['data']

// Get listener count
console.log(emitter.listenerCount('data')); // 3

// Get listeners (copies for once())
const listeners = emitter.listeners('data');
console.log(listeners.length); // 3

// Get raw listeners (includes wrapped once())
const raw = emitter.rawListeners('data');
console.log(raw.length); // 3
```

### Building a Leak Detector

```javascript
class LeakDetector extends EventEmitter {
  constructor(warningThreshold = 10) {
    super();
    this.warningThreshold = warningThreshold;
    this.baseline = new Map();
  }

  on(event, listener) {
    super.on(event, listener);
    this.checkForLeak(event);
    return this;
  }

  checkForLeak(event) {
    const count = this.listenerCount(event);

    // Check against baseline
    if (!this.baseline.has(event)) {
      this.baseline.set(event, count);
      return;
    }

    const baselineCount = this.baseline.get(event);
    const growth = count - baselineCount;

    if (growth > this.warningThreshold) {
      console.warn(`[LEAK WARNING] Event '${event}' grew by ${growth} listeners`);
      console.warn(`  Baseline: ${baselineCount}, Current: ${count}`);

      this.emit('leak:detected', {
        event,
        baseline: baselineCount,
        current: count,
        growth
      });
    }
  }

  snapshot() {
    // Take snapshot of current listener counts
    this.eventNames().forEach(event => {
      this.baseline.set(event, this.listenerCount(event));
    });
  }

  getReport() {
    const events = this.eventNames();
    const report = {
      timestamp: new Date(),
      events: []
    };

    events.forEach(event => {
      const count = this.listenerCount(event);
      const baseline = this.baseline.get(event) || 0;

      report.events.push({
        event,
        count,
        baseline,
        growth: count - baseline,
        suspicious: count > this.warningThreshold
      });
    });

    return report;
  }
}
```

---

## Performance Implications

### Listener Count Impact

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Add varying numbers of listeners
function benchmark(listenerCount) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(listenerCount + 10);

  for (let i = 0; i < listenerCount; i++) {
    emitter.on('data', () => {});
  }

  const start = Date.now();
  for (let i = 0; i < 100000; i++) {
    emitter.emit('data', 'test');
  }
  const duration = Date.now() - start;

  console.log(`${listenerCount} listeners: ${duration}ms`);
}

benchmark(10);   // Fast
benchmark(100);  // Slower
benchmark(1000); // Much slower
```

**Results show linear performance degradation:**
- 10 listeners: ~50ms
- 100 listeners: ~200ms
- 1000 listeners: ~1500ms

### Optimization Strategies

**1. Remove Unused Listeners**

```javascript
class OptimizedService extends EventEmitter {
  addTemporaryListener(event, duration) {
    const handler = () => {
      console.log('Event fired');
    };

    this.on(event, handler);

    // Auto-remove after duration
    setTimeout(() => {
      this.removeListener(event, handler);
    }, duration);
  }
}
```

**2. Use once() for One-Time Events**

```javascript
// ❌ LESS EFFICIENT
emitter.on('startup', () => {
  console.log('Started');
  emitter.removeAllListeners('startup');
});

// ✅ MORE EFFICIENT
emitter.once('startup', () => {
  console.log('Started');
  // Automatically removed
});
```

**3. Batch Operations**

```javascript
// ❌ INEFFICIENT: Emit per item
items.forEach(item => {
  emitter.emit('item', item);
});

// ✅ EFFICIENT: Emit batch
emitter.emit('items', items);
```

---

## Production Monitoring

### Runtime Monitoring

```javascript
class MonitoredEmitter extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      emits: {},
      listeners: {}
    };

    // Monitor listener changes
    this.on('newListener', (event) => {
      this.stats.listeners[event] = (this.stats.listeners[event] || 0) + 1;
    });

    this.on('removeListener', (event) => {
      this.stats.listeners[event] = (this.stats.listeners[event] || 1) - 1;
    });

    // Periodic reporting
    setInterval(() => {
      this.reportStats();
    }, 60000); // Every minute
  }

  emit(event, ...args) {
    // Track emits
    this.stats.emits[event] = (this.stats.emits[event] || 0) + 1;
    return super.emit(event, ...args);
  }

  reportStats() {
    const events = this.eventNames();

    console.log('=== EventEmitter Stats ===');
    console.log('Events:', events.length);

    events.forEach(event => {
      const count = this.listenerCount(event);
      const emits = this.stats.emits[event] || 0;

      console.log(`  ${event}:`);
      console.log(`    Listeners: ${count}`);
      console.log(`    Emits: ${emits}`);
    });
  }
}
```

### Health Checks

```javascript
class HealthCheckedEmitter extends EventEmitter {
  checkHealth() {
    const events = this.eventNames();
    const maxAllowed = this.getMaxListeners();

    const issues = [];

    events.forEach(event => {
      const count = this.listenerCount(event);

      if (count > maxAllowed * 0.8) {
        issues.push({
          event,
          count,
          max: maxAllowed,
          severity: 'warning'
        });
      }

      if (count > maxAllowed) {
        issues.push({
          event,
          count,
          max: maxAllowed,
          severity: 'critical'
        });
      }
    });

    return {
      healthy: issues.length === 0,
      issues,
      eventCount: events.length,
      totalListeners: events.reduce((sum, e) => {
        return sum + this.listenerCount(e);
      }, 0)
    };
  }
}
```

---

## Summary

**Key Takeaways:**

1. **Memory leaks happen** when listeners accumulate without cleanup
2. **Track listener ownership** to enable bulk cleanup
3. **Set appropriate max listeners** based on use case
4. **Remove listeners when done** - don't let them accumulate
5. **Use once()** for one-time events
6. **Monitor listener counts** in production
7. **Performance degrades linearly** with listener count
8. **Name handlers** so they can be removed later
9. **Wrap handlers** for component lifecycle
10. **Set up alerting** for suspicious listener growth

Proper listener management is essential for production applications. A small leak can bring down your entire system over time. Always clean up after yourself!
