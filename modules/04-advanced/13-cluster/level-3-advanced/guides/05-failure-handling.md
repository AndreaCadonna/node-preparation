# Guide 5: Failure Handling and Resilience Patterns

## Introduction

In distributed systems, failures are inevitable. This guide covers comprehensive strategies for building resilient clustered Node.js applications that gracefully handle failures.

## Types of Failures

### 1. Worker Process Failures
- Crashes due to uncaught exceptions
- Memory leaks leading to OOM
- CPU saturation
- Event loop blocking

### 2. External Service Failures
- Database connection failures
- API timeouts
- Network partitions
- Service degradation

### 3. System Failures
- Out of memory
- Disk full
- Network issues
- OS-level problems

## Circuit Breaker Pattern

### Implementation

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
  }

  async call(fn, fallback) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        return fallback ? fallback() : Promise.reject(new Error('Circuit open'));
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
      }
    }
  }

  onFailure() {
    this.failures++;
    this.successes = 0;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

// Usage
const dbCircuit = new CircuitBreaker({ failureThreshold: 5, timeout: 30000 });

async function queryDatabase(sql) {
  return dbCircuit.call(
    () => db.query(sql),
    () => getCachedResult(sql)
  );
}
```

## Retry Strategies

### Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;

      await sleep(delay + jitter);
    }
  }
}

// Usage
const result = await retryWithBackoff(
  () => fetch('https://api.example.com'),
  3,
  1000
);
```

## Bulkhead Pattern

Isolate resources to prevent cascading failures:

```javascript
class Bulkhead {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.running >= this.maxConcurrent) {
      await this.enqueue();
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      this.dequeue();
    }
  }

  enqueue() {
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  dequeue() {
    const resolve = this.queue.shift();
    if (resolve) resolve();
  }
}

// Separate bulkheads for different resources
const dbBulkhead = new Bulkhead(20);
const apiBulkhead = new Bulkhead(10);
```

## Graceful Degradation

### Fallback Strategies

```javascript
// 1. Cached data
async function getUser(id) {
  try {
    return await db.query('SELECT * FROM users WHERE id = $1', [id]);
  } catch (error) {
    return cache.get(`user:${id}`);
  }
}

// 2. Default values
async function getRecommendations(userId) {
  try {
    return await mlService.getRecommendations(userId);
  } catch (error) {
    return getPopularItems();
  }
}

// 3. Degraded functionality
async function search(query) {
  try {
    return await elasticSearch.search(query);
  } catch (error) {
    // Fallback to simple database search
    return await db.query('SELECT * FROM items WHERE name LIKE $1', [`%${query}%`]);
  }
}
```

## Worker Recovery

### Auto-Restart with Backoff

```javascript
class WorkerManager {
  constructor() {
    this.restartCounts = new Map();
    this.restartWindow = 60000; // 1 minute
    this.maxRestartsPerWindow = 5;
  }

  handleWorkerExit(worker, code, signal) {
    const now = Date.now();
    const restarts = this.restartCounts.get(worker.id) || [];

    // Clean old restarts
    const recentRestarts = restarts.filter(t => now - t < this.restartWindow);

    if (recentRestarts.length >= this.maxRestartsPerWindow) {
      console.error(`Worker ${worker.id} crashed too many times, not restarting`);
      return;
    }

    recentRestarts.push(now);
    this.restartCounts.set(worker.id, recentRestarts);

    // Restart with delay
    const delay = Math.min(1000 * Math.pow(2, recentRestarts.length), 30000);

    setTimeout(() => {
      console.log(`Restarting worker ${worker.id} after ${delay}ms`);
      cluster.fork();
    }, delay);
  }
}
```

## Health Checks

```javascript
class HealthCheck {
  constructor() {
    this.checks = [];
  }

  register(name, checkFn) {
    this.checks.push({ name, check: checkFn });
  }

  async runAll() {
    const results = await Promise.allSettled(
      this.checks.map(async ({ name, check }) => ({
        name,
        status: await check() ? 'healthy' : 'unhealthy'
      }))
    );

    return results.map((r, i) => ({
      name: this.checks[i].name,
      ...r.value
    }));
  }
}

// Usage
const health = new HealthCheck();
health.register('database', () => db.ping());
health.register('redis', () => redis.ping());
health.register('disk', () => checkDiskSpace());
```

## Chaos Engineering

### Failure Injection

```javascript
class ChaosMonkey {
  constructor(enabled = false) {
    this.enabled = enabled;
  }

  maybeInjectFailure(probability = 0.01) {
    if (!this.enabled) return false;

    return Math.random() < probability;
  }

  async withChaos(fn, options = {}) {
    if (this.maybeInjectFailure(options.probability)) {
      throw new Error('Chaos monkey injected failure');
    }

    // Random delay
    if (this.maybeInjectFailure(options.latencyProbability || 0.05)) {
      await sleep(Math.random() * 5000);
    }

    return fn();
  }
}

// Usage
const chaos = new ChaosMonkey(process.env.CHAOS_ENABLED === 'true');

app.get('/api/data', async (req, res) => {
  const data = await chaos.withChaos(
    () => fetchData(),
    { probability: 0.01, latencyProbability: 0.05 }
  );

  res.json(data);
});
```

## Best Practices

1. **Fail Fast**: Don't wait for timeouts when failure is certain
2. **Fail Safe**: Default to safe state, not error state
3. **Isolate Failures**: Use bulkheads to contain blast radius
4. **Monitor Everything**: Track failure rates and patterns
5. **Test Failures**: Regularly test failure scenarios
6. **Document Failures**: Keep runbooks for common failures

## Conclusion

Building resilient systems requires planning for failure from the start. Combine multiple patterns for defense in depth.
