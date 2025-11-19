# Level 3: Events Advanced

Master advanced event-driven patterns, performance optimization, and production-ready event systems.

## Learning Objectives

By the end of this level, you will be able to:
- Detect and prevent memory leaks from event listeners
- Optimize event emitter performance for high-throughput systems
- Implement event sourcing patterns
- Build publish-subscribe systems
- Design event-driven architectures
- Apply production-ready event patterns
- Handle complex async event flows
- Implement domain-driven events

## Overview

Level 3 takes your event knowledge to production level. You'll learn how to build high-performance, scalable event systems, avoid common pitfalls like memory leaks, and implement advanced patterns like event sourcing and pub-sub that power real-world applications.

---

## Topics Covered

### 1. Memory Leak Detection and Prevention
- Common memory leak patterns
- Using process.memoryUsage() for monitoring
- Detecting unbounded listener growth
- Automatic cleanup strategies
- WeakMap and WeakRef for event handlers
- Testing for memory leaks

### 2. Performance Optimization
- Event emitter performance characteristics
- Optimizing high-frequency events
- Batching and debouncing events
- Event pooling strategies
- Measuring event overhead
- Comparing alternative patterns

### 3. Event Sourcing Pattern
- Understanding event sourcing
- Building event stores
- Event replay and rehydration
- Snapshots and optimization
- CQRS integration
- Practical event sourcing applications

### 4. Publish-Subscribe Systems
- Pub-sub vs observer pattern
- Building a message bus
- Topic-based routing
- Wildcard subscriptions
- Message persistence
- Distributed pub-sub considerations

### 5. Event-Driven Architecture
- Designing event-driven systems
- Domain events and bounded contexts
- Event storming and modeling
- Saga pattern for distributed transactions
- Event choreography vs orchestration
- Microservices communication

### 6. Production Patterns
- Error handling strategies
- Event monitoring and observability
- Circuit breakers for events
- Rate limiting and backpressure
- Graceful degradation
- Testing event-driven systems

---

## Examples

This level includes 8 advanced examples:

1. **[01-memory-leak-detection.js](./examples/01-memory-leak-detection.js)**
   - Detecting memory leaks in event listeners
   - Using memory profiling tools
   - Automatic leak detection

2. **[02-performance-optimization.js](./examples/02-performance-optimization.js)**
   - Benchmarking event emitters
   - Optimizing high-frequency events
   - Performance comparison patterns

3. **[03-event-batching.js](./examples/03-event-batching.js)**
   - Batching events for efficiency
   - Debouncing and throttling
   - Aggregating event data

4. **[04-event-sourcing.js](./examples/04-event-sourcing.js)**
   - Implementing event sourcing
   - Event store and replay
   - State reconstruction from events

5. **[05-pubsub-system.js](./examples/05-pubsub-system.js)**
   - Building a publish-subscribe system
   - Topic-based routing
   - Message filtering

6. **[06-event-bus.js](./examples/06-event-bus.js)**
   - Creating a centralized event bus
   - Cross-module communication
   - Namespace isolation

7. **[07-saga-pattern.js](./examples/07-saga-pattern.js)**
   - Implementing saga pattern
   - Distributed transactions
   - Compensation logic

8. **[08-production-system.js](./examples/08-production-system.js)**
   - Complete production-ready event system
   - Error handling and monitoring
   - Circuit breakers and rate limiting

### Running Examples

```bash
# Run any example
node examples/01-memory-leak-detection.js

# Run all examples
for file in examples/*.js; do
  echo "Running $file"
  node "$file"
  echo "---"
done
```

---

## Exercises

Test your advanced skills with 5 production-level exercises:

1. **[exercise-1.js](./exercises/exercise-1.js)** - Detect and fix memory leaks
2. **[exercise-2.js](./exercises/exercise-2.js)** - Build a high-performance event bus
3. **[exercise-3.js](./exercises/exercise-3.js)** - Implement event sourcing
4. **[exercise-4.js](./exercises/exercise-4.js)** - Create a pub-sub system
5. **[exercise-5.js](./exercises/exercise-5.js)** - Build an event-driven application

### Exercise Guidelines

1. Read the exercise description in each file
2. Write your solution where indicated
3. Test your solution thoroughly
4. Consider edge cases and error handling
5. Compare with the solution only after attempting

### Checking Solutions

Solutions are available in the `solutions/` directory:

```bash
# After attempting, compare your solution
node solutions/exercise-1-solution.js
```

---

## Conceptual Guides

For deeper understanding, read these advanced guides:

1. **[01-memory-leaks.md](./guides/01-memory-leaks.md)**
   - Understanding event listener memory leaks
   - Detection techniques
   - Prevention strategies

2. **[02-performance-optimization.md](./guides/02-performance-optimization.md)**
   - Event emitter performance characteristics
   - Optimization techniques
   - Benchmarking methods

3. **[03-event-sourcing.md](./guides/03-event-sourcing.md)**
   - Event sourcing pattern explained
   - Benefits and trade-offs
   - Implementation strategies

4. **[04-pubsub-pattern.md](./guides/04-pubsub-pattern.md)**
   - Publish-subscribe pattern deep dive
   - Use cases and patterns
   - Implementation approaches

5. **[05-event-driven-architecture.md](./guides/05-event-driven-architecture.md)**
   - Designing event-driven systems
   - Domain events and boundaries
   - Best practices

6. **[06-production-patterns.md](./guides/06-production-patterns.md)**
   - Production-ready patterns
   - Error handling and resilience
   - Monitoring and observability

---

## Key Concepts

### Memory Leak Detection

```javascript
const EventEmitter = require('events');

class LeakDetector extends EventEmitter {
  constructor(maxListeners = 10) {
    super();
    this.setMaxListeners(maxListeners);
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      const eventNames = this.eventNames();
      eventNames.forEach(event => {
        const count = this.listenerCount(event);
        if (count > this.getMaxListeners()) {
          console.warn(`Potential leak: ${event} has ${count} listeners`);
        }
      });
    }, 5000);
  }
}
```

### Event Sourcing

```javascript
class EventStore extends EventEmitter {
  constructor() {
    super();
    this.events = [];
  }

  append(event) {
    event.timestamp = Date.now();
    event.version = this.events.length + 1;
    this.events.push(event);
    this.emit('event:appended', event);
    this.emit(event.type, event);
  }

  replay(fromVersion = 0) {
    return this.events
      .filter(e => e.version > fromVersion)
      .forEach(e => this.emit(e.type, e));
  }

  getState(reducer, initialState = {}) {
    return this.events.reduce(reducer, initialState);
  }
}
```

### Pub-Sub Pattern

```javascript
class PubSub extends EventEmitter {
  constructor() {
    super();
    this.topics = new Map();
  }

  publish(topic, message) {
    this.emit(`topic:${topic}`, message);

    // Support wildcards: topic:user:* matches topic:user:created
    const parts = topic.split(':');
    for (let i = 1; i <= parts.length; i++) {
      const pattern = parts.slice(0, i).join(':') + ':*';
      this.emit(`pattern:${pattern}`, message);
    }
  }

  subscribe(topic, handler) {
    if (topic.includes('*')) {
      this.on(`pattern:${topic}`, handler);
    } else {
      this.on(`topic:${topic}`, handler);
    }
  }

  unsubscribe(topic, handler) {
    if (topic.includes('*')) {
      this.off(`pattern:${topic}`, handler);
    } else {
      this.off(`topic:${topic}`, handler);
    }
  }
}
```

### High-Performance Event Bus

```javascript
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
    this.metrics = new Map();
  }

  emit(event, ...args) {
    const start = process.hrtime.bigint();
    const result = super.emit(event, ...args);
    const duration = process.hrtime.bigint() - start;

    this.recordMetric(event, duration);
    return result;
  }

  recordMetric(event, duration) {
    if (!this.metrics.has(event)) {
      this.metrics.set(event, { count: 0, totalTime: 0n });
    }
    const metric = this.metrics.get(event);
    metric.count++;
    metric.totalTime += duration;
  }

  getMetrics(event) {
    const metric = this.metrics.get(event);
    if (!metric) return null;

    return {
      count: metric.count,
      avgTime: Number(metric.totalTime / BigInt(metric.count)) / 1000000,
      totalTime: Number(metric.totalTime) / 1000000
    };
  }
}
```

---

## Common Patterns

### Pattern 1: Memory-Safe Event Handlers

```javascript
class MemorySafeEmitter extends EventEmitter {
  constructor() {
    super();
    this.handlerRegistry = new WeakMap();
  }

  safeOn(event, handler, context) {
    const boundHandler = handler.bind(context);

    // Store reference for cleanup
    if (!this.handlerRegistry.has(context)) {
      this.handlerRegistry.set(context, new Map());
    }
    this.handlerRegistry.get(context).set(event, boundHandler);

    this.on(event, boundHandler);
    return boundHandler;
  }

  cleanup(context) {
    const handlers = this.handlerRegistry.get(context);
    if (handlers) {
      handlers.forEach((handler, event) => {
        this.off(event, handler);
      });
      this.handlerRegistry.delete(context);
    }
  }
}
```

### Pattern 2: Event Batching for Performance

```javascript
class BatchedEmitter extends EventEmitter {
  constructor(batchInterval = 100) {
    super();
    this.batches = new Map();
    this.batchInterval = batchInterval;
  }

  batchEmit(event, data) {
    if (!this.batches.has(event)) {
      this.batches.set(event, []);

      setTimeout(() => {
        const batch = this.batches.get(event);
        this.batches.delete(event);
        this.emit(event, batch);
      }, this.batchInterval);
    }

    this.batches.get(event).push(data);
  }
}
```

### Pattern 3: Circuit Breaker for Events

```javascript
class CircuitBreakerEmitter extends EventEmitter {
  constructor(threshold = 5, timeout = 60000) {
    super();
    this.failures = new Map();
    this.threshold = threshold;
    this.timeout = timeout;
  }

  safeEmit(event, ...args) {
    const state = this.getCircuitState(event);

    if (state === 'open') {
      console.warn(`Circuit open for ${event}, skipping emit`);
      return false;
    }

    try {
      const result = this.emit(event, ...args);
      this.recordSuccess(event);
      return result;
    } catch (error) {
      this.recordFailure(event);
      throw error;
    }
  }

  getCircuitState(event) {
    const failure = this.failures.get(event);
    if (!failure) return 'closed';

    if (failure.count >= this.threshold) {
      if (Date.now() - failure.openedAt < this.timeout) {
        return 'open';
      }
      this.failures.delete(event);
    }

    return 'closed';
  }

  recordFailure(event) {
    const failure = this.failures.get(event) || { count: 0 };
    failure.count++;
    failure.openedAt = Date.now();
    this.failures.set(event, failure);
  }

  recordSuccess(event) {
    this.failures.delete(event);
  }
}
```

---

## Best Practices

### ✅ DO

- Monitor memory usage in production
- Set appropriate maxListeners based on use case
- Implement cleanup strategies for long-lived objects
- Use WeakMap for handler references when appropriate
- Batch high-frequency events
- Implement circuit breakers for resilience
- Monitor event performance metrics
- Test for memory leaks regularly
- Use namespacing for complex systems
- Implement proper error boundaries

### ❌ DON'T

- Ignore maxListeners warnings
- Create unbounded event listeners
- Forget to clean up in long-running processes
- Emit high-frequency events without batching
- Use events for synchronous return values
- Ignore event errors in production
- Skip performance testing
- Create circular event dependencies
- Use events when simple functions suffice
- Forget to handle backpressure

---

## Advanced Mistakes to Avoid

### Mistake 1: Memory Leak from Closures

```javascript
// ❌ Wrong - creates memory leak
class DataProcessor {
  constructor(emitter) {
    this.data = new Array(1000000).fill('x');

    // This closure captures 'this' and prevents garbage collection
    emitter.on('process', () => {
      console.log(this.data.length);
    });
  }
}

// ✅ Correct - clean up when done
class DataProcessor {
  constructor(emitter) {
    this.data = new Array(1000000).fill('x');
    this.emitter = emitter;
    this.handler = () => console.log(this.data.length);

    emitter.on('process', this.handler);
  }

  cleanup() {
    this.emitter.off('process', this.handler);
    this.data = null;
  }
}
```

### Mistake 2: Event Flooding

```javascript
// ❌ Wrong - floods event system
setInterval(() => {
  for (let i = 0; i < 1000; i++) {
    emitter.emit('data', i);
  }
}, 100);

// ✅ Correct - batch events
const batcher = new BatchedEmitter();
setInterval(() => {
  for (let i = 0; i < 1000; i++) {
    batcher.batchEmit('data', i);
  }
}, 100);
```

### Mistake 3: Synchronous Heavy Processing

```javascript
// ❌ Wrong - blocks event loop
emitter.on('process', (data) => {
  // Heavy synchronous work
  const result = expensiveCalculation(data);
  return result;
});

// ✅ Correct - use async or worker threads
emitter.on('process', async (data) => {
  setImmediate(() => {
    const result = expensiveCalculation(data);
    emitter.emit('result', result);
  });
});
```

---

## Testing Your Knowledge

After completing this level, you should be able to answer:

1. How do you detect memory leaks in event listeners?
2. What are the performance implications of many event listeners?
3. How does event sourcing differ from traditional state management?
4. When should you use pub-sub vs direct EventEmitter?
5. How do you implement backpressure in event systems?
6. What is the saga pattern and when should you use it?
7. How do you test event-driven systems effectively?
8. What are the trade-offs of event-driven architecture?
9. How do you handle errors in distributed event systems?
10. What monitoring is essential for production event systems?

---

## Next Steps

Once you've completed this level:

1. ✅ Complete all exercises
2. ✅ Read all conceptual guides
3. ✅ Implement a production event system
4. ✅ Profile and optimize your event code
5. ➡️ Apply patterns to real projects
6. ➡️ Explore event-driven frameworks (EventEmitter2, EventEmitter3)
7. ➡️ Study distributed event systems (Kafka, RabbitMQ)

---

## Time Estimate

- **Examples**: 45-60 minutes
- **Exercises**: 90-120 minutes
- **Guides**: 60-90 minutes
- **Total**: 3-4 hours

---

## Summary

Level 3 Advanced covers production-ready event patterns:
- Memory leak detection and prevention
- Performance optimization techniques
- Event sourcing implementation
- Pub-sub system design
- Event-driven architecture patterns
- Production best practices

Master these advanced topics, and you'll be ready to build scalable, maintainable event-driven systems in production. You'll understand not just how events work, but how to use them effectively in complex, real-world applications!
