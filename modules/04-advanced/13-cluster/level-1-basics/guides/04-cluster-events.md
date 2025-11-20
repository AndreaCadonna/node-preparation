# Guide 4: Cluster Events

## Introduction

Events are the primary mechanism for monitoring and reacting to changes in a cluster's state. The Node.js cluster module emits various events throughout the lifecycle of workers, allowing you to build robust, self-healing applications. This guide provides a comprehensive exploration of all cluster events, their use cases, and best practices.

## Event-Driven Architecture

### Understanding Cluster Events

The cluster module follows Node.js's event-driven pattern:

```
Master Process
     │
     ├─── emit('fork') ────> Worker creation started
     │
     ├─── emit('online') ──> Worker process started
     │
     ├─── emit('listening') > Worker listening on port
     │
     ├─── emit('disconnect') > Worker disconnecting
     │
     └─── emit('exit') ────> Worker terminated
```

### Event Categories

1. **Lifecycle Events**: fork, online, listening, disconnect, exit
2. **Communication Events**: message
3. **Configuration Events**: setup

## Core Lifecycle Events

### 1. 'fork' Event

Emitted when a new worker is being forked.

**Timing**: Immediately after `cluster.fork()` is called

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  // Listen for fork event
  cluster.on('fork', (worker) => {
    console.log(`Worker ${worker.id} is being forked`);
    console.log(`Process will be: ${worker.process.pid}`);
  });

  // Fork a worker
  cluster.fork();
}
```

**Use Cases**:
- Initialize tracking data structures
- Log worker creation attempts
- Set up worker-specific monitoring

**Practical Example**:
```javascript
if (cluster.isMaster) {
  const workerMetadata = new Map();

  cluster.on('fork', (worker) => {
    // Track when worker fork started
    workerMetadata.set(worker.id, {
      forkStarted: Date.now(),
      forkCount: (workerMetadata.get(worker.id)?.forkCount || 0) + 1,
      pid: worker.process.pid
    });

    console.log(`Forking worker ${worker.id} (attempt ${workerMetadata.get(worker.id).forkCount})`);
  });

  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
}
```

### 2. 'online' Event

Emitted when a worker sends an online message to the master.

**Timing**: After worker process starts, before listening

```javascript
if (cluster.isMaster) {
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.id} is online`);
    console.log(`PID: ${worker.process.pid}`);
  });

  cluster.fork();
}
```

**Use Cases**:
- Confirm worker startup
- Send initial configuration
- Update worker pool status
- Measure startup time

**Practical Example**:
```javascript
if (cluster.isMaster) {
  const workerStartupTimes = new Map();

  cluster.on('fork', (worker) => {
    workerStartupTimes.set(worker.id, Date.now());
  });

  cluster.on('online', (worker) => {
    const startTime = workerStartupTimes.get(worker.id);
    const duration = Date.now() - startTime;

    console.log(`Worker ${worker.id} online after ${duration}ms`);

    // Send initial configuration
    worker.send({
      cmd: 'configure',
      config: {
        workerId: worker.id,
        maxConnections: 1000
      }
    });

    // Alert if startup is slow
    if (duration > 5000) {
      console.warn(`WARNING: Slow worker startup (${duration}ms)`);
    }
  });

  cluster.fork();
}
```

### 3. 'listening' Event

Emitted when a worker calls `listen()` on a server.

**Timing**: After worker starts listening on a port

```javascript
if (cluster.isMaster) {
  cluster.on('listening', (worker, address) => {
    console.log(`Worker ${worker.id} listening`);
    console.log('Address:', address);
    // address: { address: '0.0.0.0', port: 8000, addressType: 4 }
  });

  cluster.fork();
}

if (cluster.isWorker) {
  const http = require('http');
  http.createServer((req, res) => {
    res.end('Hello');
  }).listen(8000); // Triggers 'listening' event
}
```

**Address Object**:
```javascript
{
  address: '0.0.0.0',    // Bind address
  port: 8000,             // Port number
  addressType: 4,         // 4 (IPv4) or 6 (IPv6)
  fd: undefined           // File descriptor (usually undefined)
}
```

**Use Cases**:
- Verify worker is ready to accept connections
- Track which ports workers are using
- Implement health checks
- Log service readiness

**Practical Example**:
```javascript
if (cluster.isMaster) {
  const workerPorts = new Map();

  cluster.on('listening', (worker, address) => {
    workerPorts.set(worker.id, address);

    console.log(`✓ Worker ${worker.id} ready`);
    console.log(`  Address: ${address.address}:${address.port}`);
    console.log(`  Type: IPv${address.addressType}`);

    // Check if all workers are ready
    const totalWorkers = Object.keys(cluster.workers).length;
    if (workerPorts.size === totalWorkers) {
      console.log('\n=== All workers ready ===');
      workerPorts.forEach((addr, id) => {
        console.log(`Worker ${id}: ${addr.address}:${addr.port}`);
      });
    }
  });

  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
}
```

### 4. 'disconnect' Event

Emitted when the IPC channel between master and worker is disconnected.

**Timing**: After `worker.disconnect()` or worker begins shutting down

```javascript
if (cluster.isMaster) {
  cluster.on('disconnect', (worker) => {
    console.log(`Worker ${worker.id} disconnected`);
    console.log(`IPC channel closed`);
  });

  const worker = cluster.fork();

  setTimeout(() => {
    worker.disconnect(); // Triggers 'disconnect' event
  }, 5000);
}
```

**Use Cases**:
- Detect worker shutdown initiation
- Clean up worker-related resources
- Update load balancer state
- Log disconnection events

**Practical Example**:
```javascript
if (cluster.isMaster) {
  const workerStatus = new Map();

  cluster.on('online', (worker) => {
    workerStatus.set(worker.id, 'active');
  });

  cluster.on('disconnect', (worker) => {
    console.log(`Worker ${worker.id} disconnecting...`);
    workerStatus.set(worker.id, 'disconnecting');

    // Remove from active pool
    console.log('Active workers:',
      Array.from(workerStatus.entries())
        .filter(([id, status]) => status === 'active')
        .map(([id]) => id)
    );

    // Check if intentional shutdown
    if (worker.exitedAfterDisconnect) {
      console.log('  → Graceful shutdown');
    } else {
      console.log('  → Unexpected disconnect');
    }
  });

  // Create workers
  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }

  // Gracefully disconnect one worker after 10 seconds
  setTimeout(() => {
    const worker = Object.values(cluster.workers)[0];
    worker.disconnect();
  }, 10000);
}
```

### 5. 'exit' Event

Emitted when a worker process exits.

**Timing**: After worker process terminates

```javascript
if (cluster.isMaster) {
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.id} died`);
    console.log(`Exit code: ${code}`);
    console.log(`Signal: ${signal}`);
  });

  const worker = cluster.fork();
}
```

**Parameters**:
- `worker`: The worker that exited
- `code`: Exit code (if exited normally)
- `signal`: Signal that caused termination (e.g., 'SIGTERM')

**Use Cases**:
- Detect worker crashes
- Implement auto-restart logic
- Log crash details
- Alert on failures

**Practical Example**:
```javascript
if (cluster.isMaster) {
  const workerRestarts = new Map();
  const MAX_RESTARTS = 5;
  const RESTART_WINDOW = 60000; // 1 minute

  cluster.on('exit', (worker, code, signal) => {
    console.log(`\n=== Worker ${worker.id} Exit ===`);
    console.log(`PID: ${worker.process.pid}`);
    console.log(`Exit code: ${code}`);
    console.log(`Signal: ${signal}`);
    console.log(`Intentional: ${worker.exitedAfterDisconnect}`);

    // Don't restart if intentional shutdown
    if (worker.exitedAfterDisconnect) {
      console.log('→ Graceful shutdown, not restarting');
      return;
    }

    // Track restart attempts
    const now = Date.now();
    const restarts = workerRestarts.get(worker.id) || [];

    // Remove old restart attempts outside window
    const recentRestarts = restarts.filter(time => now - time < RESTART_WINDOW);
    recentRestarts.push(now);
    workerRestarts.set(worker.id, recentRestarts);

    // Check restart limit
    if (recentRestarts.length > MAX_RESTARTS) {
      console.error(`→ Too many restarts (${recentRestarts.length}), giving up`);
      return;
    }

    // Restart worker
    console.log(`→ Restarting worker (attempt ${recentRestarts.length}/${MAX_RESTARTS})`);
    const newWorker = cluster.fork();
    workerRestarts.set(newWorker.id, recentRestarts);
  });

  cluster.fork();
}
```

## Communication Events

### 'message' Event

Emitted when the master receives a message from a worker.

```javascript
if (cluster.isMaster) {
  cluster.on('message', (worker, message, handle) => {
    console.log(`Message from worker ${worker.id}:`, message);
  });

  cluster.fork();
}

if (cluster.isWorker) {
  // Send message to master
  process.send({
    type: 'status',
    data: { healthy: true }
  });
}
```

**Use Cases**:
- Receive worker status updates
- Collect metrics from workers
- Handle custom protocols
- Coordinate worker actions

**Practical Example**:
```javascript
if (cluster.isMaster) {
  const workerMetrics = new Map();

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'metrics') {
      workerMetrics.set(worker.id, {
        ...msg.data,
        timestamp: Date.now()
      });
    }

    if (msg.type === 'error') {
      console.error(`Worker ${worker.id} error:`, msg.error);
    }

    if (msg.type === 'ready') {
      console.log(`Worker ${worker.id} reports ready`);
    }
  });

  // Display metrics periodically
  setInterval(() => {
    console.log('\n=== Worker Metrics ===');
    workerMetrics.forEach((metrics, id) => {
      console.log(`Worker ${id}:`, metrics);
    });
  }, 10000);

  cluster.fork();
}

if (cluster.isWorker) {
  let requestCount = 0;

  const http = require('http');
  http.createServer((req, res) => {
    requestCount++;
    res.end('OK');
  }).listen(8000);

  // Report metrics
  setInterval(() => {
    process.send({
      type: 'metrics',
      data: {
        requests: requestCount,
        memory: process.memoryUsage().heapUsed / 1024 / 1024,
        uptime: process.uptime()
      }
    });
  }, 5000);

  // Signal ready
  process.send({ type: 'ready' });
}
```

## Setup Event

### 'setup' Event

Emitted when `.setupMaster()` is called.

```javascript
if (cluster.isMaster) {
  cluster.on('setup', (settings) => {
    console.log('Cluster settings:', settings);
  });

  cluster.setupMaster({
    exec: 'worker.js',
    args: ['--use', 'https'],
    silent: false
  });
}
```

**Use Cases**:
- Log configuration changes
- Validate settings
- Audit cluster setup

## Complete Event Monitoring Example

### Comprehensive Event Tracking

```javascript
const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isMaster) {
  console.log(`Master ${process.pid} starting\n`);

  // ========== EVENT HANDLERS ==========

  // 1. Setup
  cluster.on('setup', (settings) => {
    console.log('=== Setup ===');
    console.log('Settings:', settings);
    console.log();
  });

  // 2. Fork
  cluster.on('fork', (worker) => {
    console.log(`=== Fork ===`);
    console.log(`Worker ID: ${worker.id}`);
    console.log(`Process: ${worker.process.pid}`);
    console.log();
  });

  // 3. Online
  cluster.on('online', (worker) => {
    console.log(`=== Online ===`);
    console.log(`Worker ${worker.id} is online`);
    console.log(`State: ${worker.state}`);
    console.log();
  });

  // 4. Listening
  cluster.on('listening', (worker, address) => {
    console.log(`=== Listening ===`);
    console.log(`Worker ${worker.id} listening`);
    console.log(`Address: ${address.address}:${address.port}`);
    console.log(`Family: IPv${address.addressType}`);
    console.log();
  });

  // 5. Disconnect
  cluster.on('disconnect', (worker) => {
    console.log(`=== Disconnect ===`);
    console.log(`Worker ${worker.id} disconnected`);
    console.log(`Intentional: ${worker.exitedAfterDisconnect}`);
    console.log();
  });

  // 6. Exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`=== Exit ===`);
    console.log(`Worker ${worker.id} exited`);
    console.log(`Exit code: ${code}`);
    console.log(`Signal: ${signal}`);
    console.log(`Intentional: ${worker.exitedAfterDisconnect}`);
    console.log();

    // Auto-restart
    if (!worker.exitedAfterDisconnect) {
      console.log('Restarting worker...\n');
      cluster.fork();
    }
  });

  // 7. Message
  cluster.on('message', (worker, msg) => {
    console.log(`=== Message ===`);
    console.log(`From worker ${worker.id}:`, msg);
    console.log();
  });

  // ========== START WORKERS ==========

  const numCPUs = os.cpus().length;
  console.log(`Starting ${numCPUs} workers\n`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // ========== COMMANDS ==========

  // Demonstrate events
  setTimeout(() => {
    console.log('\n>>> Sending message to all workers\n');
    Object.values(cluster.workers).forEach(worker => {
      worker.send({ cmd: 'ping' });
    });
  }, 5000);

  setTimeout(() => {
    console.log('\n>>> Disconnecting worker 1\n');
    cluster.workers[1]?.disconnect();
  }, 10000);

} else {
  // ========== WORKER PROCESS ==========

  console.log(`Worker ${cluster.worker.id} (${process.pid}) starting`);

  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Worker ${cluster.worker.id}\n`);
  });

  server.listen(8000);

  // Handle messages from master
  process.on('message', (msg) => {
    if (msg.cmd === 'ping') {
      process.send({
        cmd: 'pong',
        workerId: cluster.worker.id,
        timestamp: Date.now()
      });
    }
  });

  // Send initial status
  process.send({
    type: 'status',
    workerId: cluster.worker.id,
    status: 'initialized'
  });
}
```

## Event-Based Patterns

### 1. Health Monitoring

```javascript
if (cluster.isMaster) {
  const healthStatus = new Map();

  // Initialize health status on fork
  cluster.on('fork', (worker) => {
    healthStatus.set(worker.id, {
      state: 'starting',
      healthy: false,
      lastCheck: Date.now()
    });
  });

  // Mark healthy when listening
  cluster.on('listening', (worker) => {
    const status = healthStatus.get(worker.id);
    status.state = 'running';
    status.healthy = true;
  });

  // Mark unhealthy on disconnect
  cluster.on('disconnect', (worker) => {
    const status = healthStatus.get(worker.id);
    status.state = 'disconnecting';
    status.healthy = false;
  });

  // Remove on exit
  cluster.on('exit', (worker) => {
    healthStatus.delete(worker.id);
  });

  // Regular health checks
  setInterval(() => {
    console.log('\n=== Health Status ===');
    healthStatus.forEach((status, id) => {
      const worker = cluster.workers[id];
      if (worker) {
        console.log(`Worker ${id}: ${status.state} (healthy: ${status.healthy})`);
      }
    });
  }, 10000);
}
```

### 2. Graceful Restart

```javascript
if (cluster.isMaster) {
  let restarting = false;

  function gracefulRestart() {
    if (restarting) return;
    restarting = true;

    const workers = Object.values(cluster.workers);
    let index = 0;

    function restartNext() {
      if (index >= workers.length) {
        console.log('All workers restarted');
        restarting = false;
        return;
      }

      const oldWorker = workers[index++];
      const newWorker = cluster.fork();

      // Wait for new worker to be ready
      newWorker.on('listening', () => {
        console.log(`New worker ${newWorker.id} ready, disconnecting old worker ${oldWorker.id}`);

        // Gracefully disconnect old worker
        oldWorker.disconnect();

        // Continue with next worker
        setTimeout(restartNext, 2000);
      });
    }

    restartNext();
  }

  // Trigger graceful restart on SIGUSR2
  process.on('SIGUSR2', () => {
    console.log('Received SIGUSR2, starting graceful restart');
    gracefulRestart();
  });
}
```

### 3. Load-Based Scaling

```javascript
if (cluster.isMaster) {
  const MIN_WORKERS = 2;
  const MAX_WORKERS = os.cpus().length;

  let workerLoad = new Map();

  cluster.on('online', (worker) => {
    workerLoad.set(worker.id, 0);
  });

  cluster.on('exit', (worker) => {
    workerLoad.delete(worker.id);
  });

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'load') {
      workerLoad.set(worker.id, msg.value);
    }
  });

  // Check load and scale
  setInterval(() => {
    const currentWorkers = Object.keys(cluster.workers).length;
    const avgLoad = Array.from(workerLoad.values())
      .reduce((a, b) => a + b, 0) / workerLoad.size;

    console.log(`Workers: ${currentWorkers}, Avg Load: ${avgLoad.toFixed(2)}`);

    if (avgLoad > 0.8 && currentWorkers < MAX_WORKERS) {
      console.log('High load, adding worker');
      cluster.fork();
    } else if (avgLoad < 0.2 && currentWorkers > MIN_WORKERS) {
      console.log('Low load, removing worker');
      const worker = Object.values(cluster.workers)[0];
      worker.disconnect();
    }
  }, 10000);
}
```

## Best Practices

### 1. Always Handle Exit Events

```javascript
// ✓ CORRECT
cluster.on('exit', (worker, code, signal) => {
  if (!worker.exitedAfterDisconnect) {
    cluster.fork(); // Auto-restart crashed workers
  }
});

// ❌ WRONG
// Not handling exit events means crashed workers aren't replaced
```

### 2. Distinguish Intentional vs Unintentional Exits

```javascript
cluster.on('exit', (worker, code, signal) => {
  if (worker.exitedAfterDisconnect) {
    // Intentional shutdown (disconnect() was called)
    console.log('Graceful shutdown');
  } else {
    // Crash or unexpected exit
    console.error('Unexpected exit, restarting');
    cluster.fork();
  }
});
```

### 3. Implement Restart Limits

```javascript
const restartCounts = new Map();

cluster.on('exit', (worker) => {
  const count = restartCounts.get(worker.id) || 0;

  if (count < 5) {
    cluster.fork();
    restartCounts.set(worker.id, count + 1);
  } else {
    console.error('Too many restarts, not restarting worker');
  }
});
```

### 4. Use Events for Coordination

```javascript
// Wait for all workers to be ready
let readyWorkers = 0;
const totalWorkers = 4;

cluster.on('listening', (worker) => {
  readyWorkers++;

  if (readyWorkers === totalWorkers) {
    console.log('All workers ready, enabling traffic');
    // Enable load balancer, etc.
  }
});
```

## Summary

Cluster events provide powerful hooks for:
- Monitoring worker lifecycle
- Implementing auto-restart logic
- Coordinating graceful shutdowns
- Scaling based on load
- Collecting metrics and health data

Key events:
- **fork**: Worker creation started
- **online**: Worker process running
- **listening**: Worker ready to accept connections
- **disconnect**: Worker disconnecting
- **exit**: Worker terminated
- **message**: Communication from worker

Best practices:
- Always handle 'exit' events
- Distinguish intentional vs unintentional exits
- Implement restart limits and backoff
- Use events for coordination and monitoring
- Log important state transitions

Mastering cluster events is essential for building robust, production-ready clustered Node.js applications.
