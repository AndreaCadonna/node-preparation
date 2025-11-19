# Guide 2: Advanced Load Balancing Strategies

## Introduction

Load balancing is the art and science of distributing work across multiple resources to optimize performance, reliability, and scalability. This guide explores advanced load balancing algorithms beyond simple round-robin, their implementations, and production use cases for clustered Node.js applications.

## Understanding Load Balancing Fundamentals

### Goals of Load Balancing

1. **Even Distribution**: Spread requests across all healthy workers
2. **Performance Optimization**: Minimize response time and maximize throughput
3. **Resource Utilization**: Efficiently use available CPU, memory, and I/O
4. **Fault Tolerance**: Handle worker failures gracefully
5. **Scalability**: Support dynamic worker addition/removal

### Load Balancing Layers

**Layer 4 (Transport Layer)**
- Operates on TCP/UDP level
- Fast but limited intelligence
- Source/destination IP and port only
- Examples: nginx stream, HAProxy TCP mode

**Layer 7 (Application Layer)**
- Operates on HTTP level
- Full request visibility
- Content-based routing possible
- Examples: nginx http, HAProxy HTTP mode, Node.js cluster

Node.js cluster operates at Layer 7, giving us maximum flexibility.

## Load Balancing Strategies

### 1. Round Robin

The simplest strategy: distribute requests sequentially across workers.

**Implementation:**

```javascript
class RoundRobinBalancer {
  constructor(workers) {
    this.workers = workers;
    this.currentIndex = 0;
  }

  selectWorker() {
    const worker = this.workers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.workers.length;
    return worker;
  }
}
```

**Characteristics:**
- **Simplicity**: Easiest to implement and understand
- **Distribution**: Perfect distribution when requests are uniform
- **Performance**: O(1) selection time
- **State**: Minimal state (just current index)

**When it works well:**
- Homogeneous workers (same capacity)
- Uniform request processing time
- Similar resource requirements across requests

**When it fails:**
- Varying request processing times
- Heterogeneous worker capacities
- Long-running requests mixed with short ones

**Real-world example:**
```javascript
// Works well for consistent API requests
app.get('/api/quick', handler); // Always ~50ms

// Fails for mixed workloads
app.get('/api/quick', quickHandler);  // ~50ms
app.get('/api/slow', slowHandler);     // ~5000ms
// Round robin will overwhelm workers with slow requests
```

### 2. Weighted Round Robin

Assigns weights to workers based on their capacity, giving more requests to powerful workers.

**Implementation:**

```javascript
class WeightedRoundRobinBalancer {
  constructor(workers) {
    // workers = [{ worker, weight }, ...]
    this.workers = workers;
    this.currentIndex = 0;
    this.currentWeight = 0;
    this.maxWeight = Math.max(...workers.map(w => w.weight));
    this.gcd = this.calculateGCD(workers.map(w => w.weight));
  }

  calculateGCD(weights) {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    return weights.reduce((acc, val) => gcd(acc, val));
  }

  selectWorker() {
    while (true) {
      this.currentIndex = (this.currentIndex + 1) % this.workers.length;

      if (this.currentIndex === 0) {
        this.currentWeight -= this.gcd;

        if (this.currentWeight <= 0) {
          this.currentWeight = this.maxWeight;
        }
      }

      const workerConfig = this.workers[this.currentIndex];

      if (workerConfig.weight >= this.currentWeight) {
        return workerConfig.worker;
      }
    }
  }
}

// Usage
const balancer = new WeightedRoundRobinBalancer([
  { worker: worker1, weight: 1 },  // Weak machine
  { worker: worker2, weight: 3 },  // Powerful machine
  { worker: worker3, weight: 2 }   // Medium machine
]);
// worker2 will get 3x more requests than worker1
```

**Weight Calculation Strategies:**

```javascript
// Based on CPU cores
function calculateCPUWeight(worker) {
  return worker.cpuCores;
}

// Based on memory
function calculateMemoryWeight(worker) {
  return Math.floor(worker.memoryGB);
}

// Based on observed performance
function calculatePerformanceWeight(worker) {
  const avgResponseTime = worker.getAverageResponseTime();
  const baseline = 100; // ms

  // Inverse relationship: faster = higher weight
  return Math.max(1, Math.floor(baseline / avgResponseTime));
}

// Composite weight
function calculateWeight(worker) {
  const cpuWeight = worker.cpuCores / 2;
  const memoryWeight = worker.memoryGB / 4;
  const perfWeight = 100 / worker.avgResponseTime;

  return Math.floor((cpuWeight + memoryWeight + perfWeight) / 3);
}
```

**Dynamic Weight Adjustment:**

```javascript
class AdaptiveWeightedBalancer extends WeightedRoundRobinBalancer {
  constructor(workers) {
    super(workers);
    this.startAdaptiveWeighting();
  }

  startAdaptiveWeighting() {
    setInterval(() => {
      this.workers.forEach(workerConfig => {
        const metrics = workerConfig.worker.getMetrics();

        // Calculate new weight based on current performance
        let newWeight = workerConfig.baseWeight || 1;

        // Reduce weight for high error rates
        if (metrics.errorRate > 0.05) {
          newWeight *= 0.5;
        }

        // Reduce weight for slow responses
        if (metrics.avgResponseTime > 500) {
          newWeight *= 0.7;
        }

        // Reduce weight for high CPU usage
        if (metrics.cpuUsage > 80) {
          newWeight *= 0.6;
        }

        workerConfig.weight = Math.max(1, Math.floor(newWeight));
      });

      // Recalculate GCD and max weight
      this.maxWeight = Math.max(...this.workers.map(w => w.weight));
      this.gcd = this.calculateGCD(this.workers.map(w => w.weight));
    }, 5000); // Adjust every 5 seconds
  }
}
```

### 3. Least Connections

Routes requests to the worker with the fewest active connections.

**Implementation:**

```javascript
class LeastConnectionsBalancer {
  constructor(workers) {
    this.workers = workers;
    this.connections = new Map();

    workers.forEach(worker => {
      this.connections.set(worker.id, 0);
    });
  }

  selectWorker() {
    let minConnections = Infinity;
    let selectedWorker = null;

    this.workers.forEach(worker => {
      const connections = this.connections.get(worker.id);

      if (connections < minConnections) {
        minConnections = connections;
        selectedWorker = worker;
      }
    });

    return selectedWorker;
  }

  recordConnectionStart(worker) {
    const current = this.connections.get(worker.id);
    this.connections.set(worker.id, current + 1);
  }

  recordConnectionEnd(worker) {
    const current = this.connections.get(worker.id);
    this.connections.set(worker.id, Math.max(0, current - 1));
  }
}
```

**Characteristics:**
- **Fairness**: Accounts for variable request duration
- **Efficiency**: Better utilization with mixed workloads
- **Complexity**: O(n) selection time
- **State**: Must track active connections

**Weighted Least Connections:**

```javascript
class WeightedLeastConnectionsBalancer {
  selectWorker() {
    let minRatio = Infinity;
    let selectedWorker = null;

    this.workers.forEach(workerConfig => {
      const connections = this.connections.get(workerConfig.worker.id);
      const ratio = connections / workerConfig.weight;

      if (ratio < minRatio) {
        minRatio = ratio;
        selectedWorker = workerConfig.worker;
      }
    });

    return selectedWorker;
  }
}
```

### 4. Least Response Time

Routes to the worker with the best average response time.

**Implementation:**

```javascript
class LeastResponseTimeBalancer {
  constructor(workers) {
    this.workers = workers;
    this.metrics = new Map();

    workers.forEach(worker => {
      this.metrics.set(worker.id, {
        totalTime: 0,
        requestCount: 0,
        activeConnections: 0
      });
    });
  }

  selectWorker() {
    let minScore = Infinity;
    let selectedWorker = null;

    this.workers.forEach(worker => {
      const metrics = this.metrics.get(worker.id);

      // Calculate score: avg response time * (1 + load factor)
      const avgResponseTime = metrics.requestCount > 0
        ? metrics.totalTime / metrics.requestCount
        : 0;

      const loadFactor = metrics.activeConnections * 0.1;
      const score = avgResponseTime * (1 + loadFactor);

      if (score < minScore || (score === 0 && minScore === 0)) {
        minScore = score;
        selectedWorker = worker;
      }
    });

    return selectedWorker;
  }

  recordRequest(worker, duration) {
    const metrics = this.metrics.get(worker.id);
    metrics.totalTime += duration;
    metrics.requestCount++;
    metrics.activeConnections--;
  }

  recordConnectionStart(worker) {
    const metrics = this.metrics.get(worker.id);
    metrics.activeConnections++;
  }
}
```

**Exponential Moving Average:**

```javascript
class EMAResponseTimeBalancer {
  constructor(workers, alpha = 0.3) {
    this.workers = workers;
    this.alpha = alpha; // Smoothing factor
    this.ema = new Map();

    workers.forEach(worker => {
      this.ema.set(worker.id, 0);
    });
  }

  updateEMA(workerId, newValue) {
    const current = this.ema.get(workerId);
    const updated = current === 0
      ? newValue
      : this.alpha * newValue + (1 - this.alpha) * current;

    this.ema.set(workerId, updated);
  }

  selectWorker() {
    let minEMA = Infinity;
    let selectedWorker = null;

    this.workers.forEach(worker => {
      const ema = this.ema.get(worker.id);

      if (ema < minEMA) {
        minEMA = ema;
        selectedWorker = worker;
      }
    });

    return selectedWorker;
  }
}
```

### 5. Resource-Based Balancing

Routes based on worker resource utilization (CPU, memory).

**Implementation:**

```javascript
class ResourceBasedBalancer {
  constructor(workers) {
    this.workers = workers;
    this.resources = new Map();

    workers.forEach(worker => {
      this.resources.set(worker.id, {
        cpuUsage: 0,
        memoryUsage: 0,
        eventLoopLag: 0,
        lastUpdate: Date.now()
      });
    });
  }

  updateResources(workerId, metrics) {
    this.resources.set(workerId, {
      ...metrics,
      lastUpdate: Date.now()
    });
  }

  selectWorker() {
    let minLoad = Infinity;
    let selectedWorker = null;

    this.workers.forEach(worker => {
      const resources = this.resources.get(worker.id);

      // Check if metrics are fresh (within last 5 seconds)
      if (Date.now() - resources.lastUpdate > 5000) {
        return; // Skip stale data
      }

      // Composite load score
      const cpuScore = resources.cpuUsage * 0.4;
      const memoryScore = resources.memoryUsage * 0.3;
      const lagScore = Math.min(100, resources.eventLoopLag / 10) * 0.3;

      const loadScore = cpuScore + memoryScore + lagScore;

      if (loadScore < minLoad) {
        minLoad = loadScore;
        selectedWorker = worker;
      }
    });

    return selectedWorker || this.workers[0]; // Fallback
  }
}
```

### 6. Random Selection

Selects worker randomly, surprisingly effective for many workloads.

**Implementation:**

```javascript
class RandomBalancer {
  constructor(workers) {
    this.workers = workers;
  }

  selectWorker() {
    const index = Math.floor(Math.random() * this.workers.length);
    return this.workers[index];
  }
}
```

**Weighted Random:**

```javascript
class WeightedRandomBalancer {
  constructor(workers) {
    // workers = [{ worker, weight }, ...]
    this.workers = workers;
    this.totalWeight = workers.reduce((sum, w) => sum + w.weight, 0);
  }

  selectWorker() {
    let random = Math.random() * this.totalWeight;

    for (const workerConfig of this.workers) {
      random -= workerConfig.weight;

      if (random <= 0) {
        return workerConfig.worker;
      }
    }

    return this.workers[0].worker; // Fallback
  }
}
```

### 7. Consistent Hashing

Distributes requests based on request characteristics while minimizing disruption during scaling.

**Implementation:**

```javascript
class ConsistentHashBalancer {
  constructor(workers, replicas = 150) {
    this.replicas = replicas;
    this.ring = new Map();
    this.sortedKeys = [];

    workers.forEach(worker => this.addWorker(worker));
  }

  hash(str) {
    const hash = crypto.createHash('md5').update(str).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  addWorker(worker) {
    for (let i = 0; i < this.replicas; i++) {
      const hashKey = this.hash(`${worker.id}:${i}`);
      this.ring.set(hashKey, worker);
    }

    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  removeWorker(worker) {
    for (let i = 0; i < this.replicas; i++) {
      const hashKey = this.hash(`${worker.id}:${i}`);
      this.ring.delete(hashKey);
    }

    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  selectWorker(requestKey) {
    if (this.sortedKeys.length === 0) return null;

    const hashKey = this.hash(requestKey);

    // Binary search for first key >= hashKey
    let index = this.sortedKeys.findIndex(k => k >= hashKey);

    if (index === -1) index = 0; // Wrap around

    const ringKey = this.sortedKeys[index];
    return this.ring.get(ringKey);
  }
}

// Usage: Route based on user ID for session affinity
const worker = balancer.selectWorker(userId);
```

## Strategy Selection Guide

| Strategy | Best For | Avoid When | Complexity |
|----------|----------|------------|------------|
| Round Robin | Uniform requests, homogeneous workers | Variable request times | Low |
| Weighted RR | Heterogeneous workers, known capacities | Dynamic performance | Medium |
| Least Connections | Variable request duration | Short-lived connections | Medium |
| Least Response Time | Latency-sensitive apps | Highly variable requests | High |
| Resource-Based | CPU/memory intensive tasks | I/O bound tasks | High |
| Random | Simple cases, load testing | Need predictability | Low |
| Consistent Hashing | Session affinity, caching | Simple load distribution | High |

## Production Implementation

### Complete Balancer with Multiple Strategies

```javascript
class ProductionLoadBalancer {
  constructor(workers, initialStrategy = 'least-connections') {
    this.workers = workers;
    this.strategies = {
      'round-robin': new RoundRobinBalancer(workers),
      'weighted': new WeightedRoundRobinBalancer(workers),
      'least-connections': new LeastConnectionsBalancer(workers),
      'least-response-time': new LeastResponseTimeBalancer(workers),
      'resource-based': new ResourceBasedBalancer(workers),
      'random': new RandomBalancer(workers)
    };

    this.currentStrategy = initialStrategy;
    this.healthCheck = new WorkerHealthCheck(workers);
  }

  selectWorker(requestKey = null) {
    // Filter out unhealthy workers
    const healthyWorkers = this.workers.filter(w =>
      this.healthCheck.isHealthy(w.id)
    );

    if (healthyWorkers.length === 0) {
      throw new Error('No healthy workers available');
    }

    // Use current strategy
    const strategy = this.strategies[this.currentStrategy];
    return strategy.selectWorker(requestKey);
  }

  setStrategy(strategyName) {
    if (!this.strategies[strategyName]) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }

    this.currentStrategy = strategyName;
  }

  addWorker(worker) {
    this.workers.push(worker);

    // Update all strategies
    Object.values(this.strategies).forEach(strategy => {
      if (strategy.addWorker) {
        strategy.addWorker(worker);
      }
    });

    this.healthCheck.addWorker(worker);
  }

  removeWorker(worker) {
    this.workers = this.workers.filter(w => w.id !== worker.id);

    // Update all strategies
    Object.values(this.strategies).forEach(strategy => {
      if (strategy.removeWorker) {
        strategy.removeWorker(worker);
      }
    });

    this.healthCheck.removeWorker(worker);
  }
}
```

### Health-Aware Routing

```javascript
class WorkerHealthCheck {
  constructor(workers) {
    this.health = new Map();
    this.thresholds = {
      errorRate: 0.05,      // 5%
      responseTime: 1000,   // 1 second
      cpuUsage: 90,         // 90%
      memoryUsage: 90       // 90%
    };

    workers.forEach(worker => {
      this.health.set(worker.id, {
        status: 'healthy',
        score: 100,
        lastCheck: Date.now()
      });
    });
  }

  updateHealth(workerId, metrics) {
    let score = 100;

    // Deduct for high error rate
    if (metrics.errorRate > this.thresholds.errorRate) {
      score -= 30;
    }

    // Deduct for slow response
    if (metrics.avgResponseTime > this.thresholds.responseTime) {
      score -= 25;
    }

    // Deduct for high CPU
    if (metrics.cpuUsage > this.thresholds.cpuUsage) {
      score -= 25;
    }

    // Deduct for high memory
    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      score -= 20;
    }

    const status = score >= 50 ? 'healthy' : 'degraded';

    this.health.set(workerId, {
      status,
      score: Math.max(0, score),
      lastCheck: Date.now()
    });
  }

  isHealthy(workerId) {
    const health = this.health.get(workerId);
    return health && health.status === 'healthy';
  }

  getHealthScore(workerId) {
    const health = this.health.get(workerId);
    return health ? health.score : 0;
  }
}
```

## Performance Optimization

### Connection Pooling

Reuse worker connections to reduce overhead:

```javascript
class ConnectionPool {
  constructor(workers, maxConnectionsPerWorker = 100) {
    this.pools = new Map();

    workers.forEach(worker => {
      this.pools.set(worker.id, {
        worker,
        active: 0,
        max: maxConnectionsPerWorker
      });
    });
  }

  canAcceptConnection(workerId) {
    const pool = this.pools.get(workerId);
    return pool && pool.active < pool.max;
  }

  selectWorkerWithCapacity(balancer) {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const worker = balancer.selectWorker();

      if (this.canAcceptConnection(worker.id)) {
        return worker;
      }

      attempts++;
    }

    // All workers at capacity, find least loaded
    return this.findLeastLoadedWorker();
  }

  findLeastLoadedWorker() {
    let minLoad = Infinity;
    let selectedWorker = null;

    for (const [workerId, pool] of this.pools) {
      if (pool.active < minLoad) {
        minLoad = pool.active;
        selectedWorker = pool.worker;
      }
    }

    return selectedWorker;
  }
}
```

## Conclusion

Choose your load balancing strategy based on your specific needs:

- **Development**: Round Robin (simplicity)
- **Production APIs**: Least Connections (fairness)
- **Mixed Workloads**: Least Response Time (optimization)
- **Heterogeneous Cluster**: Weighted strategies
- **Session Affinity**: Consistent Hashing
- **Resource Intensive**: Resource-Based

Remember: No single strategy is perfect. Monitor, measure, and adjust based on your actual traffic patterns and requirements.
