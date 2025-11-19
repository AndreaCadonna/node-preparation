/**
 * Example 5: Prepend Listeners
 *
 * This example demonstrates:
 * - Using prependListener() and prependOnceListener()
 * - Understanding listener execution order
 * - Priority event handling
 * - Middleware patterns with prepend
 * - Use cases for prepended listeners
 */

const EventEmitter = require('events');

console.log('=== Prepend Listeners ===\n');

console.log('--- Basic Execution Order ---\n');

const emitter = new EventEmitter();

// Regular listeners execute in registration order
emitter.on('event', () => console.log('Listener 1 (on)'));
emitter.on('event', () => console.log('Listener 2 (on)'));
emitter.on('event', () => console.log('Listener 3 (on)'));

console.log('Emitting with normal listeners:');
emitter.emit('event');

console.log('\n--- Prepending Listeners ---\n');

// prependListener adds to the BEGINNING
emitter.prependListener('event', () => console.log('Prepended Listener (first!)'));

console.log('After prepending:');
emitter.emit('event');

console.log('\n--- Prepend Once ---\n');

const onceEmitter = new EventEmitter();

onceEmitter.on('request', () => console.log('Regular handler'));
onceEmitter.prependOnceListener('request', () => console.log('Prepended once (1st time only)'));

console.log('First emit:');
onceEmitter.emit('request');

console.log('\nSecond emit:');
onceEmitter.emit('request');

console.log('\n--- Use Case: Request Preprocessing ---\n');

class Server extends EventEmitter {
  handleRequest(req) {
    this.emit('request', req);
  }
}

const server = new Server();

// Add normal request handlers
server.on('request', (req) => {
  console.log('[Route Handler] Processing:', req.url);
  console.log('  - Has timestamp:', !!req.timestamp);
  console.log('  - Has requestId:', !!req.requestId);
});

server.on('request', (req) => {
  console.log('[Logger] Logged request:', req.requestId);
});

// Prepend middleware that runs FIRST
server.prependListener('request', (req) => {
  console.log('[Middleware] Adding metadata...');
  req.timestamp = Date.now();
  req.requestId = `req-${Math.random().toString(36).substr(2, 9)}`;
});

console.log('Handling request:');
server.handleRequest({ url: '/api/users', method: 'GET' });

console.log('\n--- Use Case: Validation ---\n');

class DataProcessor extends EventEmitter {
  process(data) {
    this.emit('process', data);
  }
}

const processor = new DataProcessor();

// Business logic handlers
processor.on('process', (data) => {
  console.log('[Processor] Processing data:', data.value);
});

processor.on('process', (data) => {
  console.log('[Processor] Saving to database...');
});

// Prepend validation that runs BEFORE processing
processor.prependListener('process', (data) => {
  console.log('[Validation] Checking data...');

  if (!data.value) {
    console.log('[Validation] ❌ Invalid data - missing value');
    data.valid = false;
  } else {
    console.log('[Validation] ✅ Data valid');
    data.valid = true;
  }
});

console.log('Processing valid data:');
processor.process({ value: 'test data' });

console.log('\nProcessing invalid data:');
processor.process({ value: null });

console.log('\n--- Use Case: Event Middleware Chain ---\n');

class MiddlewareEmitter extends EventEmitter {
  constructor() {
    super();
    this.middlewareOrder = [];
  }

  // Add middleware that runs before regular listeners
  use(name, handler) {
    console.log(`[Setup] Adding middleware: ${name}`);
    this.prependListener('event', (data) => {
      console.log(`[Middleware: ${name}] Running...`);
      handler(data);
    });
    this.middlewareOrder.unshift(name);
  }

  // Add regular event handler
  handle(handler) {
    this.on('event', handler);
  }
}

const app = new MiddlewareEmitter();

// Add regular handler first
app.handle((data) => {
  console.log('[Handler] Final handler:', data);
});

// Add middleware (will run BEFORE handler despite being added after)
app.use('Logger', (data) => {
  data.logged = true;
});

app.use('Auth', (data) => {
  data.authenticated = true;
});

app.use('RateLimit', (data) => {
  data.rateLimitChecked = true;
});

console.log('\nEmitting event:');
app.emit('event', { userId: 123 });

console.log('\n--- Priority Handling ---\n');

class PriorityEmitter extends EventEmitter {
  constructor() {
    super();
  }

  // Add high priority listener (runs first)
  onHigh(event, listener) {
    this.prependListener(event, listener);
  }

  // Add normal priority listener
  onNormal(event, listener) {
    this.on(event, listener);
  }

  // Add low priority listener (runs last, but we'll use append)
  onLow(event, listener) {
    // Normal on() is already "low priority" since it's added at end
    this.on(event, listener);
  }
}

const priority = new PriorityEmitter();

// Add in mixed order
priority.onNormal('task', () => console.log('[Normal] Processing task'));
priority.onHigh('task', () => console.log('[High] Pre-processing task'));
priority.onLow('task', () => console.log('[Low] Post-processing task'));
priority.onHigh('task', () => console.log('[High] Another high priority'));

console.log('Executing with priorities:');
priority.emit('task');

console.log('\n--- Use Case: Circuit Breaker ---\n');

class ResilientService extends EventEmitter {
  constructor() {
    super();
    this.failureCount = 0;
    this.circuitOpen = false;
    this.threshold = 3;

    // Prepend circuit breaker check BEFORE all other handlers
    this.prependListener('operation', (operation) => {
      if (this.circuitOpen) {
        console.log('[Circuit Breaker] Circuit OPEN - rejecting operation');
        operation.rejected = true;
        return;
      }

      console.log('[Circuit Breaker] Circuit CLOSED - allowing operation');
    });
  }

  execute(operation) {
    this.emit('operation', operation);

    if (operation.rejected) {
      console.log('[Service] Operation rejected by circuit breaker');
      return false;
    }

    return true;
  }

  recordFailure() {
    this.failureCount++;
    console.log(`[Service] Failure recorded: ${this.failureCount}/${this.threshold}`);

    if (this.failureCount >= this.threshold) {
      this.openCircuit();
    }
  }

  openCircuit() {
    this.circuitOpen = true;
    console.log('[Circuit Breaker] Circuit opened!');

    // Auto-close after delay
    setTimeout(() => {
      this.closeCircuit();
    }, 2000);
  }

  closeCircuit() {
    this.circuitOpen = false;
    this.failureCount = 0;
    console.log('[Circuit Breaker] Circuit closed - reset');
  }
}

const resilient = new ResilientService();

// Add operation handler (runs AFTER circuit breaker check)
resilient.on('operation', (op) => {
  if (!op.rejected) {
    console.log('[Handler] Executing operation:', op.name);
  }
});

console.log('Operation 1 (should succeed):');
resilient.execute({ name: 'fetch-data' });

console.log('\nRecording failures:');
resilient.recordFailure();
resilient.recordFailure();
resilient.recordFailure(); // Opens circuit

console.log('\nOperation 2 (should be rejected):');
resilient.execute({ name: 'fetch-data' });

console.log('\nWaiting for circuit to close...');
setTimeout(() => {
  console.log('\nOperation 3 (should succeed):');
  resilient.execute({ name: 'fetch-data' });

  console.log('\n=== Example Complete ===');
}, 2100);

/*
 * Key Takeaways:
 * 1. prependListener() adds to the BEGINNING of the listener array
 * 2. Normal on() adds to the END
 * 3. Execution order: prepended → normal → appended
 * 4. prependOnceListener() for one-time prepended listeners
 * 5. Perfect for middleware that must run first
 * 6. Use for validation, authentication, preprocessing
 * 7. Circuit breakers and rate limiters benefit from prepend
 * 8. Can implement priority systems
 * 9. Later prepends come BEFORE earlier prepends
 * 10. Useful for adding "global" handlers after specific ones exist
 */
