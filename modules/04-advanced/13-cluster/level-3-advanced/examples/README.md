# Level 3: Advanced Cluster Examples

This directory contains production-grade examples demonstrating advanced cluster patterns and deployment strategies. These examples are designed for experienced developers building production Node.js applications.

## Examples Overview

### 01-sticky-sessions.js
**Session Affinity Implementation**

Demonstrates sticky sessions (session affinity) to route requests from the same client to the same worker process.

**Key Concepts:**
- Cookie-based routing
- IP-based routing fallback
- Consistent hashing
- Session store integration
- In-memory session management

**Run:**
```bash
node 01-sticky-sessions.js
```

**Test:**
```bash
# Test sticky routing
curl -c cookies.txt http://localhost:8000/
curl -b cookies.txt http://localhost:8000/stats

# Test session persistence
curl -c cookies.txt http://localhost:8000/
curl -b cookies.txt http://localhost:8000/session
```

**Production Use Cases:**
- WebSocket connections
- In-memory caching per worker
- Shopping carts
- User sessions
- Real-time applications

---

### 02-advanced-load-balancing.js
**Custom Load Balancing Algorithms**

Implements multiple load balancing strategies beyond simple round-robin.

**Implemented Strategies:**
- **Round Robin**: Equal distribution across workers
- **Least Connections**: Route to worker with fewest active connections
- **Weighted**: Distribute based on worker capacity/performance
- **Least Response Time**: Route to fastest responding worker
- **Resource-Based**: Consider CPU and memory usage

**Run:**
```bash
# Test different strategies
STRATEGY=round-robin node 02-advanced-load-balancing.js
STRATEGY=least-connections node 02-advanced-load-balancing.js
STRATEGY=weighted node 02-advanced-load-balancing.js
STRATEGY=least-response-time node 02-advanced-load-balancing.js
STRATEGY=resource-based node 02-advanced-load-balancing.js
```

**Test:**
```bash
# Benchmark different strategies
ab -n 1000 -c 10 http://localhost:8000/

# View live stats
curl http://localhost:8000/lb-stats | jq
```

**When to Use:**
- Variable request processing times
- Heterogeneous infrastructure
- CPU/memory intensive operations
- Optimizing for latency
- Uneven workload distribution

---

### 03-performance-monitoring.js
**Production Metrics Collection & Monitoring Dashboard**

Comprehensive performance monitoring with real-time dashboard and metrics collection.

**Metrics Collected:**
- Request throughput (req/sec)
- Response time percentiles (p50, p95, p99)
- CPU and memory usage per worker
- Event loop lag
- Active connections
- Error rates
- Health scoring

**Run:**
```bash
node 03-performance-monitoring.js
```

**Access:**
- **Dashboard**: http://localhost:8000/dashboard
- **Metrics API**: http://localhost:8000/metrics
- **Prometheus**: http://localhost:8000/metrics/prometheus

**Test:**
```bash
# Generate load
ab -n 10000 -c 50 http://localhost:8000/

# Monitor metrics
watch -n 1 'curl -s http://localhost:8000/metrics | jq'
```

**Integration:**
- Export to Prometheus
- Custom monitoring dashboards
- APM integration
- Alert configuration

---

### 04-circuit-breaker.js
**Circuit Breaker Pattern for Failure Handling**

Implements the circuit breaker pattern to prevent cascading failures and enable graceful degradation.

**Circuit States:**
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures, reject immediately (fail fast)
- **HALF_OPEN**: Testing if service recovered

**Key Features:**
- Configurable failure thresholds
- Automatic recovery testing
- Fallback responses
- Per-service circuit breakers
- State transition logging

**Run:**
```bash
node 04-circuit-breaker.js
```

**Test:**
```bash
# Trigger circuit breaker
for i in {1..10}; do curl http://localhost:8000/api/fail; done

# Check circuit status
curl http://localhost:8000/circuit-status | jq

# Reset circuits
curl -X POST http://localhost:8000/circuit-reset
```

**Production Applications:**
- External API protection
- Database failure handling
- Downstream service resilience
- Preventing cascading failures

---

### 05-canary-deployment.js
**Canary Deployment Strategy**

Demonstrates canary deployments for gradually rolling out new versions with automatic health checks and rollback.

**Deployment Phases:**
1. Deploy canary to 10% of workers
2. Monitor metrics vs baseline
3. Gradually increase to 25%, 50%, 75%, 100%
4. Auto-rollback on degradation

**Key Features:**
- Gradual traffic shifting
- Version-based worker management
- Automatic rollback on errors
- Real-time metrics comparison
- Manual and automated rollout control

**Run:**
```bash
node 05-canary-deployment.js
```

**Control:**
```bash
# View deployment status
curl http://localhost:8000/canary/status | jq

# Manual control
curl -X POST http://localhost:8000/canary/increase
curl -X POST http://localhost:8000/canary/rollback

# Automated rollout
curl -X POST http://localhost:8000/canary/rollout
```

**Test:**
```bash
# Generate traffic and monitor
ab -n 10000 -c 20 http://localhost:8000/ &
watch -n 1 'curl -s http://localhost:8000/canary/status | jq'
```

**Use Cases:**
- Zero-downtime deployments
- A/B testing
- Feature flag rollouts
- Risk mitigation
- Gradual infrastructure changes

---

### 06-production-cluster.js
**Complete Production-Ready Cluster**

Comprehensive production implementation combining all advanced patterns.

**Integrated Patterns:**
- ✅ Sticky sessions with session management
- ✅ Least connections load balancing
- ✅ Real-time performance monitoring
- ✅ Circuit breaker protection
- ✅ Graceful shutdown
- ✅ Automatic health checks
- ✅ Worker auto-recovery
- ✅ Metrics export (JSON + Prometheus)

**Run:**
```bash
# With default configuration
node 06-production-cluster.js

# With custom configuration
PORT=8000 WORKERS=4 SHUTDOWN_TIMEOUT=30000 node 06-production-cluster.js
```

**Endpoints:**
- **Dashboard**: http://localhost:8000/dashboard
- **Health Check**: http://localhost:8000/health
- **Metrics**: http://localhost:8000/metrics

**Environment Variables:**
```bash
PORT=8000                    # Server port
WORKERS=4                    # Number of workers
SHUTDOWN_TIMEOUT=30000       # Graceful shutdown timeout (ms)
HEALTH_CHECK_INTERVAL=5000   # Health check frequency (ms)
METRICS_INTERVAL=1000        # Metrics collection interval (ms)
SESSION_TIMEOUT=1800000      # Session expiration (ms)
```

**Production Deployment Checklist:**
- [ ] Configure environment variables
- [ ] Set up external session store (Redis)
- [ ] Configure logging (Winston/Bunyan)
- [ ] Integrate APM (New Relic/DataDog)
- [ ] Enable HTTPS
- [ ] Set up load balancer (nginx)
- [ ] Configure health checks
- [ ] Set up monitoring/alerting
- [ ] Implement rate limiting
- [ ] Configure process manager (PM2/systemd)

---

## Running the Examples

### Prerequisites
```bash
# Basic HTTP benchmarking
sudo apt-get install apache2-utils  # Linux
brew install httpie ab               # macOS

# JSON processing
sudo apt-get install jq              # Linux
brew install jq                      # macOS
```

### Performance Testing
```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:8000/

# With keep-alive
ab -n 10000 -c 100 -k http://localhost:8000/

# POST requests
ab -n 1000 -c 10 -p data.json -T application/json http://localhost:8000/api
```

### Monitoring
```bash
# Watch metrics in real-time
watch -n 1 'curl -s http://localhost:8000/metrics | jq'

# Monitor specific worker
curl -s http://localhost:8000/metrics | jq '.workers[] | select(.id == 1)'

# Check cluster health
curl -s http://localhost:8000/health | jq
```

## Learning Path

### Beginner → Advanced
1. Start with **01-sticky-sessions.js** to understand session affinity
2. Explore **02-advanced-load-balancing.js** for different routing strategies
3. Study **03-performance-monitoring.js** for observability
4. Learn **04-circuit-breaker.js** for resilience patterns
5. Practice **05-canary-deployment.js** for deployment strategies
6. Analyze **06-production-cluster.js** as a complete reference

### Key Takeaways

**Sticky Sessions:**
- Maintain session affinity for stateful applications
- Use consistent hashing for distribution
- Combine with external session store for production

**Load Balancing:**
- Different strategies for different workloads
- Least connections for variable processing times
- Resource-based for CPU/memory intensive tasks

**Monitoring:**
- Essential for production operations
- Collect metrics from all workers
- Real-time dashboards for visibility
- Export to proper monitoring systems

**Circuit Breakers:**
- Prevent cascading failures
- Fast failure response
- Automatic recovery testing
- Critical for microservices

**Canary Deployments:**
- Gradual rollout reduces risk
- Monitor metrics during deployment
- Automatic rollback on issues
- Production-grade deployment strategy

**Production Cluster:**
- Combine all patterns appropriately
- Configure based on requirements
- Monitor everything
- Plan for failures

## Common Issues and Solutions

### Issue: Uneven Load Distribution
**Solution:** Use least-connections or resource-based load balancing instead of round-robin

### Issue: Session Loss on Worker Restart
**Solution:** Implement external session store (Redis) instead of in-memory storage

### Issue: Circuit Breaker Opens Too Frequently
**Solution:** Tune failure threshold and timeout based on actual service characteristics

### Issue: High Event Loop Lag
**Solution:** Move CPU-intensive work to worker threads or separate processes

### Issue: Memory Leaks
**Solution:** Implement proper session cleanup, monitor memory usage, set restart policies

## Production Recommendations

### Session Management
- **Development**: In-memory sessions (as shown)
- **Production**: Redis or Memcached with session replication
- **Enterprise**: Distributed session stores with high availability

### Load Balancing
- **Development**: Node.js cluster (as shown)
- **Production**: nginx or HAProxy in front of Node.js cluster
- **Cloud**: AWS ALB/ELB, Azure Load Balancer, GCP Load Balancer

### Monitoring
- **Development**: Built-in dashboard (as shown)
- **Production**: Prometheus + Grafana, DataDog, New Relic
- **Enterprise**: Full APM stack with distributed tracing

### Deployment
- **Development**: Direct node execution
- **Production**: PM2 or systemd with auto-restart
- **Kubernetes**: Deployment with HPA, service mesh (Istio/Linkerd)

## Next Steps

1. Complete the exercises in `../exercises/`
2. Read the detailed guides in `../guides/`
3. Study the solution implementations in `../solutions/`
4. Experiment with different configurations
5. Build your own production cluster based on these patterns

## Additional Resources

- [Node.js Cluster Documentation](https://nodejs.org/api/cluster.html)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [nginx Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Canary Deployments](https://martinfowler.com/bliki/CanaryRelease.html)
