# Extending EventEmitter

A comprehensive guide to creating custom event-driven classes by extending EventEmitter.

## Table of Contents

1. [Why Extend EventEmitter?](#why-extend-eventemitter)
2. [Basic Extension Pattern](#basic-extension-pattern)
3. [When to Extend vs Compose](#when-to-extend-vs-compose)
4. [Best Practices](#best-practices)
5. [Common Patterns](#common-patterns)
6. [Real-World Examples](#real-world-examples)
7. [Common Pitfalls](#common-pitfalls)

---

## Why Extend EventEmitter?

Extending EventEmitter transforms your classes into event-driven entities, enabling:

### Benefits

**1. Loose Coupling**
- Decouples logic from side effects
- Components can react independently
- Easy to add new functionality without modifying core logic

**2. Flexibility**
- Add/remove listeners dynamically
- Enable/disable features at runtime
- Multiple handlers for same event

**3. Observability**
- External monitoring without code changes
- Audit trails and logging
- Testing and debugging hooks

**4. Extensibility**
- Users can hook into lifecycle
- Plugin systems
- Framework integrations

### Node.js Core Examples

Many Node.js core APIs extend EventEmitter:

```javascript
// http.Server extends EventEmitter
const server = http.createServer();
server.on('request', handler);

// fs.ReadStream extends EventEmitter
const stream = fs.createReadStream('file.txt');
stream.on('data', chunk => {});

// child_process.ChildProcess extends EventEmitter
const child = spawn('ls');
child.on('exit', code => {});
```

---

## Basic Extension Pattern

### Minimal Example

```javascript
const EventEmitter = require('events');

class Counter extends EventEmitter {
  constructor() {
    super(); // CRITICAL: Must call super() first!
    this.count = 0;
  }

  increment() {
    this.count++;
    this.emit('incremented', this.count);
  }

  decrement() {
    this.count--;
    this.emit('decremented', this.count);
  }

  reset() {
    this.count = 0;
    this.emit('reset');
  }
}

const counter = new Counter();

counter.on('incremented', (count) => {
  console.log('Count increased to:', count);
});

counter.increment(); // Count increased to: 1
```

### Critical Rules

1. **Always call `super()` first**
```javascript
// ❌ Wrong
class MyEmitter extends EventEmitter {
  constructor() {
    this.data = []; // ReferenceError!
    super();
  }
}

// ✅ Correct
class MyEmitter extends EventEmitter {
  constructor() {
    super(); // Call super first
    this.data = [];
  }
}
```

2. **Emit events at meaningful points**
```javascript
class UserService extends EventEmitter {
  createUser(data) {
    // Emit AFTER the action
    const user = this.saveToDatabase(data);
    this.emit('user:created', user);
    return user;
  }
}
```

3. **Include relevant data in events**
```javascript
// ❌ Not helpful
this.emit('updated');

// ✅ Helpful
this.emit('updated', {
  what: 'user',
  id: user.id,
  changes: changedFields
});
```

---

## When to Extend vs Compose

### Extend EventEmitter When:

**1. The class IS fundamentally event-driven**
```javascript
// Good: Server is naturally event-driven
class Server extends EventEmitter {
  start() {
    this.emit('started');
  }
}
```

**2. Multiple lifecycle events**
```javascript
class TaskRunner extends EventEmitter {
  async run() {
    this.emit('starting');
    this.emit('validating');
    this.emit('executing');
    this.emit('completed');
  }
}
```

**3. Observable state changes**
```javascript
class StateMachine extends EventEmitter {
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChanged', { oldState, newState });
  }
}
```

### Use Composition When:

**1. Events are secondary to main purpose**
```javascript
// Better: Use composition
class Calculator {
  constructor() {
    this.emitter = new EventEmitter();
  }

  add(a, b) {
    const result = a + b;
    this.emitter.emit('calculated', result);
    return result; // Main purpose is to return value
  }
}
```

**2. Need multiple emitters**
```javascript
class Application {
  constructor() {
    this.userEvents = new EventEmitter();
    this.systemEvents = new EventEmitter();
  }
}
```

**3. Avoiding inheritance complexity**
```javascript
// If you already extend another class
class MyClass extends BaseClass {
  constructor() {
    super();
    this.events = new EventEmitter(); // Compose instead
  }
}
```

---

## Best Practices

### 1. Use Namespaced Event Names

```javascript
// ✅ Good: Descriptive and namespaced
class UserService extends EventEmitter {
  createUser(data) {
    this.emit('user:created', data);
  }

  updateUser(id, data) {
    this.emit('user:updated', { id, data });
  }

  deleteUser(id) {
    this.emit('user:deleted', { id });
  }
}
```

```javascript
// ❌ Bad: Generic names
this.emit('created');  // Created what?
this.emit('update');   // Update what?
this.emit('event');    // Too generic
```

### 2. Always Emit Error Events

```javascript
class DataService extends EventEmitter {
  async fetchData() {
    try {
      const data = await this.fetch();
      this.emit('data:fetched', data);
    } catch (error) {
      // CRITICAL: Always emit errors
      this.emit('error', error);
    }
  }
}

// Users must listen to errors
const service = new DataService();
service.on('error', (err) => {
  console.error('Service error:', err);
});
```

### 3. Document Your Events

```javascript
/**
 * TaskQueue manages asynchronous task execution
 *
 * Events:
 * - 'task:added' - (task) - Fired when task is added
 * - 'task:processing' - (task) - Fired when task starts
 * - 'task:completed' - (task, result) - Fired on success
 * - 'task:failed' - (task, error) - Fired on failure
 * - 'queue:empty' - () - Fired when queue is empty
 * - 'error' - (error) - Fired on unexpected errors
 */
class TaskQueue extends EventEmitter {
  // ...
}
```

### 4. Provide Event Data as Objects

```javascript
// ✅ Good: Object with named properties
this.emit('user:updated', {
  userId: user.id,
  changes: changedFields,
  timestamp: Date.now()
});

// ❌ Less maintainable: Multiple positional arguments
this.emit('user:updated', user.id, changedFields, Date.now());
```

### 5. Emit Events Consistently

```javascript
class OrderService extends EventEmitter {
  // Consistent pattern for all CRUD operations
  createOrder(data) {
    const order = this.create(data);
    this.emit('order:created', order);
    return order;
  }

  updateOrder(id, data) {
    const order = this.update(id, data);
    this.emit('order:updated', order);
    return order;
  }

  deleteOrder(id) {
    const order = this.delete(id);
    this.emit('order:deleted', order);
    return order;
  }
}
```

---

## Common Patterns

### Pattern 1: CRUD Service

```javascript
class ResourceService extends EventEmitter {
  constructor() {
    super();
    this.resources = new Map();
  }

  create(data) {
    const resource = { id: Date.now(), ...data };
    this.resources.set(resource.id, resource);
    this.emit('resource:created', resource);
    return resource;
  }

  read(id) {
    const resource = this.resources.get(id);
    if (!resource) {
      this.emit('error', new Error('Not found'));
      return null;
    }
    this.emit('resource:read', resource);
    return resource;
  }

  update(id, changes) {
    const resource = this.resources.get(id);
    if (!resource) {
      this.emit('error', new Error('Not found'));
      return null;
    }
    Object.assign(resource, changes);
    this.emit('resource:updated', { resource, changes });
    return resource;
  }

  delete(id) {
    const resource = this.resources.get(id);
    if (!resource) {
      this.emit('error', new Error('Not found'));
      return false;
    }
    this.resources.delete(id);
    this.emit('resource:deleted', resource);
    return true;
  }
}
```

### Pattern 2: State Machine

```javascript
class Connection extends EventEmitter {
  constructor() {
    super();
    this.state = 'disconnected';
  }

  connect() {
    if (this.state !== 'disconnected') {
      this.emit('error', new Error('Already connected'));
      return;
    }

    this.state = 'connecting';
    this.emit('state:changed', 'connecting');

    setTimeout(() => {
      this.state = 'connected';
      this.emit('state:changed', 'connected');
      this.emit('connected');
    }, 1000);
  }

  disconnect() {
    if (this.state !== 'connected') {
      return;
    }

    this.state = 'disconnecting';
    this.emit('state:changed', 'disconnecting');

    setTimeout(() => {
      this.state = 'disconnected';
      this.emit('state:changed', 'disconnected');
      this.emit('disconnected');
    }, 500);
  }
}
```

### Pattern 3: Async Operation Tracker

```javascript
class AsyncOperation extends EventEmitter {
  constructor(name, operation) {
    super();
    this.name = name;
    this.operation = operation;
    this.status = 'pending';
  }

  async execute() {
    this.status = 'running';
    this.emit('started', { name: this.name });

    try {
      const result = await this.operation();
      this.status = 'completed';
      this.emit('completed', { name: this.name, result });
      return result;
    } catch (error) {
      this.status = 'failed';
      this.emit('failed', { name: this.name, error });
      throw error;
    }
  }
}
```

---

## Real-World Examples

### Example 1: HTTP Server Wrapper

```javascript
class WebServer extends EventEmitter {
  constructor(port) {
    super();
    this.port = port;
    this.server = null;
  }

  start() {
    this.emit('starting', { port: this.port });

    this.server = http.createServer((req, res) => {
      this.emit('request', { req, res });
    });

    this.server.listen(this.port, () => {
      this.emit('started', { port: this.port });
    });

    this.server.on('error', (error) => {
      this.emit('error', error);
    });
  }

  stop() {
    if (!this.server) return;

    this.emit('stopping');
    this.server.close(() => {
      this.emit('stopped');
    });
  }
}

// Usage
const server = new WebServer(3000);

server.on('starting', () => {
  console.log('Server starting...');
});

server.on('request', ({ req, res }) => {
  console.log('Request:', req.url);
  res.end('Hello');
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.start();
```

### Example 2: Database Connection Pool

```javascript
class ConnectionPool extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connections = [];
    this.available = [];
  }

  async initialize() {
    this.emit('initializing', { size: this.config.size });

    for (let i = 0; i < this.config.size; i++) {
      const conn = await this.createConnection();
      this.connections.push(conn);
      this.available.push(conn);
      this.emit('connection:created', { index: i });
    }

    this.emit('initialized', { total: this.connections.length });
  }

  acquire() {
    if (this.available.length === 0) {
      this.emit('pool:exhausted');
      return null;
    }

    const conn = this.available.pop();
    this.emit('connection:acquired', { available: this.available.length });
    return conn;
  }

  release(conn) {
    this.available.push(conn);
    this.emit('connection:released', { available: this.available.length });
  }

  async createConnection() {
    // Simulate connection creation
    return { id: Date.now(), connected: true };
  }
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting super()

```javascript
// ❌ WRONG
class MyEmitter extends EventEmitter {
  constructor() {
    this.data = []; // ReferenceError: Must call super constructor
  }
}

// ✅ CORRECT
class MyEmitter extends EventEmitter {
  constructor() {
    super(); // Call super first!
    this.data = [];
  }
}
```

### Pitfall 2: Not Handling Error Events

```javascript
// ❌ WRONG: Crashes if error emitted
class Service extends EventEmitter {
  doSomething() {
    this.emit('error', new Error('Oops'));
  }
}

const service = new Service();
service.doSomething(); // Crashes!

// ✅ CORRECT: Always have error handler
service.on('error', (err) => {
  console.error('Error:', err);
});
```

### Pitfall 3: Emitting Before Ready

```javascript
// ❌ WRONG: Emit before initialization
class Service extends EventEmitter {
  constructor() {
    this.emit('ready'); // No listeners yet!
    super();
  }
}

// ✅ CORRECT: Emit after users can listen
class Service extends EventEmitter {
  constructor() {
    super();
    process.nextTick(() => {
      this.emit('ready'); // Listeners have time to attach
    });
  }
}
```

### Pitfall 4: Memory Leaks from Forgotten Listeners

```javascript
// ❌ WRONG: Creates leak
setInterval(() => {
  emitter.on('tick', () => {}); // New listener every second!
}, 1000);

// ✅ CORRECT: Reuse or cleanup
const handler = () => {};
emitter.on('tick', handler);
// Later: emitter.removeListener('tick', handler);
```

---

## Summary

**Key Takeaways:**

1. **Always call `super()` first** in constructor
2. **Emit events at meaningful lifecycle points**
3. **Use namespaced event names** (e.g., 'user:created')
4. **Always handle error events** to prevent crashes
5. **Document all events your class emits**
6. **Include relevant data in event payloads**
7. **Consider composition** for non-core event functionality
8. **Clean up listeners** to prevent memory leaks

Extending EventEmitter is a powerful pattern that enables loose coupling, observability, and extensibility. Use it when your class has natural lifecycle events or observable state changes. Master this pattern, and you'll write more flexible, testable Node.js code!
