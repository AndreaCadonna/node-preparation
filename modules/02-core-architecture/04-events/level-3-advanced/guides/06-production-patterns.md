# Production Event Patterns

Battle-tested patterns for building resilient, scalable event systems in production.

## Overview

Production event systems require more than basic EventEmitter usage. This guide covers essential patterns for reliability, performance, and maintainability.

## Resilience Patterns

### 1. Circuit Breaker

Prevent cascading failures by breaking the circuit when errors exceed a threshold:

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.failures = new Map();
  }

  execute(eventName, fn) {
    const state = this.getState(eventName);

    if (state === 'open') {
      throw new Error(`Circuit open for ${eventName}`);
    }

    try {
      const result = fn();
      this.onSuccess(eventName);
      return result;
    } catch (error) {
      this.onFailure(eventName);
      throw error;
    }
  }

  getState(eventName) {
    const failure = this.failures.get(eventName);

    if (!failure) return 'closed';

    if (failure.count >= this.threshold) {
      const now = Date.now();
      if (now - failure.openedAt < this.timeout) {
        return 'open';
      }
      this.reset(eventName);
    }

    return 'closed';
  }

  onSuccess(eventName) {
    this.failures.delete(eventName);
  }

  onFailure(eventName) {
    const failure = this.failures.get(eventName) || { count: 0 };
    failure.count++;
    failure.openedAt = Date.now();
    this.failures.set(eventName, failure);
  }

  reset(eventName) {
    this.failures.delete(eventName);
  }
}
```

### 2. Retry with Exponential Backoff

```javascript
class RetryableEmitter extends EventEmitter {
  async emitWithRetry(event, data, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const baseDelay = options.baseDelay || 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return this.emit(event, data);
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;

        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

### 3. Bulkhead Pattern

Isolate failures to prevent total system collapse:

```javascript
class BulkheadEventBus extends EventEmitter {
  constructor() {
    super();
    this.pools = new Map();
  }

  createPool(name, size = 10) {
    this.pools.set(name, {
      size,
      active: 0,
      queue: []
    });
  }

  async executeInPool(poolName, fn) {
    const pool = this.pools.get(poolName);

    if (!pool) {
      throw new Error(`Pool ${poolName} not found`);
    }

    if (pool.active >= pool.size) {
      // Queue or reject
      return new Promise((resolve, reject) => {
        pool.queue.push({ fn, resolve, reject });
      });
    }

    pool.active++;

    try {
      const result = await fn();
      pool.active--;
      this.processQueue(poolName);
      return result;
    } catch (error) {
      pool.active--;
      this.processQueue(poolName);
      throw error;
    }
  }

  processQueue(poolName) {
    const pool = this.pools.get(poolName);

    if (pool.queue.length > 0 && pool.active < pool.size) {
      const { fn, resolve, reject } = pool.queue.shift();
      this.executeInPool(poolName, fn).then(resolve).catch(reject);
    }
  }
}
```

## Performance Patterns

### 1. Event Batching

```javascript
class BatchingEventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.batchSize = options.batchSize || 100;
    this.batchTimeout = options.batchTimeout || 1000;
    this.batches = new Map();
  }

  batchEmit(event, data) {
    if (!this.batches.has(event)) {
      this.batches.set(event, {
        items: [],
        timer: setTimeout(() => this.flush(event), this.batchTimeout)
      });
    }

    const batch = this.batches.get(event);
    batch.items.push(data);

    if (batch.items.length >= this.batchSize) {
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

  shutdown() {
    // Flush all pending batches
    this.batches.forEach((_, event) => this.flush(event));
  }
}
```

### 2. Rate Limiting

```javascript
class RateLimitedEventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.rateLimit = options.rateLimit || 1000;
    this.window = options.window || 1000;
    this.counters = new Map();
  }

  emit(event, ...args) {
    if (!this.checkRateLimit(event)) {
      console.warn(`Rate limit exceeded for ${event}`);
      this.emit('rateLimit:exceeded', { event });
      return false;
    }

    return super.emit(event, ...args);
  }

  checkRateLimit(event) {
    const now = Date.now();
    const counter = this.counters.get(event);

    if (!counter) {
      this.counters.set(event, { count: 1, windowStart: now });
      return true;
    }

    if (now - counter.windowStart >= this.window) {
      counter.count = 1;
      counter.windowStart = now;
      return true;
    }

    if (counter.count >= this.rateLimit) {
      return false;
    }

    counter.count++;
    return true;
  }
}
```

### 3. Debouncing and Throttling

```javascript
class DebouncedThrottledEmitter extends EventEmitter {
  constructor() {
    super();
    this.debounceTimers = new Map();
    this.throttleTimers = new Map();
  }

  debounceEmit(event, data, wait = 300) {
    if (this.debounceTimers.has(event)) {
      clearTimeout(this.debounceTimers.get(event));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(event);
      this.emit(event, data);
    }, wait);

    this.debounceTimers.set(event, timer);
  }

  throttleEmit(event, data, wait = 1000) {
    if (this.throttleTimers.has(event)) {
      return; // Still in cooldown
    }

    this.emit(event, data);

    const timer = setTimeout(() => {
      this.throttleTimers.delete(event);
    }, wait);

    this.throttleTimers.set(event, timer);
  }
}
```

## Observability Patterns

### 1. Event Logging

```javascript
class LoggedEventBus extends EventEmitter {
  emit(event, ...args) {
    logger.info('Event emitted', {
      event,
      timestamp: Date.now(),
      listenerCount: this.listenerCount(event),
      args: this.sanitizeArgs(args)
    });

    return super.emit(event, ...args);
  }

  sanitizeArgs(args) {
    // Remove sensitive data
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const sanitized = { ...arg };
        delete sanitized.password;
        delete sanitized.token;
        return sanitized;
      }
      return arg;
    });
  }
}
```

### 2. Metrics Collection

```javascript
class MetricsEventBus extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      emissions: new Map(),
      durations: new Map(),
      errors: new Map()
    };
  }

  emit(event, ...args) {
    const start = process.hrtime.bigint();

    // Count emissions
    this.metrics.emissions.set(
      event,
      (this.metrics.emissions.get(event) || 0) + 1
    );

    try {
      const result = super.emit(event, ...args);

      // Record duration
      const duration = process.hrtime.bigint() - start;
      if (!this.metrics.durations.has(event)) {
        this.metrics.durations.set(event, []);
      }
      this.metrics.durations.get(event).push(Number(duration));

      return result;
    } catch (error) {
      // Count errors
      this.metrics.errors.set(
        event,
        (this.metrics.errors.get(event) || 0) + 1
      );
      throw error;
    }
  }

  getMetrics() {
    const metrics = {};

    this.metrics.emissions.forEach((count, event) => {
      const durations = this.metrics.durations.get(event) || [];
      const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b) / durations.length / 1000000
        : 0;

      metrics[event] = {
        emissions: count,
        errors: this.metrics.errors.get(event) || 0,
        avgDurationMs: avgDuration.toFixed(2)
      };
    });

    return metrics;
  }
}
```

### 3. Distributed Tracing

```javascript
class TracedEventBus extends EventEmitter {
  emit(event, ...args) {
    const traceId = this.generateTraceId();
    const span = tracer.startSpan(event, { traceId });

    span.setTag('event.name', event);
    span.setTag('event.listenerCount', this.listenerCount(event));

    try {
      const result = super.emit(event, ...args);
      span.setTag('event.success', true);
      return result;
    } catch (error) {
      span.setTag('event.error', true);
      span.log({ error: error.message });
      throw error;
    } finally {
      span.finish();
    }
  }

  generateTraceId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Operational Patterns

### 1. Graceful Shutdown

```javascript
class GracefulEventBus extends EventEmitter {
  constructor() {
    super();
    this.isShuttingDown = false;
    this.pendingEmissions = 0;
  }

  emit(event, ...args) {
    if (this.isShuttingDown) {
      console.warn(`Rejecting ${event} during shutdown`);
      return false;
    }

    this.pendingEmissions++;

    try {
      return super.emit(event, ...args);
    } finally {
      this.pendingEmissions--;
    }
  }

  async shutdown(timeout = 5000) {
    this.isShuttingDown = true;
    this.emit('system:shuttingDown');

    const start = Date.now();

    while (this.pendingEmissions > 0) {
      if (Date.now() - start > timeout) {
        console.warn(`Shutdown timeout: ${this.pendingEmissions} pending`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.removeAllListeners();
    this.emit('system:shutdown');
  }
}
```

### 2. Health Checks

```javascript
class HealthCheckEventBus extends EventEmitter {
  getHealth() {
    const eventNames = this.eventNames();
    const totalListeners = eventNames.reduce(
      (sum, event) => sum + this.listenerCount(event),
      0
    );

    return {
      healthy: true,
      uptime: process.uptime(),
      events: eventNames.length,
      listeners: totalListeners,
      memory: process.memoryUsage()
    };
  }
}
```

### 3. Feature Flags

```javascript
class FeatureFlaggedEventBus extends EventEmitter {
  constructor(featureFlags = {}) {
    super();
    this.featureFlags = featureFlags;
  }

  emit(event, ...args) {
    const flag = this.featureFlags[event];

    if (flag === false) {
      console.log(`Event ${event} disabled by feature flag`);
      return false;
    }

    return super.emit(event, ...args);
  }

  setFeatureFlag(event, enabled) {
    this.featureFlags[event] = enabled;
  }
}
```

## Testing Patterns

### 1. Event Spy

```javascript
class SpyEventBus extends EventEmitter {
  constructor() {
    super();
    this.emittedEvents = [];
  }

  emit(event, ...args) {
    this.emittedEvents.push({
      event,
      args,
      timestamp: Date.now()
    });

    return super.emit(event, ...args);
  }

  getEmittedEvents(event) {
    return this.emittedEvents.filter(e => e.event === event);
  }

  clearHistory() {
    this.emittedEvents = [];
  }
}
```

### 2. Mock Listeners

```javascript
class TestEventBus extends EventEmitter {
  createMockListener() {
    const calls = [];

    const listener = (...args) => {
      calls.push(args);
    };

    listener.calls = calls;
    listener.callCount = () => calls.length;
    listener.lastCall = () => calls[calls.length - 1];

    return listener;
  }
}
```

## Summary

**Production Checklist:**

- [ ] Implement circuit breakers
- [ ] Add retry logic with backoff
- [ ] Use rate limiting
- [ ] Batch high-frequency events
- [ ] Add comprehensive logging
- [ ] Collect metrics
- [ ] Enable distributed tracing
- [ ] Implement graceful shutdown
- [ ] Add health checks
- [ ] Use feature flags
- [ ] Test thoroughly
- [ ] Monitor in production

Production event systems require resilience, performance optimization, and comprehensive observability. These patterns provide a solid foundation for building robust event-driven applications.
