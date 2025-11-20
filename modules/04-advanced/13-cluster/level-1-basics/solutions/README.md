# Level 1: Exercise Solutions

Complete, production-ready solutions for all 5 Level 1 cluster exercises with detailed explanations and best practices.

## Overview

These solutions demonstrate fundamental cluster concepts in Node.js:
- Process forking and management
- Worker lifecycle handling
- HTTP server clustering
- Inter-process communication
- Production-ready patterns

Each solution includes:
- ✅ Complete, working code
- ✅ Detailed inline comments
- ✅ Best practice demonstrations
- ✅ Bonus challenge implementations
- ✅ Common pitfall warnings
- ✅ Production considerations

## Solutions

### Exercise 1: Create Your First Cluster
**File**: `exercise-1-solution.js`

**What It Demonstrates**:
- Basic cluster creation
- Master vs worker identification
- Process forking
- Logging and monitoring

**Key Concepts**:
```javascript
// Master process forks workers
if (cluster.isMaster) {
  cluster.fork();  // Creates worker process
}

// Worker processes do the work
else {
  // Worker logic here
}
```

**Run It**:
```bash
node exercise-1-solution.js
```

**Expected Output**:
```
Master process started with PID: 12345
Worker 1 started with PID: 12346
Worker 2 started with PID: 12347
```

**Learning Points**:
- Understand process separation
- Master vs worker roles
- Worker IDs vs PIDs
- Code sharing pattern

---

### Exercise 2: Fork Specific Number of Workers
**File**: `exercise-2-solution.js`

**What It Demonstrates**:
- Dynamic worker scaling based on CPU count
- System information gathering
- Worker tracking and management
- Resource-aware clustering

**Key Concepts**:
```javascript
const numCPUs = os.cpus().length;  // Get CPU count
const workers = [];                // Track workers

for (let i = 0; i < numCPUs; i++) {
  const worker = cluster.fork();
  workers.push(worker);            // Store reference
}
```

**Run It**:
```bash
node exercise-2-solution.js

# With custom worker count
NUM_WORKERS=2 node exercise-2-solution.js
```

**Expected Output**:
```
=== System Information ===
CPUs: 4
Platform: linux
Architecture: x64

=== Creating Workers ===
Created worker 1, PID: 12346
Created worker 2, PID: 12347
Created worker 3, PID: 12348
Created worker 4, PID: 12349

=== Cluster Summary ===
Total workers: 4
Worker IDs: 1, 2, 3, 4
```

**Learning Points**:
- CPU-based worker scaling
- System resource detection
- Worker management strategies
- Configuration flexibility

---

### Exercise 3: Handle Worker Exits
**File**: `exercise-3-solution.js`

**What It Demonstrates**:
- Worker exit event handling
- Automatic restart on failure
- Exit code interpretation
- Resilience patterns

**Key Concepts**:
```javascript
// Listen for worker exits
cluster.on('exit', (worker, code, signal) => {
  console.log(`Worker ${worker.id} died`);

  // Restart automatically
  cluster.fork();
});

// Workers can crash
process.exit(1);  // Simulate crash
```

**Run It**:
```bash
node exercise-3-solution.js
```

**Expected Output**:
```
Master: Starting cluster
Master: Created worker 1
Master: Created worker 2
Master: Created worker 3
Worker 1 started
Worker 2 started
Worker 3 started
Worker 2 is exiting...

=== Worker Exit Event ===
Worker 2 exited with error code 1
Master: Restarting worker...
Master: Created worker 4
Worker 4 started
```

**Learning Points**:
- Exit event handling
- Exit codes and signals
- Automatic restart strategy
- Restart loop prevention

**Bonus Features**:
- Track restart counts
- Prevent restart loops (max 5/minute)
- Handle different exit codes
- Graceful shutdown on SIGTERM

---

### Exercise 4: Build a Clustered Web Server
**File**: `exercise-4-solution.js`

**What It Demonstrates**:
- Clustered HTTP server creation
- Port sharing across workers
- Load distribution
- Production web server pattern

**Key Concepts**:
```javascript
// Workers create HTTP servers
const server = http.createServer((req, res) => {
  // Each worker handles requests
  res.end(JSON.stringify({
    worker: cluster.worker.id,
    pid: process.pid
  }));
});

// All workers listen on same port!
server.listen(3000);
```

**Run It**:
```bash
node exercise-4-solution.js
```

**Test It**:
```bash
# Single request
curl http://localhost:3000

# Multiple requests to see load distribution
for i in {1..10}; do curl http://localhost:3000; done

# With jq for pretty output
curl -s http://localhost:3000 | jq .
```

**Expected Output**:
```
Master 12345 is running
Starting 4 workers...

Worker 1 is online
Worker 2 is online
Worker 3 is online
Worker 4 is online
Worker 1 (PID: 12346) is listening on :::3000
Worker 2 (PID: 12347) is listening on :::3000
Worker 3 (PID: 12348) is listening on :::3000
Worker 4 (PID: 12349) is listening on :::3000

✅ Cluster is ready! All 4 workers are listening
🌐 Server is running at http://localhost:3000
```

**Request Response Example**:
```json
{
  "message": "Hello from clustered server!",
  "worker": {
    "id": 2,
    "pid": 12347
  },
  "request": {
    "number": 3,
    "url": "/",
    "method": "GET",
    "timestamp": "2025-11-19T10:30:45.123Z"
  },
  "server": {
    "uptime": 12.456,
    "memory": {
      "rss": 45678912,
      "heapTotal": 12345678,
      "heapUsed": 8765432,
      "external": 123456
    }
  }
}
```

**Learning Points**:
- Port sharing mechanism
- Load distribution
- Worker independence
- High availability
- Scalability patterns

**Bonus Features**:
- `/stats` endpoint with metrics
- `/crash` endpoint to test restart
- Total request counting via IPC
- Request logging
- Load balancing visualization

---

### Exercise 5: Worker Communication
**File**: `exercise-5-solution.js`

**What It Demonstrates**:
- Inter-process communication (IPC)
- Message passing patterns
- Status reporting
- Command handling
- Distributed system coordination

**Key Concepts**:
```javascript
// Master receives messages
cluster.on('message', (worker, msg) => {
  if (msg.type === 'status') {
    console.log(`Status from Worker ${worker.id}`);
  }
});

// Master sends to workers
worker.send({ type: 'ping' });

// Worker sends to master
process.send({ type: 'status', data: {...} });

// Worker receives from master
process.on('message', (msg) => {
  if (msg.type === 'ping') {
    process.send({ type: 'pong' });
  }
});
```

**Run It**:
```bash
node exercise-5-solution.js
```

**Expected Output**:
```
[Master] PID: 12345

=== Forking Workers ===
[Worker 1] Starting (PID: 12346)
[Worker 2] Starting (PID: 12347)
[Worker 3] Starting (PID: 12348)

[Master] Worker 1 ready (PID: 12346)
[Master] Worker 2 ready (PID: 12347)
[Master] Worker 3 ready (PID: 12348)
[Master] All 3 workers are ready!

[Master] Status from Worker 1: Memory: 24.56 MB, Uptime: 3s
[Master] Status from Worker 2: Memory: 24.32 MB, Uptime: 3s
[Master] Status from Worker 3: Memory: 24.78 MB, Uptime: 3s

[Master] Sending ping to all workers...
[Master] Pong from Worker 1
[Master] Latency: 2ms
[Master] Pong from Worker 2
[Master] Latency: 1ms
[Master] Pong from Worker 3
[Master] Latency: 2ms

=== Worker Status Summary ===
Time: 10:30:45
Active Workers: 3/3

Worker 1:
  Status: Ready
  PID: 12346
  Memory: 24.56 MB
  Uptime: 15s
  Last Pong: 0.5s ago

Worker 2:
  Status: Ready
  PID: 12347
  Memory: 24.32 MB
  Uptime: 15s
  Last Pong: 0.3s ago

Worker 3:
  Status: Ready
  PID: 12348
  Memory: 24.78 MB
  Uptime: 15s
  Last Pong: 0.4s ago
```

**Learning Points**:
- IPC message patterns
- Request-response pattern
- Status reporting
- Health monitoring
- Message routing

**Bonus Features**:
- Shutdown command implementation
- Health check with timeout
- Worker-to-worker communication
- Task distribution system
- Monitoring dashboard

---

## Common Patterns Demonstrated

### 1. Basic Cluster Setup
```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numWorkers = os.cpus().length;

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    cluster.fork();  // Auto-restart
  });

} else {
  // Worker code
}
```

### 2. Clustered HTTP Server
```javascript
if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
} else {
  http.createServer((req, res) => {
    res.end(`Worker ${cluster.worker.id}`);
  }).listen(3000);
}
```

### 3. Worker Communication
```javascript
// Master to worker
worker.send({ type: 'config', data: {...} });

// Worker to master
process.send({ type: 'status', data: {...} });

// Listen for messages
cluster.on('message', (worker, msg) => {
  // Handle message
});
```

### 4. Graceful Shutdown
```javascript
process.on('SIGTERM', () => {
  for (const id in cluster.workers) {
    cluster.workers[id].disconnect();
  }

  setTimeout(() => process.exit(0), 5000);
});
```

### 5. Health Monitoring
```javascript
setInterval(() => {
  for (const id in cluster.workers) {
    cluster.workers[id].send({ type: 'health-check' });
  }
}, 10000);
```

## Testing the Solutions

### Manual Testing
```bash
# Exercise 1 - Basic cluster
node exercise-1-solution.js

# Exercise 2 - CPU-based workers
node exercise-2-solution.js

# Exercise 3 - Auto-restart (watch it restart workers)
node exercise-3-solution.js

# Exercise 4 - Web server
node exercise-4-solution.js
# In another terminal:
curl http://localhost:3000

# Exercise 5 - Communication
node exercise-5-solution.js
```

### Load Testing Exercise 4
```bash
# Start server
node exercise-4-solution.js

# Make multiple requests
for i in {1..20}; do
  curl -s http://localhost:3000 | jq -r '.worker.id'
done

# With ApacheBench
ab -n 1000 -c 10 http://localhost:3000/

# With wrk
wrk -t4 -c100 -d30s http://localhost:3000/
```

### Monitoring Worker Distribution
```bash
# Count requests per worker
for i in {1..100}; do
  curl -s http://localhost:3000 | jq -r '.worker.id'
done | sort | uniq -c

# Expected output (roughly even distribution):
#  25 1
#  26 2
#  24 3
#  25 4
```

## Production Considerations

### 1. Worker Count Strategy
```javascript
// Conservative (leave CPU for system)
const numWorkers = Math.max(1, os.cpus().length - 1);

// Standard (match CPU count)
const numWorkers = os.cpus().length;

// Aggressive (for I/O-bound apps)
const numWorkers = os.cpus().length * 2;

// Configurable (recommended)
const numWorkers = process.env.WEB_CONCURRENCY || os.cpus().length;
```

### 2. Error Handling
```javascript
// In workers
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);  // Let master restart
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
```

### 3. Graceful Shutdown
```javascript
// In master
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  // Stop accepting new connections
  for (const id in cluster.workers) {
    cluster.workers[id].send('shutdown');
    cluster.workers[id].disconnect();
  }

  // Force exit after timeout
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(0);
  }, 30000);  // 30 second grace period
}
```

### 4. Restart Rate Limiting
```javascript
const restartTimes = [];

cluster.on('exit', (worker) => {
  const now = Date.now();
  restartTimes.push(now);

  // Remove restarts older than 1 minute
  const recentRestarts = restartTimes.filter(
    time => now - time < 60000
  );

  if (recentRestarts.length > 5) {
    console.error('Too many restarts, exiting');
    process.exit(1);
  }

  cluster.fork();
});
```

### 5. Health Checks
```javascript
// In master
const healthChecks = new Map();

setInterval(() => {
  for (const id in cluster.workers) {
    const worker = cluster.workers[id];
    const checkId = Date.now();

    healthChecks.set(checkId, { workerId: id, time: Date.now() });
    worker.send({ type: 'health-check', checkId });

    // Timeout check
    setTimeout(() => {
      if (healthChecks.has(checkId)) {
        console.log(`Worker ${id} failed health check`);
        worker.kill();
      }
    }, 5000);
  }
}, 30000);

cluster.on('message', (worker, msg) => {
  if (msg.type === 'health-check-response') {
    healthChecks.delete(msg.checkId);
  }
});
```

## Common Issues and Solutions

### Issue 1: Port Already in Use
**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port
lsof -i :3000
# or
netstat -tulpn | grep :3000

# Kill the process
kill -9 <PID>

# Or use a different port
const PORT = process.env.PORT || 3001;
```

### Issue 2: Workers Not Starting
**Problem**: Workers fork but don't execute

**Solution**:
- Ensure you're checking `cluster.isMaster` correctly
- Verify worker code is in the `else` block
- Check for syntax errors in worker code
- Add logging to track worker execution

### Issue 3: Infinite Forking
**Problem**: Workers keep forking infinitely

**Solution**:
```javascript
// ❌ Wrong - creates fork bomb
cluster.fork();

// ✅ Correct - only master forks
if (cluster.isMaster) {
  cluster.fork();
}
```

### Issue 4: Shared State Issues
**Problem**: Workers don't see each other's data

**Solution**:
```javascript
// Workers have separate memory
// Use external storage for shared state:
// - Redis
// - Database
// - IPC messages
// - Shared memory (advanced)
```

### Issue 5: Messages Not Received
**Problem**: IPC messages aren't being received

**Solution**:
- Verify IPC channel is connected: `worker.isConnected()`
- Check message handler is registered before sending
- Ensure messages are JSON-serializable
- Add error handling for send failures

## Performance Tips

### 1. Worker Count
- **CPU-bound**: Match CPU count
- **I/O-bound**: Can exceed CPU count (1.5x - 2x)
- **Memory-limited**: Fewer workers, more memory each
- **Test and measure**: No one-size-fits-all

### 2. Load Distribution
- Trust Node.js load balancing for most cases
- Consider external load balancer for advanced control
- Monitor distribution to verify it's even
- Sticky sessions require external load balancer

### 3. Memory Management
- Monitor worker memory usage
- Set `--max-old-space-size` if needed
- Restart workers periodically if memory grows
- Use heap snapshots to find leaks

### 4. Logging
- Use structured logging (JSON)
- Include worker ID in all logs
- Aggregate logs from all workers
- Consider log streaming service

## Next Steps

After mastering Level 1:

1. **Practice**: Run and experiment with all solutions
2. **Modify**: Try the bonus challenges
3. **Test**: Load test the web server solution
4. **Monitor**: Add monitoring to your implementations
5. **Advance**: Move to Level 2 for advanced patterns

## Resources

### Official Documentation
- [Node.js Cluster Module](https://nodejs.org/api/cluster.html)
- [Node.js Process](https://nodejs.org/api/process.html)
- [Node.js OS Module](https://nodejs.org/api/os.html)

### Related Topics
- Process managers (PM2, Forever)
- Load balancing strategies
- Microservices architecture
- Container orchestration

### Tools
- **PM2**: Production process manager
- **Forever**: Simple process manager
- **Nodemon**: Development auto-restart
- **Clinic.js**: Performance profiling

## Summary

These solutions cover the essentials of Node.js clustering:

✅ **Exercise 1**: Basic cluster creation and process management
✅ **Exercise 2**: Resource-aware worker scaling
✅ **Exercise 3**: Resilient applications with auto-restart
✅ **Exercise 4**: Production web server clustering
✅ **Exercise 5**: Inter-process communication patterns

You now have production-ready patterns for:
- Creating robust clustered applications
- Handling failures gracefully
- Scaling across CPU cores
- Building high-availability systems
- Implementing worker communication

Keep these patterns in mind as you build real-world applications!
