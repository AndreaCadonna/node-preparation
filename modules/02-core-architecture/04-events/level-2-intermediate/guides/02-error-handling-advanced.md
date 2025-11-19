# Advanced Error Handling in Event-Driven Code

A comprehensive guide to error handling patterns, recovery strategies, and resilience in event-driven architectures.

## Table of Contents

1. [Error Events Are Special](#error-events-are-special)
2. [Error Handling Strategies](#error-handling-strategies)
3. [Error Recovery Patterns](#error-recovery-patterns)
4. [Circuit Breaker Pattern](#circuit-breaker-pattern)
5. [Error Propagation](#error-propagation)
6. [Production Error Handling](#production-error-handling)
7. [Testing Error Scenarios](#testing-error-scenarios)

---

## Error Events Are Special

### Why Error Events Are Different

Error events are special in Node.js EventEmitter:

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// ❌ This will CRASH the process!
emitter.emit('error', new Error('Oops'));
// Error: Uncaught, unspecified "error" event

// ✅ This is safe
emitter.on('error', (err) => {
  console.error('Error:', err.message);
});

emitter.emit('error', new Error('Safe now'));
```

**Key Points:**
- Emitting 'error' without a listener throws the error
- This causes an unhandled exception
- Process will crash unless caught
- ALWAYS have at least one error listener

### The Rule: Always Handle Errors

```javascript
class SafeService extends EventEmitter {
  constructor() {
    super();

    // Set up error handler in constructor
    this.on('error', this.handleError.bind(this));
  }

  handleError(error) {
    console.error('[Service Error]:', error.message);
    // Log to monitoring service
    // Emit to parent
    // Take recovery action
  }
}
```

---

## Error Handling Strategies

### Strategy 1: Defensive Emit

Wrap emit() in try-catch to prevent listener errors from crashing:

```javascript
class SafeEmitter extends EventEmitter {
  safeEmit(event, ...args) {
    try {
      return this.emit(event, ...args);
    } catch (error) {
      // Listener threw - emit as error event
      if (event !== 'error') {
        this.emit('error', error, { event, args });
      } else {
        // Error in error handler - log and continue
        console.error('Error in error handler:', error);
      }
      return false;
    }
  }
}

const emitter = new SafeEmitter();

emitter.on('data', (data) => {
  throw new Error('Listener error!'); // Won't crash
});

emitter.on('error', (err) => {
  console.error('Caught:', err.message);
});

emitter.safeEmit('data', 'test');
// Output: Caught: Listener error!
```

### Strategy 2: Centralized Error Handler

Route all errors through a central handler:

```javascript
class Application extends EventEmitter {
  constructor() {
    super();

    // Centralized error handling
    this.on('error', this.centralErrorHandler.bind(this));

    // Domain-specific handlers
    this.errorHandlers = {
      database: this.handleDatabaseError.bind(this),
      network: this.handleNetworkError.bind(this),
      validation: this.handleValidationError.bind(this)
    };
  }

  centralErrorHandler(error, context = {}) {
    const errorType = context.type || 'unknown';

    console.error(`[${errorType.toUpperCase()}] Error:`, error.message);

    // Route to specific handler
    const handler = this.errorHandlers[errorType];
    if (handler) {
      handler(error, context);
    }

    // Log to monitoring
    this.logToMonitoring(error, context);

    // Emit specific error event
    this.emit(`error:${errorType}`, error, context);
  }

  handleDatabaseError(error, context) {
    console.log('Attempting database reconnection...');
    this.emit('database:reconnect');
  }

  handleNetworkError(error, context) {
    console.log('Retrying network request...');
    this.emit('network:retry', context);
  }

  handleValidationError(error, context) {
    console.log('Validation failed:', context.field);
  }

  logToMonitoring(error, context) {
    // Send to monitoring service (Sentry, LogRocket, etc.)
    console.log('[Monitoring]', {
      message: error.message,
      stack: error.stack,
      context
    });
  }
}

// Usage
const app = new Application();

// Trigger different error types
app.emit('error', new Error('Connection lost'), {
  type: 'database',
  operation: 'query'
});

app.emit('error', new Error('Timeout'), {
  type: 'network',
  url: '/api/users'
});
```

### Strategy 3: Error Context

Always include context with errors:

```javascript
class DataProcessor extends EventEmitter {
  processItem(item) {
    try {
      this.validate(item);
      this.transform(item);
      this.emit('item:processed', item);
    } catch (error) {
      // Include context for debugging
      this.emit('error', error, {
        operation: 'processItem',
        item: item,
        timestamp: Date.now(),
        stack: error.stack
      });
    }
  }
}

const processor = new DataProcessor();

processor.on('error', (error, context) => {
  console.error('Error processing item:', context.item.id);
  console.error('Operation:', context.operation);
  console.error('Error:', error.message);
  console.error('Time:', new Date(context.timestamp));
});
```

---

## Error Recovery Patterns

### Pattern 1: Retry Logic

Automatically retry failed operations:

```javascript
class RetryEmitter extends EventEmitter {
  emitWithRetry(event, data, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      backoff = true
    } = options;

    let attempts = 0;

    const attempt = () => {
      attempts++;

      try {
        this.emit(event, data);
        this.emit('retry:success', {
          event,
          attempts
        });
      } catch (error) {
        console.log(`Attempt ${attempts}/${maxRetries} failed`);

        if (attempts < maxRetries) {
          const delay = backoff ? retryDelay * attempts : retryDelay;
          setTimeout(attempt, delay);
        } else {
          this.emit('retry:exhausted', {
            event,
            data,
            error,
            attempts
          });
        }
      }
    };

    attempt();
  }
}

const emitter = new RetryEmitter();

let callCount = 0;
emitter.on('operation', (data) => {
  callCount++;
  if (callCount < 3) {
    throw new Error('Failed');
  }
  console.log('Success on attempt', callCount);
});

emitter.on('retry:success', ({ attempts }) => {
  console.log('Succeeded after', attempts, 'attempts');
});

emitter.emitWithRetry('operation', { id: 123 });
```

### Pattern 2: Fallback Handler

Provide fallback when primary fails:

```javascript
class FallbackService extends EventEmitter {
  async fetchData(id) {
    try {
      // Try primary source
      const data = await this.fetchFromPrimary(id);
      this.emit('fetch:success', { source: 'primary', data });
      return data;
    } catch (error) {
      this.emit('fetch:primary:failed', error);

      try {
        // Try fallback
        const data = await this.fetchFromFallback(id);
        this.emit('fetch:success', { source: 'fallback', data });
        return data;
      } catch (fallbackError) {
        this.emit('fetch:failed', {
          primaryError: error,
          fallbackError
        });
        throw fallbackError;
      }
    }
  }

  async fetchFromPrimary(id) {
    // Simulate primary fetch
    throw new Error('Primary unavailable');
  }

  async fetchFromFallback(id) {
    // Simulate fallback fetch
    return { id, source: 'cache' };
  }
}
```

### Pattern 3: Graceful Degradation

Continue with reduced functionality:

```javascript
class ResilientService extends EventEmitter {
  constructor() {
    super();
    this.healthy = true;
    this.degradedMode = false;
  }

  async processRequest(request) {
    if (!this.healthy) {
      this.emit('request:rejected', {
        request,
        reason: 'Service unhealthy'
      });
      return null;
    }

    try {
      const result = await this.fullProcessing(request);
      return result;
    } catch (error) {
      if (this.canDegrade()) {
        this.enterDegradedMode();
        return await this.degradedProcessing(request);
      } else {
        this.enterUnhealthyState();
        throw error;
      }
    }
  }

  enterDegradedMode() {
    this.degradedMode = true;
    this.emit('service:degraded');
    console.log('Entering degraded mode - limited functionality');
  }

  enterUnhealthyState() {
    this.healthy = false;
    this.emit('service:unhealthy');
    console.log('Service unhealthy - rejecting requests');
  }

  async degradedProcessing(request) {
    // Simplified processing
    this.emit('request:degraded', request);
    return { degraded: true, data: request };
  }
}
```

---

## Circuit Breaker Pattern

Prevent cascading failures with circuit breaker:

```javascript
class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();

    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;

    this.startMonitoring();
  }

  async execute(operation) {
    // Check state
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.halfOpen();
      } else {
        this.emit('rejected', { state: this.state });
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= 2) {
        this.close();
      }
    }

    this.emit('success');
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    this.emit('failure', { failures: this.failures });

    if (this.failures >= this.failureThreshold) {
      this.open();
    }
  }

  open() {
    this.state = 'OPEN';
    this.emit('state:changed', 'OPEN');
    this.emit('circuit:opened', {
      failures: this.failures,
      resetTimeout: this.resetTimeout
    });
  }

  close() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.emit('state:changed', 'CLOSED');
    this.emit('circuit:closed');
  }

  halfOpen() {
    this.state = 'HALF_OPEN';
    this.emit('state:changed', 'HALF_OPEN');
    this.emit('circuit:half-open');
  }

  shouldAttemptReset() {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  startMonitoring() {
    setInterval(() => {
      this.emit('stats', {
        state: this.state,
        failures: this.failures,
        successes: this.successes
      });
    }, this.monitoringPeriod);
  }
}

// Usage
const breaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 5000
});

breaker.on('circuit:opened', () => {
  console.log('Circuit opened - stopping requests');
});

breaker.on('circuit:closed', () => {
  console.log('Circuit closed - resuming requests');
});

breaker.on('rejected', () => {
  console.log('Request rejected - circuit is open');
});
```

---

## Error Propagation

### Pattern: Parent-Child Error Handling

```javascript
class ChildService extends EventEmitter {
  doWork() {
    try {
      // Work that might fail
      throw new Error('Child error');
    } catch (error) {
      this.emit('error', error);
    }
  }
}

class ParentService extends EventEmitter {
  constructor() {
    super();
    this.child = new ChildService();

    // Propagate child errors
    this.child.on('error', (error) => {
      this.emit('error', error, {
        source: 'child',
        service: 'ChildService'
      });
    });
  }
}

const parent = new ParentService();

parent.on('error', (error, context) => {
  console.error('Parent caught error from:', context.service);
  console.error('Error:', error.message);
});
```

---

## Production Error Handling

### Complete Production Example

```javascript
class ProductionService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;

    // Setup comprehensive error handling
    this.setupErrorHandling();
    this.setupMonitoring();
  }

  setupErrorHandling() {
    this.on('error', (error, context = {}) => {
      // Log with full context
      this.logError(error, context);

      // Alert if critical
      if (context.critical) {
        this.alertTeam(error, context);
      }

      // Attempt recovery
      if (context.recoverable) {
        this.attemptRecovery(context);
      }
    });
  }

  setupMonitoring() {
    // Track error rates
    this.errorCount = 0;
    this.errorWindow = [];

    setInterval(() => {
      const recentErrors = this.errorWindow.filter(
        t => Date.now() - t < 60000
      );

      if (recentErrors.length > 50) {
        this.emit('error:rate:high', {
          count: recentErrors.length,
          window: '1 minute'
        });
      }

      this.errorWindow = recentErrors;
    }, 10000);
  }

  logError(error, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      service: this.constructor.name
    };

    console.error('[ERROR]', JSON.stringify(logEntry, null, 2));

    // Send to logging service
    this.sendToLoggingService(logEntry);
  }

  alertTeam(error, context) {
    // Send to PagerDuty, Slack, etc.
    console.log('[ALERT] Critical error:', error.message);
  }

  attemptRecovery(context) {
    console.log('[RECOVERY] Attempting recovery for:', context.operation);
  }

  sendToLoggingService(logEntry) {
    // Send to Datadog, Splunk, ELK, etc.
  }
}
```

---

## Testing Error Scenarios

### Test Error Handling

```javascript
const assert = require('assert');

describe('Error Handling', () => {
  it('should emit error event on failure', (done) => {
    const service = new MyService();

    service.on('error', (error) => {
      assert.equal(error.message, 'Expected error');
      done();
    });

    service.causeError();
  });

  it('should recover from errors', (done) => {
    const service = new ResilientService();

    service.on('recovered', () => {
      done();
    });

    service.on('error', (error) => {
      assert.ok(error);
    });

    service.failThenRecover();
  });
});
```

---

## Summary

**Key Takeaways:**

1. **Always handle error events** - they crash without listeners
2. **Include context with errors** - aids debugging
3. **Implement retry logic** for transient failures
4. **Use circuit breakers** to prevent cascading failures
5. **Centralize error handling** for consistency
6. **Monitor error rates** in production
7. **Have fallback strategies** for critical operations
8. **Test error scenarios** thoroughly
9. **Log with full context** for debugging
10. **Set up alerting** for critical errors

Error handling is not an afterthought - it's a core part of resilient systems. Proper error handling makes the difference between a system that crashes and one that gracefully handles failures!
