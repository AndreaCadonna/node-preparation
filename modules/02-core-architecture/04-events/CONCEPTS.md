# Events Module: Core Concepts

This document provides foundational understanding of the Events module and event-driven programming in Node.js.

## Table of Contents

1. [What is Event-Driven Programming?](#what-is-event-driven-programming)
2. [The EventEmitter Class](#the-eventemitter-class)
3. [Event Loop and Events](#event-loop-and-events)
4. [Event Listener Lifecycle](#event-listener-lifecycle)
5. [Error Handling](#error-handling)
6. [Memory Management](#memory-management)
7. [Event Patterns](#event-patterns)
8. [Best Practices](#best-practices)

---

## What is Event-Driven Programming?

Event-driven programming is a paradigm where the flow of the program is determined by events: user actions, sensor outputs, messages from other programs, etc.

### Traditional Programming Flow

```javascript
// Sequential, synchronous
function processData() {
  const data = readFile();
  const processed = transform(data);
  saveFile(processed);
  console.log('Done');
}
```

### Event-Driven Flow

```javascript
// Asynchronous, event-based
const processor = new EventEmitter();

processor.on('dataReceived', (data) => {
  const processed = transform(data);
  processor.emit('dataProcessed', processed);
});

processor.on('dataProcessed', (data) => {
  saveFile(data);
  processor.emit('complete');
});

processor.on('complete', () => {
  console.log('Done');
});

// Trigger the flow
processor.emit('dataReceived', fileData);
```

### Why Event-Driven?

**Advantages:**
- **Loose Coupling**: Components don't need to know about each other
- **Scalability**: Easy to add new listeners without changing existing code
- **Asynchronous**: Non-blocking operations
- **Flexibility**: Dynamic behavior modification

**Trade-offs:**
- More complex flow to understand
- Harder to debug
- Potential for memory leaks
- Callback management complexity

---

## The EventEmitter Class

EventEmitter is the core class in Node.js for implementing the observer pattern.

### Basic Architecture

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

// Register listener (observer)
myEmitter.on('event', () => {
  console.log('Event occurred!');
});

// Trigger event (notify observers)
myEmitter.emit('event');
```

### How It Works Internally

EventEmitter maintains a map of event names to arrays of listener functions:

```javascript
// Simplified internal structure
{
  'event1': [listener1, listener2, listener3],
  'event2': [listener4],
  'error': [errorHandler]
}
```

When `emit()` is called:
1. Look up the event name
2. Get the array of listeners
3. Call each listener in order
4. Pass arguments to each listener

### Synchronous vs Asynchronous

**Important**: Event listeners are called **synchronously** in the order they were registered.

```javascript
const emitter = new EventEmitter();

emitter.on('event', () => {
  console.log('First');
});

emitter.on('event', () => {
  console.log('Second');
});

console.log('Before emit');
emitter.emit('event');
console.log('After emit');

// Output:
// Before emit
// First
// Second
// After emit
```

---

## Event Loop and Events

Understanding how events relate to the Node.js event loop is crucial.

### Event Loop Phases

```
   ┌───────────────────────────┐
┌─>│           timers          │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │           check           │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │
   └───────────────────────────┘
```

### EventEmitter and the Event Loop

EventEmitter calls are **synchronous**, but you can make them asynchronous:

```javascript
// Synchronous (default)
emitter.on('event', () => {
  // Blocks event loop
  heavyComputation();
});

// Asynchronous (recommended for heavy work)
emitter.on('event', () => {
  setImmediate(() => {
    heavyComputation();
  });
});

// Or with async/await
emitter.on('event', async () => {
  await heavyComputationAsync();
});
```

---

## Event Listener Lifecycle

Understanding the lifecycle of event listeners is key to preventing bugs.

### Registration Methods

```javascript
const emitter = new EventEmitter();

// 1. on() - persistent listener
emitter.on('data', handleData);

// 2. once() - one-time listener
emitter.once('connect', handleConnect);

// 3. prependListener() - add to front of queue
emitter.prependListener('data', handleDataFirst);

// 4. prependOnceListener() - one-time, front of queue
emitter.prependOnceListener('connect', handleConnectFirst);
```

### Removal Methods

```javascript
// 1. removeListener() / off() - remove specific listener
emitter.removeListener('data', handleData);
emitter.off('data', handleData); // Alias

// 2. removeAllListeners() - remove all listeners for an event
emitter.removeAllListeners('data');

// 3. removeAllListeners() - remove ALL listeners for ALL events
emitter.removeAllListeners();
```

### Listener Order

```javascript
const emitter = new EventEmitter();

emitter.on('event', () => console.log('1'));
emitter.on('event', () => console.log('2'));
emitter.prependListener('event', () => console.log('0'));

emitter.emit('event');
// Output:
// 0
// 1
// 2
```

---

## Error Handling

Error handling in EventEmitter is special and crucial.

### The Error Event

If an 'error' event is emitted and there's no listener, Node.js will:
1. Throw the error
2. Print stack trace
3. **Exit the process**

```javascript
const emitter = new EventEmitter();

// Dangerous - will crash the process
emitter.emit('error', new Error('Oops'));
```

### Always Handle Errors

```javascript
// Safe - error is handled
emitter.on('error', (err) => {
  console.error('Error occurred:', err);
  // Handle gracefully
});

emitter.emit('error', new Error('Oops')); // Safe now
```

### Error Handling Patterns

```javascript
class SafeEmitter extends EventEmitter {
  safeEmit(event, ...args) {
    try {
      this.emit(event, ...args);
    } catch (err) {
      this.emit('error', err);
    }
  }
}

// Or with error-first callback pattern
emitter.on('data', (err, data) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  // Process data
});
```

---

## Memory Management

EventEmitters can cause memory leaks if not managed properly.

### The Problem

```javascript
// Memory leak example
function createHandler() {
  const largeData = new Array(1000000).fill('data');

  return function handler(event) {
    // Uses largeData
    console.log(largeData.length, event);
  };
}

// Leak: handler keeps largeData in memory
emitter.on('event', createHandler());

// Even if we never emit 'event', the handler
// and largeData stay in memory forever
```

### Maximum Listeners Warning

By default, EventEmitter warns if more than 10 listeners are added to a single event:

```javascript
const emitter = new EventEmitter();

// Add 11 listeners
for (let i = 0; i < 11; i++) {
  emitter.on('event', () => {});
}

// Warning: Possible EventEmitter memory leak detected.
// 11 event listeners added. Use emitter.setMaxListeners() to increase limit
```

### Setting Listener Limits

```javascript
// Increase limit for specific emitter
emitter.setMaxListeners(20);

// Increase limit for all emitters
EventEmitter.defaultMaxListeners = 20;

// Disable warning (use with caution)
emitter.setMaxListeners(0); // or Infinity
```

### Preventing Leaks

```javascript
// 1. Always remove listeners when done
const handler = () => { /* ... */ };
emitter.on('event', handler);
// Later...
emitter.removeListener('event', handler);

// 2. Use once() for one-time events
emitter.once('connect', () => {
  // Automatically removed after first emit
});

// 3. Clean up in cleanup functions
class Component extends EventEmitter {
  constructor(externalEmitter) {
    super();
    this.handler = () => this.handleData();
    externalEmitter.on('data', this.handler);
  }

  destroy() {
    externalEmitter.removeListener('data', this.handler);
  }
}
```

---

## Event Patterns

Common patterns for using EventEmitter effectively.

### Pattern 1: Observer Pattern

```javascript
class Subject extends EventEmitter {
  setState(state) {
    this.state = state;
    this.emit('stateChanged', state);
  }
}

class Observer {
  constructor(subject) {
    subject.on('stateChanged', (state) => {
      this.update(state);
    });
  }

  update(state) {
    console.log('State updated:', state);
  }
}
```

### Pattern 2: Event Middleware

```javascript
class MiddlewareEmitter extends EventEmitter {
  use(event, middleware) {
    this.on(event, async (...args) => {
      await middleware(...args);
    });
  }
}

const emitter = new MiddlewareEmitter();

// Add middleware
emitter.use('request', async (req) => {
  console.log('Logger:', req);
});

emitter.use('request', async (req) => {
  console.log('Auth:', req);
});
```

### Pattern 3: Event Namespacing

```javascript
class NamespacedEmitter extends EventEmitter {
  emitNamespaced(namespace, event, ...args) {
    this.emit(`${namespace}:${event}`, ...args);
  }

  onNamespaced(namespace, event, handler) {
    this.on(`${namespace}:${event}`, handler);
  }
}

const emitter = new NamespacedEmitter();

emitter.onNamespaced('user', 'created', (user) => {
  console.log('User created:', user);
});

emitter.emitNamespaced('user', 'created', { id: 1, name: 'Alice' });
```

### Pattern 4: Request-Response

```javascript
class RequestResponseEmitter extends EventEmitter {
  async request(event, data) {
    return new Promise((resolve, reject) => {
      const responseEvent = `${event}:response`;

      const timeout = setTimeout(() => {
        this.removeAllListeners(responseEvent);
        reject(new Error('Request timeout'));
      }, 5000);

      this.once(responseEvent, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.emit(event, data, responseEvent);
    });
  }

  respond(event, handler) {
    this.on(event, async (data, responseEvent) => {
      try {
        const result = await handler(data);
        this.emit(responseEvent, result);
      } catch (err) {
        this.emit(responseEvent, { error: err.message });
      }
    });
  }
}
```

---

## Best Practices

### 1. Always Handle Errors

```javascript
// Always add error handler
emitter.on('error', (err) => {
  console.error('Error:', err);
});
```

### 2. Use Descriptive Event Names

```javascript
// Good
emitter.on('user:created', handleUserCreated);
emitter.on('payment:processed', handlePayment);

// Bad
emitter.on('event1', handler1);
emitter.on('data', handler2);
```

### 3. Document Event Contracts

```javascript
/**
 * @event connection
 * @param {Object} socket - The socket object
 * @param {string} socket.id - Unique socket identifier
 */
class Server extends EventEmitter {
  // ...
}
```

### 4. Clean Up Listeners

```javascript
class Component {
  constructor(emitter) {
    this.emitter = emitter;
    this.handlers = {
      data: (data) => this.handleData(data),
      error: (err) => this.handleError(err)
    };

    this.emitter.on('data', this.handlers.data);
    this.emitter.on('error', this.handlers.error);
  }

  destroy() {
    this.emitter.removeListener('data', this.handlers.data);
    this.emitter.removeListener('error', this.handlers.error);
  }
}
```

### 5. Avoid Long Listener Chains

```javascript
// Bad - hard to debug
emitter.on('a', () => emitter.emit('b'));
emitter.on('b', () => emitter.emit('c'));
emitter.on('c', () => emitter.emit('d'));

// Better - explicit flow
async function processWorkflow() {
  await stepA();
  await stepB();
  await stepC();
}
```

### 6. Use once() for One-Time Events

```javascript
// For events that only happen once
emitter.once('ready', () => {
  console.log('Application ready');
});

// Instead of
emitter.on('ready', function handler() {
  console.log('Application ready');
  emitter.removeListener('ready', handler);
});
```

### 7. Return this for Chaining

```javascript
class ChainableEmitter extends EventEmitter {
  start() {
    this.emit('start');
    return this; // Enable chaining
  }

  stop() {
    this.emit('stop');
    return this;
  }
}

const emitter = new ChainableEmitter();

emitter
  .on('start', () => console.log('Started'))
  .on('stop', () => console.log('Stopped'))
  .start()
  .stop();
```

---

## Common Use Cases

### 1. HTTP Server

```javascript
const http = require('http');

const server = http.createServer();

server.on('request', (req, res) => {
  res.end('Hello World');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(3000);
```

### 2. Streams

```javascript
const fs = require('fs');

const readStream = fs.createReadStream('file.txt');

readStream.on('data', (chunk) => {
  console.log('Received chunk:', chunk.length);
});

readStream.on('end', () => {
  console.log('Finished reading');
});

readStream.on('error', (err) => {
  console.error('Stream error:', err);
});
```

### 3. Custom Application Events

```javascript
class Application extends EventEmitter {
  async initialize() {
    this.emit('initializing');
    await this.loadConfig();
    await this.connectDatabase();
    this.emit('ready');
  }

  async loadConfig() {
    // Load configuration
    this.emit('config:loaded');
  }

  async connectDatabase() {
    // Connect to database
    this.emit('database:connected');
  }
}

const app = new Application();

app.on('initializing', () => console.log('App is initializing...'));
app.on('config:loaded', () => console.log('Config loaded'));
app.on('database:connected', () => console.log('DB connected'));
app.on('ready', () => console.log('App is ready!'));

app.initialize();
```

---

## Summary

The Events module is fundamental to Node.js:

- **EventEmitter** is the core class for event-driven programming
- Events are called **synchronously** in registration order
- Always handle **error events** to prevent crashes
- **Memory leaks** can occur from forgotten listeners
- Many Node.js core modules extend EventEmitter
- Understanding events is key to mastering Node.js

Master these concepts, and you'll be able to build scalable, event-driven applications with confidence!
