# Guide 1: Sticky Sessions - Session Affinity Patterns and Implementations

## Introduction

Sticky sessions, also known as session affinity, is a crucial pattern in distributed web applications that ensures requests from the same client are consistently routed to the same server or worker process. This guide provides comprehensive coverage of sticky session implementations, use cases, and production considerations for clustered Node.js applications.

## Why Sticky Sessions Matter

### The Problem: Stateful Applications in Clusters

When you cluster a Node.js application, incoming requests are distributed across multiple worker processes. Without sticky sessions, consecutive requests from the same client may be handled by different workers, leading to several problems:

```javascript
// Worker 1 handles first request
app.post('/login', (req, res) => {
  // Store session in memory
  sessions[sessionId] = { user: 'john', cart: [] };
});

// Worker 2 handles second request
app.get('/cart', (req, res) => {
  // Session not found! Different worker process.
  const session = sessions[sessionId]; // undefined
});
```

**Problems without sticky sessions:**
- Lost session data (shopping carts, authentication state)
- Inconsistent user experience
- Increased database/cache load
- Failed WebSocket connections
- Cache misses and inefficiency

### Benefits of Sticky Sessions

**1. In-Memory Session Management**
- No need for external session store for simple applications
- Faster session access (no network I/O)
- Reduced infrastructure complexity

**2. Connection State Preservation**
- WebSocket connections maintained on same worker
- Long-polling requests work correctly
- Server-sent events (SSE) function properly

**3. Improved Caching**
- Worker-local caches more effective
- Reduced cache duplication across workers
- Better cache hit rates

**4. Reduced External Dependencies**
- Less reliance on Redis/Memcached for sessions
- Simpler architecture for small to medium applications
- Lower operational overhead

## Sticky Session Strategies

### 1. Cookie-Based Routing

The most reliable and common sticky session strategy uses HTTP cookies to track session affinity.

**How it works:**
1. Client makes first request (no cookie)
2. Load balancer assigns worker and sets cookie
3. Subsequent requests include cookie
4. Load balancer routes to same worker based on cookie

**Implementation:**

```javascript
// Master process - Cookie-based routing
function getWorkerByCookie(cookieHeader) {
  const sessionId = extractSessionId(cookieHeader);

  if (!sessionId) {
    // New session - assign to worker using consistent hashing
    return assignNewSession();
  }

  // Existing session - route to assigned worker
  if (sessionMap.has(sessionId)) {
    const workerId = sessionMap.get(sessionId);
    const worker = workers.find(w => w.id === workerId);

    if (worker) {
      return worker; // Worker still alive
    }

    // Worker died - reassign
    sessionMap.delete(sessionId);
  }

  // Reassign to new worker
  return assignNewSession(sessionId);
}

function assignNewSession(sessionId = generateSessionId()) {
  // Use consistent hashing for distribution
  const hash = crypto.createHash('md5').update(sessionId).digest('hex');
  const index = parseInt(hash.substring(0, 8), 16) % workers.length;
  const worker = workers[index];

  sessionMap.set(sessionId, worker.id);
  return worker;
}
```

**Advantages:**
- Works across different networks
- Not affected by NAT or proxies
- Persistent across browser sessions
- Highly reliable

**Disadvantages:**
- Requires cookie support
- GDPR/privacy considerations
- Can be cleared by user
- Cookie size overhead

**Best Practices:**
```javascript
// Set secure cookie with appropriate flags
res.setHeader('Set-Cookie', [
  `sessionId=${sessionId}`,
  'HttpOnly',          // Prevent JavaScript access
  'Secure',            // HTTPS only (in production)
  'SameSite=Strict',   // CSRF protection
  'Max-Age=3600',      // 1 hour expiration
  'Path=/'             // Available site-wide
].join('; '));
```

### 2. IP-Based Routing

Routes requests based on client IP address. Useful as a fallback when cookies aren't available.

**Implementation:**

```javascript
function getWorkerByIP(clientIP) {
  if (ipMap.has(clientIP)) {
    const workerId = ipMap.get(clientIP);
    const worker = workers.find(w => w.id === workerId);
    if (worker) return worker;

    ipMap.delete(clientIP);
  }

  // Assign using consistent hashing
  const hash = crypto.createHash('md5').update(clientIP).digest('hex');
  const index = parseInt(hash.substring(0, 8), 16) % workers.length;
  const worker = workers[index];

  ipMap.set(clientIP, worker.id);
  return worker;
}
```

**Advantages:**
- No cookie required
- Works for any protocol
- Simple implementation

**Disadvantages:**
- Breaks with NAT (multiple users same IP)
- Changes with dynamic IPs
- Issues with load balancers/proxies
- Privacy concerns

**When to use:**
- Fallback mechanism
- Internal applications
- APIs without cookie support
- IoT devices

### 3. URL Parameter-Based Routing

Embed worker ID in URL or use session token in URL parameters.

**Implementation:**

```javascript
// Extract session from URL
function getWorkerByURL(url) {
  const urlObj = new URL(url, 'http://localhost');
  const sessionId = urlObj.searchParams.get('session');

  if (sessionId && sessionMap.has(sessionId)) {
    const workerId = sessionMap.get(sessionId);
    return workers.find(w => w.id === workerId);
  }

  return null; // Fall back to other strategies
}

// Client includes session in URL
// http://example.com/api/cart?session=abc123
```

**Advantages:**
- Works without cookies
- Easy to implement
- Visible and debuggable

**Disadvantages:**
- Security risk (session ID in URL)
- Cache issues
- URL pollution
- Harder to manage

**Use cases:**
- Public APIs with limited state
- Temporary links
- Mobile apps

### 4. Consistent Hashing

Advanced technique that minimizes disruption when workers are added or removed.

**Implementation:**

```javascript
class ConsistentHash {
  constructor(workers, replicas = 150) {
    this.replicas = replicas;
    this.ring = new Map();
    this.sortedKeys = [];

    workers.forEach(worker => this.addWorker(worker));
  }

  addWorker(worker) {
    for (let i = 0; i < this.replicas; i++) {
      const key = crypto
        .createHash('md5')
        .update(`${worker.id}:${i}`)
        .digest('hex');
      const hashKey = parseInt(key.substring(0, 8), 16);

      this.ring.set(hashKey, worker);
    }

    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  removeWorker(worker) {
    for (let i = 0; i < this.replicas; i++) {
      const key = crypto
        .createHash('md5')
        .update(`${worker.id}:${i}`)
        .digest('hex');
      const hashKey = parseInt(key.substring(0, 8), 16);

      this.ring.delete(hashKey);
    }

    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  getWorker(sessionId) {
    if (this.sortedKeys.length === 0) return null;

    const hash = crypto.createHash('md5').update(sessionId).digest('hex');
    const hashKey = parseInt(hash.substring(0, 8), 16);

    // Find first key >= hashKey
    let index = this.sortedKeys.findIndex(k => k >= hashKey);

    // Wrap around if necessary
    if (index === -1) index = 0;

    const ringKey = this.sortedKeys[index];
    return this.ring.get(ringKey);
  }
}
```

**Advantages:**
- Minimal disruption when scaling
- Even distribution
- Predictable behavior

**Disadvantages:**
- More complex implementation
- Higher memory overhead
- Requires more computation

## Session Storage Strategies

### In-Memory Storage (Worker-Local)

**Implementation:**

```javascript
// In worker process
const sessions = new Map();

function createSession(sessionId) {
  const session = {
    id: sessionId,
    created: Date.now(),
    lastAccess: Date.now(),
    data: {}
  };

  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);

  if (session) {
    session.lastAccess = Date.now();
    return session;
  }

  return null;
}

// Periodic cleanup
setInterval(() => {
  const timeout = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess > timeout) {
      sessions.delete(sessionId);
    }
  }
}, 60000); // Check every minute
```

**Pros:**
- Fastest access (no I/O)
- Simple implementation
- No external dependencies

**Cons:**
- Lost on worker restart
- Not shared across workers
- Memory limited

**Best for:**
- Development
- Non-critical sessions
- Temporary state

### Shared External Storage (Redis/Memcached)

**Redis Implementation:**

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function createSession(sessionId, data, ttl = 1800) {
  await redis.setex(
    `session:${sessionId}`,
    ttl,
    JSON.stringify(data)
  );
}

async function getSession(sessionId) {
  const data = await redis.get(`session:${sessionId}`);

  if (data) {
    // Refresh TTL on access (sliding expiration)
    await redis.expire(`session:${sessionId}`, 1800);
    return JSON.parse(data);
  }

  return null;
}

async function updateSession(sessionId, data, ttl = 1800) {
  await redis.setex(
    `session:${sessionId}`,
    ttl,
    JSON.stringify(data)
  );
}

async function deleteSession(sessionId) {
  await redis.del(`session:${sessionId}`);
}
```

**Pros:**
- Survives worker restarts
- Shared across all workers
- Can scale independently
- Battle-tested reliability

**Cons:**
- Network latency
- External dependency
- Additional infrastructure
- Single point of failure (without clustering)

**Best for:**
- Production applications
- Multi-server deployments
- Critical session data

### Hybrid Approach

Combine in-memory caching with external storage for best performance.

```javascript
class HybridSessionStore {
  constructor(redis) {
    this.redis = redis;
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  async get(sessionId) {
    // Try cache first
    if (this.cache.has(sessionId)) {
      return this.cache.get(sessionId);
    }

    // Fetch from Redis
    const data = await this.redis.get(`session:${sessionId}`);

    if (data) {
      const session = JSON.parse(data);

      // Cache it
      this.cache.set(sessionId, session);
      this.evictIfNeeded();

      return session;
    }

    return null;
  }

  async set(sessionId, data, ttl = 1800) {
    // Update cache
    this.cache.set(sessionId, data);
    this.evictIfNeeded();

    // Persist to Redis
    await this.redis.setex(
      `session:${sessionId}`,
      ttl,
      JSON.stringify(data)
    );
  }

  evictIfNeeded() {
    if (this.cache.size > this.maxCacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}
```

## Production Considerations

### Security

**1. Secure Session ID Generation:**

```javascript
const crypto = require('crypto');

function generateSecureSessionId() {
  return crypto.randomBytes(32).toString('hex');
}
```

**2. Session Fixation Prevention:**

```javascript
function regenerateSessionId(oldSessionId) {
  const oldSession = getSession(oldSessionId);
  const newSessionId = generateSecureSessionId();

  // Copy data to new session
  createSession(newSessionId, oldSession.data);

  // Delete old session
  deleteSession(oldSessionId);

  return newSessionId;
}

// Regenerate on privilege escalation
app.post('/login', (req, res) => {
  // ... authenticate user ...

  // Regenerate session ID after login
  const newSessionId = regenerateSessionId(req.sessionId);

  // Update cookie
  res.cookie('sessionId', newSessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
});
```

**3. Session Encryption:**

```javascript
const crypto = require('crypto');

function encryptSessionData(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decryptSessionData(encryptedData, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encryptedData.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}
```

### Performance Optimization

**1. Session Preloading:**

```javascript
// Preload session on first access
async function preloadSession(sessionId) {
  const sessionData = await redis.get(`session:${sessionId}`);

  if (sessionData) {
    // Preload related data
    const session = JSON.parse(sessionData);
    const userId = session.userId;

    if (userId) {
      // Preload user data in parallel
      const userData = await redis.get(`user:${userId}`);
      session.user = JSON.parse(userData);
    }

    return session;
  }

  return null;
}
```

**2. Batch Operations:**

```javascript
// Update multiple session fields atomically
async function batchUpdateSession(sessionId, updates) {
  const pipeline = redis.pipeline();

  for (const [field, value] of Object.entries(updates)) {
    pipeline.hset(`session:${sessionId}`, field, JSON.stringify(value));
  }

  pipeline.expire(`session:${sessionId}`, 1800);

  await pipeline.exec();
}
```

### Monitoring and Observability

**Session Metrics:**

```javascript
class SessionMetrics {
  constructor() {
    this.metrics = {
      totalSessions: 0,
      activeSessions: 0,
      sessionCreations: 0,
      sessionDeletions: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  recordSessionCreation() {
    this.metrics.totalSessions++;
    this.metrics.activeSessions++;
    this.metrics.sessionCreations++;
  }

  recordSessionDeletion() {
    this.metrics.activeSessions--;
    this.metrics.sessionDeletions++;
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  getCacheHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.getCacheHitRate().toFixed(2) + '%'
    };
  }
}
```

## Common Pitfalls and Solutions

### Pitfall 1: Worker Death Loses Sessions

**Problem:** When a worker dies, all its in-memory sessions are lost.

**Solution:** Use external session store or implement session replication:

```javascript
// Replicate sessions to backup workers
function replicateSession(sessionId, sessionData) {
  const primaryWorker = getWorkerBySession(sessionId);
  const backupWorker = getBackupWorker(sessionId);

  // Store on both workers
  primaryWorker.send({
    type: 'session-store',
    sessionId,
    data: sessionData
  });

  backupWorker.send({
    type: 'session-backup',
    sessionId,
    data: sessionData
  });
}
```

### Pitfall 2: Uneven Session Distribution

**Problem:** Simple hashing can lead to uneven distribution across workers.

**Solution:** Use consistent hashing with virtual nodes (replicas).

### Pitfall 3: Session Fixation Vulnerability

**Problem:** Attacker can fixate a session ID before user logs in.

**Solution:** Always regenerate session ID on authentication state changes.

### Pitfall 4: Memory Leaks from Uncleaned Sessions

**Problem:** Expired sessions not cleaned up, causing memory leaks.

**Solution:** Implement periodic cleanup and set appropriate TTL:

```javascript
setInterval(() => {
  cleanExpiredSessions();
}, 60000); // Clean every minute
```

## Conclusion

Sticky sessions are a powerful pattern for managing state in clustered applications. Choose the right strategy based on your requirements:

- **Cookie-based**: Most reliable, use for web applications
- **IP-based**: Fallback or internal applications
- **Consistent hashing**: When scaling dynamically
- **External storage**: Production applications with Redis
- **Hybrid approach**: Best performance with reliability

Remember: Sticky sessions are a trade-off. They provide simplicity and performance but reduce load balancing flexibility. For truly stateless architectures, consider using external session stores without sticky sessions.
