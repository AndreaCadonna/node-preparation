# on() vs once()

Understanding the difference between persistent and one-time event listeners.

## Table of Contents

1. [Overview](#overview)
2. [The on() Method](#the-on-method)
3. [The once() Method](#the-once-method)
4. [Key Differences](#key-differences)
5. [When to Use Each](#when-to-use-each)
6. [Performance Implications](#performance-implications)
7. [Common Patterns](#common-patterns)

---

## Overview

EventEmitter provides two main methods for adding listeners:

- **`on()`** - Adds a persistent listener that triggers every time the event is emitted
- **`once()`** - Adds a one-time listener that automatically removes itself after the first emit

### Quick Comparison

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// on() - runs every time
emitter.on('repeat', () => {
  console.log('on: I run every time');
});

// once() - runs only once
emitter.once('single', () => {
  console.log('once: I run only once');
});

emitter.emit('repeat'); // "on: I run every time"
emitter.emit('repeat'); // "on: I run every time"

emitter.emit('single'); // "once: I run only once"
emitter.emit('single'); // (nothing - listener was removed)
```

---

## The on() Method

The `on()` method (alias: `addEventListener()`) adds a **persistent listener** that remains active until explicitly removed.

### Syntax

```javascript
emitter.on(eventName, listener)
```

- **eventName**: String - The name of the event
- **listener**: Function - The callback function to execute
- **Returns**: The emitter (for chaining)

### Characteristics

1. **Persistent** - Listener stays registered indefinitely
2. **Multiple Triggers** - Runs every time the event is emitted
3. **Manual Cleanup** - Must be manually removed with `removeListener()` or `off()`
4. **Memory Concern** - Can cause memory leaks if not cleaned up

### Example: Persistent Logging

```javascript
class Server extends EventEmitter {
  handleRequest(req) {
    this.emit('request', req);
  }
}

const server = new Server();

// This logger runs for every request
server.on('request', (req) => {
  console.log(`[${new Date().toISOString()}] ${req.url}`);
});

server.handleRequest({ url: '/home' });    // Logs
server.handleRequest({ url: '/about' });   // Logs
server.handleRequest({ url: '/contact' }); // Logs
// ... continues logging forever
```

### Use Cases for on()

- **Continuous monitoring** (logging, analytics)
- **Recurring events** (server requests, user actions)
- **Long-lived listeners** (application lifecycle)
- **Multiple occurrences** (data streams, ticks)

---

## The once() Method

The `once()` method adds a **one-time listener** that automatically removes itself after the first emission.

### Syntax

```javascript
emitter.once(eventName, listener)
```

- **eventName**: String - The name of the event
- **listener**: Function - The callback function to execute (only once)
- **Returns**: The emitter (for chaining)

### Characteristics

1. **One-Time** - Listener is automatically removed after first trigger
2. **Self-Cleaning** - No memory leaks from forgotten listeners
3. **Perfect for Initialization** - Ideal for 'ready', 'connected', etc.
4. **Performance** - Slightly more overhead than on() due to wrapper

### Example: One-Time Initialization

```javascript
class Database extends EventEmitter {
  connect() {
    setTimeout(() => {
      this.connected = true;
      this.emit('connected');
    }, 100);
  }
}

const db = new Database();

// This only runs once when database first connects
db.once('connected', () => {
  console.log('Database is ready!');
  startApplication();
});

db.connect();
// Later, even if 'connected' is emitted again, the listener won't run
```

### Use Cases for once()

- **Initialization events** ('ready', 'connected', 'loaded')
- **One-time actions** ('firstRequest', 'install', 'upgrade')
- **Error handling** (when you only want the first error)
- **Async operation completion** (single callback)

---

## Key Differences

### 1. Listener Persistence

```javascript
const emitter = new EventEmitter();
let onCount = 0;
let onceCount = 0;

emitter.on('event', () => {
  onCount++;
});

emitter.once('event', () => {
  onceCount++;
});

emitter.emit('event');
emitter.emit('event');
emitter.emit('event');

console.log('on() count:', onCount);     // 3
console.log('once() count:', onceCount); // 1
```

### 2. Listener Count Over Time

```javascript
const emitter = new EventEmitter();

emitter.on('persist', () => {});
emitter.once('temporary', () => {});

console.log('Before emit:');
console.log('  persist listeners:', emitter.listenerCount('persist'));     // 1
console.log('  temporary listeners:', emitter.listenerCount('temporary')); // 1

emitter.emit('persist');
emitter.emit('temporary');

console.log('After emit:');
console.log('  persist listeners:', emitter.listenerCount('persist'));     // 1
console.log('  temporary listeners:', emitter.listenerCount('temporary')); // 0
```

### 3. Memory Management

```javascript
// ❌ Potential memory leak with on()
setInterval(() => {
  const emitter = getEmitter();
  emitter.on('data', handleData); // Never removed! Memory leak!
}, 1000);

// ✅ Safe with once()
setInterval(() => {
  const emitter = getEmitter();
  emitter.once('data', handleData); // Auto-removed, no leak
}, 1000);
```

### 4. Implementation Difference

```javascript
// once() is implemented roughly like this:
function once(eventName, listener) {
  const onceWrapper = (...args) => {
    this.removeListener(eventName, onceWrapper);
    listener.apply(this, args);
  };
  this.on(eventName, onceWrapper);
}
```

---

## When to Use Each

### Use on() When:

✅ The event will occur multiple times
```javascript
server.on('request', handleRequest); // Many requests
```

✅ You need persistent monitoring
```javascript
process.on('uncaughtException', logError); // Always monitor
```

✅ You're handling streams or continuous data
```javascript
stream.on('data', processChunk); // Many chunks
```

✅ You want explicit control over listener lifecycle
```javascript
const handler = () => {};
emitter.on('event', handler);
// Later: emitter.off('event', handler);
```

### Use once() When:

✅ The event should only trigger once
```javascript
db.once('connected', initialize); // Connect once
```

✅ You're waiting for initialization
```javascript
app.once('ready', startServer); // Ready once
```

✅ You want to prevent memory leaks
```javascript
request.once('complete', cleanup); // Auto-cleanup
```

✅ You're handling async operations
```javascript
emitter.once('result', (data) => {
  resolve(data);
});
```

### Decision Tree

```
Does the event occur multiple times?
│
├─ Yes → Use on()
│   │
│   └─ Do you need all occurrences?
│       ├─ Yes → on()
│       └─ No, just the first → once()
│
└─ No → Use once()
```

---

## Performance Implications

### once() Overhead

```javascript
// once() creates a wrapper function
emitter.once('event', handler);

// Roughly equivalent to:
function wrapper(...args) {
  emitter.removeListener('event', wrapper);
  handler(...args);
}
emitter.on('event', wrapper);
```

**Impact:**
- Slightly more memory (wrapper function)
- Slightly slower (extra function call)
- Negligible in most applications
- Worth it for automatic cleanup

### Benchmark Comparison

```javascript
const emitter = new EventEmitter();
const iterations = 1000000;

// Benchmark on()
console.time('on()');
for (let i = 0; i < iterations; i++) {
  emitter.on('test', () => {});
  emitter.removeAllListeners('test');
}
console.timeEnd('on()');

// Benchmark once()
console.time('once()');
for (let i = 0; i < iterations; i++) {
  emitter.once('test', () => {});
  emitter.emit('test');
}
console.timeEnd('once()');

// once() is typically ~10-20% slower due to wrapper
// But this is microseconds - rarely matters in practice
```

**Recommendation:** Use `once()` when semantically correct, don't worry about performance unless profiling shows it's a bottleneck.

---

## Common Patterns

### Pattern 1: Conditional Once

```javascript
class Game extends EventEmitter {
  levelUp(player) {
    this.emit('levelUp', player);

    if (player.level === 10) {
      this.emit('levelTen', player);
    }
  }
}

const game = new Game();

// Only celebrate the first time reaching level 10
game.once('levelTen', (player) => {
  celebrateAchievement(player);
});
```

### Pattern 2: Async Promise Pattern

```javascript
function waitForEvent(emitter, eventName) {
  return new Promise((resolve) => {
    emitter.once(eventName, resolve);
  });
}

// Usage
const data = await waitForEvent(emitter, 'data');
```

### Pattern 3: Timeout with once()

```javascript
function waitForEventWithTimeout(emitter, eventName, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout'));
    }, timeout);

    emitter.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
```

### Pattern 4: Hybrid Approach

```javascript
class Service extends EventEmitter {
  start() {
    // Persistent listener for ongoing work
    this.on('request', this.handleRequest);

    // One-time listener for initialization
    this.once('ready', () => {
      console.log('Service is ready');
    });

    this.initialize();
  }
}
```

### Pattern 5: Converting on() to once()

```javascript
// Manual once() implementation using on()
function manualOnce(emitter, eventName, handler) {
  const wrapper = (...args) => {
    emitter.removeListener(eventName, wrapper);
    handler(...args);
  };
  emitter.on(eventName, wrapper);
  return wrapper; // Return for possible manual removal
}
```

---

## Best Practices

### 1. Use once() for Initialization

```javascript
// Good
app.once('ready', () => {
  console.log('App ready');
});

// Unnecessary
app.on('ready', () => {
  console.log('App ready');
  // Forgot to remove listener - memory leak potential
});
```

### 2. Use on() for Continuous Events

```javascript
// Good
server.on('request', handleRequest);

// Bad
server.once('request', handleRequest); // Only handles first request!
```

### 3. Be Explicit About Intent

```javascript
// Clear intent: only care about first error
request.once('error', handleError);

// Ambiguous intent: is this a mistake or intentional?
request.on('complete', cleanup);
```

### 4. Document Unusual Usage

```javascript
// Unusual: Using on() for something that happens once
// But we want to re-register it later
server.on('firstConnection', (conn) => {
  // Do something
  // We'll manually call removeListener() elsewhere
});
```

---

## Summary

| Feature | on() | once() |
|---------|------|--------|
| **Triggers** | Every emit | First emit only |
| **Removal** | Manual | Automatic |
| **Use Case** | Recurring events | One-time events |
| **Memory** | Manual cleanup needed | Self-cleaning |
| **Performance** | Slightly faster | Slightly slower |
| **Typical Use** | Requests, data, continuous | Ready, connected, init |

**Golden Rule:** Use `once()` when the event logically happens once, use `on()` when it can happen multiple times and you care about all occurrences.
