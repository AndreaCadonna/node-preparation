# Guide 3: Rolling Restarts and Zero-Downtime Deployments

## Introduction

Rolling restarts are essential for deploying updates to production applications without any downtime. This technique allows you to update your application code while continuing to serve requests, providing seamless updates to users.

## The Zero-Downtime Challenge

### Traditional Deployment Problem

```javascript
// Traditional deployment (with downtime)
// 1. Stop all workers
workers.forEach(w => w.kill());

// 2. Deploy new code
// ... deployment happens ...

// 3. Start new workers
for (let i = 0; i < numCPUs; i++) {
  cluster.fork();
}

// Problem: Downtime between steps 1 and 3!
// Users see: "Connection refused" errors
```

**Downtime period**:
- Stop all workers: 1-2 seconds
- Deploy code: 5-30 seconds
- Start workers: 2-5 seconds
- **Total downtime: 8-37 seconds** ❌

### Rolling Restart Solution

```javascript
// Rolling restart (zero downtime)
async function rollingRestart() {
  for (const worker of workers) {
    // 1. Start new worker FIRST
    const newWorker = cluster.fork();

    // 2. Wait for new worker to be ready
    await waitForWorkerReady(newWorker);

    // 3. THEN stop old worker
    await gracefulShutdown(worker);
  }
}

// Result: Always have workers serving requests
// Downtime: 0 seconds! ✅
```

## Rolling Restart Strategy

### The Overlap Period

```
Time   Worker 1    Worker 2    Worker 3    Worker 4
  │
  0    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓  (old)
  │
  1    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓
  │    ░░░░░░░                                  (new starting)
  │
  2    ░░░░░░░    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓
  │                                             (old stopping)
  │
  3    ░░░░░░░    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓
  │               ░░░░░░░                        (new starting)
  │
  4    ░░░░░░░    ░░░░░░░    ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓
  │
  5    ░░░░░░░    ░░░░░░░    ░░░░░░░    ▓▓▓▓▓▓▓
  │
  6    ░░░░░░░    ░░░░░░░    ░░░░░░░    ░░░░░░░  (all new!)

▓▓▓ = Old version    ░░░ = New version
```

**Key insight**: Always maintain minimum capacity during restart.

## Basic Rolling Restart Implementation

### Simple Sequential Restart

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  const workers = [];

  // Initialize workers
  for (let i = 0; i < 4; i++) {
    workers.push(cluster.fork());
  }

  async function rollingRestart() {
    console.log('Starting rolling restart...');

    for (let i = 0; i < workers.length; i++) {
      const oldWorker = workers[i];

      console.log(`Restarting worker ${i + 1}/${workers.length}`);

      // 1. Fork new worker
      const newWorker = cluster.fork();

      // 2. Wait for new worker to be ready
      await new Promise((resolve) => {
        newWorker.on('listening', () => {
          console.log(`New worker ${newWorker.id} ready`);
          resolve();
        });
      });

      // 3. Gracefully shutdown old worker
      oldWorker.disconnect();

      // 4. Wait for old worker to exit
      await new Promise((resolve) => {
        oldWorker.on('exit', () => {
          console.log(`Old worker ${oldWorker.id} exited`);
          resolve();
        });

        // Force kill after timeout
        setTimeout(() => {
          if (!oldWorker.isDead()) {
            oldWorker.kill('SIGKILL');
            resolve();
          }
        }, 30000);
      });

      // 5. Update workers array
      workers[i] = newWorker;

      console.log(`Worker ${i + 1}/${workers.length} restarted`);
    }

    console.log('Rolling restart complete!');
  }

  // Trigger rolling restart with SIGUSR2
  process.on('SIGUSR2', () => {
    rollingRestart().catch(console.error);
  });
}
```

## Advanced Rolling Restart Patterns

### Restart with Version Tracking

```javascript
if (cluster.isMaster) {
  let currentVersion = process.env.APP_VERSION || '1.0.0';

  class RollingRestartManager {
    constructor() {
      this.workers = new Map();
      this.isRestarting = false;
      this.restartQueue = [];
    }

    async restart(newVersion) {
      if (this.isRestarting) {
        throw new Error('Restart already in progress');
      }

      this.isRestarting = true;
      const startTime = Date.now();

      console.log(`\n${'='.repeat(50)}`);
      console.log(`Rolling Restart Started`);
      console.log(`From version: ${currentVersion}`);
      console.log(`To version: ${newVersion}`);
      console.log(`Workers to restart: ${this.workers.size}`);
      console.log(`${'='.repeat(50)}\n`);

      try {
        const workerIds = Array.from(this.workers.keys());

        for (let i = 0; i < workerIds.length; i++) {
          const workerId = workerIds[i];
          const workerNum = i + 1;
          const totalWorkers = workerIds.length;

          console.log(`\n[${ workerNum}/${totalWorkers}] Restarting worker ${workerId}...`);

          await this.restartWorker(workerId, newVersion);

          console.log(`[${workerNum}/${totalWorkers}] ✓ Worker ${workerId} restarted successfully`);

          // Brief pause between restarts
          if (i < workerIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        currentVersion = newVersion;
        const duration = Date.now() - startTime;

        console.log(`\n${'='.repeat(50)}`);
        console.log(`Rolling Restart Complete`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Current version: ${currentVersion}`);
        console.log(`${'='.repeat(50)}\n`);

      } finally {
        this.isRestarting = false;
      }
    }

    async restartWorker(workerId, newVersion) {
      const oldWorkerInfo = this.workers.get(workerId);
      if (!oldWorkerInfo) {
        throw new Error(`Worker ${workerId} not found`);
      }

      // 1. Fork new worker with new version
      const newWorker = cluster.fork({
        APP_VERSION: newVersion,
        WORKER_GENERATION: (oldWorkerInfo.generation || 0) + 1
      });

      const newWorkerInfo = {
        worker: newWorker,
        version: newVersion,
        generation: (oldWorkerInfo.generation || 0) + 1,
        createdAt: Date.now()
      };

      this.workers.set(newWorker.id, newWorkerInfo);

      // 2. Wait for new worker to be ready
      console.log(`  Waiting for new worker ${newWorker.id} to be ready...`);
      await this.waitForWorkerReady(newWorker);

      // 3. Shutdown old worker
      console.log(`  Shutting down old worker ${workerId}...`);
      await this.shutdownWorker(oldWorkerInfo.worker);

      // 4. Remove old worker from tracking
      this.workers.delete(workerId);

      console.log(`  ✓ Replacement complete`);
    }

    waitForWorkerReady(worker, timeout = 30000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Worker ${worker.id} failed to become ready within ${timeout}ms`));
        }, timeout);

        worker.on('listening', () => {
          clearTimeout(timer);
          console.log(`  ✓ New worker ${worker.id} ready`);
          resolve();
        });

        worker.on('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`Worker ${worker.id} exited during startup with code ${code}`));
        });
      });
    }

    shutdownWorker(worker, timeout = 30000) {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          console.log(`  ⚠ Worker ${worker.id} didn't exit gracefully, force killing`);
          worker.kill('SIGKILL');
          resolve();
        }, timeout);

        worker.on('exit', () => {
          clearTimeout(timer);
          console.log(`  ✓ Old worker ${worker.id} exited`);
          resolve();
        });

        // Initiate graceful shutdown
        worker.disconnect();
      });
    }
  }

  const restartManager = new RollingRestartManager();

  // Initialize workers
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork({ APP_VERSION: currentVersion });
    restartManager.workers.set(worker.id, {
      worker,
      version: currentVersion,
      generation: 0,
      createdAt: Date.now()
    });
  }

  // Trigger restart
  process.on('SIGUSR2', async () => {
    const newVersion = `${parseFloat(currentVersion) + 0.1}`;
    await restartManager.restart(newVersion);
  });
}
```

### Parallel Rolling Restart

```javascript
// Restart multiple workers in parallel (faster, but requires more capacity)
class ParallelRollingRestart {
  constructor(maxParallel = 2) {
    this.maxParallel = maxParallel;
    this.workers = new Map();
  }

  async restart(newVersion) {
    const workerIds = Array.from(this.workers.keys());
    const batches = this.createBatches(workerIds, this.maxParallel);

    console.log(`Restarting ${workerIds.length} workers in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\nBatch ${i + 1}/${batches.length}: Restarting ${batch.length} workers`);

      // Restart batch in parallel
      await Promise.all(
        batch.map(workerId => this.restartWorker(workerId, newVersion))
      );

      console.log(`✓ Batch ${i + 1} complete`);
    }

    console.log('\n✓ All batches complete');
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async restartWorker(workerId, newVersion) {
    // ... similar to sequential restart
  }
}

// Usage
const restartManager = new ParallelRollingRestart(2); // Restart 2 workers at a time
await restartManager.restart('2.0.0');
```

## Health Checks During Restart

### Worker Readiness Check

```javascript
if (cluster.isWorker) {
  const express = require('express');
  const app = express();

  let isReady = false;

  // Health check endpoint
  app.get('/health', (req, res) => {
    if (isReady) {
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(503).json({ status: 'starting' });
    }
  });

  // Readiness check endpoint
  app.get('/ready', (req, res) => {
    if (isReady) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  });

  const server = app.listen(8000, async () => {
    console.log(`Worker ${cluster.worker.id} started`);

    // Perform initialization
    await initializeDatabase();
    await warmupCache();
    await loadConfiguration();

    // Signal ready
    isReady = true;

    if (process.send) {
      process.send({ type: 'ready' });
    }

    console.log(`Worker ${cluster.worker.id} ready`);
  });
}
```

### Master Health Check Verification

```javascript
if (cluster.isMaster) {
  const http = require('http');

  async function checkWorkerHealth(worker, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await httpGet('http://localhost:8000/ready');

        if (response.statusCode === 200) {
          console.log(`Worker ${worker.id} health check passed`);
          return true;
        }

        console.log(`Worker ${worker.id} not ready (attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.log(`Worker ${worker.id} health check failed: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return false;
  }

  async function restartWorker(workerId) {
    const newWorker = cluster.fork();

    // Wait for worker to listen
    await new Promise(resolve => {
      newWorker.on('listening', resolve);
    });

    // Verify health
    const isHealthy = await checkWorkerHealth(newWorker);

    if (!isHealthy) {
      console.error(`New worker ${newWorker.id} failed health checks`);
      newWorker.kill();
      throw new Error('New worker unhealthy');
    }

    // Proceed with shutting down old worker
    // ...
  }

  function httpGet(url) {
    return new Promise((resolve, reject) => {
      http.get(url, resolve).on('error', reject);
    });
  }
}
```

## Handling Restart Failures

### Rollback on Failure

```javascript
class SafeRollingRestart {
  async restart(newVersion) {
    const snapshot = this.createSnapshot();

    try {
      await this.performRestart(newVersion);
      console.log('✓ Restart successful');

    } catch (error) {
      console.error('✗ Restart failed:', error.message);
      console.log('Rolling back...');

      await this.rollback(snapshot);
      console.log('✓ Rollback complete');

      throw error;
    }
  }

  createSnapshot() {
    return {
      workers: new Map(this.workers),
      version: this.currentVersion,
      timestamp: Date.now()
    };
  }

  async rollback(snapshot) {
    console.log(`Rolling back to version ${snapshot.version}`);

    // Kill all new workers
    this.workers.forEach((info, id) => {
      if (!snapshot.workers.has(id)) {
        console.log(`Killing new worker ${id}`);
        info.worker.kill();
      }
    });

    // Restore old workers if possible
    // (In practice, might need to restart from old version)
    this.currentVersion = snapshot.version;
  }
}
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 3, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'closed'; // closed, open, half-open
    this.lastFailure = null;
  }

  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open';
        console.log('Circuit breaker: half-open, trying again');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.log(`Circuit breaker opened after ${this.failures} failures`);
    }
  }
}

// Usage
const breaker = new CircuitBreaker(3, 60000);

async function performRollingRestart() {
  try {
    await breaker.execute(async () => {
      await rollingRestart();
    });
  } catch (error) {
    console.error('Rolling restart failed:', error.message);
  }
}
```

## Load Balancer Integration

### Update Load Balancer Health Checks

```javascript
if (cluster.isWorker) {
  let acceptingTraffic = true;

  // Health endpoint for load balancer
  app.get('/lb-health', (req, res) => {
    if (acceptingTraffic && isReady) {
      res.status(200).send('OK');
    } else {
      // Load balancer will remove this worker from rotation
      res.status(503).send('Not Ready');
    }
  });

  // Graceful shutdown process
  async function shutdown() {
    // 1. Stop accepting traffic from load balancer
    acceptingTraffic = false;
    console.log('Removed from load balancer');

    // 2. Wait for load balancer to update (typically 5-10 seconds)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 3. Stop accepting new connections
    server.close();

    // 4. Wait for active requests
    await drainConnections();

    // 5. Exit
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
}
```

## Monitoring Rolling Restarts

### Metrics Collection

```javascript
class RestartMetrics {
  constructor() {
    this.restarts = [];
  }

  recordRestart(data) {
    this.restarts.push({
      timestamp: Date.now(),
      duration: data.duration,
      workersRestarted: data.workersRestarted,
      failures: data.failures,
      version: data.version
    });

    // Keep last 100 restarts
    if (this.restarts.length > 100) {
      this.restarts.shift();
    }
  }

  getStats() {
    if (this.restarts.length === 0) {
      return null;
    }

    const durations = this.restarts.map(r => r.duration);
    const failures = this.restarts.filter(r => r.failures > 0);

    return {
      totalRestarts: this.restarts.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      failureRate: (failures.length / this.restarts.length) * 100,
      lastRestart: this.restarts[this.restarts.length - 1]
    };
  }
}

const metrics = new RestartMetrics();

async function rollingRestart() {
  const startTime = Date.now();
  let failures = 0;

  try {
    // Perform restart...

  } catch (error) {
    failures++;
    throw error;

  } finally {
    metrics.recordRestart({
      duration: Date.now() - startTime,
      workersRestarted: workers.size,
      failures,
      version: currentVersion
    });

    console.log('Restart metrics:', metrics.getStats());
  }
}
```

## Best Practices

### 1. Always Start New Before Stopping Old

```javascript
// ✅ Good
const newWorker = cluster.fork();
await waitForReady(newWorker);
oldWorker.disconnect();

// ❌ Bad
oldWorker.kill();
const newWorker = cluster.fork(); // Temporary capacity loss!
```

### 2. Verify Worker Readiness

```javascript
// ✅ Good
await waitForReady(newWorker);
await verifyHealth(newWorker);
// Now safe to kill old worker

// ❌ Bad
cluster.fork();
setTimeout(() => oldWorker.kill(), 5000); // Hope it's ready!
```

### 3. Set Timeouts

```javascript
// ✅ Good
await waitForReady(newWorker, 30000); // 30s timeout

// ❌ Bad
await waitForReady(newWorker); // Could wait forever!
```

### 4. Handle Failures

```javascript
// ✅ Good
try {
  await restartWorker(workerId);
} catch (error) {
  console.error('Restart failed, keeping old worker');
  // Old worker still running
}

// ❌ Bad
await restartWorker(workerId); // Unhandled failure = lost worker!
```

## Summary

Rolling restarts enable zero-downtime deployments by:

1. **Starting new workers** before stopping old ones
2. **Waiting for readiness** before proceeding
3. **Gracefully shutting down** old workers
4. **Maintaining capacity** throughout the process
5. **Handling failures** gracefully
6. **Monitoring** the process

This pattern is essential for production applications requiring high availability.
