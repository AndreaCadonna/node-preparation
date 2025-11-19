# Memory Leaks in Event Emitters

Understanding, detecting, and preventing memory leaks in event-driven systems.

## Table of Contents

1. [What Are Memory Leaks?](#what-are-memory-leaks)
2. [How Event Listeners Cause Leaks](#how-event-listeners-cause-leaks)
3. [Common Leak Patterns](#common-leak-patterns)
4. [Detection Techniques](#detection-techniques)
5. [Prevention Strategies](#prevention-strategies)
6. [Tools and Debugging](#tools-and-debugging)

---

## What Are Memory Leaks?

A **memory leak** occurs when memory that is no longer needed is not released, causing the application's memory usage to grow unboundedly over time.

### Why Memory Leaks Matter

```
Time →
Memory ↑

Without Leak:     With Leak:
    |                 |        ╱
    |   ___           |      ╱
    |  ╱   ╲          |    ╱
    | ╱     ╲___      |  ╱
    |╱               |╱
    └─────────       └─────────

Memory stays       Memory grows
within bounds      until crash
```

**Consequences:**
- Degraded performance
- Increased memory usage
- Application crashes
- Resource exhaustion
- Poor user experience

---

## How Event Listeners Cause Leaks

Event listeners create references that prevent garbage collection.

### The Reference Chain

```javascript
// Event emitter holds reference to listener
emitter.on('event', handler);

// If handler references a large object...
function handler() {
  console.log(largeObject.data); // largeObject can't be GC'd
}

// Object stays in memory even when no longer needed
```

### Visualization

```
┌──────────────┐
│ EventEmitter │
└──────┬───────┘
       │
       │ holds reference
       ▼
┌──────────────┐
│   Listener   │
└──────┬───────┘
       │
       │ closes over
       ▼
┌──────────────┐
│ Large Object │ ← Can't be garbage collected!
└──────────────┘
```

---

## Common Leak Patterns

### Pattern 1: Forgotten Cleanup

```javascript
// ❌ LEAK: Listeners never removed
class Component {
  constructor(eventBus) {
    this.data = new Array(1000000); // Large data

    // Listener holds reference to 'this'
    eventBus.on('update', () => {
      this.handleUpdate();
    });
  }

  // No cleanup method!
}

// Creating many components
for (let i = 0; i < 100; i++) {
  new Component(eventBus); // Each adds a listener that's never removed
}

// Result: 100 listeners, all holding large objects in memory
```

**Fix:**

```javascript
// ✅ CORRECT: Proper cleanup
class Component {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.data = new Array(1000000);

    // Store handler reference
    this.updateHandler = () => this.handleUpdate();
    eventBus.on('update', this.updateHandler);
  }

  destroy() {
    // Remove listener
    this.eventBus.off('update', this.updateHandler);

    // Clear references
    this.data = null;
    this.updateHandler = null;
  }
}
```

### Pattern 2: Anonymous Functions

```javascript
// ❌ LEAK: Can't remove anonymous functions
class Service {
  start(emitter) {
    emitter.on('data', (data) => {
      this.process(data);
    });

    // Later: Can't remove this specific listener!
    // emitter.off('data', ???); // What do we pass?
  }
}
```

**Fix:**

```javascript
// ✅ CORRECT: Named function reference
class Service {
  start(emitter) {
    this.emitter = emitter;
    this.dataHandler = (data) => this.process(data);

    emitter.on('data', this.dataHandler);
  }

  stop() {
    this.emitter.off('data', this.dataHandler);
  }
}
```

### Pattern 3: Accumulating Event Handlers

```javascript
// ❌ LEAK: Adding listeners in a loop
setInterval(() => {
  // Each iteration adds a new listener
  emitter.on('tick', () => {
    console.log('tick');
  });
}, 1000);

// After 1 hour: 3600 listeners!
```

**Fix:**

```javascript
// ✅ CORRECT: Add listener once
const tickHandler = () => console.log('tick');
emitter.on('tick', tickHandler);

setInterval(() => {
  // Just emit, don't add listeners
  emitter.emit('tick');
}, 1000);
```

### Pattern 4: Closure Traps

```javascript
// ❌ LEAK: Closure captures large context
class DataProcessor {
  constructor(emitter) {
    this.cache = new Map(); // Potentially large

    for (let i = 0; i < 1000; i++) {
      // Each listener captures 'this' (including cache)
      emitter.on(`event${i}`, () => {
        this.process(i);
      });
    }
  }
}
```

**Fix:**

```javascript
// ✅ CORRECT: Minimize closure scope
class DataProcessor {
  constructor(emitter) {
    this.cache = new Map();
    this.handlers = [];

    for (let i = 0; i < 1000; i++) {
      const handler = this.createHandler(i);
      this.handlers.push({ event: `event${i}`, handler });
      emitter.on(`event${i}`, handler);
    }
  }

  createHandler(id) {
    // Only capture what's needed
    return (data) => this.process(id, data);
  }

  cleanup(emitter) {
    this.handlers.forEach(({ event, handler }) => {
      emitter.off(event, handler);
    });
    this.handlers = [];
  }
}
```

---

## Detection Techniques

### Technique 1: Monitor Listener Counts

```javascript
class LeakDetector {
  constructor(emitter, threshold = 10) {
    this.emitter = emitter;
    this.threshold = threshold;
  }

  check() {
    const events = this.emitter.eventNames();
    const warnings = [];

    events.forEach(event => {
      const count = this.emitter.listenerCount(event);

      if (count > this.threshold) {
        warnings.push({
          event: String(event),
          count,
          threshold: this.threshold
        });
      }
    });

    return warnings;
  }
}

// Usage
const detector = new LeakDetector(eventBus, 20);
setInterval(() => {
  const warnings = detector.check();

  if (warnings.length > 0) {
    console.warn('Potential memory leaks:', warnings);
  }
}, 5000);
```

### Technique 2: Memory Usage Tracking

```javascript
class MemoryMonitor {
  constructor() {
    this.baseline = process.memoryUsage();
    this.snapshots = [];
  }

  snapshot(label) {
    const current = process.memoryUsage();
    const delta = {
      label,
      timestamp: Date.now(),
      heapUsed: current.heapUsed - this.baseline.heapUsed,
      heapTotal: current.heapTotal - this.baseline.heapTotal,
      external: current.external - this.baseline.external
    };

    this.snapshots.push(delta);
    return delta;
  }

  getTrend() {
    if (this.snapshots.length < 2) return 'insufficient_data';

    const recent = this.snapshots.slice(-10);
    const avgGrowth = recent.reduce((sum, snap, i) => {
      if (i === 0) return 0;
      return sum + (snap.heapUsed - recent[i - 1].heapUsed);
    }, 0) / (recent.length - 1);

    return avgGrowth > 1024 * 1024 ? 'growing' : 'stable';
  }
}

// Usage
const monitor = new MemoryMonitor();

setInterval(() => {
  monitor.snapshot('periodic');

  if (monitor.getTrend() === 'growing') {
    console.warn('Memory usage is growing - possible leak!');
  }
}, 10000);
```

### Technique 3: MaxListeners Warning

```javascript
// Node.js warns when you exceed maxListeners
const emitter = new EventEmitter();
emitter.setMaxListeners(10); // Default is 10

// Listen for warnings
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.error('Potential memory leak:', warning.message);
    console.trace('Stack trace:');
  }
});

// This will trigger a warning
for (let i = 0; i < 15; i++) {
  emitter.on('event', () => {});
}
```

---

## Prevention Strategies

### Strategy 1: Always Provide Cleanup

```javascript
class LifecycleAware {
  constructor(emitter) {
    this.emitter = emitter;
    this.handlers = new Map();
  }

  /**
   * Register event handler with cleanup tracking
   */
  register(event, handler) {
    this.handlers.set(event, handler);
    this.emitter.on(event, handler);
  }

  /**
   * Cleanup all registered handlers
   */
  cleanup() {
    this.handlers.forEach((handler, event) => {
      this.emitter.off(event, handler);
    });
    this.handlers.clear();
  }
}
```

### Strategy 2: Use WeakMap for Context

```javascript
class MemorySafeEmitter extends EventEmitter {
  constructor() {
    super();
    // WeakMap allows contexts to be garbage collected
    this.contextHandlers = new WeakMap();
  }

  registerWithContext(context, event, handler) {
    if (!this.contextHandlers.has(context)) {
      this.contextHandlers.set(context, new Map());
    }

    const handlers = this.contextHandlers.get(context);
    const boundHandler = handler.bind(context);

    handlers.set(event, boundHandler);
    this.on(event, boundHandler);
  }

  cleanupContext(context) {
    const handlers = this.contextHandlers.get(context);

    if (handlers) {
      handlers.forEach((handler, event) => {
        this.off(event, handler);
      });
      this.contextHandlers.delete(context);
    }
  }
}
```

### Strategy 3: Use `once()` When Appropriate

```javascript
// ❌ Potential leak with on()
emitter.on('initialized', () => {
  console.log('App initialized');
  // Listener stays registered forever!
});

// ✅ Automatic cleanup with once()
emitter.once('initialized', () => {
  console.log('App initialized');
  // Automatically removed after first call
});
```

### Strategy 4: Set Appropriate MaxListeners

```javascript
// For normal use cases
const normalEmitter = new EventEmitter();
normalEmitter.setMaxListeners(10); // Default

// For high-listener scenarios
const eventBus = new EventEmitter();
eventBus.setMaxListeners(100); // Or Infinity if intentional

// For strict leak detection
const strictEmitter = new EventEmitter();
strictEmitter.setMaxListeners(3); // Fail fast
```

---

## Tools and Debugging

### 1. Chrome DevTools (for Node.js)

```bash
# Run Node with inspector
node --inspect your-app.js

# Or for immediate break
node --inspect-brk your-app.js
```

**Take heap snapshots:**
1. Connect Chrome to `chrome://inspect`
2. Take heap snapshot before creating listeners
3. Create many listeners
4. Take another snapshot
5. Compare snapshots to find retained objects

### 2. Node.js Built-in Memory Profiler

```javascript
// Enable heap profiler
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot(filename) {
  const snapshot = v8.writeHeapSnapshot();
  console.log(`Heap snapshot written to ${snapshot}`);
}

// Take snapshots at intervals
setInterval(() => {
  takeHeapSnapshot();
}, 60000);
```

### 3. clinic.js

```bash
# Install
npm install -g clinic

# Run with memory profiling
clinic doctor -- node app.js

# Analyze the results
```

### 4. memwatch-next

```javascript
const memwatch = require('@airbnb/node-memwatch');

memwatch.on('leak', (info) => {
  console.error('Memory leak detected:', info);
});

memwatch.on('stats', (stats) => {
  console.log('GC stats:', stats);
});
```

---

## Best Practices Checklist

### Development

- [ ] Always provide cleanup/destroy methods
- [ ] Store handler references (no anonymous functions)
- [ ] Use `once()` for one-time events
- [ ] Set appropriate `maxListeners`
- [ ] Use WeakMap for context-sensitive handlers
- [ ] Avoid adding listeners in loops or intervals
- [ ] Clean up in lifecycle hooks (componentWillUnmount, etc.)

### Testing

- [ ] Test cleanup methods
- [ ] Monitor listener counts in tests
- [ ] Use memory profiling in CI
- [ ] Test long-running scenarios
- [ ] Verify garbage collection works

### Production

- [ ] Monitor memory usage
- [ ] Set up alerts for growing memory
- [ ] Log listener counts periodically
- [ ] Use APM tools (New Relic, DataDog)
- [ ] Have a rollback plan

---

## Summary

**Key Takeaways:**

1. **Memory leaks** occur when event listeners prevent garbage collection
2. **Common causes**: Forgotten cleanup, anonymous functions, accumulating handlers
3. **Detection**: Monitor listener counts, track memory usage, use profiling tools
4. **Prevention**: Always cleanup, use WeakMap, use `once()`, set maxListeners
5. **Tools**: Chrome DevTools, clinic.js, memwatch, APM

**Golden Rule:** For every `on()`, there should be a corresponding `off()` when the listener is no longer needed.

Remember: Event-driven code is powerful, but requires discipline to avoid memory leaks!
