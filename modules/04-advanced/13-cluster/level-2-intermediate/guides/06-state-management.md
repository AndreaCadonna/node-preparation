# Guide 6: State Management in Clustered Applications

## Introduction

State management is one of the most challenging aspects of clustered applications. Since each worker process has its own memory space, sharing state requires careful architectural decisions. This guide covers strategies for managing shared state, maintaining consistency, and choosing the right approach for your needs.

## The State Problem

### Why Workers Don't Share Memory

```javascript
// ❌ This doesn't work across workers!
let globalCounter = 0;

if (cluster.isWorker) {
  app.get('/increment', (req, res) => {
    globalCounter++; // Each worker has its own counter!
    res.json({ counter: globalCounter });
  });
}

// Problem:
// Worker 1: counter = 1, 2, 3
// Worker 2: counter = 1, 2, 3
// Worker 3: counter = 1, 2, 3
// Not a shared counter!
```

**Why this happens**:
- Each worker is a separate Node.js process
- Separate memory spaces (no shared heap)
- Variables are duplicated, not shared
- Changes in one worker don't affect others

### Common State Problems

```javascript
// Session storage
const sessions = new Map(); // Each worker has different sessions!

// Rate limiting
const rateLimits = new Map(); // Each worker tracks separately!

// Caching
const cache = new Map(); // Cache inconsistency across workers!

// Connection pools
const connections = []; // Inefficient duplication!
```

## State Management Strategies

### 1. Master Process Coordination

The master process can coordinate state across workers.

```javascript
if (cluster.isMaster) {
  // Shared state in master
  const sharedState = new Map();

  function handleStateRequest(workerId, message) {
    const { requestId, operation, key, value } = message;
    const worker = cluster.workers[workerId];

    let result;

    switch (operation) {
      case 'get':
        result = sharedState.get(key);
        break;

      case 'set':
        sharedState.set(key, value);
        result = value;
        break;

      case 'delete':
        result = sharedState.delete(key);
        break;

      case 'increment':
        const current = sharedState.get(key) || 0;
        const newValue = current + (value || 1);
        sharedState.set(key, newValue);
        result = newValue;
        break;
    }

    worker.send({
      type: 'state-response',
      requestId,
      result
    });
  }

  // Listen for state requests
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', (msg) => {
      if (msg.type === 'state-request') {
        handleStateRequest(worker.id, msg);
      }
    });
  });

} else {
  // Worker state client
  const crypto = require('crypto');
  const pendingRequests = new Map();

  async function stateRequest(operation, key, value) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('State request timeout'));
      }, 5000);

      pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });

      if (process.send) {
        process.send({
          type: 'state-request',
          requestId,
          operation,
          key,
          value
        });
      }
    });
  }

  // Handle responses
  process.on('message', (msg) => {
    if (msg.type === 'state-response') {
      const pending = pendingRequests.get(msg.requestId);
      if (pending) {
        pending.resolve(msg.result);
        pendingRequests.delete(msg.requestId);
      }
    }
  });

  // Usage
  app.get('/counter', async (req, res) => {
    const count = await stateRequest('increment', 'global-counter');
    res.json({ counter: count });
  });
}
```

**Pros**:
- Simple to implement
- No external dependencies
- Atomic operations guaranteed

**Cons**:
- Master becomes bottleneck
- State lost if master crashes
- Not suitable for high-throughput

### 2. External Storage (Redis)

Use Redis or similar for distributed state.

```javascript
const Redis = require('ioredis');
const redis = new Redis();

if (cluster.isWorker) {
  // Global counter with Redis
  app.get('/counter', async (req, res) => {
    const count = await redis.incr('global-counter');
    res.json({ counter: count });
  });

  // Session storage
  app.post('/session', async (req, res) => {
    const sessionId = crypto.randomUUID();
    const sessionData = { userId: req.body.userId, createdAt: Date.now() };

    await redis.setex(
      `session:${sessionId}`,
      3600, // 1 hour TTL
      JSON.stringify(sessionData)
    );

    res.json({ sessionId });
  });

  app.get('/session/:id', async (req, res) => {
    const data = await redis.get(`session:${req.params.id}`);

    if (!data) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(JSON.parse(data));
  });

  // Distributed cache
  async function getCachedOrFetch(key, fetchFn, ttl = 300) {
    // Try cache first
    const cached = await redis.get(`cache:${key}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch and cache
    const data = await fetchFn();
    await redis.setex(`cache:${key}`, ttl, JSON.stringify(data));

    return data;
  }

  // Rate limiting
  async function checkRateLimit(ip, limit = 100, window = 60) {
    const key = `ratelimit:${ip}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, window);
    }

    return current <= limit;
  }

  app.use(async (req, res, next) => {
    const allowed = await checkRateLimit(req.ip);

    if (!allowed) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    next();
  });
}
```

**Pros**:
- Highly scalable
- Persistent (survives restarts)
- Works across multiple servers
- Rich features (TTL, pub/sub, etc.)

**Cons**:
- External dependency
- Network latency
- Additional complexity
- Requires Redis expertise

### 3. Database Storage

Use database for persistent shared state.

```javascript
// Using PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  max: 20 // Connection pool
});

if (cluster.isWorker) {
  // Atomic counter with database
  app.get('/counter', async (req, res) => {
    const result = await pool.query(`
      INSERT INTO counters (name, value)
      VALUES ('global', 1)
      ON CONFLICT (name)
      DO UPDATE SET value = counters.value + 1
      RETURNING value
    `);

    res.json({ counter: result.rows[0].value });
  });

  // Session storage
  app.post('/session', async (req, res) => {
    const sessionId = crypto.randomUUID();

    await pool.query(
      'INSERT INTO sessions (id, user_id, data, expires_at) VALUES ($1, $2, $3, $4)',
      [sessionId, req.body.userId, {}, new Date(Date.now() + 3600000)]
    );

    res.json({ sessionId });
  });

  // Distributed locks
  async function acquireLock(key, timeout = 30000) {
    const result = await pool.query(`
      INSERT INTO locks (key, locked_at, expires_at)
      VALUES ($1, NOW(), NOW() + INTERVAL '${timeout} milliseconds')
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    `, [key]);

    return result.rowCount > 0;
  }

  async function releaseLock(key) {
    await pool.query('DELETE FROM locks WHERE key = $1', [key]);
  }
}
```

**Pros**:
- Already using database
- Persistent
- ACID guarantees
- Familiar tool

**Cons**:
- Slower than Redis
- Database load
- Connection pool management

## Advanced State Patterns

### Distributed Locking

```javascript
// Redis-based distributed lock
class DistributedLock {
  constructor(redis, key, timeout = 10000) {
    this.redis = redis;
    this.key = `lock:${key}`;
    this.timeout = timeout;
    this.lockId = crypto.randomUUID();
  }

  async acquire() {
    const result = await this.redis.set(
      this.key,
      this.lockId,
      'PX', // Milliseconds
      this.timeout,
      'NX' // Only if not exists
    );

    return result === 'OK';
  }

  async release() {
    // Only release if we own the lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, this.key, this.lockId);
    return result === 1;
  }

  async extend(additionalTime) {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      this.key,
      this.lockId,
      additionalTime
    );

    return result === 1;
  }
}

// Usage
app.post('/critical-section', async (req, res) => {
  const lock = new DistributedLock(redis, 'critical-resource');

  const acquired = await lock.acquire();

  if (!acquired) {
    res.status(423).json({ error: 'Resource locked' });
    return;
  }

  try {
    // Critical section
    await performCriticalOperation();

    res.json({ success: true });

  } finally {
    await lock.release();
  }
});
```

### State Replication

```javascript
// Replicate state changes to all workers
if (cluster.isMaster) {
  function replicateStateChange(type, key, value) {
    Object.values(cluster.workers).forEach(worker => {
      worker.send({
        type: 'state-replicate',
        operation: type,
        key,
        value
      });
    });
  }

  // When master state changes, replicate
  sharedState.set('config', newConfig);
  replicateStateChange('set', 'config', newConfig);

} else {
  // Workers maintain local replica
  const localState = new Map();

  process.on('message', (msg) => {
    if (msg.type === 'state-replicate') {
      switch (msg.operation) {
        case 'set':
          localState.set(msg.key, msg.value);
          break;

        case 'delete':
          localState.delete(msg.key);
          break;
      }
    }
  });

  // Fast local reads, no IPC needed
  app.get('/config', (req, res) => {
    const config = localState.get('config');
    res.json(config);
  });
}
```

### Eventually Consistent State

```javascript
// Broadcast state changes, accept eventual consistency
if (cluster.isMaster) {
  function updateState(key, value) {
    // Update master
    sharedState.set(key, value);

    // Broadcast to workers (fire and forget)
    Object.values(cluster.workers).forEach(worker => {
      try {
        worker.send({
          type: 'state-update',
          key,
          value,
          version: Date.now()
        });
      } catch (error) {
        // Worker might be dead, continue
      }
    });
  }

} else {
  const localCache = new Map();

  process.on('message', (msg) => {
    if (msg.type === 'state-update') {
      const current = localCache.get(msg.key);

      // Only update if newer
      if (!current || msg.version > current.version) {
        localCache.set(msg.key, {
          value: msg.value,
          version: msg.version
        });
      }
    }
  });
}
```

## Caching Strategies

### Multi-Level Caching

```javascript
if (cluster.isWorker) {
  // Level 1: In-memory cache (worker-local)
  const l1Cache = new Map();

  // Level 2: Shared cache (Redis)
  const redis = new Redis();

  async function getCached(key, fetchFn, ttl = 300) {
    // Check L1 cache
    const l1Entry = l1Cache.get(key);
    if (l1Entry && Date.now() < l1Entry.expiresAt) {
      console.log('L1 cache hit');
      return l1Entry.value;
    }

    // Check L2 cache (Redis)
    const l2Value = await redis.get(`cache:${key}`);
    if (l2Value) {
      console.log('L2 cache hit');
      const value = JSON.parse(l2Value);

      // Populate L1
      l1Cache.set(key, {
        value,
        expiresAt: Date.now() + (ttl * 1000)
      });

      return value;
    }

    // Cache miss - fetch data
    console.log('Cache miss');
    const value = await fetchFn();

    // Populate L2
    await redis.setex(`cache:${key}`, ttl, JSON.stringify(value));

    // Populate L1
    l1Cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl * 1000)
    });

    return value;
  }

  // Clear caches
  async function clearCache(key) {
    // Clear L1
    l1Cache.delete(key);

    // Clear L2
    await redis.del(`cache:${key}`);

    // Notify other workers to clear their L1
    if (process.send) {
      process.send({
        type: 'cache-invalidate',
        key
      });
    }
  }

  process.on('message', (msg) => {
    if (msg.type === 'cache-invalidate') {
      l1Cache.delete(msg.key);
    }
  });
}
```

### Cache Invalidation

```javascript
// Pattern 1: TTL-based invalidation
await redis.setex('user:123', 300, userData); // Auto-expire after 5min

// Pattern 2: Event-based invalidation
async function updateUser(userId, updates) {
  // Update database
  await db.query('UPDATE users SET ... WHERE id = $1', [userId]);

  // Invalidate cache
  await redis.del(`user:${userId}`);

  // Notify all workers
  if (cluster.isMaster) {
    broadcastCacheInvalidation('user', userId);
  }
}

// Pattern 3: Version-based invalidation
const cacheVersion = await redis.incr('cache-version');

async function getCachedWithVersion(key, fetchFn) {
  const versionedKey = `${key}:v${cacheVersion}`;
  // ... use versioned key
}

// Invalidate all caches
async function invalidateAllCaches() {
  await redis.incr('cache-version');
}
```

## Consistency Models

### Strong Consistency

```javascript
// Every read returns the most recent write
async function stronglyConsistentRead(key) {
  // Always read from authoritative source (database/Redis)
  return await redis.get(key);
}

async function stronglyConsistentWrite(key, value) {
  // Write to authoritative source
  await redis.set(key, value);

  // Invalidate all caches
  broadcastCacheInvalidation(key);
}
```

### Eventual Consistency

```javascript
// Reads may return stale data, but eventually consistent
async function eventuallyConsistentRead(key) {
  // Read from local cache (might be stale)
  return localCache.get(key);
}

async function eventuallyConsistentWrite(key, value) {
  // Write to source
  await redis.set(key, value);

  // Async update to workers (no guarantee of order or timing)
  setTimeout(() => {
    broadcastUpdate(key, value);
  }, 0);
}
```

## Best Practices

### 1. Choose the Right Storage

```javascript
// Read-heavy, rarely changes → Local cache + replication
const config = localCache.get('app-config');

// Write-heavy, shared → Redis/Database
const counter = await redis.incr('request-counter');

// Critical, ACID → Database
await db.transaction(async (tx) => {
  await tx.query('UPDATE accounts...');
});
```

### 2. Always Set TTLs

```javascript
// ✅ Good: TTL prevents stale data
await redis.setex('cache:user:123', 300, data);

// ❌ Bad: No TTL, stale data forever
await redis.set('cache:user:123', data);
```

### 3. Handle Cache Failures Gracefully

```javascript
async function getCachedData(key) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.error('Cache error:', error);
    // Fall through to fetch from source
  }

  // Fetch from authoritative source
  return await fetchFromDatabase(key);
}
```

### 4. Use Locks for Critical Sections

```javascript
// ✅ Good: Lock protects critical section
const lock = await acquireLock('transfer-money');
try {
  await transferMoney(from, to, amount);
} finally {
  await releaseLock('transfer-money');
}

// ❌ Bad: Race condition
await transferMoney(from, to, amount); // Multiple workers = corruption!
```

### 5. Monitor Cache Hit Rates

```javascript
let cacheHits = 0;
let cacheMisses = 0;

async function getCached(key) {
  const cached = await redis.get(key);

  if (cached) {
    cacheHits++;
  } else {
    cacheMisses++;
  }

  // Report metrics
  if ((cacheHits + cacheMisses) % 1000 === 0) {
    const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;
    console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);
  }

  return cached;
}
```

## Common Pitfalls

### 1. Assuming Shared Memory

```javascript
// ❌ Won't work across workers
let sessionStore = {};

// ✅ Use external storage
const sessionStore = redis;
```

### 2. Not Handling Cache Stampede

```javascript
// ❌ All workers fetch simultaneously
const data = await cache.get(key) || await fetchExpensive();

// ✅ Use locks to prevent stampede
const lock = await acquireLock(`fetch:${key}`);
if (lock) {
  try {
    const data = await fetchExpensive();
    await cache.set(key, data);
  } finally {
    await releaseLock(`fetch:${key}`);
  }
}
```

### 3. Infinite Lock Holding

```javascript
// ❌ Lock never released on error
await acquireLock(key);
await doWork(); // Might throw!
await releaseLock(key); // Never reached!

// ✅ Always use try/finally
await acquireLock(key);
try {
  await doWork();
} finally {
  await releaseLock(key);
}
```

## Summary

Effective state management in clustered applications requires:

1. **Choosing the right strategy** (master coordination, Redis, database)
2. **Understanding consistency tradeoffs** (strong vs eventual)
3. **Implementing caching** strategically
4. **Using locks** for critical sections
5. **Handling failures** gracefully
6. **Monitoring** cache performance

The key is matching the state management approach to your application's consistency and performance requirements.
