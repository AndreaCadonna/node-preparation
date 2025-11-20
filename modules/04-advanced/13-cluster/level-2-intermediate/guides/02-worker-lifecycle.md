# Guide 2: Worker Lifecycle Management

## Introduction

Understanding and managing the worker lifecycle is crucial for building reliable clustered applications. Workers transition through various states from creation to termination, and proper lifecycle management ensures stability, performance, and maintainability.

## Worker States

### State Diagram

```
                    ┌─────────┐
                    │ Created │
                    └────┬────┘
                         │ fork()
                         ▼
                    ┌────────┐
                    │ Online │
                    └────┬───┘
                         │ listen()
                         ▼
                  ┌──────────┐
                  │ Listening│◄─────┐
                  └────┬─────┘      │
                       │         restart
                       │            │
           ┌───────────┼────────────┤
           │           │            │
    disconnect()   crash/kill   exit()
           │           │            │
           ▼           ▼            ▼
     ┌──────────┐ ┌────────┐  ┌────────┐
     │Disconnected│ │ Exited │  │  Dead  │
     └──────────┘ └────────┘  └────────┘
```

### State Descriptions

```javascript
const WorkerState = {
  // Created but not yet online
  CREATED: 'created',

  // Worker process started, can receive messages
  ONLINE: 'online',

  // Worker server listening on port
  LISTENING: 'listening',

  // Worker disconnected from IPC channel
  DISCONNECTED: 'disconnected',

  // Worker is shutting down gracefully
  EXITING: 'exiting',

  // Worker has exited
  DEAD: 'dead'
};
```

## Worker Creation and Initialization

### Basic Worker Creation

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('Master process starting');

  // Create worker
  const worker = cluster.fork();

  console.log(`Worker created: ${worker.id}`);
  console.log(`Worker PID: ${worker.process.pid}`);
  console.log(`Worker state: ${worker.state}`); // 'none' initially

  // Worker becomes 'online'
  worker.on('online', () => {
    console.log(`Worker ${worker.id} is online`);
  });

  // Worker starts listening
  worker.on('listening', (address) => {
    console.log(`Worker ${worker.id} listening on ${address.port}`);
  });
}
```

### Worker Initialization Process

```javascript
if (cluster.isMaster) {
  const workers = new Map();

  function createWorker() {
    const worker = cluster.fork({
      WORKER_ID: Date.now(),
      ENVIRONMENT: 'production'
    });

    // Track worker with metadata
    workers.set(worker.id, {
      worker,
      state: 'created',
      createdAt: Date.now(),
      readyAt: null,
      requestCount: 0,
      errorCount: 0
    });

    setupWorkerEventHandlers(worker);
    return worker;
  }

  function setupWorkerEventHandlers(worker) {
    const info = workers.get(worker.id);

    // Worker comes online
    worker.on('online', () => {
      info.state = 'online';
      console.log(`Worker ${worker.id} online`);
    });

    // Worker ready to accept connections
    worker.on('listening', (address) => {
      info.state = 'listening';
      info.readyAt = Date.now();
      const initTime = info.readyAt - info.createdAt;
      console.log(`Worker ${worker.id} ready (${initTime}ms)`);
    });

    // Worker sends ready message
    worker.on('message', (msg) => {
      if (msg.type === 'ready') {
        info.ready = true;
      } else if (msg.type === 'request') {
        info.requestCount++;
      } else if (msg.type === 'error') {
        info.errorCount++;
      }
    });

    // Worker disconnects
    worker.on('disconnect', () => {
      info.state = 'disconnected';
      console.log(`Worker ${worker.id} disconnected`);
    });

    // Worker exits
    worker.on('exit', (code, signal) => {
      info.state = 'dead';
      console.log(`Worker ${worker.id} exited: code=${code}, signal=${signal}`);
    });
  }
}
```

## Worker Lifecycle Events

### All Lifecycle Events

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  // Cluster-level events (all workers)
  cluster.on('fork', (worker) => {
    console.log(`[CLUSTER] Worker ${worker.id} forked`);
  });

  cluster.on('online', (worker) => {
    console.log(`[CLUSTER] Worker ${worker.id} online`);
  });

  cluster.on('listening', (worker, address) => {
    console.log(`[CLUSTER] Worker ${worker.id} listening on ${address.port}`);
  });

  cluster.on('disconnect', (worker) => {
    console.log(`[CLUSTER] Worker ${worker.id} disconnected`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[CLUSTER] Worker ${worker.id} exited: code=${code}, signal=${signal}`);
  });

  // Create worker
  const worker = cluster.fork();

  // Worker-specific events
  worker.on('online', () => {
    console.log(`[WORKER ${worker.id}] Online`);
  });

  worker.on('listening', (address) => {
    console.log(`[WORKER ${worker.id}] Listening: ${JSON.stringify(address)}`);
  });

  worker.on('message', (msg) => {
    console.log(`[WORKER ${worker.id}] Message: ${JSON.stringify(msg)}`);
  });

  worker.on('disconnect', () => {
    console.log(`[WORKER ${worker.id}] Disconnected`);
  });

  worker.on('exit', (code, signal) => {
    console.log(`[WORKER ${worker.id}] Exited: code=${code}, signal=${signal}`);
  });

  worker.on('error', (error) => {
    console.log(`[WORKER ${worker.id}] Error: ${error.message}`);
  });
}
```

### Event Timing

```javascript
// Track event timing
if (cluster.isMaster) {
  const timing = {
    fork: null,
    online: null,
    listening: null
  };

  const worker = cluster.fork();
  timing.fork = Date.now();

  worker.on('online', () => {
    timing.online = Date.now();
    console.log(`Fork to Online: ${timing.online - timing.fork}ms`);
  });

  worker.on('listening', () => {
    timing.listening = Date.now();
    console.log(`Online to Listening: ${timing.listening - timing.online}ms`);
    console.log(`Total startup time: ${timing.listening - timing.fork}ms`);
  });
}
```

## Worker Health Monitoring

### Heartbeat Implementation

```javascript
if (cluster.isMaster) {
  class WorkerMonitor {
    constructor(worker) {
      this.worker = worker;
      this.lastHeartbeat = Date.now();
      this.missedHeartbeats = 0;
      this.isHealthy = true;

      this.startMonitoring();
    }

    startMonitoring() {
      // Listen for heartbeats
      this.worker.on('message', (msg) => {
        if (msg.type === 'heartbeat') {
          this.lastHeartbeat = Date.now();
          this.missedHeartbeats = 0;
          this.isHealthy = true;
        }
      });

      // Check heartbeat every 5 seconds
      this.checkInterval = setInterval(() => {
        this.checkHealth();
      }, 5000);
    }

    checkHealth() {
      const now = Date.now();
      const timeSinceHeartbeat = now - this.lastHeartbeat;

      if (timeSinceHeartbeat > 10000) {
        this.missedHeartbeats++;
        this.isHealthy = false;

        console.log(`Worker ${this.worker.id} missed heartbeat #${this.missedHeartbeats}`);

        if (this.missedHeartbeats >= 3) {
          console.log(`Worker ${this.worker.id} unresponsive, restarting`);
          this.worker.kill();
        }
      }
    }

    stop() {
      clearInterval(this.checkInterval);
    }
  }

  // Create worker with monitoring
  const worker = cluster.fork();
  const monitor = new WorkerMonitor(worker);

} else {
  // Worker sends heartbeat
  setInterval(() => {
    if (process.send) {
      process.send({
        type: 'heartbeat',
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      });
    }
  }, 3000);
}
```

### Memory Monitoring

```javascript
if (cluster.isMaster) {
  function monitorWorkerMemory(worker) {
    worker.on('message', (msg) => {
      if (msg.type === 'metrics') {
        const heapUsed = msg.memory.heapUsed;
        const heapTotal = msg.memory.heapTotal;
        const heapPercent = (heapUsed / heapTotal) * 100;

        console.log(`Worker ${worker.id} memory: ${(heapUsed / 1024 / 1024).toFixed(2)}MB (${heapPercent.toFixed(1)}%)`);

        // Check for memory leak
        if (heapPercent > 90) {
          console.log(`⚠ Worker ${worker.id} high memory usage, restarting`);
          gracefulRestart(worker);
        }
      }
    });
  }

} else {
  // Worker reports metrics
  setInterval(() => {
    if (process.send) {
      process.send({
        type: 'metrics',
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      });
    }
  }, 5000);
}
```

## Worker Restart Strategies

### Immediate Restart

```javascript
if (cluster.isMaster) {
  cluster.on('exit', (worker, code, signal) => {
    if (!worker.exitedAfterDisconnect) {
      // Unexpected exit - restart immediately
      console.log(`Worker ${worker.id} crashed, restarting`);
      cluster.fork();
    }
  });
}
```

### Restart with Backoff

```javascript
if (cluster.isMaster) {
  const restartCounts = new Map();
  const MAX_RESTARTS = 5;
  const BACKOFF_BASE = 1000; // 1 second

  cluster.on('exit', (worker, code, signal) => {
    if (worker.exitedAfterDisconnect) {
      console.log(`Worker ${worker.id} exited gracefully`);
      return;
    }

    // Track restarts
    const count = (restartCounts.get(worker.id) || 0) + 1;
    restartCounts.set(worker.id, count);

    if (count > MAX_RESTARTS) {
      console.error(`Worker ${worker.id} crashed ${count} times, giving up`);
      return;
    }

    // Calculate backoff delay
    const delay = BACKOFF_BASE * Math.pow(2, count - 1);
    console.log(`Restarting worker ${worker.id} in ${delay}ms (attempt ${count}/${MAX_RESTARTS})`);

    setTimeout(() => {
      const newWorker = cluster.fork();
      // Reset counter after successful restart
      setTimeout(() => {
        restartCounts.delete(worker.id);
      }, 60000); // Reset after 1 minute
    }, delay);
  });
}
```

### Graceful Restart

```javascript
if (cluster.isMaster) {
  async function gracefulRestart(worker) {
    console.log(`Starting graceful restart of worker ${worker.id}`);

    // 1. Fork new worker first
    const newWorker = cluster.fork();

    // 2. Wait for new worker to be ready
    await new Promise((resolve) => {
      newWorker.on('listening', resolve);
    });

    console.log(`New worker ${newWorker.id} ready`);

    // 3. Disconnect old worker
    worker.disconnect();

    // 4. Wait for graceful shutdown
    await new Promise((resolve) => {
      worker.on('exit', resolve);

      // Force kill after timeout
      setTimeout(() => {
        if (!worker.isDead()) {
          console.log(`Force killing worker ${worker.id}`);
          worker.kill('SIGKILL');
        }
      }, 30000);
    });

    console.log(`Old worker ${worker.id} shut down`);
  }

  // Trigger graceful restart
  process.on('SIGUSR2', () => {
    Object.values(cluster.workers).forEach(gracefulRestart);
  });
}
```

## Worker State Management

### Complete State Tracker

```javascript
if (cluster.isMaster) {
  class WorkerStateManager {
    constructor() {
      this.workers = new Map();
    }

    createWorker() {
      const worker = cluster.fork();

      this.workers.set(worker.id, {
        worker,
        state: 'created',
        createdAt: Date.now(),
        onlineAt: null,
        listeningAt: null,
        disconnectedAt: null,
        exitedAt: null,
        restartCount: 0,
        requestCount: 0,
        errorCount: 0,
        lastHeartbeat: Date.now(),
        metadata: {}
      });

      this.setupHandlers(worker);
      return worker;
    }

    setupHandlers(worker) {
      const state = this.workers.get(worker.id);

      worker.on('online', () => {
        state.state = 'online';
        state.onlineAt = Date.now();
      });

      worker.on('listening', () => {
        state.state = 'listening';
        state.listeningAt = Date.now();
      });

      worker.on('disconnect', () => {
        state.state = 'disconnected';
        state.disconnectedAt = Date.now();
      });

      worker.on('exit', (code, signal) => {
        state.state = 'exited';
        state.exitedAt = Date.now();
        state.exitCode = code;
        state.exitSignal = signal;
      });

      worker.on('message', (msg) => {
        if (msg.type === 'heartbeat') {
          state.lastHeartbeat = Date.now();
        } else if (msg.type === 'request') {
          state.requestCount++;
        } else if (msg.type === 'error') {
          state.errorCount++;
        }
      });
    }

    getWorkerState(workerId) {
      return this.workers.get(workerId);
    }

    getAllStates() {
      return Array.from(this.workers.values()).map(state => ({
        id: state.worker.id,
        pid: state.worker.process.pid,
        state: state.state,
        uptime: state.listeningAt ? Date.now() - state.listeningAt : 0,
        requests: state.requestCount,
        errors: state.errorCount,
        restarts: state.restartCount
      }));
    }

    isHealthy(workerId) {
      const state = this.workers.get(workerId);
      if (!state) return false;

      const timeSinceHeartbeat = Date.now() - state.lastHeartbeat;
      return timeSinceHeartbeat < 10000 && state.state === 'listening';
    }

    removeWorker(workerId) {
      this.workers.delete(workerId);
    }
  }

  const stateManager = new WorkerStateManager();

  // Create workers
  for (let i = 0; i < 4; i++) {
    stateManager.createWorker();
  }

  // Report state
  setInterval(() => {
    const states = stateManager.getAllStates();
    console.log('\nWorker States:');
    states.forEach(state => {
      console.log(`  Worker ${state.id}: ${state.state} (${state.requests} req, ${state.uptime}ms uptime)`);
    });
  }, 10000);
}
```

## Worker Shutdown

### Graceful Worker Shutdown

```javascript
if (cluster.isWorker) {
  let isShuttingDown = false;

  async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`Worker ${cluster.worker.id} shutting down`);

    // 1. Stop accepting new connections
    server.close(() => {
      console.log('Server closed');
    });

    // 2. Wait for active requests
    await waitForRequests();

    // 3. Clean up resources
    await cleanup();

    // 4. Disconnect from master
    cluster.worker.disconnect();

    // 5. Exit
    process.exit(0);
  }

  // Handle shutdown signals
  process.on('SIGTERM', shutdown);
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      shutdown();
    }
  });
}
```

### Forced Shutdown

```javascript
if (cluster.isMaster) {
  function forceShutdown(worker, timeout = 30000) {
    console.log(`Force shutting down worker ${worker.id}`);

    // Send shutdown message
    worker.send('shutdown');

    // Wait for graceful shutdown
    const timer = setTimeout(() => {
      if (!worker.isDead()) {
        console.log(`Worker ${worker.id} didn't exit gracefully, killing`);
        worker.kill('SIGKILL');
      }
    }, timeout);

    worker.on('exit', () => {
      clearTimeout(timer);
      console.log(`Worker ${worker.id} exited`);
    });
  }
}
```

## Best Practices

### 1. Always Monitor Worker Health

```javascript
// ✅ Good: Monitor worker health
const monitors = new Map();

cluster.on('online', (worker) => {
  monitors.set(worker.id, new WorkerMonitor(worker));
});

cluster.on('exit', (worker) => {
  const monitor = monitors.get(worker.id);
  if (monitor) {
    monitor.stop();
    monitors.delete(worker.id);
  }
});
```

### 2. Track Worker State

```javascript
// ✅ Good: Maintain worker state
const workerStates = new Map();

function updateWorkerState(workerId, state) {
  const current = workerStates.get(workerId) || {};
  workerStates.set(workerId, { ...current, state, timestamp: Date.now() });
}
```

### 3. Implement Graceful Restart

```javascript
// ✅ Good: Always graceful restart
async function restartWorker(worker) {
  const newWorker = cluster.fork();
  await waitForReady(newWorker);
  await shutdownGracefully(worker);
}
```

### 4. Set Restart Limits

```javascript
// ✅ Good: Prevent infinite restart loops
const restartCounts = new Map();
const MAX_RESTARTS = 5;

cluster.on('exit', (worker) => {
  const count = (restartCounts.get(worker.id) || 0) + 1;

  if (count > MAX_RESTARTS) {
    console.error('Too many restarts, stopping');
    return;
  }

  restartCounts.set(worker.id, count);
  cluster.fork();
});
```

## Common Pitfalls

### 1. Not Handling Unexpected Exits

```javascript
// ❌ Bad: No restart on crash
cluster.on('exit', (worker) => {
  console.log('Worker exited');
});

// ✅ Good: Restart crashed workers
cluster.on('exit', (worker, code, signal) => {
  if (!worker.exitedAfterDisconnect) {
    console.log('Worker crashed, restarting');
    cluster.fork();
  }
});
```

### 2. Infinite Restart Loops

```javascript
// ❌ Bad: Can restart forever
cluster.on('exit', () => {
  cluster.fork(); // Restarts even if worker keeps crashing
});

// ✅ Good: Limit restarts
const restartLimit = createRestartLimiter(5, 60000);
cluster.on('exit', (worker) => {
  if (restartLimit.canRestart(worker.id)) {
    cluster.fork();
  }
});
```

### 3. Not Tracking Worker State

```javascript
// ❌ Bad: No state tracking
cluster.fork(); // Don't know if worker is ready

// ✅ Good: Wait for ready state
const worker = cluster.fork();
await new Promise(resolve => {
  worker.on('listening', resolve);
});
```

## Summary

Effective worker lifecycle management requires:

1. **Monitor** all lifecycle events
2. **Track** worker state transitions
3. **Implement** health checks with heartbeats
4. **Handle** crashes with intelligent restart
5. **Coordinate** graceful shutdowns
6. **Set** limits on restart attempts
7. **Log** all lifecycle events for debugging

Understanding the worker lifecycle enables building robust, self-healing clustered applications.
