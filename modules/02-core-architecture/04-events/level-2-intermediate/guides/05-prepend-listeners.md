# Prepending Listeners and Execution Order

A comprehensive guide to controlling event listener execution order using prependListener and advanced patterns.

## Table of Contents

1. [Understanding Listener Order](#understanding-listener-order)
2. [The prependListener Method](#the-prependlistener-method)
3. [Use Cases for Prepending](#use-cases-for-prepending)
4. [Middleware Patterns](#middleware-patterns)
5. [Priority Systems](#priority-systems)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)

---

## Understanding Listener Order

### Default Behavior

By default, listeners execute in registration order (FIFO - First In, First Out):

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('event', () => console.log('Listener 1'));
emitter.on('event', () => console.log('Listener 2'));
emitter.on('event', () => console.log('Listener 3'));

emitter.emit('event');
// Output:
// Listener 1
// Listener 2
// Listener 3
```

### Execution Order Matters

Order impacts:

**1. Data Transformation**
```javascript
emitter.on('request', (req) => {
  req.timestamp = Date.now(); // Must run before logger
});

emitter.on('request', (req) => {
  console.log('Request at:', req.timestamp); // Needs timestamp
});
```

**2. Validation**
```javascript
emitter.on('data', (data) => {
  if (!data.valid) return; // Must validate first
});

emitter.on('data', (data) => {
  processData(data); // Assumes data is valid
});
```

**3. Authorization**
```javascript
emitter.on('action', (action) => {
  if (!isAuthorized(action)) {
    throw new Error('Unauthorized');
  }
});

emitter.on('action', (action) => {
  executeAction(action); // Only if authorized
});
```

---

## The prependListener Method

### Basic Usage

```javascript
const emitter = new EventEmitter();

// Add normal listeners
emitter.on('event', () => console.log('Second'));
emitter.on('event', () => console.log('Third'));

// Prepend listener (goes to front)
emitter.prependListener('event', () => console.log('First!'));

emitter.emit('event');
// Output:
// First!
// Second
// Third
```

### prependOnceListener

For one-time prepended listeners:

```javascript
const emitter = new EventEmitter();

emitter.on('event', () => console.log('Always runs'));

emitter.prependOnceListener('event', () => {
  console.log('Runs once, but first');
});

emitter.emit('event');
// Output:
// Runs once, but first
// Always runs

emitter.emit('event');
// Output:
// Always runs
```

### Execution Order Rules

```javascript
const emitter = new EventEmitter();

// 1. Add normal listeners
emitter.on('event', () => console.log('Normal 1'));
emitter.on('event', () => console.log('Normal 2'));

// 2. Prepend listener
emitter.prependListener('event', () => console.log('Prepend 1'));

// 3. Add another normal listener
emitter.on('event', () => console.log('Normal 3'));

// 4. Prepend another (goes before Prepend 1)
emitter.prependListener('event', () => console.log('Prepend 2'));

emitter.emit('event');
// Output:
// Prepend 2  (last prepended = first executed)
// Prepend 1  (first prepended = second executed)
// Normal 1   (first added = third executed)
// Normal 2
// Normal 3
```

**Order: Last prepended → First prepended → First added → Last added**

---

## Use Cases for Prepending

### Use Case 1: Request Preprocessing

```javascript
class Server extends EventEmitter {
  handleRequest(req) {
    this.emit('request', req);
  }
}

const server = new Server();

// Add route handlers first
server.on('request', (req) => {
  console.log('[Route] Processing:', req.url);
  console.log('  Has ID:', req.requestId);
  console.log('  Has timestamp:', req.timestamp);
});

// Then prepend middleware that MUST run first
server.prependListener('request', (req) => {
  console.log('[Middleware] Adding metadata...');
  req.requestId = Math.random().toString(36).substr(2, 9);
  req.timestamp = Date.now();
});

server.handleRequest({ url: '/api/users' });
// Output:
// [Middleware] Adding metadata...
// [Route] Processing: /api/users
//   Has ID: abc123xyz
//   Has timestamp: 1234567890
```

### Use Case 2: Validation

```javascript
class DataService extends EventEmitter {
  processData(data) {
    this.emit('data', data);
  }
}

const service = new DataService();

// Business logic handlers
service.on('data', (data) => {
  console.log('[Processor] Processing:', data.value);
  // Assumes data is valid
});

service.on('data', (data) => {
  console.log('[Logger] Logging data...');
});

// Prepend validation that MUST run first
service.prependListener('data', (data) => {
  console.log('[Validator] Checking data...');

  if (!data.value) {
    data.valid = false;
    console.log('[Validator] Invalid data!');
  } else {
    data.valid = true;
    console.log('[Validator] Valid data');
  }
});

service.processData({ value: 'test' });
console.log();
service.processData({ value: null });
```

### Use Case 3: Circuit Breaker

```javascript
class ResilientService extends EventEmitter {
  constructor() {
    super();
    this.circuitOpen = false;

    // Prepend circuit breaker check
    this.prependListener('operation', (op) => {
      if (this.circuitOpen) {
        console.log('[Circuit] OPEN - Rejecting operation');
        op.rejected = true;
      } else {
        console.log('[Circuit] CLOSED - Allowing operation');
      }
    });
  }

  execute(operation) {
    this.emit('operation', operation);

    if (operation.rejected) {
      console.log('[Service] Operation rejected');
      return false;
    }

    return true;
  }

  openCircuit() {
    this.circuitOpen = true;
    console.log('[Service] Circuit opened');
  }

  closeCircuit() {
    this.circuitOpen = false;
    console.log('[Service] Circuit closed');
  }
}

const service = new ResilientService();

service.on('operation', (op) => {
  if (!op.rejected) {
    console.log('[Handler] Executing:', op.name);
  }
});

service.execute({ name: 'fetch-data' });
console.log();

service.openCircuit();
service.execute({ name: 'fetch-data' });
console.log();

service.closeCircuit();
service.execute({ name: 'fetch-data' });
```

### Use Case 4: Rate Limiting

```javascript
class RateLimitedAPI extends EventEmitter {
  constructor(maxRequests, windowMs) {
    super();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];

    // Prepend rate limit check
    this.prependListener('request', (req) => {
      const now = Date.now();

      // Remove old requests
      this.requests = this.requests.filter(
        time => now - time < this.windowMs
      );

      console.log(`[Rate Limit] ${this.requests.length}/${this.maxRequests} requests used`);

      if (this.requests.length >= this.maxRequests) {
        console.log('[Rate Limit] EXCEEDED - Request blocked');
        req.rateLimited = true;
      } else {
        this.requests.push(now);
      }
    });
  }

  handleRequest(req) {
    this.emit('request', req);

    if (req.rateLimited) {
      console.log('[API] Request blocked by rate limiter');
      return { error: 'Rate limit exceeded' };
    }

    return { success: true };
  }
}

const api = new RateLimitedAPI(3, 1000); // 3 requests per second

api.on('request', (req) => {
  if (!req.rateLimited) {
    console.log('[API] Processing request:', req.id);
  }
});

// Make 5 requests quickly
for (let i = 1; i <= 5; i++) {
  console.log(`\nRequest ${i}:`);
  api.handleRequest({ id: i });
}
```

---

## Middleware Patterns

### Pattern 1: Express-Style Middleware

```javascript
class MiddlewareEmitter extends EventEmitter {
  constructor() {
    super();
    this.middlewareCount = 0;
  }

  use(middleware) {
    // Prepend middleware so it runs before handlers
    this.prependListener('request', (req) => {
      console.log(`[Middleware ${this.middlewareCount}] Running...`);
      middleware(req);
    });

    this.middlewareCount++;
    return this; // Chainable
  }

  handle(handler) {
    this.on('request', handler);
  }

  processRequest(req) {
    this.emit('request', req);
  }
}

const app = new MiddlewareEmitter();

// Add handler first
app.handle((req) => {
  console.log('[Handler] Request:', req.url);
  console.log('  - Logged:', req.logged);
  console.log('  - Authenticated:', req.authenticated);
});

// Add middleware (will run BEFORE handler)
app
  .use((req) => {
    req.logged = true;
    console.log('  Logging enabled');
  })
  .use((req) => {
    req.authenticated = true;
    console.log('  Authentication checked');
  });

app.processRequest({ url: '/api/users' });
```

### Pattern 2: Chain of Responsibility

```javascript
class RequestProcessor extends EventEmitter {
  addHandler(name, shouldHandle, handler) {
    this.prependListener('request', (req) => {
      if (!req.handled && shouldHandle(req)) {
        console.log(`[${name}] Handling request`);
        handler(req);
        req.handled = true;
      }
    });
  }
}

const processor = new RequestProcessor();

// Add handlers in reverse priority order
// (because prepend reverses the order)

processor.addHandler(
  'Default Handler',
  () => true, // Handles everything
  (req) => {
    console.log('  Default handling');
  }
);

processor.addHandler(
  'Admin Handler',
  (req) => req.admin,
  (req) => {
    console.log('  Admin handling');
  }
);

processor.addHandler(
  'API Handler',
  (req) => req.url.startsWith('/api'),
  (req) => {
    console.log('  API handling');
  }
);

console.log('Request 1 (API):');
processor.emit('request', { url: '/api/users', admin: false });

console.log('\nRequest 2 (Admin):');
processor.emit('request', { url: '/admin', admin: true });

console.log('\nRequest 3 (Regular):');
processor.emit('request', { url: '/home', admin: false });
```

---

## Priority Systems

### Simple Priority System

```javascript
class PriorityEmitter extends EventEmitter {
  onHigh(event, listener) {
    this.prependListener(event, listener);
  }

  onMedium(event, listener) {
    this.on(event, listener);
  }

  onLow(event, listener) {
    // Add to end by using on() after prepends
    this.on(event, listener);
  }
}

const emitter = new PriorityEmitter();

// Add in mixed priority order
emitter.onMedium('task', () => console.log('[Medium] Task'));
emitter.onHigh('task', () => console.log('[High] Task'));
emitter.onLow('task', () => console.log('[Low] Task'));
emitter.onHigh('task', () => console.log('[High] Another'));

emitter.emit('task');
// Output:
// [High] Another  (last high prepended)
// [High] Task     (first high prepended)
// [Medium] Task   (medium = normal)
// [Low] Task      (low = normal)
```

### Advanced Priority System

```javascript
class AdvancedPriorityEmitter extends EventEmitter {
  constructor() {
    super();
    this.priorities = new Map();
  }

  onPriority(event, priority, listener) {
    if (!this.priorities.has(event)) {
      this.priorities.set(event, []);
    }

    this.priorities.get(event).push({
      priority,
      listener
    });

    // Re-register all listeners in priority order
    this.removeAllListeners(event);

    const sorted = this.priorities.get(event)
      .sort((a, b) => b.priority - a.priority); // High to low

    sorted.forEach(({ listener }) => {
      this.on(event, listener);
    });
  }
}

const emitter = new AdvancedPriorityEmitter();

emitter.onPriority('task', 5, () => console.log('[Priority 5]'));
emitter.onPriority('task', 10, () => console.log('[Priority 10]'));
emitter.onPriority('task', 1, () => console.log('[Priority 1]'));
emitter.onPriority('task', 8, () => console.log('[Priority 8]'));

emitter.emit('task');
// Output (high to low):
// [Priority 10]
// [Priority 8]
// [Priority 5]
// [Priority 1]
```

---

## Common Patterns

### Pattern 1: Global Error Handler

```javascript
const emitter = new EventEmitter();

// Add specific error handlers
emitter.on('error', (err) => {
  if (err.type === 'database') {
    console.log('[DB Handler] Database error');
  }
});

// Prepend global error handler that runs first
emitter.prependListener('error', (err) => {
  console.log('[Global Handler] Error:', err.message);
  err.handled = true;
});

emitter.emit('error', {
  type: 'database',
  message: 'Connection lost'
});
```

### Pattern 2: Metrics Collection

```javascript
class MetricsEmitter extends EventEmitter {
  constructor() {
    super();
    this.metrics = {};

    // Prepend metrics collection to all events
    const originalEmit = this.emit.bind(this);
    this.emit = function(event, ...args) {
      this.metrics[event] = (this.metrics[event] || 0) + 1;
      return originalEmit(event, ...args);
    };
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

### Pattern 3: Feature Flags

```javascript
class FeatureFlaggedEmitter extends EventEmitter {
  constructor() {
    super();
    this.features = {};

    // Prepend feature flag check
    this.prependListener = ((original) => {
      return function(event, listener) {
        const wrapped = (...args) => {
          const feature = this.features[event];
          if (feature === undefined || feature === true) {
            listener(...args);
          } else {
            console.log(`[Feature] '${event}' is disabled`);
          }
        };

        return original.call(this, event, wrapped);
      };
    })(this.prependListener.bind(this));
  }

  enableFeature(event) {
    this.features[event] = true;
  }

  disableFeature(event) {
    this.features[event] = false;
  }
}
```

---

## Best Practices

### DO:

**1. Use for Middleware**
```javascript
// ✅ Prepend for preprocessing
emitter.prependListener('request', addRequestId);
emitter.prependListener('request', addTimestamp);
emitter.on('request', handleRequest);
```

**2. Use for Validation**
```javascript
// ✅ Validate before processing
emitter.prependListener('data', validateData);
emitter.on('data', processData);
```

**3. Use for Global Handlers**
```javascript
// ✅ Global error logging
emitter.prependListener('error', logError);
emitter.on('error', handleSpecificError);
```

### DON'T:

**1. Don't Rely on Order for Critical Logic**
```javascript
// ❌ Bad: Critical logic depends on order
emitter.on('data', (data) => {
  data.critical = true; // Might not run first!
});

emitter.on('data', (data) => {
  if (data.critical) doSomething(); // Fragile!
});

// ✅ Better: Explicit order or combine
emitter.on('data', (data) => {
  data.critical = true;
  if (data.critical) doSomething();
});
```

**2. Don't Overuse**
```javascript
// ❌ Too complex
emitter.prependListener('event', handler1);
emitter.prependListener('event', handler2);
emitter.on('event', handler3);
emitter.prependListener('event', handler4);
emitter.on('event', handler5);

// ✅ Simpler: Use explicit ordering
const handlers = [handler4, handler2, handler1, handler3, handler5];
handlers.forEach(h => emitter.on('event', h));
```

**3. Don't Mix Patterns**
```javascript
// ❌ Confusing
someEvents.forEach(e => emitter.on(e, handler));
otherEvents.forEach(e => emitter.prependListener(e, handler));

// ✅ Clearer: Be consistent
allEvents.forEach(e => emitter.on(e, handler));
```

---

## Summary

**Key Takeaways:**

1. **prependListener adds to front** of listener array
2. **Default is FIFO** (First In, First Out)
3. **Use for middleware** that must run first
4. **Perfect for validation** before processing
5. **Enable circuit breakers** and rate limiting
6. **Don't overuse** - keep it simple
7. **prependOnceListener** for one-time prepended listeners
8. **Last prepended runs first** among prepended listeners
9. **Document** when order matters
10. **Test** execution order explicitly

Prepending listeners is a powerful tool for controlling execution order. Use it judiciously for middleware, validation, and global handlers where order truly matters!
