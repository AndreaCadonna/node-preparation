# Guide 4: Health Monitoring and Auto-Remediation

## Introduction

Health monitoring is critical for maintaining reliable clustered applications in production. A comprehensive health monitoring system detects problems early, provides visibility into worker status, and can automatically remediate issues before they impact users.

## Why Health Monitoring Matters

### The Problem Without Monitoring

```javascript
// Without monitoring
const workers = [];
for (let i = 0; i < 4; i++) {
  workers.push(cluster.fork());
}

// Problems:
// - Worker hangs → No detection
// - Memory leak → Crashes eventually
// - High error rate → No visibility
// - Slow responses → Users suffer
// - Worker dies → May not restart
```

**Consequences**:
- Silent failures
- Degraded performance
- User-reported issues
- Difficult debugging
- Extended downtime

### With Comprehensive Monitoring

```javascript
// With monitoring
const monitor = new WorkerHealthMonitor();

for (let i = 0; i < 4; i++) {
  const worker = cluster.fork();
  monitor.track(worker);
}

// Benefits:
// ✓ Early problem detection
// ✓ Automatic worker restart
// ✓ Performance metrics
// ✓ Error tracking
// ✓ Proactive remediation
```

## Heartbeat Pattern

### Basic Heartbeat Implementation

```javascript
const HEARTBEAT_INTERVAL = 5000; // Send heartbeat every 5s
const HEARTBEAT_TIMEOUT = 15000; // Timeout after 15s

if (cluster.isMaster) {
  class HeartbeatMonitor {
    constructor(worker) {
      this.worker = worker;
      this.lastHeartbeat = Date.now();
      this.isAlive = true;
      this.missedBeats = 0;

      this.startMonitoring();
    }

    startMonitoring() {
      // Listen for heartbeats
      this.worker.on('message', (msg) => {
        if (msg.type === 'heartbeat') {
          this.onHeartbeat(msg);
        }
      });

      // Check heartbeat every interval
      this.checkInterval = setInterval(() => {
        this.checkHeartbeat();
      }, HEARTBEAT_INTERVAL);
    }

    onHeartbeat(msg) {
      this.lastHeartbeat = Date.now();
      this.missedBeats = 0;
      this.isAlive = true;

      console.log(`Worker ${this.worker.id} heartbeat: ` +
                  `memory=${formatMB(msg.memory.heapUsed)}, ` +
                  `uptime=${msg.uptime.toFixed(0)}s`);
    }

    checkHeartbeat() {
      const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;

      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
        this.missedBeats++;
        this.isAlive = false;

        console.warn(`⚠ Worker ${this.worker.id} missed heartbeat #${this.missedBeats} ` +
                     `(${timeSinceHeartbeat}ms since last)`);

        // Restart after multiple missed heartbeats
        if (this.missedBeats >= 3) {
          console.error(`✗ Worker ${this.worker.id} unresponsive, restarting`);
          this.worker.kill();
        }
      }
    }

    stop() {
      clearInterval(this.checkInterval);
    }
  }

  // Usage
  const worker = cluster.fork();
  const monitor = new HeartbeatMonitor(worker);

} else {
  // Worker sends heartbeat
  setInterval(() => {
    if (process.send) {
      process.send({
        type: 'heartbeat',
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      });
    }
  }, HEARTBEAT_INTERVAL);
}

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + 'MB';
}
```

### Enhanced Heartbeat with Metrics

```javascript
if (cluster.isWorker) {
  class WorkerMetrics {
    constructor() {
      this.requestCount = 0;
      this.errorCount = 0;
      this.responseTimes = [];
      this.lastReset = Date.now();
    }

    recordRequest(duration) {
      this.requestCount++;
      this.responseTimes.push(duration);

      // Keep only last 100
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }
    }

    recordError() {
      this.errorCount++;
    }

    getMetrics() {
      const avgResponseTime = this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;

      const errorRate = this.requestCount > 0
        ? (this.errorCount / this.requestCount) * 100
        : 0;

      return {
        requests: this.requestCount,
        errors: this.errorCount,
        errorRate: errorRate.toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(2),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      };
    }

    reset() {
      this.requestCount = 0;
      this.errorCount = 0;
      this.responseTimes = [];
      this.lastReset = Date.now();
    }
  }

  const metrics = new WorkerMetrics();

  // Track requests
  server.on('request', (req, res) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      metrics.recordRequest(duration);

      if (res.statusCode >= 500) {
        metrics.recordError();
      }
    });
  });

  // Send metrics in heartbeat
  setInterval(() => {
    if (process.send) {
      process.send({
        type: 'heartbeat',
        timestamp: Date.now(),
        metrics: metrics.getMetrics()
      });
    }
  }, HEARTBEAT_INTERVAL);
}
```

## Multi-Dimensional Health Checks

### Comprehensive Health Monitoring

```javascript
if (cluster.isMaster) {
  class HealthMonitor {
    constructor() {
      this.workers = new Map();
      this.thresholds = {
        memory: 500 * 1024 * 1024, // 500MB
        errorRate: 10, // 10%
        responseTime: 5000, // 5s
        heartbeatTimeout: 15000 // 15s
      };
    }

    track(worker) {
      this.workers.set(worker.id, {
        worker,
        lastHeartbeat: Date.now(),
        metrics: {},
        healthChecks: {
          heartbeat: true,
          memory: true,
          errorRate: true,
          responseTime: true
        },
        isHealthy: true
      });

      this.setupListeners(worker);
    }

    setupListeners(worker) {
      worker.on('message', (msg) => {
        if (msg.type === 'heartbeat') {
          this.updateWorkerHealth(worker.id, msg);
        }
      });

      // Check health periodically
      setInterval(() => {
        this.checkWorkerHealth(worker.id);
      }, 5000);
    }

    updateWorkerHealth(workerId, msg) {
      const info = this.workers.get(workerId);
      if (!info) return;

      info.lastHeartbeat = Date.now();
      info.metrics = msg.metrics;

      // Update individual health checks
      this.checkMemory(info);
      this.checkErrorRate(info);
      this.checkResponseTime(info);
      this.checkHeartbeat(info);

      // Overall health
      info.isHealthy = Object.values(info.healthChecks).every(v => v);

      if (!info.isHealthy) {
        this.handleUnhealthyWorker(workerId, info);
      }
    }

    checkMemory(info) {
      const heapUsed = info.metrics.memory?.heapUsed || 0;
      info.healthChecks.memory = heapUsed < this.thresholds.memory;

      if (!info.healthChecks.memory) {
        console.warn(`⚠ Worker ${info.worker.id} high memory: ${formatMB(heapUsed)}`);
      }
    }

    checkErrorRate(info) {
      const errorRate = parseFloat(info.metrics.errorRate) || 0;
      info.healthChecks.errorRate = errorRate < this.thresholds.errorRate;

      if (!info.healthChecks.errorRate) {
        console.warn(`⚠ Worker ${info.worker.id} high error rate: ${errorRate}%`);
      }
    }

    checkResponseTime(info) {
      const avgTime = parseFloat(info.metrics.avgResponseTime) || 0;
      info.healthChecks.responseTime = avgTime < this.thresholds.responseTime;

      if (!info.healthChecks.responseTime) {
        console.warn(`⚠ Worker ${info.worker.id} slow responses: ${avgTime}ms`);
      }
    }

    checkHeartbeat(info) {
      const timeSinceHeartbeat = Date.now() - info.lastHeartbeat;
      info.healthChecks.heartbeat = timeSinceHeartbeat < this.thresholds.heartbeatTimeout;

      if (!info.healthChecks.heartbeat) {
        console.warn(`⚠ Worker ${info.worker.id} heartbeat timeout: ${timeSinceHeartbeat}ms`);
      }
    }

    handleUnhealthyWorker(workerId, info) {
      const failedChecks = Object.entries(info.healthChecks)
        .filter(([_, healthy]) => !healthy)
        .map(([check]) => check);

      console.error(`✗ Worker ${workerId} unhealthy: ${failedChecks.join(', ')}`);

      // Decide on remediation
      if (!info.healthChecks.heartbeat || !info.healthChecks.memory) {
        // Critical - restart immediately
        this.restartWorker(workerId);
      } else {
        // Non-critical - monitor and restart if persists
        setTimeout(() => {
          const current = this.workers.get(workerId);
          if (current && !current.isHealthy) {
            this.restartWorker(workerId);
          }
        }, 30000); // Wait 30s
      }
    }

    restartWorker(workerId) {
      const info = this.workers.get(workerId);
      if (!info) return;

      console.log(`Restarting unhealthy worker ${workerId}`);

      // Fork new worker first
      const newWorker = cluster.fork();
      this.track(newWorker);

      // Wait for new worker to be ready
      setTimeout(() => {
        info.worker.kill();
        this.workers.delete(workerId);
      }, 5000);
    }

    getHealthReport() {
      const report = {
        timestamp: new Date().toISOString(),
        workers: [],
        summary: {
          total: this.workers.size,
          healthy: 0,
          unhealthy: 0
        }
      };

      this.workers.forEach((info, id) => {
        const workerReport = {
          id,
          pid: info.worker.process.pid,
          healthy: info.isHealthy,
          checks: info.healthChecks,
          metrics: info.metrics,
          lastHeartbeat: new Date(info.lastHeartbeat).toISOString()
        };

        report.workers.push(workerReport);

        if (info.isHealthy) {
          report.summary.healthy++;
        } else {
          report.summary.unhealthy++;
        }
      });

      return report;
    }
  }

  const healthMonitor = new HealthMonitor();

  // Create and monitor workers
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork();
    healthMonitor.track(worker);
  }

  // Periodic health report
  setInterval(() => {
    const report = healthMonitor.getHealthReport();
    console.log('\n=== Health Report ===');
    console.log(`Healthy: ${report.summary.healthy}/${report.summary.total}`);
    console.log(JSON.stringify(report, null, 2));
  }, 30000);
}
```

## Advanced Monitoring Patterns

### Circuit Breaker for Worker Restarts

```javascript
class RestartCircuitBreaker {
  constructor(threshold = 5, windowMs = 60000) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.restarts = [];
  }

  canRestart(workerId) {
    // Clean old restarts
    const cutoff = Date.now() - this.windowMs;
    this.restarts = this.restarts.filter(r => r.timestamp > cutoff);

    // Check if under threshold
    const recentRestarts = this.restarts.filter(r => r.workerId === workerId);

    if (recentRestarts.length >= this.threshold) {
      console.error(`Circuit breaker: Worker ${workerId} restarted ${recentRestarts.length} times in ${this.windowMs}ms`);
      return false;
    }

    return true;
  }

  recordRestart(workerId) {
    this.restarts.push({
      workerId,
      timestamp: Date.now()
    });
  }
}

const circuitBreaker = new RestartCircuitBreaker(5, 60000);

function restartWorker(workerId) {
  if (!circuitBreaker.canRestart(workerId)) {
    console.error(`Refusing to restart worker ${workerId} - circuit breaker open`);
    // Alert operations team
    return;
  }

  // Perform restart
  circuitBreaker.recordRestart(workerId);
  // ... restart logic
}
```

### Exponential Backoff for Restarts

```javascript
class BackoffRestart {
  constructor() {
    this.restartCounts = new Map();
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 60000; // 1 minute
  }

  async restartWithBackoff(worker) {
    const count = (this.restartCounts.get(worker.id) || 0) + 1;
    this.restartCounts.set(worker.id, count);

    // Calculate delay: min(baseDelay * 2^(count-1), maxDelay)
    const delay = Math.min(
      this.baseDelay * Math.pow(2, count - 1),
      this.maxDelay
    );

    console.log(`Restarting worker ${worker.id} in ${delay}ms (attempt ${count})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    // Fork new worker
    const newWorker = cluster.fork();

    // Reset counter after successful restart
    newWorker.on('listening', () => {
      setTimeout(() => {
        this.restartCounts.delete(worker.id);
      }, 60000); // Reset after 1 minute of stability
    });

    // Kill old worker
    worker.kill();

    return newWorker;
  }
}
```

### Health Check Endpoints

```javascript
if (cluster.isWorker) {
  const express = require('express');
  const app = express();

  let isHealthy = true;
  let isReady = false;

  // Liveness probe - is process alive?
  app.get('/health/live', (req, res) => {
    // Simple check - if we can respond, we're alive
    res.status(200).json({
      status: 'alive',
      worker: cluster.worker.id,
      pid: process.pid,
      uptime: process.uptime()
    });
  });

  // Readiness probe - can we handle traffic?
  app.get('/health/ready', (req, res) => {
    if (isReady && isHealthy) {
      res.status(200).json({
        status: 'ready',
        worker: cluster.worker.id
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        ready: isReady,
        healthy: isHealthy
      });
    }
  });

  // Detailed health check
  app.get('/health/detailed', (req, res) => {
    const health = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      worker: cluster.worker.id,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: checkDatabase(),
        redis: checkRedis(),
        diskSpace: checkDiskSpace()
      }
    };

    const allHealthy = Object.values(health.checks).every(c => c.healthy);
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(health);
  });

  function checkDatabase() {
    // Check database connection
    return { healthy: true, latency: 5 };
  }

  function checkRedis() {
    // Check Redis connection
    return { healthy: true, latency: 2 };
  }

  function checkDiskSpace() {
    // Check disk space
    return { healthy: true, available: '10GB' };
  }

  // Mark as ready after initialization
  setTimeout(() => {
    isReady = true;
    console.log(`Worker ${cluster.worker.id} ready`);
  }, 2000);
}
```

## Metrics and Alerting

### Metrics Collection

```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [],
      workerRestarts: 0,
      healthCheckFailures: 0
    };
  }

  recordRequest(duration, statusCode) {
    this.metrics.requests++;

    if (statusCode >= 500) {
      this.metrics.errors++;
    }

    this.metrics.responseTimes.push(duration);

    // Keep only last 1000
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }

  recordWorkerRestart() {
    this.metrics.workerRestarts++;
  }

  recordHealthCheckFailure() {
    this.metrics.healthCheckFailures++;
  }

  getMetrics() {
    const times = this.metrics.responseTimes;

    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0
        ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2)
        : 0,
      avgResponseTime: times.length > 0
        ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)
        : 0,
      p95ResponseTime: this.calculatePercentile(times, 95),
      p99ResponseTime: this.calculatePercentile(times, 99),
      workerRestarts: this.metrics.workerRestarts,
      healthCheckFailures: this.metrics.healthCheckFailures
    };
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;

    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index].toFixed(2);
  }
}

const metrics = new MetricsCollector();

// Export metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics.getMetrics());
});
```

### Alert System

```javascript
class AlertSystem {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      errorRate: 5, // 5%
      workerRestarts: 3, // per hour
      responseTime: 1000 // 1s
    };
  }

  check(metrics) {
    // Check error rate
    if (parseFloat(metrics.errorRate) > this.thresholds.errorRate) {
      this.alert('HIGH_ERROR_RATE', `Error rate: ${metrics.errorRate}%`);
    }

    // Check response time
    if (parseFloat(metrics.avgResponseTime) > this.thresholds.responseTime) {
      this.alert('SLOW_RESPONSES', `Avg response: ${metrics.avgResponseTime}ms`);
    }

    // Check worker restarts
    if (metrics.workerRestarts > this.thresholds.workerRestarts) {
      this.alert('FREQUENT_RESTARTS', `Restarts: ${metrics.workerRestarts}`);
    }
  }

  alert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(type)
    };

    console.error(`🚨 ALERT [${alert.severity}]: ${type} - ${message}`);

    this.alerts.push(alert);

    // In production: send to alerting system
    // - PagerDuty, Slack, email, etc.
    this.sendToAlertingSystem(alert);
  }

  getSeverity(type) {
    const severities = {
      HIGH_ERROR_RATE: 'critical',
      SLOW_RESPONSES: 'warning',
      FREQUENT_RESTARTS: 'critical'
    };

    return severities[type] || 'info';
  }

  sendToAlertingSystem(alert) {
    // Implementation for alerting system
    // Example: POST to Slack webhook, PagerDuty API, etc.
  }
}
```

## Best Practices

### 1. Multiple Health Dimensions

Monitor multiple aspects:
- Heartbeat (liveness)
- Memory usage
- Error rates
- Response times
- CPU usage
- Connection counts

### 2. Graduated Responses

```javascript
// Different actions for different severity
if (errorRate > 50) {
  // Critical - immediate restart
  restartWorker();
} else if (errorRate > 20) {
  // Warning - alert and monitor
  alert('High error rate');
  monitorClosely();
} else if (errorRate > 10) {
  // Info - log for investigation
  log('Elevated error rate');
}
```

### 3. Avoid Restart Loops

```javascript
// ✅ Good - circuit breaker
if (!circuitBreaker.canRestart(workerId)) {
  alert('Worker restart loop detected');
  return;
}

// ❌ Bad - infinite restarts
cluster.on('exit', () => {
  cluster.fork(); // Could loop forever!
});
```

### 4. External Health Checks

```javascript
// Load balancer health check
app.get('/health', (req, res) => {
  const healthy = checkAllDependencies();
  res.status(healthy ? 200 : 503).json({ healthy });
});
```

## Summary

Effective health monitoring includes:

1. **Heartbeat** monitoring for liveness
2. **Multi-dimensional** health checks
3. **Automatic remediation** with safeguards
4. **Metrics collection** and analysis
5. **Alerting** for critical issues
6. **Circuit breakers** to prevent loops
7. **Health endpoints** for integration

These patterns ensure reliable, self-healing clustered applications.
