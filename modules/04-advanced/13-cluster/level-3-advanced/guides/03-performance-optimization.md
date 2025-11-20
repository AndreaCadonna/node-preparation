# Guide 3: Performance Optimization for Clustered Applications

## Introduction

Performance optimization in clustered Node.js applications requires understanding system-level concerns, application architecture, and the interaction between processes. This guide covers comprehensive optimization techniques for production clusters.

## Performance Fundamentals

### Key Metrics

1. **Throughput**: Requests per second the cluster can handle
2. **Latency**: Time to complete a single request (p50, p95, p99)
3. **Resource Utilization**: CPU, memory, I/O usage
4. **Error Rate**: Percentage of failed requests
5. **Concurrency**: Number of simultaneously handled requests

### Performance Goals

- **Response Time**: p95 < 200ms, p99 < 500ms
- **Throughput**: Handle expected load + 50% headroom
- **Resource Usage**: < 70% CPU, < 80% memory under normal load
- **Error Rate**: < 0.1% errors
- **Availability**: 99.9% uptime (43 minutes downtime/month)

## CPU Optimization

### Worker Process Count

```javascript
const os = require('os');

// Optimal worker count
function getOptimalWorkerCount() {
  const cpuCount = os.cpus().length;
  
  // Leave 1 CPU for OS and other processes
  return Math.max(1, cpuCount - 1);
}

// For I/O intensive applications
const ioIntensiveWorkers = cpuCount * 2;

// For CPU intensive applications  
const cpuIntensiveWorkers = cpuCount - 1;
```

### Event Loop Monitoring

```javascript
class EventLoopMonitor {
  constructor(threshold = 100) {
    this.threshold = threshold; // ms
    this.lastCheck = process.hrtime();
  }

  measure() {
    setImmediate(() => {
      const diff = process.hrtime(this.lastCheck);
      const lagMs = (diff[0] * 1e9 + diff[1]) / 1e6;

      if (lagMs > this.threshold) {
        console.warn(`Event loop lag: ${lagMs.toFixed(2)}ms`);
      }

      this.lastCheck = process.hrtime();
    });
  }

  start(interval = 1000) {
    setInterval(() => this.measure(), interval);
  }
}
```

## Memory Optimization

### Prevent Memory Leaks

```javascript
// Bad: Unbounded cache
const cache = {};
app.get('/data/:id', (req, res) => {
  cache[req.params.id] = fetchData(req.params.id);
});

// Good: Bounded cache with LRU
const LRU = require('lru-cache');
const cache = new LRU({ max: 500, maxAge: 1000 * 60 * 60 });

app.get('/data/:id', (req, res) => {
  let data = cache.get(req.params.id);
  
  if (!data) {
    data = fetchData(req.params.id);
    cache.set(req.params.id, data);
  }
  
  res.json(data);
});
```

### Memory Profiling

```javascript
// Track memory usage
function reportMemoryUsage() {
  const usage = process.memoryUsage();
  
  console.log({
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
  });
}

setInterval(reportMemoryUsage, 60000);
```

## Network Optimization

### Connection Pooling

```javascript
// Database connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  max: 20,              // Maximum pool size
  min: 5,               // Minimum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Reuse connections
async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
```

### HTTP Keep-Alive

```javascript
const http = require('http');
const Agent = require('agentkeepalive');

const agent = new Agent({
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

// Use agent for external requests
http.request({
  host: 'api.example.com',
  port: 80,
  path: '/',
  agent: agent
});
```

## Caching Strategies

### Multi-Level Caching

```javascript
class MultiLevelCache {
  constructor() {
    this.l1 = new Map(); // In-memory (fastest)
    this.l2 = null;      // Redis (shared)
    this.l3 = null;      // Database (source)
  }

  async get(key) {
    // L1: Memory
    if (this.l1.has(key)) {
      return this.l1.get(key);
    }

    // L2: Redis
    const l2Value = await this.l2.get(key);
    if (l2Value) {
      this.l1.set(key, l2Value);
      return l2Value;
    }

    // L3: Database
    const l3Value = await this.l3.query(key);
    if (l3Value) {
      this.l1.set(key, l3Value);
      await this.l2.set(key, l3Value, 3600);
      return l3Value;
    }

    return null;
  }
}
```

## Load Testing and Benchmarking

### Apache Bench (ab)

```bash
# Basic load test
ab -n 10000 -c 100 http://localhost:8000/

# With keep-alive
ab -n 10000 -c 100 -k http://localhost:8000/

# POST with data
ab -n 1000 -c 10 -p data.json -T application/json http://localhost:8000/api
```

### wrk (Advanced)

```bash
# High concurrency test
wrk -t12 -c400 -d30s http://localhost:8000/

# With Lua script
wrk -t12 -c400 -d30s -s script.lua http://localhost:8000/
```

## Production Checklist

- [ ] Optimal worker count configured
- [ ] Event loop monitoring enabled
- [ ] Memory limits set and monitored
- [ ] Connection pooling implemented
- [ ] Multi-level caching strategy
- [ ] Load testing completed
- [ ] Performance baselines established
- [ ] Monitoring and alerting configured

## Conclusion

Performance optimization is an iterative process. Measure, optimize, and measure again. Focus on the bottlenecks that matter most to your users.
