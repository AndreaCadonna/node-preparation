# Production Deployment of Worker Threads

## Production Readiness Checklist

Deploying worker threads to production requires careful consideration of reliability, monitoring, and resource management.

## Essential Production Patterns

### 1. Graceful Shutdown

Handle shutdown signals properly:

```javascript
class ProductionWorkerPool {
  constructor(workerScript, poolSize) {
    this.workerScript = workerScript;
    this.workers = [];
    this.shuttingDown = false;

    this.createPool(poolSize);
    this.setupShutdownHandlers();
  }

  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await this.gracefulShutdown();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async gracefulShutdown() {
    this.shuttingDown = true;

    console.log('Waiting for active tasks to complete...');

    // Stop accepting new tasks
    // Wait for current tasks (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (this.hasActiveTasks() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force terminate if timeout exceeded
    if (this.hasActiveTasks()) {
      console.warn('Force terminating workers after timeout');
    }

    await this.terminateAll();
    console.log('All workers terminated');
  }

  async execute(data) {
    if (this.shuttingDown) {
      throw new Error('Pool is shutting down');
    }

    return this.executeTask(data);
  }

  hasActiveTasks() {
    return this.workers.some(w => w.busy);
  }

  async terminateAll() {
    await Promise.all(this.workers.map(w => w.worker.terminate()));
  }
}
```

### 2. Health Checks

Implement health monitoring:

```javascript
class HealthMonitor {
  constructor(pool) {
    this.pool = pool;
    this.checks = [];
    this.status = 'healthy';
  }

  addCheck(name, checkFn) {
    this.checks.push({ name, checkFn });
  }

  async runHealthCheck() {
    const results = [];

    for (const check of this.checks) {
      try {
        const start = Date.now();
        const result = await Promise.race([
          check.checkFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);

        results.push({
          name: check.name,
          status: 'pass',
          duration: Date.now() - start,
          ...result
        });
      } catch (err) {
        results.push({
          name: check.name,
          status: 'fail',
          error: err.message
        });
      }
    }

    const allPassed = results.every(r => r.status === 'pass');
    this.status = allPassed ? 'healthy' : 'unhealthy';

    return {
      status: this.status,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }
}

// Usage
const monitor = new HealthMonitor(pool);

// Check workers are responsive
monitor.addCheck('workers-responsive', async () => {
  const stats = pool.getStats();
  return {
    workers: stats.workers,
    busy: stats.busyWorkers
  };
});

// Check queue depth
monitor.addCheck('queue-depth', async () => {
  const stats = pool.getStats();
  const queueLength = stats.queueLength;

  if (queueLength > 100) {
    throw new Error(`Queue too long: ${queueLength}`);
  }

  return { queueLength };
});

// Check worker can execute task
monitor.addCheck('worker-execution', async () => {
  const start = Date.now();
  await pool.execute({ test: true });
  return { duration: Date.now() - start };
});

// HTTP endpoint for health checks
app.get('/health', async (req, res) => {
  const health = await monitor.runHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### 3. Metrics and Monitoring

Track key metrics:

```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      tasksCompleted: 0,
      tasksErrored: 0,
      totalProcessingTime: 0,
      tasksByType: new Map(),
      errorsByType: new Map()
    };

    this.startCollection();
  }

  recordTaskStart(taskId, type) {
    const timestamp = Date.now();
    this.tasks.set(taskId, { type, start: timestamp });
  }

  recordTaskComplete(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const duration = Date.now() - task.start;

    this.metrics.tasksCompleted++;
    this.metrics.totalProcessingTime += duration;

    // Track by type
    const typeStats = this.metrics.tasksByType.get(task.type) || {
      count: 0,
      totalTime: 0
    };

    typeStats.count++;
    typeStats.totalTime += duration;
    this.metrics.tasksByType.set(task.type, typeStats);

    this.tasks.delete(taskId);
  }

  recordTaskError(taskId, error) {
    this.metrics.tasksErrored++;

    const errorType = error.constructor.name;
    const count = this.metrics.errorsByType.get(errorType) || 0;
    this.metrics.errorsByType.set(errorType, count + 1);

    this.tasks.delete(taskId);
  }

  getMetrics() {
    const avgProcessingTime = this.metrics.tasksCompleted > 0
      ? this.metrics.totalProcessingTime / this.metrics.tasksCompleted
      : 0;

    return {
      tasksCompleted: this.metrics.tasksCompleted,
      tasksErrored: this.metrics.tasksErrored,
      avgProcessingTime: avgProcessingTime.toFixed(2),
      tasksByType: Array.from(this.metrics.tasksByType.entries()).map(([type, stats]) => ({
        type,
        count: stats.count,
        avgTime: (stats.totalTime / stats.count).toFixed(2)
      })),
      errorsByType: Object.fromEntries(this.metrics.errorsByType)
    };
  }

  startCollection() {
    // Send metrics to monitoring system every 10 seconds
    this.interval = setInterval(() => {
      const metrics = this.getMetrics();
      this.sendToMonitoring(metrics);
    }, 10000);
  }

  sendToMonitoring(metrics) {
    // Send to Prometheus, StatsD, CloudWatch, etc.
    console.log('Metrics:', JSON.stringify(metrics, null, 2));
  }
}
```

### 4. Error Recovery

Implement robust error handling:

```javascript
class ResilientWorkerPool {
  constructor(workerScript, poolSize, maxRestarts = 3) {
    this.workerScript = workerScript;
    this.maxRestarts = maxRestarts;
    this.workerRestarts = new Map();

    this.createPool(poolSize);
  }

  createWorker(id) {
    const worker = new Worker(this.workerScript);

    const workerInfo = {
      id,
      worker,
      busy: false,
      currentTask: null,
      tasksCompleted: 0,
      errors: 0,
      restarts: 0
    };

    worker.on('error', (err) => {
      this.handleWorkerError(workerInfo, err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.handleWorkerCrash(workerInfo, code);
      }
    });

    return workerInfo;
  }

  handleWorkerError(workerInfo, error) {
    console.error(`Worker ${workerInfo.id} error:`, error.message);

    workerInfo.errors++;

    // Reject current task
    if (workerInfo.currentTask) {
      workerInfo.currentTask.reject(error);
      workerInfo.currentTask = null;
      workerInfo.busy = false;
    }

    // Check if worker should be restarted
    if (workerInfo.errors > 5) {
      console.warn(`Worker ${workerInfo.id} has too many errors, restarting`);
      this.restartWorker(workerInfo);
    }
  }

  async handleWorkerCrash(workerInfo, exitCode) {
    console.error(`Worker ${workerInfo.id} crashed with code ${exitCode}`);

    // Reject current task
    if (workerInfo.currentTask) {
      workerInfo.currentTask.reject(new Error('Worker crashed'));
    }

    // Restart if under limit
    if (workerInfo.restarts < this.maxRestarts) {
      await this.restartWorker(workerInfo);
    } else {
      console.error(`Worker ${workerInfo.id} exceeded restart limit`);
      // Alert monitoring system
      this.alertCritical(`Worker ${workerInfo.id} failed permanently`);
    }
  }

  async restartWorker(workerInfo) {
    console.log(`Restarting worker ${workerInfo.id}...`);

    // Terminate old worker
    try {
      await workerInfo.worker.terminate();
    } catch (err) {
      console.error('Error terminating worker:', err);
    }

    // Create new worker
    const newWorkerInfo = this.createWorker(workerInfo.id);
    newWorkerInfo.restarts = workerInfo.restarts + 1;

    // Replace in pool
    const index = this.workers.findIndex(w => w.id === workerInfo.id);
    if (index !== -1) {
      this.workers[index] = newWorkerInfo;
    }

    console.log(`Worker ${workerInfo.id} restarted (restart count: ${newWorkerInfo.restarts})`);
  }

  alertCritical(message) {
    // Send to PagerDuty, Slack, etc.
    console.error('CRITICAL ALERT:', message);
  }
}
```

### 5. Resource Limits

Enforce resource constraints:

```javascript
class ResourceLimitedPool {
  constructor(workerScript, config = {}) {
    this.config = {
      maxMemoryPerWorker: config.maxMemoryPerWorker || 512 * 1024 * 1024, // 512MB
      maxCPUPercent: config.maxCPUPercent || 80,
      maxQueueSize: config.maxQueueSize || 10000,
      taskTimeout: config.taskTimeout || 30000
    };

    this.createPool(config.poolSize);
    this.startResourceMonitoring();
  }

  startResourceMonitoring() {
    setInterval(() => {
      this.checkResourceLimits();
    }, 5000);
  }

  checkResourceLimits() {
    this.workers.forEach(workerInfo => {
      // Request memory usage from worker
      workerInfo.worker.postMessage({ type: 'MEMORY_CHECK' });
    });

    // Check queue size
    if (this.taskQueue.length > this.config.maxQueueSize) {
      console.error('Queue size exceeded limit');
      this.rejectOldestTasks();
    }
  }

  rejectOldestTasks() {
    const toReject = this.taskQueue.length - this.config.maxQueueSize;

    for (let i = 0; i < toReject; i++) {
      const task = this.taskQueue.shift();
      task.reject(new Error('Queue full, task rejected'));
    }
  }

  async execute(data, timeout = this.config.taskTimeout) {
    return Promise.race([
      this.executeTask(data),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      )
    ]);
  }
}

// In worker
parentPort.on('message', (msg) => {
  if (msg.type === 'MEMORY_CHECK') {
    const usage = process.memoryUsage();
    parentPort.postMessage({
      type: 'MEMORY_REPORT',
      usage
    });
  }
});
```

## Configuration Management

### Environment-Based Configuration

```javascript
class WorkerPoolFactory {
  static create(environment = process.env.NODE_ENV) {
    const configs = {
      development: {
        poolSize: 2,
        maxMemory: 256 * 1024 * 1024,
        logLevel: 'debug',
        healthCheckInterval: 10000
      },

      staging: {
        poolSize: 4,
        maxMemory: 512 * 1024 * 1024,
        logLevel: 'info',
        healthCheckInterval: 5000
      },

      production: {
        poolSize: os.cpus().length,
        maxMemory: 1024 * 1024 * 1024,
        logLevel: 'warn',
        healthCheckInterval: 5000,
        enableMetrics: true,
        enableHealthChecks: true
      }
    };

    const config = configs[environment] || configs.development;

    return new ProductionWorkerPool('./worker.js', config);
  }
}

// Usage
const pool = WorkerPoolFactory.create(process.env.NODE_ENV);
```

## Deployment Strategies

### Zero-Downtime Updates

```javascript
class UpdateableWorkerPool {
  async updateWorkers(newWorkerScript) {
    console.log('Starting rolling update...');

    for (let i = 0; i < this.workers.length; i++) {
      const workerInfo = this.workers[i];

      // Wait for current task to complete
      while (workerInfo.busy) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Terminate old worker
      await workerInfo.worker.terminate();

      // Create new worker with updated code
      const newWorker = new Worker(newWorkerScript);
      this.workers[i] = {
        ...workerInfo,
        worker: newWorker
      };

      console.log(`Updated worker ${i + 1}/${this.workers.length}`);
    }

    console.log('Rolling update complete');
  }
}
```

### Canary Deployment

```javascript
class CanaryDeployment {
  async deployCanary(newWorkerScript, canaryPercent = 10) {
    const canaryCount = Math.ceil(this.workers.length * (canaryPercent / 100));

    console.log(`Deploying canary to ${canaryCount} workers`);

    // Update subset of workers
    for (let i = 0; i < canaryCount; i++) {
      await this.updateWorker(i, newWorkerScript);
    }

    // Monitor canary workers
    const metrics = await this.monitorCanary(canaryCount);

    if (metrics.errorRate < 0.01) {
      console.log('Canary successful, rolling out to all workers');
      await this.updateRemainingWorkers(canaryCount, newWorkerScript);
    } else {
      console.error('Canary failed, rolling back');
      await this.rollbackCanary(canaryCount);
    }
  }
}
```

## Monitoring Integration

### Prometheus Metrics

```javascript
const promClient = require('prom-client');

class PrometheusMetrics {
  constructor(pool) {
    this.pool = pool;

    // Define metrics
    this.tasksTotal = new promClient.Counter({
      name: 'worker_tasks_total',
      help: 'Total number of tasks processed',
      labelNames: ['status']
    });

    this.taskDuration = new promClient.Histogram({
      name: 'worker_task_duration_seconds',
      help: 'Task processing duration',
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.queueSize = new promClient.Gauge({
      name: 'worker_queue_size',
      help: 'Current queue size'
    });

    this.poolSize = new promClient.Gauge({
      name: 'worker_pool_size',
      help: 'Number of workers in pool'
    });

    this.startCollection();
  }

  startCollection() {
    setInterval(() => {
      const stats = this.pool.getStats();
      this.queueSize.set(stats.queueLength);
      this.poolSize.set(stats.workers);
    }, 5000);
  }

  recordTask(status, duration) {
    this.tasksTotal.inc({ status });
    this.taskDuration.observe(duration / 1000);
  }
}
```

## Best Practices

### 1. Always Implement Health Checks

```javascript
// Essential for load balancers and orchestrators
app.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.status(health.healthy ? 200 : 503).json(health);
});
```

### 2. Use Structured Logging

```javascript
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

logger.info('Worker task completed', {
  taskId: task.id,
  duration: task.duration,
  workerId: worker.id
});
```

### 3. Implement Circuit Breakers

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      setTimeout(() => {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      }, this.timeout);
    }
  }
}
```

## Key Takeaways

1. **Graceful shutdown is essential** - Handle SIGTERM/SIGINT properly
2. **Health checks are critical** - For load balancers and monitoring
3. **Collect metrics** - Visibility into performance and errors
4. **Implement error recovery** - Auto-restart failed workers
5. **Enforce resource limits** - Prevent runaway resource usage
6. **Environment-based config** - Different settings per environment
7. **Zero-downtime updates** - Rolling or canary deployments

## Next Steps

With production deployment mastered, you've completed all advanced worker thread concepts!
