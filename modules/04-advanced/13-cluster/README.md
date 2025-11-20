# Module 13: Cluster

Master Node.js clustering for multi-core scalability and high-performance applications.

## Why This Module Matters

The `cluster` module enables Node.js applications to leverage multi-core systems by creating child processes (workers) that share the same server port. This is essential for maximizing performance and building production-ready applications that can handle high loads efficiently.

**Real-world applications:**
- Scaling web servers across CPU cores
- Load balancing incoming connections
- Zero-downtime application restarts
- Improving application throughput
- Handling high-concurrency scenarios
- Building fault-tolerant systems
- Production deployment strategies
- Process management and orchestration

---

## What You'll Learn

By completing this module, you'll master:

### Technical Skills
- Understanding the cluster module architecture
- Creating worker processes
- Master-worker communication patterns
- Load balancing strategies
- Process lifecycle management
- Handling worker crashes and restarts
- Zero-downtime deployment techniques
- Performance optimization with clustering

### Practical Applications
- Build scalable multi-core web servers
- Implement graceful shutdown and restart
- Handle worker failures automatically
- Distribute load across workers
- Monitor cluster health and performance
- Implement rolling restarts
- Build production-ready architectures
- Optimize resource utilization

---

## Module Structure

This module is divided into three progressive levels:

### [Level 1: Basics](./level-1-basics/README.md)
**Time**: 2-3 hours

Learn the fundamentals of Node.js clustering:
- Understanding clustering concepts
- Creating basic cluster setups
- Master and worker processes
- Process forking basics
- Basic inter-process communication
- Worker process management
- Cluster events
- Simple load balancing

**You'll be able to:**
- Create clustered applications
- Understand master-worker architecture
- Fork worker processes
- Handle basic cluster events
- Implement simple load distribution
- Monitor worker status
- Understand clustering benefits
- Build basic multi-core servers

### [Level 2: Intermediate](./level-2-intermediate/README.md)
**Time**: 3-4 hours

Advanced clustering techniques:
- Worker lifecycle management
- Graceful shutdown patterns
- Worker restart strategies
- Advanced IPC (Inter-Process Communication)
- Shared server handles
- Worker monitoring and health checks
- Message passing between workers
- State management in clusters

**You'll be able to:**
- Implement graceful restarts
- Handle worker failures
- Build robust IPC systems
- Monitor cluster health
- Manage shared resources
- Implement zero-downtime deploys
- Handle complex communication
- Build resilient architectures

### [Level 3: Advanced](./level-3-advanced/README.md)
**Time**: 4-6 hours

Production-ready clustering patterns:
- Advanced load balancing strategies
- Session affinity (sticky sessions)
- Performance optimization
- Memory and resource management
- Cluster monitoring and metrics
- Production deployment patterns
- Scaling strategies
- Cluster vs Worker Threads comparison
- Integration with process managers

**You'll be able to:**
- Build production-grade clusters
- Implement sticky sessions
- Optimize cluster performance
- Handle edge cases and failures
- Monitor and debug clusters
- Choose optimal scaling strategies
- Integrate with PM2 and other tools
- Make architectural decisions

---

## Prerequisites

- **Module 6: Process** (essential - understanding process management)
- **Module 4: Events** (recommended - cluster uses EventEmitter)
- **Module 7: HTTP** (recommended - building clustered servers)
- **Module 12: Child Process** (recommended - understanding process creation)
- Basic JavaScript knowledge
- Understanding of asynchronous programming
- Node.js installed (v14+)
- Multi-core system (for testing)

---

## Learning Path

### Recommended Approach

1. **Read** the [CONCEPTS.md](./CONCEPTS.md) file first for foundational understanding
2. **Start** with Level 1 and progress sequentially
3. **Study** the examples in each level
4. **Complete** the exercises before checking solutions
5. **Read** the conceptual guides for deeper understanding
6. **Practice** by building the suggested projects

### Alternative Approaches

**Fast Track** (If you're experienced with process management):
- Skim Level 1
- Focus on Level 2 and 3
- Complete advanced exercises

**Deep Dive** (If you want complete mastery):
- Read all guides thoroughly
- Complete all exercises
- Build additional projects
- Study the solutions for alternative approaches

---

## Key Concepts

### What is Clustering?

Clustering allows a Node.js application to utilize multiple CPU cores by spawning child processes (workers):

```javascript
const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isMaster) {
  // Master process - fork workers
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  console.log(`Master ${process.pid} started`);
} else {
  // Worker process - handle requests
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello from worker ' + process.pid);
  }).listen(8000);

  console.log(`Worker ${process.pid} started`);
}
```

### Master-Worker Architecture

The cluster module follows a master-worker pattern:

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  // Master process responsibilities:
  // - Fork workers
  // - Monitor workers
  // - Restart failed workers
  // - Coordinate shutdowns

  cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Restart the worker
    cluster.fork();
  });
} else {
  // Worker process responsibilities:
  // - Handle actual work (HTTP requests, etc.)
  // - Report to master
  // - Graceful shutdown

  // Do the actual work
  require('./app');
}
```

### Load Balancing

Node.js cluster automatically load balances incoming connections:

```javascript
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  // Fork 4 workers
  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
} else {
  // All workers share the same port
  http.createServer((req, res) => {
    res.end(`Handled by worker ${process.pid}\n`);
  }).listen(8000);
}

// Requests are automatically distributed across workers
```

### Worker Communication

Workers can communicate with the master process:

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  const worker = cluster.fork();

  // Master receives message from worker
  worker.on('message', (msg) => {
    console.log('Master received:', msg);
  });

  // Master sends message to worker
  worker.send({ cmd: 'start' });
} else {
  // Worker receives message from master
  process.on('message', (msg) => {
    console.log('Worker received:', msg);
  });

  // Worker sends message to master
  process.send({ status: 'ready' });
}
```

---

## Practical Examples

### Example 1: Basic Web Server Cluster

```javascript
const cluster = require('cluster');
const http = require('http');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers equal to CPU count
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exits
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case it's an HTTP server
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Hello from worker ${process.pid}\n`);
  }).listen(8000);

  console.log(`Worker ${process.pid} started`);
}
```

### Example 2: Graceful Shutdown

```javascript
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  const workers = [];

  // Fork workers
  for (let i = 0; i < 4; i++) {
    workers.push(cluster.fork());
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Master shutting down...');

    workers.forEach(worker => {
      worker.send({ cmd: 'shutdown' });
    });

    // Disconnect after timeout
    setTimeout(() => {
      workers.forEach(worker => {
        worker.kill();
      });
      process.exit(0);
    }, 10000);
  });
} else {
  const server = http.createServer((req, res) => {
    res.end('Hello World\n');
  }).listen(8000);

  // Handle shutdown message
  process.on('message', (msg) => {
    if (msg.cmd === 'shutdown') {
      // Stop accepting new connections
      server.close(() => {
        console.log(`Worker ${process.pid} shutting down`);
        process.exit(0);
      });
    }
  });
}
```

### Example 3: Zero-Downtime Restart

```javascript
const cluster = require('cluster');
const http = require('http');

if (cluster.isMaster) {
  const workers = [];

  // Fork workers
  for (let i = 0; i < 4; i++) {
    workers.push(cluster.fork());
  }

  // Rolling restart function
  function rollingRestart() {
    console.log('Starting rolling restart...');

    let i = 0;
    const restartNext = () => {
      if (i >= workers.length) {
        console.log('Rolling restart complete');
        return;
      }

      const worker = workers[i];

      // Fork new worker before killing old one
      const newWorker = cluster.fork();

      newWorker.on('listening', () => {
        // New worker ready, kill old one
        worker.kill();
        workers[i] = newWorker;
        i++;

        // Wait before restarting next
        setTimeout(restartNext, 1000);
      });
    };

    restartNext();
  }

  // Trigger restart on SIGUSR2
  process.on('SIGUSR2', rollingRestart);
} else {
  http.createServer((req, res) => {
    res.end('Hello World\n');
  }).listen(8000);
}
```

---

## Common Pitfalls

### ❌ Not Handling Worker Failures

```javascript
// Wrong - workers die and aren't replaced
if (cluster.isMaster) {
  cluster.fork();
  // No exit handler!
}

// Correct - restart workers automatically
if (cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
}
```

### ❌ Sharing State Between Workers

```javascript
// Wrong - each worker has its own memory
let requestCount = 0; // Each worker has separate count!

http.createServer((req, res) => {
  requestCount++; // Only increments in this worker
  res.end(`Count: ${requestCount}`);
}).listen(8000);

// Correct - use external storage or master coordination
// Use Redis, database, or master process for shared state
```

### ❌ Not Implementing Graceful Shutdown

```javascript
// Wrong - abrupt shutdown loses requests
process.on('SIGTERM', () => {
  process.exit(0); // Kills in-flight requests!
});

// Correct - graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    // Close connections, finish requests
    process.exit(0);
  });
});
```

### ❌ Forking Too Many Workers

```javascript
// Wrong - too many workers waste resources
for (let i = 0; i < 100; i++) {
  cluster.fork(); // Way too many!
}

// Correct - match CPU count (or slightly more)
const numWorkers = os.cpus().length;
for (let i = 0; i < numWorkers; i++) {
  cluster.fork();
}
```

---

## Module Contents

### Documentation
- **[CONCEPTS.md](./CONCEPTS.md)** - Foundational concepts for the entire module
- **Level READMEs** - Specific guidance for each level

### Code Examples
- **6 examples per level** (18 total) - Practical demonstrations
- **Fully commented** - Learn from reading the code
- **Runnable** - Execute them to see results

### Exercises
- **5 exercises per level** (15 total) - Practice problems
- **Progressive difficulty** - Build your skills gradually
- **Complete solutions** - Check your work

### Conceptual Guides
- **18 in-depth guides** - Deep understanding of specific topics
- **Level 1**: 6 guides on fundamentals
- **Level 2**: 6 guides on intermediate patterns
- **Level 3**: 6 guides on advanced topics

---

## Getting Started

### Quick Start

1. **Read the concepts**:
   ```bash
   # Read the foundational concepts
   cat CONCEPTS.md
   ```

2. **Start Level 1**:
   ```bash
   cd level-1-basics
   cat README.md
   ```

3. **Run your first example**:
   ```bash
   node examples/01-basic-cluster.js
   ```

4. **Try an exercise**:
   ```bash
   node exercises/exercise-1.js
   ```

### Setting Up

The cluster module is built into Node.js:

```javascript
// No npm install needed!
const cluster = require('cluster');
```

**Testing Requirements:**
- Multi-core system (or VM with multiple CPUs)
- Node.js v14+ recommended
- Terminal access to test clustering

---

## Success Criteria

You'll know you've mastered this module when you can:

- [ ] Explain clustering concepts and benefits
- [ ] Create clustered applications
- [ ] Implement master-worker patterns
- [ ] Handle worker failures and restarts
- [ ] Implement graceful shutdown
- [ ] Use inter-process communication
- [ ] Build zero-downtime deploys
- [ ] Monitor cluster performance
- [ ] Choose appropriate scaling strategies
- [ ] Debug cluster-related issues

---

## Why Clustering Matters

### Performance

```javascript
// Single-core: uses 1 CPU, limited throughput
// Cluster: uses all CPUs, N times throughput

// Without clustering: 1000 req/sec on 1 core
// With clustering (4 cores): ~4000 req/sec
```

### Reliability

```javascript
// Worker crashes? Master restarts it
cluster.on('exit', (worker) => {
  console.log(`Worker ${worker.process.pid} died, restarting...`);
  cluster.fork(); // Application stays up!
});
```

### Zero-Downtime Deploys

```javascript
// Rolling restart - update code without downtime
// 1. Fork new worker with updated code
// 2. New worker starts accepting requests
// 3. Kill old worker
// 4. Repeat for all workers
// Result: Users never notice the update!
```

---

## Additional Resources

### Official Documentation
- [Node.js Cluster Documentation](https://nodejs.org/api/cluster.html)
- [Node.js Load Balancing](https://nodejs.org/api/cluster.html#cluster_how_it_works)

### Practice Projects
After completing this module, try building:
1. **Clustered Web Server** - HTTP server using all CPU cores
2. **Load Balancer** - Custom load balancing with health checks
3. **Zero-Downtime Deploy** - Rolling restart implementation
4. **Cluster Monitor** - Real-time cluster health dashboard
5. **Session Store** - Shared session management across workers

### Related Modules
- **Module 6: Process** - Process management fundamentals
- **Module 12: Child Process** - Creating and managing processes
- **Module 14: Worker Threads** - Alternative parallelism model
- **Module 7: HTTP** - Building web servers

---

## Cluster vs Worker Threads

**Use Cluster when:**
- Building web servers
- Need process isolation
- Want automatic load balancing
- Each worker needs full Node.js instance

**Use Worker Threads when:**
- CPU-intensive tasks
- Need shared memory
- Lower overhead required
- Tasks are computational, not I/O

---

## Questions or Issues?

- Review the [CONCEPTS.md](./CONCEPTS.md) for foundational understanding
- Check the examples for practical demonstrations
- Study the guides for deep dives into specific topics
- Review solutions after attempting exercises

---

## Let's Begin!

Start your journey with [Level 1: Basics](./level-1-basics/README.md) and learn how to build scalable, multi-core Node.js applications.

Remember: Clustering is essential for production Node.js applications. Master it, and you'll be able to build high-performance, fault-tolerant systems that fully utilize modern hardware!
