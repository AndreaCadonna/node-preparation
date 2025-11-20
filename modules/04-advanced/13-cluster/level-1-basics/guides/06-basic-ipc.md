# Guide 6: Basic IPC (Inter-Process Communication)

## Introduction

Inter-Process Communication (IPC) is the mechanism that allows the master process and worker processes to exchange messages and coordinate their activities. Without IPC, clustered applications would just be isolated processes unable to share information or coordinate actions. This guide explores the fundamentals of IPC in Node.js clustering, from basic message passing to advanced communication patterns.

## What is IPC?

### Definition

**IPC (Inter-Process Communication)** enables different processes to:
- Exchange data and messages
- Coordinate activities
- Share state and information
- Trigger actions in other processes

### Why IPC Matters

```
Without IPC:
┌─────────┐  ┌─────────┐  ┌─────────┐
│Worker 1 │  │Worker 2 │  │Worker 3 │
│ Isolated│  │ Isolated│  │ Isolated│
└─────────┘  └─────────┘  └─────────┘
  No communication possible ❌

With IPC:
┌─────────┐  ┌─────────┐  ┌─────────┐
│Worker 1 │←→│Worker 2 │←→│Worker 3 │
│Connected│  │Connected│  │Connected│
└────┬────┘  └────┬────┘  └────┬────┘
     └───────────┬┘────────────┘
                 ↕
          ┌──────────┐
          │  Master  │
          └──────────┘
```

## IPC Channels in Cluster

### Communication Paths

In Node.js clustering, IPC channels exist between:
1. **Master ↔ Worker**: Each worker has a dedicated channel to master
2. **Worker ↔ Master**: Workers can send messages to master
3. **Worker ↔ Worker** (indirect): Through master as intermediary

```
        ┌──────────────┐
        │    Master    │
        └──┬────┬────┬─┘
           │    │    │
      IPC  │    │    │  IPC Channels
    Channel│    │    │
           │    │    │
    ┌──────▼┐ ┌▼────▼──┐ ┌▼──────┐
    │Worker1│ │Worker 2│ │Worker3│
    └───────┘ └────────┘ └───────┘
```

## Basic Message Passing

### Master to Worker

The master can send messages to any worker:

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  const worker = cluster.fork();

  // Send message to worker
  worker.send({ cmd: 'hello', data: 'Hello Worker!' });

  // Send to specific worker
  setTimeout(() => {
    worker.send({ cmd: 'shutdown' });
  }, 5000);
}

if (cluster.isWorker) {
  // Receive messages from master
  process.on('message', (msg) => {
    console.log(`Worker ${process.pid} received:`, msg);

    if (msg.cmd === 'hello') {
      console.log('Data:', msg.data);
    }

    if (msg.cmd === 'shutdown') {
      console.log('Shutting down...');
      process.exit(0);
    }
  });
}
```

### Worker to Master

Workers can send messages back to the master:

```javascript
if (cluster.isMaster) {
  const worker = cluster.fork();

  // Receive messages from worker
  worker.on('message', (msg) => {
    console.log(`Master received from worker ${worker.id}:`, msg);
  });
}

if (cluster.isWorker) {
  // Send message to master
  process.send({
    cmd: 'status',
    data: {
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  });

  // Send periodic updates
  setInterval(() => {
    process.send({
      cmd: 'heartbeat',
      timestamp: Date.now()
    });
  }, 5000);
}
```

### Broadcasting to All Workers

```javascript
if (cluster.isMaster) {
  // Fork multiple workers
  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }

  // Broadcast to all workers
  function broadcast(msg) {
    Object.values(cluster.workers).forEach(worker => {
      worker.send(msg);
    });
  }

  // Example: Broadcast configuration update
  setTimeout(() => {
    broadcast({
      cmd: 'config-update',
      config: { maxConnections: 1000 }
    });
  }, 5000);

  // Example: Trigger action in all workers
  setTimeout(() => {
    broadcast({ cmd: 'clear-cache' });
  }, 10000);
}

if (cluster.isWorker) {
  process.on('message', (msg) => {
    if (msg.cmd === 'config-update') {
      console.log(`Worker ${cluster.worker.id} updating config:`, msg.config);
    }

    if (msg.cmd === 'clear-cache') {
      console.log(`Worker ${cluster.worker.id} clearing cache`);
      // Clear cache logic here
    }
  });
}
```

## Message Types and Protocols

### 1. Command Messages

```javascript
// Master sends commands
if (cluster.isMaster) {
  const worker = cluster.fork();

  worker.send({ cmd: 'start' });
  worker.send({ cmd: 'stop' });
  worker.send({ cmd: 'reload' });
}

// Worker handles commands
if (cluster.isWorker) {
  process.on('message', (msg) => {
    switch (msg.cmd) {
      case 'start':
        console.log('Starting service...');
        break;
      case 'stop':
        console.log('Stopping service...');
        break;
      case 'reload':
        console.log('Reloading configuration...');
        break;
    }
  });
}
```

### 2. Status Updates

```javascript
// Worker reports status
if (cluster.isWorker) {
  function reportStatus() {
    process.send({
      type: 'status',
      workerId: cluster.worker.id,
      status: {
        healthy: true,
        requests: requestCount,
        memory: process.memoryUsage().heapUsed,
        uptime: process.uptime()
      }
    });
  }

  setInterval(reportStatus, 10000);
}

// Master collects status
if (cluster.isMaster) {
  const workerStatus = new Map();

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'status') {
      workerStatus.set(worker.id, msg.status);

      // Check health
      if (!msg.status.healthy) {
        console.warn(`Worker ${worker.id} unhealthy!`);
      }
    }
  });
}
```

### 3. Request-Response Pattern

```javascript
// Worker sends request and waits for response
if (cluster.isWorker) {
  let requestId = 0;
  const pendingRequests = new Map();

  function requestFromMaster(data) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;

      pendingRequests.set(id, { resolve, reject });

      process.send({
        type: 'request',
        id,
        data
      });

      // Timeout
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  process.on('message', (msg) => {
    if (msg.type === 'response') {
      const pending = pendingRequests.get(msg.id);
      if (pending) {
        pendingRequests.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.data);
        }
      }
    }
  });

  // Usage
  async function example() {
    try {
      const result = await requestFromMaster({ query: 'config' });
      console.log('Received:', result);
    } catch (err) {
      console.error('Request failed:', err);
    }
  }
}

// Master handles requests
if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'request') {
      // Process request
      const response = {
        type: 'response',
        id: msg.id,
        data: { config: 'value' }
      };

      worker.send(response);
    }
  });
}
```

## Practical IPC Patterns

### 1. Shared Cache Invalidation

```javascript
// When one worker updates cache, notify all others
if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'cache-invalidate') {
      // Broadcast to all OTHER workers
      Object.values(cluster.workers).forEach(w => {
        if (w.id !== worker.id) {
          w.send({
            type: 'cache-invalidate',
            key: msg.key
          });
        }
      });
    }
  });
}

if (cluster.isWorker) {
  const cache = new Map();

  function setCache(key, value) {
    cache.set(key, value);

    // Notify other workers to invalidate
    process.send({
      type: 'cache-invalidate',
      key
    });
  }

  process.on('message', (msg) => {
    if (msg.type === 'cache-invalidate') {
      cache.delete(msg.key);
      console.log(`Cache invalidated: ${msg.key}`);
    }
  });
}
```

### 2. Load Monitoring and Rebalancing

```javascript
if (cluster.isMaster) {
  const workerLoads = new Map();

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'load-report') {
      workerLoads.set(worker.id, msg.load);

      // Calculate average load
      const loads = Array.from(workerLoads.values());
      const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;

      // If worker is overloaded
      if (msg.load > avgLoad * 1.5) {
        console.log(`Worker ${worker.id} overloaded, considering rebalance`);
        // Could spawn new worker or redistribute load
      }
    }
  });
}

if (cluster.isWorker) {
  let currentLoad = 0;

  const server = http.createServer((req, res) => {
    currentLoad++;
    res.on('finish', () => currentLoad--);
    res.end('OK');
  });

  // Report load
  setInterval(() => {
    process.send({
      type: 'load-report',
      load: currentLoad
    });
  }, 2000);
}
```

### 3. Coordinated Graceful Restart

```javascript
if (cluster.isMaster) {
  function gracefulRestart() {
    const workers = Object.values(cluster.workers);
    let index = 0;

    function restartNext() {
      if (index >= workers.length) {
        console.log('All workers restarted');
        return;
      }

      const oldWorker = workers[index++];

      // Tell worker to finish current requests
      oldWorker.send({ cmd: 'prepare-shutdown' });

      // Wait for worker to be ready
      oldWorker.once('message', (msg) => {
        if (msg.type === 'ready-for-shutdown') {
          console.log(`Worker ${oldWorker.id} ready for shutdown`);

          // Start new worker
          const newWorker = cluster.fork();

          newWorker.on('listening', () => {
            // New worker ready, kill old one
            oldWorker.kill();
            setTimeout(restartNext, 2000);
          });
        }
      });

      // Timeout
      setTimeout(() => {
        console.log(`Worker ${oldWorker.id} timeout, forcing restart`);
        oldWorker.kill();
        cluster.fork();
        setTimeout(restartNext, 2000);
      }, 10000);
    }

    restartNext();
  }

  process.on('SIGUSR2', gracefulRestart);
}

if (cluster.isWorker) {
  let activeRequests = 0;

  const server = http.createServer((req, res) => {
    activeRequests++;
    res.on('finish', () => activeRequests--);

    setTimeout(() => {
      res.end('OK');
    }, Math.random() * 1000);
  });

  server.listen(8000);

  process.on('message', (msg) => {
    if (msg.cmd === 'prepare-shutdown') {
      console.log(`Worker ${cluster.worker.id} preparing for shutdown`);

      // Stop accepting new connections
      server.close();

      // Wait for active requests to finish
      const checkInterval = setInterval(() => {
        if (activeRequests === 0) {
          clearInterval(checkInterval);
          process.send({ type: 'ready-for-shutdown' });
        }
      }, 100);
    }
  });
}
```

### 4. Distributed Event System

```javascript
// Simple pub/sub across workers
if (cluster.isMaster) {
  const subscriptions = new Map(); // event -> Set of worker IDs

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'subscribe') {
      if (!subscriptions.has(msg.event)) {
        subscriptions.set(msg.event, new Set());
      }
      subscriptions.get(msg.event).add(worker.id);
    }

    if (msg.type === 'publish') {
      const subscribers = subscriptions.get(msg.event);
      if (subscribers) {
        subscribers.forEach(workerId => {
          const w = cluster.workers[workerId];
          if (w) {
            w.send({
              type: 'event',
              event: msg.event,
              data: msg.data
            });
          }
        });
      }
    }
  });
}

if (cluster.isWorker) {
  const eventHandlers = new Map();

  // Subscribe to event
  function subscribe(event, handler) {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, []);
      process.send({ type: 'subscribe', event });
    }
    eventHandlers.get(event).push(handler);
  }

  // Publish event
  function publish(event, data) {
    process.send({
      type: 'publish',
      event,
      data
    });
  }

  // Handle incoming events
  process.on('message', (msg) => {
    if (msg.type === 'event') {
      const handlers = eventHandlers.get(msg.event);
      if (handlers) {
        handlers.forEach(handler => handler(msg.data));
      }
    }
  });

  // Example usage
  subscribe('user-login', (data) => {
    console.log(`Worker ${cluster.worker.id}: User logged in:`, data);
  });

  subscribe('cache-clear', () => {
    console.log(`Worker ${cluster.worker.id}: Clearing cache`);
  });

  // Publish events
  setTimeout(() => {
    publish('user-login', { userId: 123 });
  }, 2000);
}
```

## Advanced IPC Techniques

### 1. Message Queue

```javascript
// Master maintains message queue for workers
if (cluster.isMaster) {
  const messageQueues = new Map();

  // Initialize queue for each worker
  cluster.on('fork', (worker) => {
    messageQueues.set(worker.id, []);
  });

  // Queue messages if worker is busy
  function sendToWorker(workerId, msg) {
    const worker = cluster.workers[workerId];
    const queue = messageQueues.get(workerId);

    if (worker && worker.isConnected()) {
      if (queue.length > 0) {
        // Send queued messages first
        queue.forEach(qMsg => worker.send(qMsg));
        queue.length = 0;
      }
      worker.send(msg);
    } else {
      // Queue message
      queue.push(msg);
    }
  }

  // Process queue when worker comes online
  cluster.on('online', (worker) => {
    const queue = messageQueues.get(worker.id);
    if (queue && queue.length > 0) {
      queue.forEach(msg => worker.send(msg));
      queue.length = 0;
    }
  });
}
```

### 2. Message Acknowledgment

```javascript
// Ensure messages are received and processed
if (cluster.isMaster) {
  const pendingMessages = new Map();

  function sendWithAck(worker, msg, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const msgId = Date.now() + Math.random();
      const message = { ...msg, _ackId: msgId };

      pendingMessages.set(msgId, { resolve, reject });

      worker.send(message);

      // Timeout
      setTimeout(() => {
        if (pendingMessages.has(msgId)) {
          pendingMessages.delete(msgId);
          reject(new Error('Message acknowledgment timeout'));
        }
      }, timeout);
    });
  }

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'ack') {
      const pending = pendingMessages.get(msg.ackId);
      if (pending) {
        pendingMessages.delete(msg.ackId);
        pending.resolve(msg.result);
      }
    }
  });

  // Usage
  const worker = cluster.fork();
  worker.on('online', async () => {
    try {
      const result = await sendWithAck(worker, { cmd: 'test' });
      console.log('Worker acknowledged:', result);
    } catch (err) {
      console.error('Worker did not acknowledge:', err);
    }
  });
}

if (cluster.isWorker) {
  process.on('message', (msg) => {
    if (msg._ackId) {
      // Process message
      const result = { status: 'processed' };

      // Send acknowledgment
      process.send({
        type: 'ack',
        ackId: msg._ackId,
        result
      });
    }
  });
}
```

### 3. Typed Messages with Validation

```javascript
// Define message types
const MessageTypes = {
  COMMAND: 'command',
  STATUS: 'status',
  REQUEST: 'request',
  RESPONSE: 'response',
  EVENT: 'event'
};

// Message validators
const validators = {
  [MessageTypes.COMMAND]: (msg) => {
    return msg.cmd && typeof msg.cmd === 'string';
  },
  [MessageTypes.STATUS]: (msg) => {
    return msg.workerId && msg.data;
  }
};

// Master validates incoming messages
if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    if (!msg.type || !MessageTypes[msg.type.toUpperCase()]) {
      console.error('Invalid message type from worker', worker.id);
      return;
    }

    const validator = validators[msg.type];
    if (validator && !validator(msg)) {
      console.error('Message validation failed:', msg);
      return;
    }

    // Process valid message
    handleMessage(worker, msg);
  });
}

// Worker sends typed messages
if (cluster.isWorker) {
  function sendCommand(cmd, data) {
    process.send({
      type: MessageTypes.COMMAND,
      cmd,
      data
    });
  }

  function sendStatus(data) {
    process.send({
      type: MessageTypes.STATUS,
      workerId: cluster.worker.id,
      data
    });
  }
}
```

## Best Practices

### 1. Always Handle Message Events

```javascript
// ✓ CORRECT
if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    console.log('Received:', msg);
  });
}

// ❌ WRONG: Unhandled messages may cause issues
// Always listen for messages, even if just to log them
```

### 2. Validate Messages

```javascript
// ✓ CORRECT
process.on('message', (msg) => {
  if (!msg || typeof msg !== 'object') {
    console.error('Invalid message format');
    return;
  }

  if (!msg.type) {
    console.error('Message missing type');
    return;
  }

  // Process valid message
  handleMessage(msg);
});

// ❌ WRONG: Assuming message format
process.on('message', (msg) => {
  handleMessage(msg.type, msg.data); // May crash if invalid
});
```

### 3. Implement Timeouts

```javascript
// ✓ CORRECT: Always use timeouts for responses
function sendWithTimeout(worker, msg, timeout = 5000) {
  return Promise.race([
    new Promise((resolve) => {
      worker.once('message', resolve);
      worker.send(msg);
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}
```

### 4. Handle Communication Errors

```javascript
// ✓ CORRECT
worker.on('error', (err) => {
  console.error('Worker IPC error:', err);
});

worker.on('disconnect', () => {
  console.log('Worker IPC channel closed');
});

// Safe send
function safeSend(worker, msg) {
  if (worker.isConnected()) {
    try {
      worker.send(msg);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  } else {
    console.warn('Worker not connected, cannot send message');
  }
}
```

### 5. Keep Messages Small

```javascript
// ✓ CORRECT: Small, focused messages
worker.send({ cmd: 'reload' });

// ❌ WRONG: Large objects
worker.send({
  cmd: 'update',
  data: hugeObject // Serialization overhead!
});

// ✓ BETTER: Reference or chunk data
worker.send({
  cmd: 'update',
  dataId: 'cache-key-123' // Worker fetches from shared storage
});
```

## Common Pitfalls

### 1. Assuming Synchronous Communication

```javascript
// ❌ WRONG: IPC is asynchronous!
worker.send({ cmd: 'getValue' });
const value = getValue(); // Won't work!

// ✓ CORRECT: Use callbacks or promises
worker.send({ cmd: 'getValue' });
worker.once('message', (msg) => {
  if (msg.type === 'value') {
    console.log('Value:', msg.data);
  }
});
```

### 2. Not Handling Disconnection

```javascript
// ❌ WRONG: Sending to disconnected worker
worker.send(msg); // May throw error if worker died

// ✓ CORRECT: Check connection
if (worker.isConnected()) {
  worker.send(msg);
}
```

### 3. Message Loop

```javascript
// ❌ WRONG: Can cause infinite loop!
if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    worker.send(msg); // Echoes back, worker sends again!
  });
}

// ✓ CORRECT: Process and respond appropriately
cluster.on('message', (worker, msg) => {
  const response = processMessage(msg);
  worker.send(response);
});
```

## Summary

IPC in Node.js clustering enables:
- **Coordination**: Workers and master work together
- **Communication**: Exchange data and commands
- **Control**: Master manages worker behavior
- **Monitoring**: Collect stats and health info

Key concepts:
- Master ↔ Worker communication via `send()` and message events
- Messages are asynchronous
- Always validate and handle messages
- Implement timeouts and error handling
- Keep messages small and focused

Common patterns:
- Command/Control
- Status reporting
- Request/Response
- Pub/Sub events
- Cache coordination

Best practices:
- Validate all messages
- Use timeouts for responses
- Handle disconnection gracefully
- Keep messages small
- Implement proper error handling

Understanding IPC is essential for building coordinated, robust clustered applications that can work together effectively across process boundaries.
