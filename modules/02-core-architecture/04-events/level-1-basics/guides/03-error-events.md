# Error Events: The Special Event

Understanding why error events are critical in Node.js and how to handle them properly.

## Table of Contents

1. [Why Error Events Are Special](#why-error-events-are-special)
2. [What Happens Without Error Handlers](#what-happens-without-error-handlers)
3. [Proper Error Handling](#proper-error-handling)
4. [Error Event Patterns](#error-event-patterns)
5. [Best Practices](#best-practices)
6. [Common Mistakes](#common-mistakes)

---

## Why Error Events Are Special

The `'error'` event is **the only** event in Node.js that has special behavior built into EventEmitter. Unlike all other events, if an error event is emitted and there's no listener for it, Node.js will:

1. Throw the error
2. Print the stack trace
3. **Exit the process with code 1**

This is a safety mechanism - unhandled errors shouldn't be silently ignored.

### The Special Treatment

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Regular event with no listener - completely safe
emitter.emit('data', 'test'); // Nothing happens, no error

// Error event with no listener - CRASHES THE PROCESS!
emitter.emit('error', new Error('Oops')); // Process exits!
```

### Why This Design?

**Safety First:**
- Errors should never be silently ignored
- Unhandled errors indicate bugs or unexpected states
- Better to crash than continue in an unknown state
- Forces developers to handle errors explicitly

**Debugging:**
- Immediate feedback when something goes wrong
- Stack traces point to the problem
- Prevents silent failures that are hard to debug

---

## What Happens Without Error Handlers

### Process Crash Example

```javascript
const EventEmitter = require('events');

class DataProcessor extends EventEmitter {
  process(data) {
    if (!data) {
      // No error handler = process crash
      this.emit('error', new Error('No data provided'));
    }
  }
}

const processor = new DataProcessor();
processor.process(null);

// Output:
// Error: No data provided
//     at DataProcessor.process (...)
//     at Object.<anonymous> (...)
//     ...stack trace...
// [Process exits with code 1]
```

### Real Output

```
node:events:491
      throw er; // Unhandled 'error' event
      ^

Error: No data provided
    at DataProcessor.process (/path/to/file.js:6:19)
    at Object.<anonymous> (/path/to/file.js:12:11)
    ...
Node.js v18.12.0
[1]    12345 exit 1     node script.js
```

### Production Impact

In a production server, this means:
- **Instant downtime** - server crashes
- **Lost requests** - any in-flight work is lost
- **Service interruption** - until process manager restarts it
- **Potential data loss** - if transactions weren't complete

**This is why error handling is critical!**

---

## Proper Error Handling

### Always Add Error Listeners

```javascript
const emitter = new EventEmitter();

// Always add this first, before any other code
emitter.on('error', (err) => {
  console.error('Error occurred:', err);
  // Handle gracefully - log, alert, cleanup, etc.
});

// Now safe to emit errors
emitter.emit('error', new Error('Something went wrong'));
// Process continues running!
```

### Best Practice: Add Error Handler Immediately

```javascript
class SafeService extends EventEmitter {
  constructor() {
    super();

    // Add error handler in constructor
    this.on('error', this.handleError.bind(this));
  }

  handleError(err) {
    console.error(`[${this.constructor.name}] Error:`, err.message);
    // Log to monitoring service
    // Send alerts
    // Cleanup resources
  }

  doWork() {
    try {
      // ... work ...
      if (problem) {
        this.emit('error', new Error('Problem!'));
      }
    } catch (err) {
      this.emit('error', err);
    }
  }
}
```

### Multiple Error Handlers

You can have multiple error handlers for different purposes:

```javascript
const emitter = new EventEmitter();

// Handler 1: Logging
emitter.on('error', (err) => {
  console.error('[ERROR]', err.message);
  logToFile(err);
});

// Handler 2: Monitoring
emitter.on('error', (err) => {
  metrics.increment('errors');
  if (err.critical) {
    alert.notify('critical-error', err);
  }
});

// Handler 3: Cleanup
emitter.on('error', (err) => {
  cleanupResources();
});
```

---

## Error Event Patterns

### Pattern 1: Try-Catch with Emit

```javascript
class DataProcessor extends EventEmitter {
  async processData(data) {
    try {
      const result = await this.transform(data);
      this.emit('processed', result);
      return result;
    } catch (error) {
      // Don't throw - emit error event
      this.emit('error', error);
      return null;
    }
  }
}

const processor = new DataProcessor();

processor.on('error', (err) => {
  console.error('Processing failed:', err.message);
});

processor.on('processed', (result) => {
  console.log('Success:', result);
});
```

### Pattern 2: Error-First Callbacks (Legacy)

```javascript
class FileHandler extends EventEmitter {
  readFile(path) {
    fs.readFile(path, (err, data) => {
      if (err) {
        this.emit('error', err);
      } else {
        this.emit('data', data);
      }
    });
  }
}
```

### Pattern 3: Async/Await with Error Events

```javascript
class AsyncService extends EventEmitter {
  async start() {
    try {
      await this.initialize();
      this.emit('ready');
    } catch (error) {
      this.emit('error', error);
    }
  }

  async initialize() {
    // Async initialization that might fail
    await connectDatabase();
    await loadConfig();
  }
}

const service = new AsyncService();

service.on('error', (err) => {
  console.error('Service failed to start:', err);
  process.exit(1);
});

service.on('ready', () => {
  console.log('Service is ready');
});

service.start();
```

### Pattern 4: Validation Errors

```javascript
class UserManager extends EventEmitter {
  createUser(userData) {
    // Validate input
    const errors = this.validate(userData);

    if (errors.length > 0) {
      this.emit('error', new ValidationError(errors));
      return null;
    }

    const user = this.saveUser(userData);
    this.emit('userCreated', user);
    return user;
  }

  validate(userData) {
    const errors = [];
    if (!userData.email) errors.push('Email required');
    if (!userData.password) errors.push('Password required');
    return errors;
  }
}

class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
```

### Pattern 5: Error Recovery

```javascript
class ResilientService extends EventEmitter {
  constructor() {
    super();
    this.retryCount = 0;
    this.maxRetries = 3;

    this.on('error', (err) => {
      console.error('Error occurred:', err.message);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retry ${this.retryCount}/${this.maxRetries}...`);
        this.retry();
      } else {
        console.error('Max retries exceeded');
        this.emit('failed', err);
      }
    });
  }

  async operation() {
    try {
      const result = await riskyOperation();
      this.retryCount = 0; // Reset on success
      this.emit('success', result);
    } catch (error) {
      this.emit('error', error);
    }
  }

  retry() {
    setTimeout(() => this.operation(), 1000 * this.retryCount);
  }
}
```

---

## Best Practices

### 1. Always Handle Error Events

```javascript
// ❌ Bad: No error handler
const emitter = new EventEmitter();
// If anyone emits an error, process crashes

// ✅ Good: Error handler in place
const emitter = new EventEmitter();
emitter.on('error', (err) => {
  console.error('Error:', err);
});
```

### 2. Add Error Handler Before Other Operations

```javascript
// ✅ Correct order
class Service extends EventEmitter {
  constructor() {
    super();
    // Error handler FIRST
    this.on('error', this.handleError);
    // Then start operations
    this.start();
  }
}

// ❌ Wrong order
class Service extends EventEmitter {
  constructor() {
    super();
    this.start(); // Might emit errors!
    this.on('error', this.handleError); // Too late!
  }
}
```

### 3. Use Specific Error Types

```javascript
class NetworkError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
  }
}

class DatabaseError extends Error {
  constructor(message, query) {
    super(message);
    this.name = 'DatabaseError';
    this.query = query;
  }
}

// Handle different error types
service.on('error', (err) => {
  if (err instanceof NetworkError) {
    console.error('Network issue:', err.code);
    retryConnection();
  } else if (err instanceof DatabaseError) {
    console.error('DB error:', err.query);
    rollbackTransaction();
  } else {
    console.error('Unknown error:', err);
  }
});
```

### 4. Include Context in Errors

```javascript
class DataProcessor extends EventEmitter {
  processItem(item) {
    try {
      this.validate(item);
    } catch (err) {
      // Add context
      err.item = item;
      err.timestamp = Date.now();
      this.emit('error', err);
    }
  }
}

processor.on('error', (err) => {
  console.error('Error processing item:', err.item);
  console.error('Time:', new Date(err.timestamp));
  console.error('Message:', err.message);
});
```

### 5. Don't Throw in Error Handlers

```javascript
// ❌ Bad: Throwing in error handler
emitter.on('error', (err) => {
  console.error(err);
  throw err; // This will crash the process!
});

// ✅ Good: Handle gracefully
emitter.on('error', (err) => {
  console.error(err);
  // Log, cleanup, but don't throw
  logToService(err);
  cleanupResources();
});
```

### 6. Emit Errors, Don't Throw

```javascript
class AsyncService extends EventEmitter {
  async doWork() {
    try {
      const result = await someAsyncOperation();
      this.emit('success', result);
    } catch (err) {
      // ✅ Good: Emit error event
      this.emit('error', err);
      // ❌ Bad: throw err; (inconsistent with event pattern)
    }
  }
}
```

---

## Common Mistakes

### Mistake 1: Forgetting Error Handler

```javascript
// ❌ Will crash if error occurs
const processor = new DataProcessor();
processor.process(badData);

// ✅ Safe
const processor = new DataProcessor();
processor.on('error', handleError);
processor.process(badData);
```

### Mistake 2: Adding Error Handler Too Late

```javascript
// ❌ Race condition
const server = createServer();
server.start(); // Might error immediately
setTimeout(() => {
  server.on('error', handleError); // Too late!
}, 100);

// ✅ Handler first
const server = createServer();
server.on('error', handleError);
server.start();
```

### Mistake 3: Swallowing All Errors

```javascript
// ❌ Silent failures - hard to debug
emitter.on('error', () => {
  // Ignore all errors
});

// ✅ Log at minimum
emitter.on('error', (err) => {
  console.error('Error occurred:', err);
  // Even if you can't recover, log it!
});
```

### Mistake 4: Assuming Only One Error

```javascript
// ❌ Using once() for errors
emitter.once('error', handleError); // Only catches first error!

// ✅ Using on() for errors
emitter.on('error', handleError); // Catches all errors
```

### Mistake 5: Not Passing Error Objects

```javascript
// ❌ Losing stack trace
emitter.emit('error', 'Something went wrong'); // Just a string!

// ✅ Use Error objects
emitter.emit('error', new Error('Something went wrong')); // Proper error with stack
```

---

## Testing Error Events

### Test That Errors Don't Crash

```javascript
const assert = require('assert');

function testErrorHandling() {
  const emitter = new EventEmitter();
  let errorCaught = false;

  emitter.on('error', (err) => {
    errorCaught = true;
    assert.strictEqual(err.message, 'Test error');
  });

  emitter.emit('error', new Error('Test error'));

  assert(errorCaught, 'Error should have been caught');
  console.log('✓ Error handling works');
}

testErrorHandling();
```

### Test Error Recovery

```javascript
class TestService extends EventEmitter {
  attemptOperation() {
    this.emit('error', new Error('Simulated failure'));
  }
}

const service = new TestService();
let recovered = false;

service.on('error', (err) => {
  console.log('Error caught:', err.message);
  recovered = true;
});

service.attemptOperation();

assert(recovered, 'Should recover from error');
console.log('✓ Error recovery works');
```

---

## Summary

**Key Points:**

1. **Error events are special** - they crash the process if unhandled
2. **Always add error handlers** - preferably in constructors or immediately after creation
3. **Use Error objects** - not strings, for proper stack traces
4. **Emit errors, don't throw** - stay consistent with event pattern
5. **Handle errors gracefully** - log, cleanup, but keep running if possible
6. **Multiple handlers are okay** - for logging, monitoring, cleanup
7. **Test error handling** - ensure your app doesn't crash unexpectedly

**Golden Rules:**
- Add error handlers **before** starting operations
- Use `on()` not `once()` for error events
- Always emit Error objects, not strings
- Never throw in an error handler
- Log error details for debugging

Error handling is critical in production Node.js applications. Unhandled errors mean downtime. Proper error events mean resilient, debuggable applications!
