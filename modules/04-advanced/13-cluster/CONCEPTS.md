# Cluster Module: Core Concepts

This document provides foundational concepts for the Cluster module that span all three levels (Basics, Intermediate, Advanced).

## Table of Contents
- [What is Clustering?](#what-is-clustering)
- [Why Clustering Matters](#why-clustering-matters)
- [How Clustering Works](#how-clustering-works)
- [Master-Worker Architecture](#master-worker-architecture)
- [Load Balancing](#load-balancing)
- [Process Communication](#process-communication)
- [Performance Considerations](#performance-considerations)
- [Clustering vs Other Approaches](#clustering-vs-other-approaches)

---

## What is Clustering?

### Definition

**Clustering** in Node.js is a technique that allows a single application to spawn multiple processes (called workers) that share the same server port, enabling the application to take advantage of multi-core systems.

```javascript
// Single-threaded Node.js
// Uses only 1 CPU core
http.createServer((req, res) => {
  res.end('Hello World');
}).listen(8000);

// Clustered Node.js
// Uses all CPU cores
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  // Fork one worker per CPU core
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
} else {
  // Each worker runs the server
  http.createServer((req, res) => {
    res.end('Hello World');
  }).listen(8000);
}
```

### The Node.js Single-Thread Challenge

Node.js runs JavaScript in a single thread:

```javascript
// Problem: CPU-intensive tasks block the event loop
app.get('/cpu-intensive', (req, res) => {
  // This blocks ALL other requests
  let sum = 0;
  for (let i = 0; i < 1000000000; i++) {
    sum += i;
  }
  res.send({ sum });
});

// Solution: Distribute across multiple processes
// Each process has its own event loop
// CPU-intensive work in one process doesn't block others
```

### Core Purpose

Clustering exists to:
1. **Utilize Multiple CPU Cores** - Overcome single-thread limitation
2. **Increase Throughput** - Handle more concurrent requests
3. **Improve Reliability** - Worker crashes don't kill entire app
4. **Enable Zero-Downtime Deploys** - Restart workers one at a time
5. **Scale Vertically** - Use all available hardware

---

## Why Clustering Matters

### 1. Performance & Scalability

Modern servers have multiple CPU cores, but Node.js uses only one by default:

```javascript
// Server with 8 CPU cores
// Without clustering: Only 1 core used (12.5% utilization)
// With clustering: All 8 cores used (100% utilization)

// Performance impact:
// Single process: 1,000 requests/sec
// 8-worker cluster: ~8,000 requests/sec
```

### 2. High Availability

Worker crashes don't bring down the entire application:

```javascript
// Without clustering
process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1); // ENTIRE APP GOES DOWN!
});

// With clustering
cluster.on('exit', (worker, code, signal) => {
  console.log(`Worker ${worker.process.pid} died`);
  cluster.fork(); // App stays up, only one worker affected
});
```

### 3. Zero-Downtime Deployments

Update application without stopping service:

```javascript
// Rolling restart pattern
// 1. Fork new worker with updated code
// 2. Wait for new worker to be ready
// 3. Gracefully shutdown old worker
// 4. Repeat for all workers
// Result: Continuous service during updates
```

### 4. Resource Isolation

Each worker is a separate process with isolated memory:

```javascript
// Worker 1 crash doesn't affect Worker 2
// Memory leak in one worker doesn't affect others
// Each worker has independent V8 heap
```

---

## How Clustering Works

### The Fork Model

The cluster module uses the `child_process.fork()` method:

```javascript
// When you call cluster.fork():
// 1. Node.js creates a new child process
// 2. Child process runs the same script
// 3. Child process can detect it's a worker
// 4. Workers inherit master's environment

const cluster = require('cluster');

if (cluster.isMaster) {
  console.log('I am the master process');
  cluster.fork(); // Creates child process
} else {
  console.log('I am a worker process');
}
```

### Process Identification

Each process can determine its role:

```javascript
const cluster = require('cluster');

// Method 1: cluster.isMaster / cluster.isWorker
if (cluster.isMaster) {
  // Master process code
} else {
  // Worker process code
}

// Method 2: cluster.isPrimary (Node 16+)
if (cluster.isPrimary) {
  // Primary process code
} else {
  // Worker process code
}

// Method 3: Check worker object
if (cluster.worker) {
  // This is a worker (cluster.worker exists only in workers)
  console.log(`Worker ID: ${cluster.worker.id}`);
}
```

### Shared Server Ports

Multiple workers can listen on the same port:

```javascript
// This seems impossible, but it works!
// Worker 1: .listen(8000)
// Worker 2: .listen(8000)
// Worker 3: .listen(8000)
// Worker 4: .listen(8000)

// How? The master process actually owns the port
// Workers receive connections from master via handle passing
```

---

## Master-Worker Architecture

### Master Process Responsibilities

The master process coordinates all workers:

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  // Master responsibilities:

  // 1. Fork workers
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // 2. Monitor workers
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });

  // 3. Handle worker failures
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart
  });

  // 4. Coordinate shutdowns
  process.on('SIGTERM', () => {
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  // 5. Distribute messages
  for (const id in cluster.workers) {
    cluster.workers[id].send({ cmd: 'update_config' });
  }
}
```

### Worker Process Responsibilities

Workers do the actual application work:

```javascript
if (cluster.isWorker) {
  // Worker responsibilities:

  // 1. Handle requests
  const server = http.createServer((req, res) => {
    res.end('Hello from worker ' + process.pid);
  }).listen(8000);

  // 2. Receive messages from master
  process.on('message', (msg) => {
    if (msg.cmd === 'update_config') {
      // Reload configuration
    }
  });

  // 3. Report status to master
  process.send({ status: 'ready', pid: process.pid });

  // 4. Graceful shutdown
  process.on('message', (msg) => {
    if (msg.cmd === 'shutdown') {
      server.close(() => {
        process.exit(0);
      });
    }
  });

  // 5. Handle errors
  process.on('uncaughtException', (err) => {
    console.error('Worker error:', err);
    process.exit(1); // Master will restart
  });
}
```

---

## Load Balancing

### How Load Balancing Works

Node.js cluster module provides automatic load balancing:

```javascript
// When a request comes in:
// 1. Master process receives it
// 2. Master distributes to a worker
// 3. Worker processes the request
// 4. Worker sends response

// Distribution happens automatically!
```

### Load Balancing Strategies

Node.js uses two strategies:

#### 1. Round-Robin (Default on non-Windows)

```javascript
// Distributes connections in circular order
// Request 1 → Worker 1
// Request 2 → Worker 2
// Request 3 → Worker 3
// Request 4 → Worker 4
// Request 5 → Worker 1 (back to first)
// ...

// Pros: Even distribution
// Cons: Doesn't consider worker load
```

#### 2. Operating System Scheduling (Windows default)

```javascript
// OS kernel decides which worker gets connection
// Based on worker availability and system load

// Pros: OS-optimized
// Cons: Less predictable distribution
```

#### Choosing a Strategy

```javascript
const cluster = require('cluster');

// Set scheduling policy
cluster.schedulingPolicy = cluster.SCHED_RR; // Round-robin
// or
cluster.schedulingPolicy = cluster.SCHED_NONE; // OS decides
```

### Load Balancing Limitations

```javascript
// What IS load balanced:
// ✓ TCP connections
// ✓ HTTP requests
// ✓ WebSocket connections (initial handshake)

// What is NOT load balanced:
// ✗ Long-lived WebSocket messages (after handshake)
// ✗ Sticky sessions (require custom implementation)
// ✗ Stateful connections
```

---

## Process Communication

### Master to Worker Communication

```javascript
// Master process
const cluster = require('cluster');

if (cluster.isMaster) {
  const worker = cluster.fork();

  // Send message to specific worker
  worker.send({ cmd: 'config', data: { port: 8000 } });

  // Send to all workers
  for (const id in cluster.workers) {
    cluster.workers[id].send({ cmd: 'reload' });
  }
}

// Worker process
if (cluster.isWorker) {
  process.on('message', (msg) => {
    console.log('Worker received:', msg);

    if (msg.cmd === 'config') {
      // Apply configuration
    }
  });
}
```

### Worker to Master Communication

```javascript
// Worker process
if (cluster.isWorker) {
  // Send message to master
  process.send({
    type: 'status',
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
}

// Master process
if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    console.log(`Master received from worker ${worker.id}:`, msg);

    if (msg.type === 'status') {
      // Log or store worker status
    }
  });
}
```

### Worker to Worker Communication

Workers cannot communicate directly - must go through master:

```javascript
// Worker 1 wants to send message to Worker 2
if (cluster.isWorker) {
  // Send to master with target worker ID
  process.send({
    type: 'worker_message',
    target: 2,
    data: 'Hello Worker 2'
  });
}

// Master routes the message
if (cluster.isMaster) {
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'worker_message') {
      const targetWorker = cluster.workers[msg.target];
      if (targetWorker) {
        targetWorker.send({
          from: worker.id,
          data: msg.data
        });
      }
    }
  });
}
```

---

## Performance Considerations

### Optimal Worker Count

```javascript
const os = require('os');
const cluster = require('cluster');

// Rule of thumb: One worker per CPU core
const numWorkers = os.cpus().length;

// But consider:
// - Memory constraints
// - Application type
// - Workload characteristics

// CPU-bound apps: workers = CPU cores
// I/O-bound apps: workers = CPU cores + 1 or 2
// Memory-intensive: fewer workers

if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
}
```

### Memory Overhead

```javascript
// Each worker is a full Node.js process
// Base memory per process: ~10-30 MB
// Plus your application's memory

// Example with 8 workers:
// Base overhead: 8 × 20 MB = 160 MB
// App memory per worker: 100 MB
// Total: 8 × (20 + 100) = 960 MB

// Consider available system memory when choosing worker count
```

### Startup Time

```javascript
// Forking workers takes time
const cluster = require('cluster');

if (cluster.isMaster) {
  console.time('Startup');

  const workers = 8;
  let ready = 0;

  for (let i = 0; i < workers; i++) {
    cluster.fork();
  }

  cluster.on('listening', () => {
    ready++;
    if (ready === workers) {
      console.timeEnd('Startup');
      // Typical: 100-500ms for 8 workers
    }
  });
}
```

---

## Clustering vs Other Approaches

### Cluster vs Single Process

```javascript
// Single Process
// Pros: Simple, low memory, easier debugging
// Cons: Uses one CPU core, no fault tolerance
http.createServer(handler).listen(8000);

// Cluster
// Pros: Uses all cores, fault tolerant, scalable
// Cons: More complex, higher memory, IPC overhead
const cluster = require('cluster');
// ... cluster setup
```

### Cluster vs Worker Threads

```javascript
// Cluster
// - Separate processes (full isolation)
// - Automatic load balancing for servers
// - Higher memory overhead
// - Better for I/O-bound web servers
const cluster = require('cluster');

// Worker Threads
// - Shared memory space
// - Better for CPU-intensive tasks
// - Lower overhead
// - Manual load distribution
const { Worker } = require('worker_threads');
```

### Cluster vs External Load Balancer

```javascript
// Internal Clustering (cluster module)
// - Built into Node.js
// - Same machine only
// - Process-level scaling
// - No additional infrastructure

// External Load Balancer (nginx, HAProxy)
// - Separate service
// - Multiple machines
// - Application-level scaling
// - Better for large deployments

// Often used together:
// nginx → [Machine 1: cluster] [Machine 2: cluster] [Machine 3: cluster]
```

### Cluster vs Process Managers

```javascript
// Cluster Module
// - Built-in Node.js module
// - Programmatic control
// - Custom logic possible
require('cluster').fork();

// PM2 / Forever
// - External tools
// - Configuration files
// - Monitoring dashboards
// - More features (logs, metrics, etc.)
pm2 start app.js -i max

// Best practice: Use both!
// - Cluster module for application-level control
// - PM2 for deployment and monitoring
```

---

## When to Use Clustering

### ✅ Use Clustering When:

1. **Building Web Servers**
   ```javascript
   // HTTP/HTTPS servers benefit most
   // Automatic connection distribution
   // Perfect for stateless APIs
   ```

2. **High Traffic Applications**
   ```javascript
   // Need to handle many concurrent connections
   // Want to maximize throughput
   ```

3. **Production Deployments**
   ```javascript
   // Need fault tolerance
   // Want zero-downtime restarts
   // Require high availability
   ```

4. **CPU-bound with I/O**
   ```javascript
   // Mix of CPU work and I/O
   // Image processing servers
   // API gateways with computation
   ```

### ❌ Don't Use Clustering When:

1. **Development/Testing**
   ```javascript
   // Adds complexity
   // Harder to debug
   // Use single process in dev
   ```

2. **Stateful Applications**
   ```javascript
   // Sessions stored in memory
   // In-memory caches
   // Use external storage instead
   ```

3. **Low Traffic Applications**
   ```javascript
   // Overhead not justified
   // Single process sufficient
   ```

4. **Pure CPU-intensive Tasks**
   ```javascript
   // Use worker_threads instead
   // Better for computation
   // Lower overhead
   ```

---

## Common Patterns

### Pattern 1: Basic Cluster Setup

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  require('./app'); // Your application code
}
```

### Pattern 2: Graceful Restart

```javascript
if (cluster.isMaster) {
  process.on('SIGUSR2', () => {
    const workers = Object.values(cluster.workers);

    const restartWorker = (i) => {
      if (i >= workers.length) return;

      const worker = workers[i];
      worker.on('exit', () => {
        cluster.fork();
        restartWorker(i + 1);
      });

      worker.kill('SIGTERM');
    };

    restartWorker(0);
  });
}
```

### Pattern 3: Health Monitoring

```javascript
if (cluster.isMaster) {
  setInterval(() => {
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];

      worker.send({ cmd: 'health_check' });

      const timeout = setTimeout(() => {
        console.log(`Worker ${id} not responding, killing`);
        worker.kill();
      }, 5000);

      worker.once('message', (msg) => {
        if (msg.cmd === 'health_response') {
          clearTimeout(timeout);
        }
      });
    }
  }, 30000);
}

if (cluster.isWorker) {
  process.on('message', (msg) => {
    if (msg.cmd === 'health_check') {
      process.send({ cmd: 'health_response', pid: process.pid });
    }
  });
}
```

---

## Best Practices

### 1. Always Restart Failed Workers

```javascript
cluster.on('exit', (worker, code, signal) => {
  console.log(`Worker ${worker.process.pid} died`);
  cluster.fork(); // Always restart
});
```

### 2. Implement Graceful Shutdown

```javascript
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000);
}
```

### 3. Don't Share State in Memory

```javascript
// Wrong
let sessionData = {}; // Each worker has different copy!

// Correct
const redis = require('redis');
const client = redis.createClient(); // External storage
```

### 4. Monitor Worker Health

```javascript
// Regular health checks
// Restart unresponsive workers
// Track worker metrics
```

### 5. Configure Appropriate Worker Count

```javascript
// Start with CPU count
// Adjust based on monitoring
// Consider memory constraints
```

---

## Summary

Clustering is a powerful technique for:
- Utilizing multiple CPU cores
- Increasing application throughput
- Improving reliability and uptime
- Enabling zero-downtime deployments

Understanding clustering is essential for building production-ready Node.js applications that can scale and handle real-world loads effectively.
