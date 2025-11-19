# Level 2: Intermediate Examples

This directory contains 6 intermediate examples demonstrating advanced clustering patterns and production-ready techniques.

## Examples Overview

### 01-graceful-shutdown.js
**Concept**: Graceful shutdown implementation
- Connection draining
- Shutdown timeouts
- Signal handling (SIGTERM, SIGINT)
- Worker coordination
- Resource cleanup

**Run**: `node 01-graceful-shutdown.js`
**Test**:
```bash
# Terminal 1
node 01-graceful-shutdown.js

# Terminal 2
curl http://localhost:8000/slow &
# Immediately press Ctrl+C in Terminal 1
# Observe graceful shutdown
```

---

### 02-rolling-restart.js
**Concept**: Zero-downtime rolling restart
- Worker replacement strategy
- Version tracking
- Readiness checks
- Sequential worker restart
- No dropped requests

**Run**: `node 02-rolling-restart.js`
**Test**:
```bash
# Terminal 1
node 02-rolling-restart.js

# Terminal 2
watch -n 0.5 'curl -s http://localhost:8000 | grep version'

# Terminal 3
# Get master PID and trigger restart
ps aux | grep "02-rolling-restart"
kill -SIGUSR2 <master_pid>
# Watch version change with zero downtime
```

---

### 03-health-monitoring.js
**Concept**: Worker health check system
- Heartbeat monitoring
- Memory usage tracking
- Error rate monitoring
- Automatic unhealthy worker restart
- Health check endpoints

**Run**: `node 03-health-monitoring.js`
**Test**:
```bash
# Check health
curl http://localhost:8000/health

# Trigger high error rate
for i in {1..20}; do curl http://localhost:8000/error; done

# Simulate memory leak
for i in {1..10}; do curl http://localhost:8000/leak; done

# Watch worker restart automatically
```

---

### 04-advanced-ipc.js
**Concept**: Advanced inter-process communication
- Request-response pattern
- Message broadcasting
- Worker-to-worker communication
- Message correlation IDs
- Timeout handling

**Run**: `node 04-advanced-ipc.js`
**Test**:
```bash
# Get aggregated stats
curl http://localhost:8000/stats

# Send worker-to-worker message
curl http://localhost:8000/send/2
curl http://localhost:8000/messages

# Send log to master
curl http://localhost:8000/log
```

---

### 05-shared-state.js
**Concept**: Managing shared state across workers
- Master as state coordinator
- Atomic operations
- Distributed locking
- State change subscriptions
- Consistency patterns

**Run**: `node 05-shared-state.js`
**Test**:
```bash
# Increment global counter
for i in {1..100}; do curl http://localhost:8000/counter; done

# Test locking
curl http://localhost:8000/lock &
curl http://localhost:8000/lock &
# Second request blocked

# View all state
curl http://localhost:8000/get-all

# Subscribe to changes
curl http://localhost:8000/subscribe
curl http://localhost:8000/counter
# Check logs for change notifications
```

---

### 06-worker-pools.js
**Concept**: Worker pool with task queue
- Task queue management
- Worker availability tracking
- Load balancing
- Result tracking
- Backpressure handling

**Run**: `node 06-worker-pools.js`
**Test**:
```bash
# Submit tasks
curl -X POST http://localhost:8000/task -d '{"type":"fibonacci","n":40}'
curl -X POST http://localhost:8000/task -d '{"type":"isPrime","n":1000000007}'
curl -X POST http://localhost:8000/task -d '{"type":"hash","data":"hello world"}'

# Check task result
curl http://localhost:8000/task/<task-id>

# View pool statistics
curl http://localhost:8000/stats

# Load test
for i in {30..45}; do
  curl -X POST http://localhost:8000/task -d "{\"type\":\"fibonacci\",\"n\":$i}" &
done
wait
```

---

## How to Use These Examples

1. **Read the code** - Each file has extensive comments explaining the patterns
2. **Run the example** - Execute and observe the behavior
3. **Test the features** - Use the provided test commands
4. **Experiment** - Modify parameters and see what changes
5. **Move to next** - Progress through examples in order

## Learning Path

We recommend studying examples in this order:

1. **Graceful shutdown** (01) - Foundation for safe deployments
2. **Rolling restart** (02) - Zero-downtime deployment strategy
3. **Health monitoring** (03) - Production monitoring patterns
4. **Advanced IPC** (04) - Complex communication patterns
5. **Shared state** (05) - State management across workers
6. **Worker pools** (06) - Task queue and load distribution

## Key Concepts Covered

### Production Patterns
- Graceful shutdown
- Zero-downtime deployments
- Health monitoring
- Automatic remediation

### Communication
- Request-response IPC
- Message broadcasting
- Worker coordination
- Timeout handling

### State Management
- Shared state coordination
- Atomic operations
- Distributed locking
- State synchronization

### Task Management
- Task queuing
- Load balancing
- Worker pools
- Result tracking

## Common Testing Patterns

### Load Testing
```bash
# Generate continuous load
while true; do curl http://localhost:8000; sleep 0.1; done

# Concurrent requests
for i in {1..100}; do curl http://localhost:8000 & done; wait

# Apache Bench
ab -n 1000 -c 10 http://localhost:8000/
```

### Process Monitoring
```bash
# Watch cluster processes
watch 'ps aux | grep node'

# Monitor resource usage
top -p <pid>

# Track file descriptors
lsof -p <pid>
```

### Signal Testing
```bash
# Graceful shutdown
kill -SIGTERM <pid>
kill -SIGINT <pid>

# Custom signals
kill -SIGUSR1 <pid>
kill -SIGUSR2 <pid>

# Force kill (for testing)
kill -SIGKILL <pid>
```

## Production Considerations

### 1. Monitoring
- Set up health check endpoints
- Monitor memory usage and leaks
- Track response times
- Alert on errors and restarts

### 2. Logging
- Structured logging with context
- Centralized log aggregation
- Log levels and filtering
- Request tracing

### 3. Deployment
- Use graceful shutdown in production
- Implement rolling restart for deployments
- Test deployment procedures regularly
- Have rollback strategy

### 4. Scaling
- Monitor worker utilization
- Adjust worker count based on load
- Consider horizontal scaling
- Use external storage for state

### 5. Error Handling
- Implement circuit breakers
- Handle partial failures
- Set appropriate timeouts
- Retry with exponential backoff

## Advanced Topics

These examples prepare you for:
- Container orchestration (Kubernetes)
- Service mesh patterns
- Distributed systems
- Microservices architecture
- Production Node.js applications

## Troubleshooting

### Common Issues

**Workers not starting:**
- Check available memory
- Verify port not already in use
- Check file descriptor limits
- Review error logs

**High memory usage:**
- Check for memory leaks
- Monitor heap snapshots
- Verify cleanup on worker exit
- Adjust worker count

**Messages not received:**
- Verify worker is alive
- Check message format
- Ensure IPC channel open
- Add timeout handling

**Graceful shutdown hangs:**
- Check for stuck connections
- Verify shutdown timeout
- Look for blocking operations
- Check cleanup logic

## Next Steps

After mastering these examples:
1. Complete the exercises in `../exercises/`
2. Study the detailed guides in `../guides/`
3. Review solution implementations in `../solutions/`
4. Move to Level 3 for advanced patterns
5. Apply these patterns to real projects

## Resources

- [Node.js Cluster Documentation](https://nodejs.org/api/cluster.html)
- [Process Signals](https://nodejs.org/api/process.html#process_signal_events)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [Production Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
