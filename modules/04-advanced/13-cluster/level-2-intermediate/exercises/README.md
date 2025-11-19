# Level 2: Intermediate Exercises

This directory contains 5 exercises to practice intermediate clustering concepts. Each exercise builds on the skills learned in the examples and guides.

## Exercise Overview

### Exercise 1: Graceful Shutdown with Timeout
**Focus**: Production-ready shutdown handling
**Difficulty**: ⭐⭐⭐

Implement a graceful shutdown system that:
- Tracks active connections
- Drains connections on shutdown
- Forces cleanup after timeout
- Rejects new requests during shutdown

**Time**: 30-45 minutes

---

### Exercise 2: Rolling Restart System
**Focus**: Zero-downtime deployments
**Difficulty**: ⭐⭐⭐⭐

Build a rolling restart mechanism that:
- Updates workers sequentially
- Tracks versions
- Waits for readiness before proceeding
- Maintains service availability throughout

**Time**: 45-60 minutes

---

### Exercise 3: Health Monitoring with Heartbeats
**Focus**: Worker health and auto-remediation
**Difficulty**: ⭐⭐⭐⭐

Create a health monitoring system with:
- Heartbeat-based liveness checks
- Memory and error rate monitoring
- Automatic unhealthy worker restart
- Health reporting

**Time**: 45-60 minutes

---

### Exercise 4: Advanced IPC Patterns
**Focus**: Inter-process communication
**Difficulty**: ⭐⭐⭐⭐

Implement advanced IPC patterns:
- Request-response with correlation IDs
- Broadcasting to all workers
- Worker-to-worker communication
- Timeout handling

**Time**: 60-75 minutes

---

### Exercise 5: Worker Pool with Task Distribution
**Focus**: Task queue management
**Difficulty**: ⭐⭐⭐⭐⭐

Build a worker pool system that:
- Manages task queue (FIFO)
- Tracks worker availability
- Distributes tasks efficiently
- Implements backpressure

**Time**: 60-90 minutes

---

## How to Use These Exercises

### 1. Read the Requirements

Each exercise file contains:
- Clear objectives
- Detailed requirements
- Expected behavior
- Testing instructions
- Hints and validation criteria

### 2. Implement the Solution

- Start with the TODO sections
- Follow the requirements carefully
- Use hints when stuck
- Test as you build

### 3. Test Thoroughly

Each exercise includes comprehensive test scenarios:
- Normal operation
- Edge cases
- Error conditions
- Load testing

### 4. Compare with Solutions

After completing your implementation:
1. Test it thoroughly
2. Check the solution in `../solutions/`
3. Compare approaches
4. Learn from differences

## Exercise Progression

We recommend completing exercises in order:

```
Exercise 1 (Graceful Shutdown)
    ↓
Exercise 2 (Rolling Restart)
    ↓
Exercise 3 (Health Monitoring)
    ↓
Exercise 4 (Advanced IPC)
    ↓
Exercise 5 (Worker Pool)
```

Each exercise builds on concepts from previous ones.

## Common Patterns

### Request-Response Pattern

```javascript
function sendRequest(worker, type, data) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();

    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Timeout'));
    }, 5000);

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

### Connection Tracking

```javascript
const connections = new Set();

server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});
```

### Worker Health Tracking

```javascript
const workerHealth = new Map();

function trackWorker(worker) {
  workerHealth.set(worker.id, {
    worker,
    lastHeartbeat: Date.now(),
    metrics: {}
  });
}
```

## Testing Tips

### 1. Start Simple

```bash
# First, make sure it runs
node exercise-1.js

# Then test basic functionality
curl http://localhost:8000/
```

### 2. Test Edge Cases

```bash
# Test shutdown with active connections
curl http://localhost:8000/slow &
# Immediately press Ctrl+C

# Test high load
for i in {1..100}; do curl http://localhost:8000/ & done
```

### 3. Use Monitoring Tools

```bash
# Watch processes
watch 'ps aux | grep exercise'

# Monitor connections
watch 'netstat -an | grep 8000 | grep ESTABLISHED | wc -l'

# Continuous testing
watch -n 0.5 'curl -s http://localhost:8000/stats'
```

## Debugging

### Common Issues

**Workers not starting:**
```bash
# Check for port conflicts
lsof -i :8000

# Check available memory
free -h

# View error logs
node exercise-1.js 2>&1 | tee debug.log
```

**Messages not received:**
```javascript
// Add debugging
process.on('message', (msg) => {
  console.log('Received:', JSON.stringify(msg));
  // ... handle message
});
```

**Timeouts occurring:**
```javascript
// Increase timeout for debugging
const REQUEST_TIMEOUT = 30000; // 30 seconds instead of 5
```

## Validation Checklist

Before moving to solutions, verify:

### Exercise 1
- [ ] Workers start and accept connections
- [ ] Shutdown stops accepting new requests
- [ ] Active connections complete during shutdown
- [ ] Timeout forces cleanup if needed
- [ ] All workers coordinate shutdown

### Exercise 2
- [ ] Workers start with initial version
- [ ] SIGUSR2 triggers rolling restart
- [ ] Workers restart sequentially
- [ ] Version increments with each restart
- [ ] No requests dropped during restart

### Exercise 3
- [ ] Workers send heartbeats every 3 seconds
- [ ] Master detects heartbeat timeout
- [ ] High memory usage detected
- [ ] High error rate detected
- [ ] Unhealthy workers restart automatically

### Exercise 4
- [ ] Stats aggregated from all workers
- [ ] Broadcasting works to all workers
- [ ] Worker-to-worker messages route correctly
- [ ] Timeouts handled properly
- [ ] All HTTP endpoints functional

### Exercise 5
- [ ] Tasks queue when workers busy
- [ ] Workers process tasks in FIFO order
- [ ] Task status trackable by ID
- [ ] Backpressure prevents queue overflow
- [ ] All task types work (fibonacci, prime, hash)

## Getting Help

If you're stuck:

1. **Check the hints** in the exercise file
2. **Review examples** in `../examples/`
3. **Read guides** in `../guides/`
4. **Compare with Level 1** solutions
5. **Look at solutions** (but try first!)

## Next Steps

After completing all exercises:

1. Review solutions and compare approaches
2. Read the comprehensive guides
3. Try the bonus challenges
4. Move to Level 3 (Advanced)
5. Apply patterns to real projects

## Key Takeaways

These exercises teach:

- **Graceful shutdown** for zero data loss
- **Rolling restarts** for zero downtime
- **Health monitoring** for reliability
- **Advanced IPC** for coordination
- **Task management** for scalability

Master these patterns to build production-ready clustered applications!
