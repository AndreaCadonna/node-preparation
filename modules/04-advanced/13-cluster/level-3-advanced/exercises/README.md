##Level 3: Advanced Cluster Exercises

These exercises challenge you to build production-ready cluster implementations. Each exercise focuses on a specific advanced pattern while requiring you to integrate multiple concepts.

## Exercise Overview

| Exercise | Focus Area | Difficulty | Time Estimate |
|----------|-----------|------------|---------------|
| Exercise 1 | Sticky Sessions | ⭐⭐⭐⭐ | 3-4 hours |
| Exercise 2 | Load Balancing | ⭐⭐⭐⭐ | 3-4 hours |
| Exercise 3 | Monitoring | ⭐⭐⭐⭐⭐ | 4-5 hours |
| Exercise 4 | Circuit Breaker | ⭐⭐⭐⭐⭐ | 4-5 hours |
| Exercise 5 | Production Cluster | ⭐⭐⭐⭐⭐ | 8-12 hours |

## Exercise 1: Sticky Sessions with External Session Store

**Goal:** Build a production-ready sticky session implementation with external session storage.

**Core Requirements:**
1. Cookie-based sticky session routing
2. Shared session store (Redis-compatible interface)
3. Session expiration and cleanup
4. Session persistence across worker restarts
5. Session migration on worker failure
6. Session statistics

**Bonus Challenges:**
- IP-based fallback routing
- Sliding expiration on activity
- Session data encryption
- Session replication
- Session locking for concurrent updates
- Redis-compatible interface

**Learning Objectives:**
- Session affinity patterns
- Consistent hashing
- Session state management
- Worker failure handling
- External storage design

**Testing Focus:**
- Session persistence
- Worker affinity
- Expiration handling
- Migration on failure
- Concurrent access

**Success Criteria:**
- Sessions route to same worker consistently
- Sessions persist across requests
- Expired sessions cleaned up properly
- Worker failures don't lose all sessions
- At least 2 bonus challenges completed

---

## Exercise 2: Custom Load Balancer with Multiple Strategies

**Goal:** Create a sophisticated load balancer supporting multiple routing algorithms.

**Core Requirements:**
1. Least Connections strategy
2. Weighted Round Robin strategy
3. Response Time-based strategy
4. Dynamic strategy switching
5. Worker health monitoring
6. Metrics dashboard

**Bonus Challenges:**
- Consistent hashing
- Predictive load balancing
- Request queueing
- Capacity planning
- Auto strategy selection
- Connection draining

**Learning Objectives:**
- Load balancing algorithms
- Strategy pattern
- Performance metrics
- Health-based routing
- Dynamic configuration

**Testing Focus:**
- Strategy correctness
- Distribution fairness
- Health exclusion
- Strategy switching
- Metric accuracy

**Success Criteria:**
- All 3 strategies work correctly
- Health monitoring functional
- Strategies switchable without downtime
- Metrics accurately reflect distribution
- At least 2 bonus challenges completed

---

## Exercise 3: Production Monitoring Dashboard

**Goal:** Build comprehensive monitoring with real-time dashboard and metrics export.

**Core Requirements:**
1. Metrics collection (throughput, latency, errors, resources)
2. Percentile calculation (p50, p95, p99)
3. Real-time HTML dashboard
4. Prometheus metrics export
5. Alert system
6. Historical data retention

**Bonus Challenges:**
- WebSocket metric streaming
- Metric downsampling
- Custom metric types
- Distributed tracing
- SLA monitoring
- Auto-scaling recommendations

**Learning Objectives:**
- Metrics collection patterns
- Percentile calculations
- Real-time dashboards
- Prometheus integration
- Alert management

**Testing Focus:**
- Metric accuracy
- Percentile correctness
- Dashboard updates
- Prometheus format
- Alert triggers

**Success Criteria:**
- All metrics collected accurately
- Dashboard updates in real-time
- Prometheus export valid
- Alerts trigger correctly
- At least 2 bonus challenges completed

---

## Exercise 4: Circuit Breaker with Auto-Recovery

**Goal:** Implement production-grade circuit breaker for resilience and fault tolerance.

**Core Requirements:**
1. Three-state circuit breaker (CLOSED, OPEN, HALF_OPEN)
2. Per-worker and per-service breakers
3. Configurable thresholds
4. Automatic state transitions
5. Fallback mechanisms
6. Circuit breaker dashboard

**Bonus Challenges:**
- Adaptive thresholds
- Bulkhead pattern
- Retry with backoff
- Cascading protection
- External dependency protection
- Metric-based breaking

**Learning Objectives:**
- Circuit breaker pattern
- State machines
- Failure detection
- Graceful degradation
- Auto-recovery

**Testing Focus:**
- State transitions
- Threshold behavior
- Recovery testing
- Fallback execution
- Multiple breakers

**Success Criteria:**
- All state transitions work
- Fallbacks execute correctly
- Auto-recovery functional
- Metrics comprehensive
- At least 2 bonus challenges completed

---

## Exercise 5: Complete Production Cluster (Capstone)

**Goal:** Build a complete, production-ready cluster combining all patterns.

**Core Requirements:**
1. Sticky sessions with external store
2. Advanced load balancing (2+ strategies)
3. Real-time monitoring dashboard
4. Circuit breaker protection
5. Graceful shutdown
6. Health checks and auto-recovery
7. Comprehensive logging
8. Metrics export (Prometheus)

**Bonus Challenges:**
- Rate limiting per client
- Request queuing and backpressure
- Distributed tracing
- Blue-green deployment
- Auto-scaling logic
- Deployment automation
- Comprehensive test suite
- Chaos engineering hooks

**Learning Objectives:**
- System architecture
- Pattern integration
- Production best practices
- Operational excellence
- Deployment strategies

**Testing Focus:**
- Normal operation
- Worker failures
- High load handling
- Graceful shutdown
- Circuit breaker activation

**Success Criteria:**

**Minimum (Pass):**
- All 8 core requirements implemented
- Passes all testing scenarios
- Production-ready code quality
- Comprehensive documentation

**Excellent:**
- Minimum requirements met
- 4+ bonus challenges completed
- Test coverage > 80%
- Performance optimized
- Security hardened
- Deployment-ready

**Scoring:**
- Bonus challenges worth 10-20 points each
- Maximum 100 bonus points available
- Document your implementation choices

---

## Getting Started

### Prerequisites

```bash
# Install development tools
npm install --save-dev jest supertest

# Install production dependencies (if using)
npm install winston prom-client

# Install testing tools
sudo apt-get install apache2-utils jq  # Linux
brew install httpie ab jq              # macOS
```

### Exercise Workflow

1. **Read Requirements**
   - Understand core requirements
   - Review bonus challenges
   - Check success criteria

2. **Design Solution**
   - Sketch architecture
   - Plan component interactions
   - Identify edge cases

3. **Implement**
   - Start with core requirements
   - Test incrementally
   - Add bonus features

4. **Test**
   - Unit tests for components
   - Integration tests
   - Load testing
   - Edge case testing

5. **Review**
   - Check success criteria
   - Refactor for clarity
   - Document decisions

### Testing Your Solutions

```bash
# Basic functionality
node exercise-1.js
curl http://localhost:8000/

# Load testing
ab -n 10000 -c 100 http://localhost:8000/

# Monitor metrics
watch -n 1 'curl -s http://localhost:8000/metrics | jq'

# Test failure scenarios
# Find worker PID and kill it
ps aux | grep node
kill -9 <pid>
```

## Solution Guidelines

### Code Quality Standards

- **Clear naming**: Use descriptive variable/function names
- **Comments**: Explain complex logic and design decisions
- **Error handling**: Comprehensive try-catch, graceful degradation
- **Logging**: Structured logs with appropriate levels
- **Testing**: Unit and integration tests
- **Documentation**: README with setup and usage

### Production Considerations

Each solution should consider:
- **Performance**: Optimize hot paths, minimize overhead
- **Reliability**: Handle failures gracefully, auto-recover
- **Security**: Input validation, secure defaults
- **Observability**: Metrics, logging, tracing
- **Maintainability**: Clear code, good structure

### Evaluation Criteria

**Core Requirements (60 points)**
- Functionality: Does it work as specified?
- Correctness: Are edge cases handled?
- Quality: Is the code production-ready?

**Bonus Challenges (40 points)**
- Complexity: How challenging were the features?
- Integration: How well do features work together?
- Innovation: Any creative solutions?

**Extra Credit (20 points)**
- Testing: Comprehensive test coverage
- Documentation: Excellent documentation
- Performance: Exceptional optimization
- Security: Security best practices

## Common Pitfalls

### Exercise 1: Sticky Sessions
- ❌ Not handling session migration on worker death
- ❌ Memory leaks from uncleaned sessions
- ❌ Race conditions in session access
- ✅ Use proper cleanup intervals
- ✅ Handle concurrent session updates
- ✅ Test worker failure scenarios

### Exercise 2: Load Balancing
- ❌ Not considering worker health in routing
- ❌ Uneven distribution with weighted strategy
- ❌ Not handling strategy switch edge cases
- ✅ Exclude unhealthy workers
- ✅ Test each strategy independently
- ✅ Validate metrics accuracy

### Exercise 3: Monitoring
- ❌ Incorrect percentile calculations
- ❌ Memory leaks from unbounded metric storage
- ❌ Dashboard not updating in real-time
- ✅ Use proper statistical methods
- ✅ Implement metric retention policies
- ✅ Test with high metric volume

### Exercise 4: Circuit Breaker
- ❌ Not resetting failure count on success (CLOSED)
- ❌ Allowing too many requests in HALF_OPEN
- ❌ Not handling timeout edge cases
- ✅ Implement proper state machine
- ✅ Test all state transitions
- ✅ Validate timeout behavior

### Exercise 5: Production Cluster
- ❌ Trying to implement everything at once
- ❌ Not testing individual components
- ❌ Ignoring production concerns
- ✅ Build incrementally
- ✅ Test continuously
- ✅ Consider deployment

## Additional Resources

### References
- [Node.js Cluster Docs](https://nodejs.org/api/cluster.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Redis Client](https://github.com/redis/node-redis)

### Tools
- **Testing**: Jest, Mocha, Supertest
- **Load Testing**: Apache Bench (ab), wrk, autocannon
- **Monitoring**: Prometheus, Grafana
- **Process Management**: PM2, systemd

### Examples
- Review `../examples/` for reference implementations
- Study `../guides/` for detailed pattern explanations
- Check `../solutions/` after attempting exercises

## Getting Help

If you're stuck:
1. Review the corresponding example file
2. Read the relevant guide
3. Check the solution (try for 30+ minutes first!)
4. Search Node.js cluster documentation
5. Review error messages carefully

## Next Steps

After completing these exercises:
1. Review your solutions against provided solutions
2. Identify areas for improvement
3. Refactor based on feedback
4. Deploy a solution to production (bonus!)
5. Share your implementation for code review

Remember: The goal is learning, not perfection. Each exercise builds on the previous ones, so take your time and ensure you understand the concepts before moving forward.

Good luck! 🚀
