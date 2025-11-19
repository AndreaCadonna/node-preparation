# Guide 2: Master-Worker Pattern

## Introduction

The master-worker pattern is the architectural foundation of Node.js clustering. This pattern divides responsibilities between a master process that coordinates and manages work, and worker processes that execute the actual application logic. Understanding this pattern is crucial for building robust, scalable Node.js applications.

## The Master-Worker Architecture

### Overview

```
┌─────────────────────────────────────────┐
│         MASTER PROCESS                  │
│  ┌─────────────────────────────────┐   │
│  │  - Spawn workers                │   │
│  │  - Monitor health               │   │
│  │  - Distribute connections       │   │
│  │  - Handle worker failures       │   │
│  │  - Coordinate shutdowns         │   │
│  └─────────────────────────────────┘   │
└──────┬────────┬────────┬────────┬───────┘
       │        │        │        │
   ┌───▼───┐┌──▼───┐┌───▼──┐┌────▼──┐
   │Worker ││Worker││Worker││Worker │
   │  #1   ││  #2  ││  #3  ││  #4   │
   │       ││      ││      ││       │
   │Process││Process│Process││Process│
   │Request││Request│Request││Request│
   └───────┘└──────┘└──────┘└───────┘
```

### Key Principle

**Separation of Concerns**: The master manages, workers execute.

## Master Process Responsibilities

### 1. Worker Lifecycle Management

The master process is responsible for the entire lifecycle of worker processes.

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // 1. Spawning workers
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`Spawned worker ${worker.process.pid}`);
  }

  // 2. Monitoring workers
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });

  // 3. Handling worker failures
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code})`);

    // 4. Restarting failed workers
    console.log('Starting a new worker');
    cluster.fork();
  });
}
```

**Lifecycle Stages**:
1. **Spawning**: Creating new worker processes
2. **Monitoring**: Tracking worker status and health
3. **Maintaining**: Restarting failed workers
4. **Terminating**: Gracefully shutting down workers

### 2. Worker Health Monitoring

Implement sophisticated health monitoring:

```javascript
if (cluster.isMaster) {
  const workers = new Map();

  // Track worker health
  cluster.on('fork', (worker) => {
    workers.set(worker.id, {
      pid: worker.process.pid,
      startedAt: Date.now(),
      restarts: 0,
      lastHeartbeat: Date.now()
    });
  });

  // Monitor heartbeats
  setInterval(() => {
    const now = Date.now();

    workers.forEach((info, id) => {
      const worker = cluster.workers[id];

      if (worker) {
        // Request heartbeat
        worker.send({ cmd: 'heartbeat' });

        // Check if worker is responsive
        const timeSinceHeartbeat = now - info.lastHeartbeat;
        if (timeSinceHeartbeat > 30000) {
          console.log(`Worker ${id} unresponsive, restarting...`);
          worker.kill();
        }
      }
    });
  }, 10000); // Check every 10 seconds

  // Handle heartbeat responses
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', (msg) => {
      if (msg.cmd === 'heartbeat') {
        const info = workers.get(worker.id);
        if (info) {
          info.lastHeartbeat = Date.now();
        }
      }
    });
  });
}
```

### 3. Graceful Shutdown Coordination

The master orchestrates coordinated shutdowns:

```javascript
if (cluster.isMaster) {
  // Handle shutdown signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  function gracefulShutdown() {
    console.log('Master received shutdown signal');
    console.log('Initiating graceful shutdown...');

    // Stop accepting new workers
    cluster.disconnect(() => {
      console.log('All workers disconnected');
      console.log('Master exiting');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 second timeout
  }
}
```

### 4. Load Distribution Strategy

The master controls how connections are distributed:

```javascript
if (cluster.isMaster) {
  // Configure scheduling policy
  cluster.schedulingPolicy = cluster.SCHED_RR; // Round-robin

  const numCPUs = os.cpus().length;
  const workers = [];

  // Create workers
  for (let i = 0; i < numCPUs; i++) {
    workers.push(cluster.fork());
  }

  // Track worker load (custom implementation)
  const workerStats = new Map();

  workers.forEach(worker => {
    workerStats.set(worker.id, {
      activeConnections: 0,
      totalRequests: 0
    });

    worker.on('message', (msg) => {
      if (msg.cmd === 'stats') {
        workerStats.set(worker.id, msg.data);
      }
    });
  });

  // Monitor distribution
  setInterval(() => {
    console.log('\n=== Worker Stats ===');
    workerStats.forEach((stats, id) => {
      console.log(`Worker ${id}:`, stats);
    });
  }, 5000);
}
```

## Worker Process Responsibilities

### 1. Application Logic Execution

Workers handle the actual application workload:

```javascript
if (cluster.isWorker) {
  const http = require('http');

  // Worker runs the application
  const server = http.createServer((req, res) => {
    // Handle request
    console.log(`Worker ${process.pid} handling request`);

    // Simulate work
    setTimeout(() => {
      res.writeHead(200);
      res.end(`Handled by worker ${process.pid}\n`);
    }, 100);
  });

  server.listen(8000);

  console.log(`Worker ${process.pid} started`);
}
```

### 2. Health Reporting

Workers report their status to the master:

```javascript
if (cluster.isWorker) {
  let activeConnections = 0;
  let totalRequests = 0;

  const server = http.createServer((req, res) => {
    activeConnections++;
    totalRequests++;

    res.on('finish', () => {
      activeConnections--;
    });

    res.writeHead(200);
    res.end(`Worker ${process.pid}\n`);
  });

  server.listen(8000);

  // Report stats periodically
  setInterval(() => {
    process.send({
      cmd: 'stats',
      data: {
        activeConnections,
        totalRequests,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  }, 5000);

  // Respond to heartbeat requests
  process.on('message', (msg) => {
    if (msg.cmd === 'heartbeat') {
      process.send({ cmd: 'heartbeat' });
    }
  });
}
```

### 3. Graceful Shutdown Handling

Workers must handle shutdown signals properly:

```javascript
if (cluster.isWorker) {
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World\n');
  });

  server.listen(8000);

  // Track active connections
  const connections = new Set();

  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => {
      connections.delete(conn);
    });
  });

  // Handle shutdown
  process.on('SIGTERM', gracefulShutdown);

  function gracefulShutdown() {
    console.log(`Worker ${process.pid} shutting down...`);

    // Stop accepting new connections
    server.close(() => {
      console.log(`Worker ${process.pid} closed server`);
      process.exit(0);
    });

    // Close idle connections
    connections.forEach((conn) => {
      conn.end();
    });

    // Force exit after timeout
    setTimeout(() => {
      console.log(`Worker ${process.pid} forcing exit`);
      process.exit(1);
    }, 10000);
  }
}
```

## Communication Between Master and Workers

### Master to Worker

```javascript
if (cluster.isMaster) {
  const worker = cluster.fork();

  // Send messages to worker
  worker.send({ cmd: 'configure', config: { timeout: 5000 } });
  worker.send({ cmd: 'reload' });
  worker.send({ cmd: 'stats' });
}

if (cluster.isWorker) {
  // Receive messages from master
  process.on('message', (msg) => {
    switch (msg.cmd) {
      case 'configure':
        console.log('Received config:', msg.config);
        // Apply configuration
        break;

      case 'reload':
        console.log('Reloading...');
        // Reload logic
        break;

      case 'stats':
        // Send stats back
        process.send({
          cmd: 'stats',
          data: { /* stats */ }
        });
        break;
    }
  });
}
```

### Worker to Master

```javascript
if (cluster.isWorker) {
  // Report to master
  process.send({
    cmd: 'status',
    status: 'healthy',
    timestamp: Date.now()
  });

  // Report errors
  process.on('uncaughtException', (err) => {
    process.send({
      cmd: 'error',
      error: err.message,
      stack: err.stack
    });
  });
}

if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    console.log(`Message from worker ${worker.id}:`, msg);

    if (msg.cmd === 'error') {
      console.error(`Worker ${worker.id} error:`, msg.error);
    }
  });
}
```

## Complete Master-Worker Example

### Full Implementation

```javascript
const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isMaster) {
  // ========== MASTER PROCESS ==========

  console.log(`Master ${process.pid} is running`);

  const numCPUs = os.cpus().length;
  const workers = new Map();

  // Configuration
  const config = {
    maxRestarts: 10,
    restartWindow: 60000, // 1 minute
    gracefulTimeout: 30000 // 30 seconds
  };

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    forkWorker();
  }

  function forkWorker() {
    const worker = cluster.fork();

    workers.set(worker.id, {
      pid: worker.process.pid,
      restarts: 0,
      startedAt: Date.now(),
      lastRestart: null
    });

    console.log(`Forked worker ${worker.id} (PID: ${worker.process.pid})`);
  }

  // Worker online
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.id} is online`);

    // Send initial configuration
    worker.send({
      cmd: 'configure',
      config: {
        workerId: worker.id,
        environment: process.env.NODE_ENV
      }
    });
  });

  // Worker exit
  cluster.on('exit', (worker, code, signal) => {
    const info = workers.get(worker.id);

    console.log(`Worker ${worker.id} died (${signal || code})`);

    if (signal === 'SIGTERM') {
      console.log('Worker was manually terminated');
      workers.delete(worker.id);
      return;
    }

    // Check restart policy
    const now = Date.now();
    const timeSinceStart = now - info.startedAt;

    if (timeSinceStart < config.restartWindow) {
      info.restarts++;
    } else {
      info.restarts = 0;
    }

    if (info.restarts >= config.maxRestarts) {
      console.error(`Worker ${worker.id} restarted too many times, not restarting`);
      workers.delete(worker.id);
      return;
    }

    // Restart worker
    console.log('Starting replacement worker...');
    workers.delete(worker.id);
    forkWorker();
  });

  // Handle messages from workers
  cluster.on('message', (worker, msg) => {
    if (msg.cmd === 'stats') {
      console.log(`Stats from worker ${worker.id}:`, msg.data);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    console.log('\nMaster initiating graceful shutdown...');

    // Disconnect all workers
    cluster.disconnect(() => {
      console.log('All workers disconnected');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Forcing shutdown');
      process.exit(1);
    }, config.gracefulTimeout);
  }

} else {
  // ========== WORKER PROCESS ==========

  let workerId = null;
  let activeRequests = 0;
  let totalRequests = 0;

  const server = http.createServer((req, res) => {
    activeRequests++;
    totalRequests++;

    console.log(`Worker ${workerId || process.pid} handling request ${totalRequests}`);

    // Simulate work
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Handled by worker ${workerId || process.pid}\n`);

      activeRequests--;
    }, Math.random() * 100);
  });

  server.listen(8000, () => {
    console.log(`Worker ${process.pid} listening on port 8000`);
  });

  // Handle messages from master
  process.on('message', (msg) => {
    if (msg.cmd === 'configure') {
      workerId = msg.config.workerId;
      console.log(`Worker configured with ID: ${workerId}`);
    }
  });

  // Report stats periodically
  setInterval(() => {
    process.send({
      cmd: 'stats',
      data: {
        activeRequests,
        totalRequests,
        memory: process.memoryUsage().heapUsed / 1024 / 1024,
        uptime: process.uptime()
      }
    });
  }, 10000);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log(`Worker ${workerId} shutting down gracefully...`);

    server.close(() => {
      console.log(`Worker ${workerId} closed all connections`);
      process.exit(0);
    });

    setTimeout(() => {
      console.error(`Worker ${workerId} forcing exit`);
      process.exit(1);
    }, 10000);
  });
}
```

## Best Practices

### 1. Single Responsibility

**Master**: Manage and coordinate
```javascript
if (cluster.isMaster) {
  // DO: Manage workers
  cluster.fork();

  // DON'T: Handle business logic
  // ❌ Bad
  http.createServer(handler).listen(8000);
}
```

**Workers**: Execute application logic
```javascript
if (cluster.isWorker) {
  // DO: Run application
  http.createServer(handler).listen(8000);

  // DON'T: Manage other workers
  // ❌ Bad
  cluster.fork();
}
```

### 2. Proper Error Handling

```javascript
if (cluster.isMaster) {
  cluster.on('exit', (worker, code, signal) => {
    // Log exit reason
    console.error(`Worker ${worker.id} exit:`, {
      code,
      signal,
      exitedAfterDisconnect: worker.exitedAfterDisconnect
    });

    // Only restart if not intentional
    if (!worker.exitedAfterDisconnect) {
      cluster.fork();
    }
  });
}

if (cluster.isWorker) {
  // Catch uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);

    // Notify master
    process.send({ cmd: 'error', error: err.message });

    // Exit gracefully
    process.exit(1);
  });
}
```

### 3. Resource Management

```javascript
if (cluster.isMaster) {
  // Monitor system resources
  const maxMemoryPerWorker = 500 * 1024 * 1024; // 500MB

  setInterval(() => {
    Object.values(cluster.workers).forEach(worker => {
      worker.send({ cmd: 'check-memory' });
    });
  }, 60000);

  cluster.on('message', (worker, msg) => {
    if (msg.cmd === 'memory-usage') {
      if (msg.usage > maxMemoryPerWorker) {
        console.log(`Worker ${worker.id} using too much memory, restarting`);
        worker.kill();
      }
    }
  });
}

if (cluster.isWorker) {
  process.on('message', (msg) => {
    if (msg.cmd === 'check-memory') {
      const usage = process.memoryUsage().heapUsed;
      process.send({
        cmd: 'memory-usage',
        usage
      });
    }
  });
}
```

## Common Pitfalls

### 1. Shared State Assumptions

**Problem**:
```javascript
// ❌ WRONG: Each worker has its own variable!
let requestCount = 0;

if (cluster.isWorker) {
  http.createServer((req, res) => {
    requestCount++; // Only counts THIS worker's requests
    res.end(`Total: ${requestCount}`); // Wrong total!
  }).listen(8000);
}
```

**Solution**:
```javascript
// ✓ CORRECT: Use external storage
const redis = require('redis');
const client = redis.createClient();

if (cluster.isWorker) {
  http.createServer((req, res) => {
    client.incr('requestCount', (err, count) => {
      res.end(`Total: ${count}`); // Correct total!
    });
  }).listen(8000);
}
```

### 2. Improper Shutdown

**Problem**:
```javascript
// ❌ WRONG: Immediate exit
process.on('SIGTERM', () => {
  process.exit(0); // Drops active connections!
});
```

**Solution**:
```javascript
// ✓ CORRECT: Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    // All connections finished
    process.exit(0);
  });
});
```

### 3. Worker Restart Storms

**Problem**:
```javascript
// ❌ WRONG: Unlimited restarts
cluster.on('exit', () => {
  cluster.fork(); // Can cause infinite restart loop!
});
```

**Solution**:
```javascript
// ✓ CORRECT: Implement backoff and limits
const restarts = new Map();

cluster.on('exit', (worker) => {
  const count = restarts.get(worker.id) || 0;

  if (count < 5) {
    setTimeout(() => {
      cluster.fork();
      restarts.set(worker.id, count + 1);
    }, Math.pow(2, count) * 1000); // Exponential backoff
  } else {
    console.error('Too many restarts, giving up');
  }
});
```

## Summary

The master-worker pattern provides:
- **Clear separation of concerns**: Management vs. execution
- **Fault isolation**: Worker failures don't affect master
- **Centralized control**: Single point of coordination
- **Scalability**: Add/remove workers dynamically

Key principles:
- Master manages, workers execute
- Proper communication protocols
- Graceful lifecycle management
- Resource monitoring and limits
- Error handling and recovery strategies

Understanding this pattern is essential for building production-ready clustered applications in Node.js.
