/**
 * Example 6: Error Events
 *
 * This example demonstrates:
 * - The special 'error' event
 * - Why error events are critical
 * - What happens without an error handler (crash!)
 * - Best practices for error handling
 * - Error event patterns
 */

const EventEmitter = require('events');

console.log('=== Error Events Example ===\n');

console.log('--- The Danger of Unhandled Errors ---\n');

// ⚠️ WARNING: Uncomment the following to see a process crash
// const dangerous = new EventEmitter();
// dangerous.emit('error', new Error('Oops!')); // This WILL crash!

console.log('(Crash example commented out for safety)\n');
console.log('If you emit an error event with no listener,');
console.log('Node.js will throw it and crash your process!\n');

console.log('--- Proper Error Handling ---\n');

const safe = new EventEmitter();

// Always add an error listener!
safe.on('error', (err) => {
  console.log('Error caught safely:');
  console.log('  Message:', err.message);
  console.log('  Type:', err.constructor.name);
  // Process continues normally
});

// Now it's safe to emit errors
safe.emit('error', new Error('Something went wrong'));
console.log('Process still running!\n');

console.log('--- Error Event Best Practices ---\n');

class DataProcessor extends EventEmitter {
  async process(data) {
    try {
      this.emit('processing', data);

      // Simulate some work that might fail
      if (!data) {
        throw new Error('Data is required');
      }

      if (typeof data !== 'string') {
        throw new TypeError('Data must be a string');
      }

      const result = data.toUpperCase();
      this.emit('processed', result);

      return result;
    } catch (error) {
      // Emit error event instead of throwing
      this.emit('error', error);
      return null;
    }
  }
}

const processor = new DataProcessor();

// Handle errors
processor.on('error', (err) => {
  console.log(`[Error Handler] ${err.name}: ${err.message}`);
});

// Handle success
processor.on('processed', (result) => {
  console.log('[Success Handler] Result:', result);
});

// Test with various inputs
console.log('Processing valid data:');
processor.process('hello');

console.log('\nProcessing invalid data (null):');
processor.process(null);

console.log('\nProcessing invalid data (number):');
processor.process(123);

console.log('\n--- Multiple Error Handlers ---\n');

const multi = new EventEmitter();

// You can have multiple error handlers
multi.on('error', (err) => {
  console.log('[Logger] Error:', err.message);
});

multi.on('error', (err) => {
  console.log('[Alerting] Sending alert for:', err.message);
});

multi.on('error', (err) => {
  console.log('[Metrics] Recording error event');
});

multi.emit('error', new Error('Multiple handlers'));

console.log('\n--- Error Types ---\n');

const typed = new EventEmitter();

typed.on('error', (err) => {
  if (err instanceof TypeError) {
    console.log('[Type Error]:', err.message);
  } else if (err instanceof RangeError) {
    console.log('[Range Error]:', err.message);
  } else if (err instanceof Error) {
    console.log('[General Error]:', err.message);
  }
});

typed.emit('error', new TypeError('Wrong type'));
typed.emit('error', new RangeError('Out of range'));
typed.emit('error', new Error('Generic error'));

console.log('\n--- Custom Error Objects ---\n');

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const validator = new EventEmitter();

validator.on('error', (err) => {
  if (err instanceof ValidationError) {
    console.log(`[Validation] Field "${err.field}": ${err.message}`);
  } else {
    console.log('[Error]:', err.message);
  }
});

validator.emit('error', new ValidationError('Email is invalid', 'email'));
validator.emit('error', new ValidationError('Password too short', 'password'));

console.log('\n--- Async Error Handling ---\n');

class AsyncProcessor extends EventEmitter {
  async processAsync(data) {
    try {
      console.log('Processing asynchronously...');

      // Simulate async work
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!data) {
            reject(new Error('No data provided'));
          } else {
            resolve();
          }
        }, 100);
      });

      this.emit('success', data);
    } catch (error) {
      this.emit('error', error);
    }
  }
}

const asyncProcessor = new AsyncProcessor();

asyncProcessor.on('error', (err) => {
  console.log('[Async Error]:', err.message);
});

asyncProcessor.on('success', (data) => {
  console.log('[Async Success]:', data);
});

asyncProcessor.processAsync('test data');
asyncProcessor.processAsync(null);

console.log('\n--- Server Example ---\n');

class Server extends EventEmitter {
  start(port) {
    if (port < 1 || port > 65535) {
      this.emit('error', new RangeError(`Invalid port: ${port}`));
      return;
    }

    if (port < 1024) {
      this.emit('error', new Error('Port requires elevated privileges'));
      return;
    }

    console.log(`Server starting on port ${port}...`);
    this.emit('listening', port);
  }
}

const server = new Server();

server.on('error', (err) => {
  console.log('[Server Error]:', err.message);
});

server.on('listening', (port) => {
  console.log('[Server] Listening on port:', port);
});

server.start(-1);      // Invalid port
server.start(80);      // Privileged port
server.start(3000);    // Valid port

// Wait for async operations
setTimeout(() => {
  console.log('\n=== Example Complete ===');
}, 200);

/*
 * Key Takeaways:
 * 1. ALWAYS handle 'error' events - unhandled errors crash the process
 * 2. Error events are special in Node.js - they're the only events that crash if unhandled
 * 3. Use emit('error', err) instead of throwing in async event handlers
 * 4. You can have multiple error handlers for logging, alerting, etc.
 * 5. Pass Error objects (or subclasses) to error events
 * 6. Handle errors gracefully to keep your application running
 * 7. Use custom Error classes for specific error types
 * 8. In async functions, catch errors and emit them as events
 */
