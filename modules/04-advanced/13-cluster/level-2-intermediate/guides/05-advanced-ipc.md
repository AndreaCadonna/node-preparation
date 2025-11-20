# Guide 5: Advanced Inter-Process Communication Patterns

## Introduction

Inter-Process Communication (IPC) is how workers and the master process communicate in a cluster. While basic message passing is simple, production applications require more sophisticated patterns like request-response, broadcasting, queuing, and worker-to-worker communication.

## IPC Fundamentals

### Basic Message Passing

```javascript
// Master to Worker
if (cluster.isMaster) {
  const worker = cluster.fork();

  worker.send({ type: 'config', data: { port: 8000 } });
}

// Worker to Master
if (cluster.isWorker) {
  process.on('message', (msg) => {
    console.log('Received:', msg);
  });

  if (process.send) {
    process.send({ type: 'ready', workerId: cluster.worker.id });
  }
}
```

### IPC Limitations

```javascript
// ❌ Cannot send:
const cannotSend = {
  functions: () => {},           // Functions don't serialize
  circular: {},                  // Circular references
  symbols: Symbol('test'),       // Symbols
  bigData: new Array(1e8)       // Very large data (slow)
};

// ✅ Can send:
const canSend = {
  strings: 'hello',
  numbers: 42,
  booleans: true,
  objects: { a: 1, b: 2 },
  arrays: [1, 2, 3],
  dates: new Date(),
  buffers: Buffer.from('data')
};
```

## Request-Response Pattern

### Basic Implementation

```javascript
const crypto = require('crypto');

if (cluster.isMaster) {
  const pendingRequests = new Map();

  // Send request and wait for response
  function sendRequest(worker, type, data, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      // Set timeout
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      // Store pending request
      pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timer);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });

      // Send request
      worker.send({
        type,
        requestId,
        data
      });
    });
  }

  // Handle responses
  function handleResponse(workerId, message) {
    const { requestId, data, error } = message;
    const pending = pendingRequests.get(requestId);

    if (pending) {
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(data);
      }
      pendingRequests.delete(requestId);
    }
  }

  // Usage
  const worker = cluster.fork();

  worker.on('message', (msg) => {
    if (msg.type === 'response') {
      handleResponse(worker.id, msg);
    }
  });

  // Make a request
  async function example() {
    try {
      const result = await sendRequest(worker, 'get-stats', {});
      console.log('Stats:', result);
    } catch (error) {
      console.error('Request failed:', error);
    }
  }

} else {
  // Worker handles requests
  process.on('message', async (msg) => {
    if (msg.type === 'get-stats') {
      try {
        const stats = {
          pid: process.pid,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        };

        process.send({
          type: 'response',
          requestId: msg.requestId,
          data: stats
        });
      } catch (error) {
        process.send({
          type: 'response',
          requestId: msg.requestId,
          error: error.message
        });
      }
    }
  });
}
```

### Request Manager Class

```javascript
class RequestManager {
  constructor() {
    this.pendingRequests = new Map();
    this.requestTimeout = 5000;
  }

  send(worker, type, data) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Timeout: ${type}`));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      worker.send({
        type,
        requestId,
        data,
        timestamp: Date.now()
      });
    });
  }

  handleResponse(message) {
    const { requestId, data, error } = message;
    const pending = this.pendingRequests.get(requestId);

    if (pending) {
      clearTimeout(pending.timer);

      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(data);
      }

      this.pendingRequests.delete(requestId);
    }
  }

  cleanup() {
    // Clean up pending requests
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(new Error('Request manager shutdown'));
    });
    this.pendingRequests.clear();
  }
}

// Usage
const requestManager = new RequestManager();

worker.on('message', (msg) => {
  if (msg.type === 'response') {
    requestManager.handleResponse(msg);
  }
});

// Make requests
const stats = await requestManager.send(worker, 'get-stats', {});
```

## Broadcasting Pattern

### Broadcast to All Workers

```javascript
if (cluster.isMaster) {
  function broadcast(type, data) {
    const workerIds = Object.keys(cluster.workers);

    console.log(`Broadcasting ${type} to ${workerIds.length} workers`);

    workerIds.forEach(id => {
      cluster.workers[id].send({
        type,
        data,
        broadcast: true,
        timestamp: Date.now()
      });
    });
  }

  // Broadcast configuration update
  broadcast('config-update', {
    logLevel: 'debug',
    timeout: 30000
  });

  // Broadcast cache invalidation
  broadcast('cache-clear', {
    keys: ['user:*', 'session:*']
  });

} else {
  // Workers handle broadcasts
  process.on('message', (msg) => {
    if (msg.broadcast) {
      console.log(`Broadcast received: ${msg.type}`);

      switch (msg.type) {
        case 'config-update':
          updateConfig(msg.data);
          break;

        case 'cache-clear':
          clearCache(msg.data.keys);
          break;
      }
    }
  });
}
```

### Broadcast with Acknowledgment

```javascript
if (cluster.isMaster) {
  async function broadcastWithAck(type, data, timeout = 10000) {
    const workerIds = Object.keys(cluster.workers);
    const acks = new Map();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const missing = workerIds.filter(id => !acks.has(parseInt(id)));
        reject(new Error(`Timeout waiting for workers: ${missing.join(', ')}`));
      }, timeout);

      // Send to all workers
      workerIds.forEach(id => {
        const worker = cluster.workers[id];

        const listener = (msg) => {
          if (msg.type === 'broadcast-ack' && msg.broadcastType === type) {
            acks.set(parseInt(id), true);

            // Check if all acknowledged
            if (acks.size === workerIds.length) {
              clearTimeout(timer);
              worker.removeListener('message', listener);
              resolve();
            }
          }
        };

        worker.on('message', listener);

        worker.send({
          type,
          data,
          broadcast: true,
          requireAck: true
        });
      });
    });
  }

  // Usage
  try {
    await broadcastWithAck('reload-config', { config: newConfig });
    console.log('All workers reloaded config');
  } catch (error) {
    console.error('Broadcast failed:', error);
  }

} else {
  // Worker acknowledges broadcast
  process.on('message', (msg) => {
    if (msg.broadcast && msg.requireAck) {
      // Process the broadcast
      handleBroadcast(msg);

      // Send acknowledgment
      if (process.send) {
        process.send({
          type: 'broadcast-ack',
          broadcastType: msg.type
        });
      }
    }
  });
}
```

## Worker-to-Worker Communication

### Via Master Router

```javascript
if (cluster.isMaster) {
  // Master acts as message router
  function routeMessage(fromWorkerId, toWorkerId, type, data) {
    const toWorker = cluster.workers[toWorkerId];

    if (toWorker) {
      toWorker.send({
        type,
        data,
        fromWorker: fromWorkerId,
        routed: true
      });

      console.log(`Routed ${type} from worker ${fromWorkerId} to worker ${toWorkerId}`);
    } else {
      console.error(`Target worker ${toWorkerId} not found`);
    }
  }

  // Listen for routing requests
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', (msg) => {
      if (msg.type === 'route-to-worker') {
        routeMessage(
          worker.id,
          msg.targetWorker,
          msg.messageType,
          msg.data
        );
      }
    });
  });

} else {
  // Worker sends message to another worker
  function sendToWorker(targetWorkerId, type, data) {
    if (process.send) {
      process.send({
        type: 'route-to-worker',
        targetWorker: targetWorkerId,
        messageType: type,
        data
      });
    }
  }

  // Worker receives messages from other workers
  process.on('message', (msg) => {
    if (msg.routed) {
      console.log(`Message from worker ${msg.fromWorker}:`, msg.type, msg.data);

      // Handle the message
      handleWorkerMessage(msg);
    }
  });

  // Usage
  sendToWorker(2, 'cache-invalidate', { key: 'user:123' });
}
```

## Message Queuing

### Queue-Based IPC

```javascript
if (cluster.isMaster) {
  class MessageQueue {
    constructor() {
      this.queues = new Map(); // workerId -> messages[]
    }

    enqueue(workerId, message) {
      if (!this.queues.has(workerId)) {
        this.queues.set(workerId, []);
      }

      const queue = this.queues.get(workerId);
      queue.push({
        ...message,
        enqueuedAt: Date.now()
      });

      console.log(`Enqueued message for worker ${workerId} (queue size: ${queue.length})`);

      // Try to deliver
      this.tryDeliver(workerId);
    }

    tryDeliver(workerId) {
      const worker = cluster.workers[workerId];
      const queue = this.queues.get(workerId);

      if (!worker || !queue || queue.length === 0) {
        return;
      }

      // Deliver messages in order
      while (queue.length > 0) {
        const message = queue.shift();

        try {
          worker.send(message);
          console.log(`Delivered message to worker ${workerId}`);
        } catch (error) {
          console.error(`Failed to deliver to worker ${workerId}:`, error);
          // Re-queue the message
          queue.unshift(message);
          break;
        }
      }
    }

    clearQueue(workerId) {
      this.queues.delete(workerId);
    }
  }

  const messageQueue = new MessageQueue();

  // Enqueue messages instead of sending directly
  function sendMessage(workerId, message) {
    messageQueue.enqueue(workerId, message);
  }

  // When worker comes online, deliver queued messages
  cluster.on('online', (worker) => {
    messageQueue.tryDeliver(worker.id);
  });

  // Clean up queue when worker exits
  cluster.on('exit', (worker) => {
    messageQueue.clearQueue(worker.id);
  });
}
```

## Message Patterns

### Pub/Sub Pattern

```javascript
if (cluster.isMaster) {
  class PubSub {
    constructor() {
      this.subscriptions = new Map(); // topic -> Set of workerIds
    }

    subscribe(workerId, topic) {
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }

      this.subscriptions.get(topic).add(workerId);
      console.log(`Worker ${workerId} subscribed to ${topic}`);
    }

    unsubscribe(workerId, topic) {
      const subs = this.subscriptions.get(topic);
      if (subs) {
        subs.delete(workerId);
      }
    }

    publish(topic, data) {
      const subscribers = this.subscriptions.get(topic);

      if (!subscribers || subscribers.size === 0) {
        console.log(`No subscribers for topic: ${topic}`);
        return;
      }

      console.log(`Publishing to ${topic}: ${subscribers.size} subscribers`);

      subscribers.forEach(workerId => {
        const worker = cluster.workers[workerId];
        if (worker) {
          worker.send({
            type: 'pubsub-message',
            topic,
            data,
            timestamp: Date.now()
          });
        }
      });
    }
  }

  const pubsub = new PubSub();

  // Handle subscriptions
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', (msg) => {
      if (msg.type === 'subscribe') {
        pubsub.subscribe(worker.id, msg.topic);
      } else if (msg.type === 'publish') {
        pubsub.publish(msg.topic, msg.data);
      }
    });
  });

} else {
  // Worker API
  function subscribe(topic) {
    if (process.send) {
      process.send({ type: 'subscribe', topic });
    }
  }

  function publish(topic, data) {
    if (process.send) {
      process.send({ type: 'publish', topic, data });
    }
  }

  // Receive published messages
  process.on('message', (msg) => {
    if (msg.type === 'pubsub-message') {
      console.log(`Received on ${msg.topic}:`, msg.data);
      handlePubSubMessage(msg.topic, msg.data);
    }
  });

  // Usage
  subscribe('cache-updates');
  subscribe('config-changes');

  publish('cache-updates', { key: 'user:123', action: 'invalidate' });
}
```

### Command Pattern

```javascript
if (cluster.isWorker) {
  // Command handler registry
  const commandHandlers = new Map();

  // Register command handlers
  commandHandlers.set('reload-config', async (data) => {
    await loadConfig(data.configPath);
    return { success: true };
  });

  commandHandlers.set('clear-cache', async (data) => {
    cache.clear();
    return { cleared: cache.size };
  });

  commandHandlers.set('health-check', async () => {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  });

  // Command handler
  process.on('message', async (msg) => {
    if (msg.type === 'command') {
      const handler = commandHandlers.get(msg.command);

      if (!handler) {
        if (process.send) {
          process.send({
            type: 'command-result',
            requestId: msg.requestId,
            error: `Unknown command: ${msg.command}`
          });
        }
        return;
      }

      try {
        const result = await handler(msg.data);

        if (process.send) {
          process.send({
            type: 'command-result',
            requestId: msg.requestId,
            result
          });
        }
      } catch (error) {
        if (process.send) {
          process.send({
            type: 'command-result',
            requestId: msg.requestId,
            error: error.message
          });
        }
      }
    }
  });
}
```

## Performance Considerations

### Message Size

```javascript
// ❌ Bad: Sending large data via IPC
worker.send({
  type: 'data',
  data: hugeArray // Slow serialization!
});

// ✅ Good: Send reference, fetch from shared storage
worker.send({
  type: 'data-available',
  dataKey: 'temp:large-dataset-123'
});

// Worker fetches from Redis/DB
const data = await redis.get('temp:large-dataset-123');
```

### Batching Messages

```javascript
class MessageBatcher {
  constructor(batchSize = 10, flushInterval = 100) {
    this.batch = [];
    this.batchSize = batchSize;

    setInterval(() => this.flush(), flushInterval);
  }

  add(message) {
    this.batch.push(message);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  flush() {
    if (this.batch.length === 0) return;

    if (process.send) {
      process.send({
        type: 'batch',
        messages: this.batch
      });
    }

    this.batch = [];
  }
}

const batcher = new MessageBatcher();

// Instead of sending each message
// batcher.add({ type: 'log', data: '...' });
```

## Error Handling

### Handling IPC Errors

```javascript
// Worker process
try {
  if (process.send) {
    process.send({ type: 'update', data: myData });
  }
} catch (error) {
  // IPC channel closed
  console.error('Failed to send message:', error);
  // Queue for retry or log
}

// Handle disconnect
process.on('disconnect', () => {
  console.log('Disconnected from master');
  // Clean up, stop sending messages
});
```

## Best Practices

### 1. Use Structured Messages

```javascript
// ✅ Good: Consistent structure
const message = {
  type: 'request',
  requestId: uuid(),
  timestamp: Date.now(),
  data: {}
};

// ❌ Bad: Inconsistent structure
worker.send('update');
worker.send({ foo: 'bar' });
```

### 2. Implement Timeouts

```javascript
// ✅ Always set timeouts
const response = await sendRequest(worker, 'query', data, 5000);

// ❌ No timeout
const response = await sendRequest(worker, 'query', data);
```

### 3. Handle Serialization Limits

```javascript
// ✅ Check message size
if (JSON.stringify(data).length > 1024 * 1024) {
  // Use external storage
  await redis.set(key, data);
  worker.send({ type: 'large-data', key });
}
```

## Summary

Advanced IPC patterns enable:

1. **Request-Response** for bidirectional communication
2. **Broadcasting** for coordinated updates
3. **Worker-to-Worker** communication via routing
4. **Message Queuing** for reliability
5. **Pub/Sub** for event-driven architecture
6. **Command Pattern** for structured operations

These patterns form the foundation of robust clustered applications.
