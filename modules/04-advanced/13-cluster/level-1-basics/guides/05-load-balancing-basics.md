# Guide 5: Load Balancing Basics

## Introduction

Load balancing is the mechanism by which Node.js distributes incoming connections across multiple worker processes. Understanding how this works is crucial for building high-performance, scalable applications. This guide explores the fundamentals of load balancing in Node.js clustering, including algorithms, strategies, and practical implementations.

## What is Load Balancing?

### Definition

**Load balancing** distributes network traffic or computational work across multiple workers to:
- Maximize throughput
- Minimize response time
- Avoid overloading any single worker
- Improve overall system reliability

### The Problem

Without load balancing:
```
Incoming Requests
      │
      ├──> Worker 1 (overloaded) ❌
      ├──> Worker 1 (overloaded) ❌
      ├──> Worker 1 (overloaded) ❌
      └──> Worker 1 (overloaded) ❌

Worker 2 (idle) 😴
Worker 3 (idle) 😴
Worker 4 (idle) 😴
```

With load balancing:
```
Incoming Requests
      │
      ├──> Worker 1 ✓
      ├──> Worker 2 ✓
      ├──> Worker 3 ✓
      └──> Worker 4 ✓

All workers utilized evenly
```

## How Node.js Handles Load Balancing

### Automatic Distribution

When workers listen on the same port, Node.js automatically distributes connections:

```javascript
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  // Fork 4 workers
  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
} else {
  // All workers listen on port 8000
  http.createServer((req, res) => {
    res.end(`Worker ${process.pid}\n`);
  }).listen(8000); // Automatic load balancing!
}
```

**Key Point**: The operating system/Node.js handles distribution automatically. You don't need to implement custom logic.

### Behind the Scenes

```
Client Requests
      │
      ▼
┌─────────────────┐
│ Master Process  │
│  (Port 8000)    │ ← Actually binds to port
└────────┬────────┘
         │ Distributes connections
    ┌────┴────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼
 Worker 1  Worker 2  Worker 3  Worker 4
```

**How it works**:
1. Master process binds to the port
2. Workers signal they want to listen
3. Master accepts connections
4. Master passes connections to workers using scheduling algorithm

## Scheduling Algorithms

### Round-Robin (Default on Most Platforms)

Distributes connections sequentially to each worker.

**Pattern**:
```
Request 1 → Worker 1
Request 2 → Worker 2
Request 3 → Worker 3
Request 4 → Worker 4
Request 5 → Worker 1  (back to first)
Request 6 → Worker 2
...
```

**Characteristics**:
- Simple and predictable
- Ensures even distribution over time
- Default on Linux, macOS (except in certain cases)

**Example**:
```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  // Set scheduling policy explicitly
  cluster.schedulingPolicy = cluster.SCHED_RR; // Round-robin

  console.log('Using round-robin scheduling');

  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
}
```

### Operating System Scheduling

Lets the OS kernel handle distribution.

**Characteristics**:
- OS-dependent behavior
- May be more efficient for certain workloads
- Less predictable distribution
- Default on Windows

**Example**:
```javascript
if (cluster.isMaster) {
  // Use OS scheduling
  cluster.schedulingPolicy = cluster.SCHED_NONE;

  console.log('Using OS scheduling');

  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
}
```

### Comparison

```javascript
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  // Test both scheduling policies
  const policy = process.env.POLICY || 'rr';

  if (policy === 'rr') {
    cluster.schedulingPolicy = cluster.SCHED_RR;
    console.log('Testing Round-Robin scheduling');
  } else {
    cluster.schedulingPolicy = cluster.SCHED_NONE;
    console.log('Testing OS scheduling');
  }

  const requestsPerWorker = new Map();

  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork();
    requestsPerWorker.set(worker.id, 0);
  }

  // Track distribution
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'request') {
      const count = requestsPerWorker.get(worker.id) || 0;
      requestsPerWorker.set(worker.id, count + 1);
    }
  });

  // Report distribution every 5 seconds
  setInterval(() => {
    console.log('\n=== Request Distribution ===');
    requestsPerWorker.forEach((count, id) => {
      console.log(`Worker ${id}: ${count} requests`);
    });
  }, 5000);

} else {
  const server = http.createServer((req, res) => {
    // Notify master of request
    process.send({ type: 'request' });

    res.writeHead(200);
    res.end(`Worker ${cluster.worker.id}\n`);
  });

  server.listen(8000);
}
```

## Load Balancing in Practice

### Observing Distribution

```javascript
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  const stats = new Map();

  // Fork workers
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork();
    stats.set(worker.id, {
      requests: 0,
      connections: 0
    });
  }

  // Collect stats from workers
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'stats') {
      stats.set(worker.id, msg.data);
    }
  });

  // Display distribution
  setInterval(() => {
    console.clear();
    console.log('=== Load Distribution ===\n');

    stats.forEach((data, id) => {
      const bar = '█'.repeat(Math.floor(data.requests / 10));
      console.log(`Worker ${id}: ${data.requests.toString().padStart(4)} ${bar}`);
    });

    const total = Array.from(stats.values())
      .reduce((sum, data) => sum + data.requests, 0);
    console.log(`\nTotal: ${total} requests`);
  }, 1000);

} else {
  let requests = 0;
  let connections = 0;

  const server = http.createServer((req, res) => {
    requests++;
    res.end(`Worker ${cluster.worker.id}\n`);
  });

  server.on('connection', () => {
    connections++;
  });

  server.listen(8000);

  // Report stats
  setInterval(() => {
    process.send({
      type: 'stats',
      data: { requests, connections }
    });
  }, 500);
}
```

### Testing Load Distribution

Run this test to see distribution in action:

```javascript
// server.js
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  cluster.schedulingPolicy = cluster.SCHED_RR;

  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
} else {
  http.createServer((req, res) => {
    console.log(`Worker ${cluster.worker.id} handling request`);
    res.end(`Worker ${cluster.worker.id}\n`);
  }).listen(8000);
}
```

```bash
# Test with curl
for i in {1..16}; do
  curl http://localhost:8000
done

# Or with Apache Bench
ab -n 1000 -c 10 http://localhost:8000/
```

## Load Balancing Strategies

### 1. Equal Distribution

Default round-robin provides equal distribution:

```javascript
if (cluster.isMaster) {
  cluster.schedulingPolicy = cluster.SCHED_RR;

  // All workers get equal share
  const numWorkers = 4;
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
}
```

### 2. Weighted Distribution

Not natively supported, but can be simulated:

```javascript
if (cluster.isMaster) {
  const workers = {
    high: [],   // High-capacity workers
    medium: [], // Medium-capacity workers
    low: []     // Low-capacity workers
  };

  // Fork high-capacity workers (e.g., 4 cores)
  for (let i = 0; i < 4; i++) {
    workers.high.push(cluster.fork({ CAPACITY: 'high' }));
  }

  // Fork medium-capacity workers (e.g., 2 cores)
  for (let i = 0; i < 2; i++) {
    workers.medium.push(cluster.fork({ CAPACITY: 'medium' }));
  }

  // Fork low-capacity workers (e.g., 1 core)
  workers.low.push(cluster.fork({ CAPACITY: 'low' }));

  // Round-robin will distribute evenly,
  // but more high-capacity workers = more load handled
}
```

### 3. Least-Connection (Custom Implementation)

Node.js doesn't provide this natively, but you can implement it:

```javascript
if (cluster.isMaster) {
  const workerConnections = new Map();
  const workers = [];

  // Fork workers
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    workerConnections.set(worker.id, 0);
  }

  // Track connections
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'connection-count') {
      workerConnections.set(worker.id, msg.count);
    }
  });

  // Display least-loaded worker
  setInterval(() => {
    const sorted = Array.from(workerConnections.entries())
      .sort((a, b) => a[1] - b[1]);

    console.log('Worker connections (sorted by load):');
    sorted.forEach(([id, count]) => {
      console.log(`  Worker ${id}: ${count}`);
    });

    const leastLoaded = sorted[0];
    console.log(`→ Least loaded: Worker ${leastLoaded[0]} (${leastLoaded[1]} connections)\n`);
  }, 3000);
}

if (cluster.isWorker) {
  let activeConnections = 0;

  const server = http.createServer((req, res) => {
    activeConnections++;

    res.on('finish', () => {
      activeConnections--;
      reportConnections();
    });

    res.end(`Worker ${cluster.worker.id}\n`);
  });

  server.listen(8000);

  function reportConnections() {
    process.send({
      type: 'connection-count',
      count: activeConnections
    });
  }

  setInterval(reportConnections, 1000);
}
```

## Performance Considerations

### 1. Connection Overhead

```javascript
// Measure connection distribution overhead
if (cluster.isMaster) {
  const startTime = Date.now();
  let totalRequests = 0;

  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'request') {
      totalRequests++;

      if (totalRequests % 1000 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rps = totalRequests / elapsed;
        console.log(`Handled ${totalRequests} requests (${rps.toFixed(0)} req/s)`);
      }
    }
  });
}

if (cluster.isWorker) {
  http.createServer((req, res) => {
    process.send({ type: 'request' });
    res.end('OK');
  }).listen(8000);
}
```

### 2. Sticky Sessions

For applications requiring session affinity:

```javascript
// Note: Node.js cluster doesn't natively support sticky sessions
// You need external load balancer (nginx, HAProxy) or custom implementation

// Example with custom session routing
if (cluster.isMaster) {
  const sessionWorkers = new Map(); // sessionId -> workerId

  // This is conceptual - actual implementation requires
  // custom socket handling
  function routeBySession(sessionId) {
    if (!sessionWorkers.has(sessionId)) {
      // Assign to least-loaded worker
      const workers = Object.values(cluster.workers);
      const worker = workers[Math.floor(Math.random() * workers.length)];
      sessionWorkers.set(sessionId, worker.id);
    }

    return cluster.workers[sessionWorkers.get(sessionId)];
  }
}
```

**Better Approach**: Use external load balancer with sticky sessions:
```nginx
# nginx configuration
upstream backend {
    ip_hash;  # Sticky sessions based on IP
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
    server 127.0.0.1:8004;
}
```

### 3. Long-Polling and WebSockets

These require special consideration:

```javascript
// WebSocket load balancing challenges
if (cluster.isWorker) {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ port: 8000 });

  wss.on('connection', (ws) => {
    console.log(`Worker ${cluster.worker.id} got WebSocket connection`);

    // WebSocket stays connected to this worker
    // Load balancing only happens on initial connection
    ws.on('message', (msg) => {
      ws.send(`Worker ${cluster.worker.id} received: ${msg}`);
    });
  });
}
```

**Solution**: Use Redis pub/sub for cross-worker communication:
```javascript
const redis = require('redis');
const pub = redis.createClient();
const sub = redis.createClient();

if (cluster.isWorker) {
  const wss = new WebSocket.Server({ port: 8000 });

  // Subscribe to broadcasts
  sub.subscribe('broadcast');
  sub.on('message', (channel, message) => {
    // Send to all connections on this worker
    wss.clients.forEach(client => {
      client.send(message);
    });
  });

  wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
      // Publish to all workers
      pub.publish('broadcast', msg);
    });
  });
}
```

## Monitoring Load Distribution

### Real-Time Distribution Monitor

```javascript
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  const workerStats = new Map();

  // Fork workers
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork();
    workerStats.set(worker.id, {
      requests: 0,
      avgResponseTime: 0,
      currentLoad: 0
    });
  }

  // Collect stats
  cluster.on('message', (worker, msg) => {
    if (msg.type === 'stats') {
      workerStats.set(worker.id, msg.data);
    }
  });

  // Display dashboard
  setInterval(() => {
    console.clear();
    console.log('╔═══════════════════════════════════════╗');
    console.log('║     CLUSTER LOAD DASHBOARD            ║');
    console.log('╚═══════════════════════════════════════╝\n');

    let totalRequests = 0;

    workerStats.forEach((stats, id) => {
      totalRequests += stats.requests;

      const loadBar = '█'.repeat(Math.min(stats.currentLoad, 20));
      const loadPercent = (stats.currentLoad * 5).toFixed(0);

      console.log(`Worker ${id}:`);
      console.log(`  Requests: ${stats.requests}`);
      console.log(`  Avg Response: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`  Load: [${loadBar.padEnd(20)}] ${loadPercent}%`);
      console.log();
    });

    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Workers: ${workerStats.size}`);
    console.log(`Avg per Worker: ${(totalRequests / workerStats.size).toFixed(0)}`);
  }, 1000);

} else {
  let requests = 0;
  let totalResponseTime = 0;
  let activeRequests = 0;

  const server = http.createServer((req, res) => {
    const start = Date.now();
    activeRequests++;

    // Simulate work
    setTimeout(() => {
      requests++;
      const responseTime = Date.now() - start;
      totalResponseTime += responseTime;
      activeRequests--;

      res.writeHead(200);
      res.end(`Worker ${cluster.worker.id}\n`);
    }, Math.random() * 100);
  });

  server.listen(8000);

  // Report stats
  setInterval(() => {
    process.send({
      type: 'stats',
      data: {
        requests,
        avgResponseTime: requests > 0 ? totalResponseTime / requests : 0,
        currentLoad: activeRequests
      }
    });
  }, 500);
}
```

## Best Practices

### 1. Use Round-Robin for HTTP Servers

```javascript
// ✓ CORRECT: Round-robin for HTTP
if (cluster.isMaster) {
  cluster.schedulingPolicy = cluster.SCHED_RR;

  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
}
```

### 2. Match Worker Count to CPU Cores

```javascript
// ✓ CORRECT: One worker per core
const numWorkers = os.cpus().length;

// ❌ WRONG: Too many workers
const numWorkers = os.cpus().length * 4; // Excessive context switching
```

### 3. Monitor Distribution Balance

```javascript
if (cluster.isMaster) {
  setInterval(() => {
    const counts = Object.values(cluster.workers)
      .map(w => w.requestCount || 0);

    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const imbalance = max - min;

    if (imbalance > 100) {
      console.warn(`Load imbalance detected: ${imbalance}`);
    }
  }, 10000);
}
```

### 4. Handle Uneven Workloads

```javascript
// If workers handle different types of requests
if (cluster.isMaster) {
  // Dedicated workers for heavy operations
  for (let i = 0; i < 2; i++) {
    cluster.fork({ TYPE: 'heavy', PORT: 8001 });
  }

  // More workers for light operations
  for (let i = 0; i < 6; i++) {
    cluster.fork({ TYPE: 'light', PORT: 8000 });
  }
}
```

## Common Pitfalls

### 1. Assuming Perfect Distribution

```javascript
// ❌ WRONG: Assuming each worker gets exactly 25% with 4 workers
// Distribution is approximately equal, not exactly equal
```

### 2. Not Considering Connection Duration

```javascript
// ❌ PROBLEM: Long-lived connections can cause imbalance
// WebSockets stay on same worker for their lifetime
// One worker might have many old connections

// ✓ SOLUTION: Monitor active connections, not just request count
```

### 3. Ignoring Worker Health

```javascript
// ❌ WRONG: Continuing to send requests to unhealthy worker

// ✓ CORRECT: Health-aware load balancing
if (cluster.isMaster) {
  const healthyWorkers = new Set();

  cluster.on('listening', (worker) => {
    healthyWorkers.add(worker.id);
  });

  cluster.on('exit', (worker) => {
    healthyWorkers.delete(worker.id);
  });

  // Only route to healthy workers (requires custom implementation)
}
```

## Summary

Load balancing in Node.js clustering:
- **Automatic**: Built into the cluster module
- **Configurable**: Round-robin or OS scheduling
- **Transparent**: Workers don't need special code
- **Efficient**: Low overhead for most use cases

Key concepts:
- Round-robin scheduling provides even distribution
- OS scheduling may be more efficient on some platforms
- Default behavior works well for most HTTP servers
- Custom load balancing requires external tools
- Monitor distribution to ensure balance

Load balancing strategies:
- Equal distribution (default)
- Weighted distribution (via worker count)
- Least-connection (custom implementation)
- Sticky sessions (external load balancer)

Best practices:
- Use round-robin for predictable distribution
- Match worker count to CPU cores
- Monitor load distribution
- Consider connection duration
- Account for worker health
- Use external load balancer for advanced features

Understanding load balancing helps you build scalable, high-performance Node.js applications that effectively utilize system resources.
