# Level 2: Exercise Solutions

This directory contains complete solutions for all Level 2 exercises. Each solution demonstrates best practices and production-ready patterns for clustered Node.js applications.

## Solutions Overview

### Exercise 1 Solution: Graceful Shutdown
**File**: `exercise-1-solution.js`
**Concepts Demonstrated**:
- Connection tracking using Set
- Coordinated master-worker shutdown
- Timeout-based force cleanup
- Request rejection during shutdown

**Key Implementation Details**:
- Tracks all active connections via 'connection' event
- Master coordinates shutdown across all workers
- Workers drain connections with 10-second timeout
- Returns 503 for new requests during shutdown

**Related Example**: `../examples/01-graceful-shutdown.js`

---

### Exercise 2 Solution: Rolling Restart
**File**: `exercise-2-solution.js`
**Concepts Demonstrated**:
- Sequential worker restart
- Version tracking and incrementing
- Worker readiness checks
- Zero-downtime deployment

**Key Implementation Details**:
- Forks new worker before killing old one
- Waits for 'ready' message from worker
- Updates version with each restart cycle
- Includes version in HTTP responses

**Related Example**: `../examples/02-rolling-restart.js`

---

### Exercise 3 Solution: Health Monitoring
**File**: `exercise-3-solution.js` (see `../examples/03-health-monitoring.js`)
**Concepts Demonstrated**:
- Heartbeat pattern
- Multi-dimensional health checks
- Automatic worker restart
- Health reporting

**Key Implementation Details**:
- Workers send heartbeat every 3 seconds
- Master checks: heartbeat timeout, memory, error rate
- Automatic restart of unhealthy workers
- Periodic health reports every 15 seconds

**Related Example**: `../examples/03-health-monitoring.js`

---

### Exercise 4 Solution: Advanced IPC
**File**: `exercise-4-solution.js` (see `../examples/04-advanced-ipc.js`)
**Concepts Demonstrated**:
- Request-response with correlation IDs
- Message broadcasting
- Worker-to-worker routing
- Timeout handling

**Key Implementation Details**:
- Unique requestId for each request
- Promise-based request-response
- Master routes messages between workers
- 5-second timeout on all requests

**Related Example**: `../examples/04-advanced-ipc.js`

---

### Exercise 5 Solution: Worker Pool
**File**: `exercise-5-solution.js` (see `../examples/06-worker-pools.js`)
**Concepts Demonstrated**:
- Task queue management (FIFO)
- Worker availability tracking
- Backpressure handling
- Task result storage

**Key Implementation Details**:
- Maintains pending task queue
- Tracks worker busy/available state
- Limits queue size to 20 tasks
- Supports fibonacci, prime, hash tasks

**Related Example**: `../examples/06-worker-pools.js`

---

## How to Use These Solutions

### 1. Study the Implementation

Each solution demonstrates:
- Clean code organization
- Proper error handling
- Resource cleanup
- Production-ready patterns

### 2. Compare with Your Solution

```bash
# Run the reference solution
node exercise-1-solution.js

# Run your implementation
node ../exercises/exercise-1.js

# Compare behavior
```

### 3. Learn from Differences

Key areas to compare:
- Code structure and organization
- Error handling approaches
- Edge case handling
- Performance optimizations

### 4. Extend the Solutions

Try these enhancements:
- Add monitoring and metrics
- Implement additional features from bonus challenges
- Optimize for specific use cases
- Add comprehensive testing

## Common Implementation Patterns

### Request-Response Pattern

```javascript
function sendRequest(worker, type, data, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();

    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Timeout'));
    }, timeout);

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

    worker.send({ type, requestId, data });
  });
}
```

### Connection Draining

```javascript
async function drainConnections(timeout) {
  server.close(() => {
    console.log('Server closed');
  });

  return new Promise(resolve => {
    const forceTimer = setTimeout(() => {
      connections.forEach(socket => socket.destroy());
      resolve();
    }, timeout);

    const checkInterval = setInterval(() => {
      if (connections.size === 0) {
        clearInterval(checkInterval);
        clearTimeout(forceTimer);
        resolve();
      }
    }, 100);
  });
}
```

### Worker Health Tracking

```javascript
const workerHealth = new Map();

function trackWorker(worker) {
  workerHealth.set(worker.id, {
    worker,
    lastHeartbeat: Date.now(),
    metrics: {},
    isHealthy: true
  });

  worker.on('message', (msg) => {
    if (msg.type === 'heartbeat') {
      const health = workerHealth.get(worker.id);
      health.lastHeartbeat = Date.now();
      health.metrics = msg.metrics;
    }
  });
}
```

## Testing the Solutions

### Automated Testing

```bash
#!/bin/bash
# test-solutions.sh

echo "Testing Exercise 1..."
node exercise-1-solution.js &
PID=$!
sleep 2
curl http://localhost:8000/
kill -SIGTERM $PID
wait $PID

echo "Testing Exercise 2..."
node exercise-2-solution.js &
PID=$!
sleep 2
kill -SIGUSR2 $PID
sleep 10
kill -SIGTERM $PID
wait $PID

# ... more tests
```

### Manual Testing

**Exercise 1 - Graceful Shutdown**:
```bash
# Terminal 1
node exercise-1-solution.js

# Terminal 2
curl http://localhost:8000/slow &
# Immediately in Terminal 1: Ctrl+C
# Observe: Request completes, then shutdown
```

**Exercise 2 - Rolling Restart**:
```bash
# Terminal 1
node exercise-2-solution.js

# Terminal 2
watch -n 0.5 'curl -s http://localhost:8000 | grep version'

# Terminal 3
kill -SIGUSR2 <master_pid>
# Observe version changing without errors
```

**Exercise 3 - Health Monitoring**:
```bash
node exercise-3-solution.js

# Trigger errors
for i in {1..30}; do curl http://localhost:8000/error; done

# Watch worker restart automatically
```

**Exercise 4 - Advanced IPC**:
```bash
node exercise-4-solution.js

# Test aggregation
curl http://localhost:8000/stats

# Test worker messaging
curl http://localhost:8000/send/2
curl http://localhost:8000/messages
```

**Exercise 5 - Worker Pool**:
```bash
node exercise-5-solution.js

# Submit tasks
curl -X POST http://localhost:8000/task -d '{"type":"fibonacci","n":40}'

# Check status
curl http://localhost:8000/task/<task-id>

# View stats
curl http://localhost:8000/stats
```

## Key Learnings

### 1. Always Use Timeouts

```javascript
// ✅ Good
const result = await sendRequest(worker, 'query', data, 5000);

// ❌ Bad
const result = await sendRequest(worker, 'query', data);
```

### 2. Clean Up Resources

```javascript
// ✅ Good
try {
  await doWork();
} finally {
  await cleanup();
  clearTimeout(timer);
  pendingRequests.delete(id);
}
```

### 3. Handle All Events

```javascript
// ✅ Good
worker.on('exit', handleExit);
worker.on('error', handleError);
worker.on('disconnect', handleDisconnect);
worker.on('message', handleMessage);
```

### 4. Track State Explicitly

```javascript
// ✅ Good
const workerState = {
  available: true,
  currentTask: null,
  metrics: {}
};
```

## Common Mistakes and Fixes

### Mistake 1: Not Waiting for Readiness

```javascript
// ❌ Bad
const newWorker = cluster.fork();
setTimeout(() => oldWorker.kill(), 5000); // Hope it's ready!

// ✅ Good
const newWorker = cluster.fork();
await waitForReady(newWorker);
oldWorker.disconnect();
```

### Mistake 2: Forgetting Cleanup

```javascript
// ❌ Bad
function sendRequest(worker, data) {
  const timer = setTimeout(reject, 5000);
  worker.send(data);
}

// ✅ Good
function sendRequest(worker, data) {
  const timer = setTimeout(reject, 5000);
  worker.send(data);
  return () => clearTimeout(timer); // Cleanup function
}
```

### Mistake 3: Infinite Restart Loops

```javascript
// ❌ Bad
cluster.on('exit', () => cluster.fork()); // Can loop forever

// ✅ Good
const restartCounts = new Map();
cluster.on('exit', (worker) => {
  const count = (restartCounts.get(worker.id) || 0) + 1;
  if (count > MAX_RESTARTS) {
    console.error('Too many restarts');
    return;
  }
  restartCounts.set(worker.id, count);
  cluster.fork();
});
```

## Production Checklist

Before deploying clustered applications:

- [ ] Graceful shutdown implemented
- [ ] Restart limits in place
- [ ] Health checks configured
- [ ] Timeouts set on all async operations
- [ ] Error handling comprehensive
- [ ] Resources properly cleaned up
- [ ] Logging and monitoring added
- [ ] Load tested under realistic conditions
- [ ] Deployment procedure tested
- [ ] Rollback strategy defined

## Further Reading

- Node.js Cluster Documentation
- Production Best Practices
- Advanced IPC Patterns
- Distributed Systems Principles
- Process Management with PM2

## Next Steps

After mastering these solutions:

1. **Apply to real projects** - Use these patterns in production
2. **Extend functionality** - Add monitoring, metrics, logging
3. **Move to Level 3** - Learn advanced clustering patterns
4. **Study related topics** - Worker threads, child processes
5. **Build something** - Create your own clustered application

These solutions provide a solid foundation for building reliable, scalable clustered Node.js applications!
