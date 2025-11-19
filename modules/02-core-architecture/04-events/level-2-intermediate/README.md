# Level 2: Events Intermediate

Master advanced event patterns and build production-ready event-driven systems.

## Learning Objectives

By the end of this level, you will be able to:
- Extend EventEmitter to create custom event-driven classes
- Implement advanced error handling strategies
- Manage listener lifecycle and prevent memory leaks
- Implement event namespacing patterns
- Use prepend listeners for priority handling
- Configure and manage maximum listeners
- Build event middleware systems
- Create production-ready event architectures

## Overview

Level 2 builds on the fundamentals to teach you advanced event patterns used in real-world Node.js applications. You'll learn how to build robust, scalable event systems that handle errors gracefully, manage resources efficiently, and provide extensibility through middleware patterns.

---

## Topics Covered

### 1. Extending EventEmitter
- Creating custom classes that inherit from EventEmitter
- Best practices for class-based emitters
- Encapsulating business logic with events
- Real-world patterns and use cases
- When to extend vs when to compose

### 2. Advanced Error Handling
- Error event patterns and strategies
- Centralized error handling
- Error recovery and retry patterns
- Error propagation in event chains
- Defensive error handling techniques

### 3. Listener Management
- Tracking and managing listeners
- Preventing memory leaks
- Listener cleanup strategies
- Maximum listeners configuration
- Debugging listener issues
- Performance implications

### 4. Event Namespacing
- Organizing events with namespaces
- Colon notation conventions (e.g., 'user:created')
- Pattern matching and wildcards
- Event hierarchies
- Namespace best practices

### 5. Prepending Listeners
- Understanding listener execution order
- Using prependListener() and prependOnceListener()
- Priority event handling
- Use cases for prepended listeners
- Event middleware patterns

### 6. Maximum Listeners Configuration
- Understanding the max listeners warning
- When to increase the limit
- Using setMaxListeners()
- Global defaults vs instance configuration
- Memory leak prevention

---

## Examples

This level includes 8 comprehensive examples:

1. **[01-extending-eventemitter.js](./examples/01-extending-eventemitter.js)**
   - Creating custom EventEmitter classes
   - Real-world class patterns
   - Best practices for inheritance

2. **[02-error-handling-patterns.js](./examples/02-error-handling-patterns.js)**
   - Advanced error event handling
   - Error recovery strategies
   - Centralized error management

3. **[03-listener-lifecycle.js](./examples/03-listener-lifecycle.js)**
   - Managing listener lifecycle
   - Preventing memory leaks
   - Cleanup patterns

4. **[04-event-namespacing.js](./examples/04-event-namespacing.js)**
   - Organizing events with namespaces
   - Pattern conventions
   - Event hierarchies

5. **[05-prepend-listeners.js](./examples/05-prepend-listeners.js)**
   - Using prependListener()
   - Priority handling
   - Execution order control

6. **[06-max-listeners.js](./examples/06-max-listeners.js)**
   - Configuring maximum listeners
   - Warning prevention
   - Memory leak detection

7. **[07-event-middleware.js](./examples/07-event-middleware.js)**
   - Building middleware systems
   - Event preprocessing
   - Middleware chains

8. **[08-production-patterns.js](./examples/08-production-patterns.js)**
   - Production-ready patterns
   - Combining all concepts
   - Real-world application

### Running Examples

```bash
# Run any example
node examples/01-extending-eventemitter.js

# Run all examples
for file in examples/*.js; do
  echo "Running $file"
  node "$file"
  echo "---"
done
```

---

## Exercises

Test your understanding with 5 practical exercises:

1. **[exercise-1.js](./exercises/exercise-1.js)** - Build a custom event-driven class
2. **[exercise-2.js](./exercises/exercise-2.js)** - Implement error handling and recovery
3. **[exercise-3.js](./exercises/exercise-3.js)** - Create a listener management system
4. **[exercise-4.js](./exercises/exercise-4.js)** - Implement event namespacing
5. **[exercise-5.js](./exercises/exercise-5.js)** - Build an event middleware system

### Exercise Guidelines

1. Read the exercise description in each file
2. Write your solution where indicated
3. Test your solution by running the file
4. Compare with the solution only after attempting

### Checking Solutions

Solutions are available in the `solutions/` directory:

```bash
# After attempting, compare your solution
node solutions/exercise-1-solution.js
```

---

## Conceptual Guides

For deeper understanding, read these guides:

1. **[01-extending-eventemitter.md](./guides/01-extending-eventemitter.md)**
   - When and how to extend EventEmitter
   - Design patterns for custom emitters
   - Best practices and pitfalls

2. **[02-error-handling-advanced.md](./guides/02-error-handling-advanced.md)**
   - Advanced error patterns
   - Error recovery strategies
   - Production error handling

3. **[03-listener-management.md](./guides/03-listener-management.md)**
   - Listener lifecycle management
   - Memory leak prevention
   - Performance optimization

4. **[04-event-namespacing.md](./guides/04-event-namespacing.md)**
   - Organizing events effectively
   - Naming conventions
   - Namespace patterns

5. **[05-prepend-listeners.md](./guides/05-prepend-listeners.md)**
   - Controlling execution order
   - Priority handling patterns
   - Middleware use cases

---

## Key Concepts

### Extending EventEmitter

```javascript
const EventEmitter = require('events');

class UserService extends EventEmitter {
  constructor() {
    super(); // Must call super()!
    this.users = new Map();
  }

  createUser(username, email) {
    const user = { username, email, id: Date.now() };
    this.users.set(username, user);

    // Emit event after action
    this.emit('user:created', user);

    return user;
  }

  deleteUser(username) {
    if (!this.users.has(username)) {
      this.emit('error', new Error('User not found'));
      return false;
    }

    const user = this.users.get(username);
    this.users.delete(username);
    this.emit('user:deleted', user);

    return true;
  }
}

const service = new UserService();

service.on('user:created', (user) => {
  console.log('[Audit] Created:', user.username);
});

service.on('user:deleted', (user) => {
  console.log('[Audit] Deleted:', user.username);
});

service.on('error', (err) => {
  console.error('[Error]:', err.message);
});
```

### Advanced Error Handling

```javascript
class RobustEmitter extends EventEmitter {
  safeEmit(event, ...args) {
    try {
      this.emit(event, ...args);
    } catch (error) {
      // Prevent uncaught errors from crashing
      this.emit('error', error);
    }
  }

  emitWithRetry(event, data, maxRetries = 3) {
    let retries = 0;

    const attempt = () => {
      try {
        this.emit(event, data);
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          console.log(`Retry ${retries}/${maxRetries}`);
          setTimeout(attempt, 1000 * retries);
        } else {
          this.emit('error', error);
        }
      }
    };

    attempt();
  }
}
```

### Event Namespacing

```javascript
class Application extends EventEmitter {
  // Namespace pattern: 'module:action'
  startServer() {
    this.emit('server:starting');
    // ... start logic
    this.emit('server:started');
  }

  connectDatabase() {
    this.emit('db:connecting');
    // ... connect logic
    this.emit('db:connected');
  }

  handleError(error) {
    // Namespace errors by module
    this.emit('error:server', error);
    // or
    this.emit('error:database', error);
  }
}

const app = new Application();

// Listen to specific namespaces
app.on('server:starting', () => console.log('Server starting...'));
app.on('server:started', () => console.log('Server ready!'));
app.on('db:connecting', () => console.log('Connecting to DB...'));
app.on('db:connected', () => console.log('DB connected!'));

// Listen to all errors
app.on('error:server', (err) => console.error('Server error:', err));
app.on('error:database', (err) => console.error('DB error:', err));
```

### Prepending Listeners

```javascript
const emitter = new EventEmitter();

// Normal listeners execute in registration order
emitter.on('request', () => console.log('Handler 1'));
emitter.on('request', () => console.log('Handler 2'));

// Prepend adds to the beginning
emitter.prependListener('request', () => console.log('First!'));

emitter.emit('request');
// Output:
// First!
// Handler 1
// Handler 2

// Use case: Middleware that must run first
emitter.prependListener('request', (req) => {
  req.timestamp = Date.now(); // Add timestamp before other handlers
});
```

### Maximum Listeners

```javascript
const emitter = new EventEmitter();

// Default is 10 - warning after 10 listeners
console.log('Default max:', emitter.getMaxListeners()); // 10

// Set unlimited (0 = unlimited)
emitter.setMaxListeners(0);

// Set specific limit
emitter.setMaxListeners(20);

// Set global default for all emitters
EventEmitter.defaultMaxListeners = 15;

// Check current listener count
console.log('Listener count:', emitter.listenerCount('data'));

// Get all listeners
const listeners = emitter.listeners('data');
console.log('Listeners:', listeners.length);
```

---

## Common Patterns

### Pattern 1: Service with Events

```javascript
class DatabaseService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connected = false;
  }

  async connect() {
    this.emit('connecting');
    try {
      // Connection logic
      await this.performConnection();
      this.connected = true;
      this.emit('connected');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async query(sql) {
    if (!this.connected) {
      const error = new Error('Not connected');
      this.emit('error', error);
      throw error;
    }

    this.emit('query:start', sql);
    try {
      const result = await this.performQuery(sql);
      this.emit('query:complete', { sql, result });
      return result;
    } catch (error) {
      this.emit('query:error', { sql, error });
      throw error;
    }
  }
}
```

### Pattern 2: Event Middleware

```javascript
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
  }

  use(fn) {
    this.middleware.push(fn);
  }

  async emitAsync(event, data) {
    let processedData = data;

    // Run through middleware
    for (const fn of this.middleware) {
      processedData = await fn(event, processedData);
      if (processedData === false) {
        return; // Middleware cancelled event
      }
    }

    // Emit with processed data
    this.emit(event, processedData);
  }
}

const bus = new EventBus();

// Add middleware
bus.use(async (event, data) => {
  console.log('[Middleware] Event:', event);
  return data;
});

bus.use(async (event, data) => {
  // Add timestamp
  return { ...data, timestamp: Date.now() };
});

bus.on('action', (data) => {
  console.log('Received:', data);
});

bus.emitAsync('action', { type: 'test' });
```

### Pattern 3: Cleanup Manager

```javascript
class ManagedEmitter extends EventEmitter {
  constructor() {
    super();
    this.listenerRegistry = new Map();
  }

  registerListener(event, listener, owner) {
    this.on(event, listener);

    if (!this.listenerRegistry.has(owner)) {
      this.listenerRegistry.set(owner, []);
    }

    this.listenerRegistry.get(owner).push({ event, listener });
  }

  cleanup(owner) {
    const listeners = this.listenerRegistry.get(owner);
    if (!listeners) return;

    listeners.forEach(({ event, listener }) => {
      this.removeListener(event, listener);
    });

    this.listenerRegistry.delete(owner);
    console.log(`Cleaned up listeners for ${owner}`);
  }

  cleanupAll() {
    this.removeAllListeners();
    this.listenerRegistry.clear();
    console.log('All listeners cleaned up');
  }
}
```

---

## Best Practices

### ✅ DO

- Always call `super()` in constructor when extending
- Use namespaced event names (`user:created`, `db:error`)
- Handle error events comprehensively
- Clean up listeners when no longer needed
- Use `prependListener()` for middleware/preprocessing
- Set appropriate max listeners for your use case
- Document events your class emits
- Use `once()` for one-time setup listeners
- Consider memory implications of long-lived listeners

### ❌ DON'T

- Don't forget to call `super()` in constructor
- Don't ignore memory leaks from forgotten listeners
- Don't use generic event names
- Don't emit errors without listeners
- Don't assume listener execution order (except with prepend)
- Don't set max listeners to 0 without good reason
- Don't create listeners in loops without cleanup
- Don't perform heavy sync work in listeners
- Don't rely on `this` context unless binding

---

## Common Mistakes

### Mistake 1: Forgetting super()

```javascript
// ❌ Wrong - ReferenceError!
class MyEmitter extends EventEmitter {
  constructor() {
    // Forgot super()!
    this.data = [];
  }
}

// ✅ Correct
class MyEmitter extends EventEmitter {
  constructor() {
    super(); // Must call super() first!
    this.data = [];
  }
}
```

### Mistake 2: Memory Leaks from Listeners

```javascript
// ❌ Wrong - creates new listener every time
setInterval(() => {
  emitter.on('tick', () => {
    console.log('Tick');
  });
}, 1000); // Leak! Adds 60 listeners per minute

// ✅ Correct - reuse or cleanup
const tickHandler = () => console.log('Tick');
emitter.on('tick', tickHandler);

// Or use once if appropriate
setInterval(() => {
  emitter.once('tick', () => {
    console.log('Tick once');
  });
}, 1000);
```

### Mistake 3: Not Handling Errors in Extended Classes

```javascript
// ❌ Wrong - errors can crash the app
class DataService extends EventEmitter {
  processData(data) {
    // Might throw
    const result = dangerousOperation(data);
    this.emit('processed', result);
  }
}

// ✅ Correct - wrap in try-catch
class DataService extends EventEmitter {
  processData(data) {
    try {
      const result = dangerousOperation(data);
      this.emit('processed', result);
    } catch (error) {
      this.emit('error', error);
    }
  }
}

const service = new DataService();
service.on('error', (err) => {
  console.error('Service error:', err);
});
```

### Mistake 4: Ignoring Max Listeners Warning

```javascript
// ❌ Wrong - ignoring the warning
for (let i = 0; i < 50; i++) {
  emitter.on('data', () => {}); // Warning at 11!
}

// ✅ Correct - either increase limit or fix the leak
// Option 1: If legitimate, increase limit
emitter.setMaxListeners(100);

// Option 2: If leak, clean up
const handlers = [];
for (let i = 0; i < 50; i++) {
  const handler = () => {};
  handlers.push(handler);
  emitter.on('data', handler);
}
// Later, cleanup
handlers.forEach(h => emitter.removeListener('data', h));
```

---

## Testing Your Knowledge

After completing this level, you should be able to answer:

1. How do you properly extend EventEmitter in a class?
2. What are best practices for error handling in event-driven code?
3. How do you prevent memory leaks from event listeners?
4. What is event namespacing and why is it useful?
5. When would you use `prependListener()` instead of `on()`?
6. What does the max listeners warning mean?
7. How do you implement event middleware?
8. What are the performance implications of many listeners?
9. How do you debug listener-related issues?
10. What's the difference between `removeListener()` and `removeAllListeners()`?

---

## Advanced Challenges

1. **Build a Logger Service**
   - Extend EventEmitter
   - Emit events for different log levels
   - Implement log rotation via events
   - Add middleware for formatting

2. **Create an Event Bus**
   - Support namespaced events
   - Implement middleware
   - Add event replay capability
   - Include debugging tools

3. **Implement a Job Queue**
   - Event-driven job processing
   - Error handling and retry
   - Priority handling with prepend
   - Progress tracking via events

---

## Next Steps

Once you've completed this level:

1. ✅ Complete all exercises
2. ✅ Read all conceptual guides
3. ✅ Understand extending EventEmitter
4. ✅ Master advanced error handling
5. ✅ Learn listener lifecycle management
6. ➡️ Move to [Level 3: Advanced](../level-3-advanced/README.md)

---

## Time Estimate

- **Examples**: 45-60 minutes
- **Exercises**: 60-90 minutes
- **Guides**: 45-60 minutes
- **Total**: 2.5-3.5 hours

---

## Summary

Level 2 covers intermediate event patterns for production applications:
- Creating custom event-driven classes
- Advanced error handling strategies
- Managing listener lifecycle and memory
- Organizing events with namespacing
- Controlling execution order with prepend
- Configuring maximum listeners properly
- Building event middleware systems

These patterns are used throughout the Node.js ecosystem and are essential for building robust, scalable applications. Master them, and you'll be ready for the advanced topics in Level 3!
