# Guide 6: Deployment Strategies for Clustered Applications

## Introduction

Deploying updates to production clusters without downtime requires careful planning and execution. This guide covers modern deployment strategies for Node.js cluster applications.

## Deployment Strategies Overview

### 1. Rolling Deployment
Update workers one at a time, maintaining service availability.

### 2. Blue-Green Deployment  
Run two identical environments, switch traffic instantly.

### 3. Canary Deployment
Gradually shift traffic to new version, monitor for issues.

### 4. A/B Testing
Run multiple versions simultaneously for testing.

## Rolling Deployment

### Implementation

```javascript
class RollingDeployment {
  constructor(cluster) {
    this.cluster = cluster;
    this.workers = [];
  }

  async deploy(newVersion) {
    console.log(`Starting rolling deployment to ${newVersion}`);

    for (const worker of this.workers) {
      console.log(`Updating worker ${worker.id}`);

      // Fork new worker with new code
      const newWorker = this.cluster.fork({ VERSION: newVersion });

      // Wait for new worker to be ready
      await this.waitForReady(newWorker);

      // Gracefully shutdown old worker
      await this.gracefulShutdown(worker);

      console.log(`Worker ${worker.id} updated successfully`);

      // Wait between updates to monitor stability
      await sleep(5000);
    }

    console.log('Rolling deployment complete');
  }

  async waitForReady(worker, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Worker ready timeout'));
      }, timeout);

      worker.once('message', (msg) => {
        if (msg.type === 'ready') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  }

  async gracefulShutdown(worker, timeout = 30000) {
    return new Promise((resolve) => {
      worker.send({ type: 'shutdown' });

      const timer = setTimeout(() => {
        worker.kill('SIGKILL');
        resolve();
      }, timeout);

      worker.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
```

## Blue-Green Deployment

### Architecture

```
Load Balancer
    |
    |-- Blue Environment (current)
    |-- Green Environment (new)
```

### Implementation

```javascript
class BlueGreenDeployment {
  constructor() {
    this.environments = {
      blue: { port: 8000, active: true, version: 'v1.0' },
      green: { port: 8001, active: false, version: null }
    };
  }

  async deploy(newVersion) {
    const inactive = this.getInactiveEnvironment();
    const active = this.getActiveEnvironment();

    console.log(`Deploying ${newVersion} to ${inactive} environment`);

    // Deploy to inactive environment
    await this.startEnvironment(inactive, newVersion);

    // Run health checks
    const healthy = await this.healthCheck(inactive);

    if (!healthy) {
      console.error('Health check failed, aborting deployment');
      await this.stopEnvironment(inactive);
      return false;
    }

    // Switch load balancer
    console.log('Switching traffic to new environment');
    await this.switchTraffic(inactive);

    // Mark new environment as active
    this.environments[inactive].active = true;
    this.environments[active].active = false;

    // Stop old environment
    await this.stopEnvironment(active);

    console.log('Blue-green deployment complete');
    return true;
  }

  getActiveEnvironment() {
    return Object.keys(this.environments).find(
      env => this.environments[env].active
    );
  }

  getInactiveEnvironment() {
    return Object.keys(this.environments).find(
      env => !this.environments[env].active
    );
  }

  async switchTraffic(targetEnv) {
    // Update load balancer configuration
    // This is environment-specific (nginx, HAProxy, cloud LB, etc.)
  }
}
```

## Canary Deployment

### Gradual Traffic Shift

```javascript
class CanaryDeployment {
  constructor() {
    this.canaryPercentage = 0;
    this.stableWorkers = [];
    this.canaryWorkers = [];
  }

  async deploy(newVersion, options = {}) {
    const steps = options.steps || [10, 25, 50, 75, 100];
    const stepDuration = options.stepDuration || 300000; // 5 minutes

    console.log(`Starting canary deployment of ${newVersion}`);

    for (const percentage of steps) {
      console.log(`Increasing canary to ${percentage}%`);

      await this.adjustCanaryPercentage(percentage);

      // Monitor metrics
      const metrics = await this.monitorCanary(stepDuration);

      // Check if canary is healthy
      if (!this.isCanaryHealthy(metrics)) {
        console.error('Canary metrics degraded, rolling back');
        await this.rollback();
        return false;
      }

      console.log(`Canary at ${percentage}% is healthy`);
    }

    console.log('Canary deployment successful');
    return true;
  }

  async adjustCanaryPercentage(targetPercentage) {
    const totalWorkers = this.stableWorkers.length + this.canaryWorkers.length;
    const targetCanaryCount = Math.ceil(totalWorkers * (targetPercentage / 100));

    while (this.canaryWorkers.length < targetCanaryCount) {
      // Convert stable worker to canary
      const stableWorker = this.stableWorkers.pop();
      await this.gracefulShutdown(stableWorker);

      const canaryWorker = cluster.fork({ VERSION: 'canary' });
      await this.waitForReady(canaryWorker);

      this.canaryWorkers.push(canaryWorker);
    }

    this.canaryPercentage = targetPercentage;
  }

  isCanaryHealthy(metrics) {
    const { stable, canary } = metrics;

    // Error rate comparison
    if (canary.errorRate > stable.errorRate * 1.5) {
      return false;
    }

    // Response time comparison
    if (canary.p95 > stable.p95 * 1.3) {
      return false;
    }

    return true;
  }

  async rollback() {
    console.log('Rolling back canary deployment');

    // Kill all canary workers
    for (const worker of this.canaryWorkers) {
      await this.gracefulShutdown(worker);
    }

    // Start stable workers to replace them
    while (this.canaryWorkers.length > 0) {
      this.canaryWorkers.pop();
      const stableWorker = cluster.fork({ VERSION: 'stable' });
      await this.waitForReady(stableWorker);
      this.stableWorkers.push(stableWorker);
    }

    this.canaryPercentage = 0;
  }
}
```

## Feature Flags

### Toggle Features Without Deployment

```javascript
class FeatureFlags {
  constructor() {
    this.flags = new Map();
  }

  define(name, options = {}) {
    this.flags.set(name, {
      enabled: options.enabled || false,
      percentage: options.percentage || 0,
      users: options.users || [],
      condition: options.condition || (() => true)
    });
  }

  isEnabled(name, context = {}) {
    const flag = this.flags.get(name);
    if (!flag) return false;

    // Disabled globally
    if (!flag.enabled) return false;

    // Specific users
    if (flag.users.length > 0) {
      return flag.users.includes(context.userId);
    }

    // Percentage rollout
    if (flag.percentage > 0) {
      const hash = this.hash(context.userId || context.sessionId);
      return (hash % 100) < flag.percentage;
    }

    // Custom condition
    return flag.condition(context);
  }

  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

// Usage
const features = new FeatureFlags();

features.define('new-ui', {
  enabled: true,
  percentage: 25  // 25% of users
});

app.get('/dashboard', (req, res) => {
  if (features.isEnabled('new-ui', { userId: req.user.id })) {
    res.render('dashboard-v2');
  } else {
    res.render('dashboard-v1');
  }
});
```

## Zero-Downtime Deployment Checklist

- [ ] Health checks implemented
- [ ] Graceful shutdown in place
- [ ] Database migrations backward compatible
- [ ] API changes backward compatible
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented
- [ ] Load testing completed
- [ ] Deployment automation tested

## Kubernetes Deployment

### Rolling Update Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-cluster
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: app
        image: myapp:v2.0
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Best Practices

1. **Always Test**: Test deployment process in staging
2. **Monitor Closely**: Watch metrics during deployment
3. **Automate**: Use CI/CD pipelines
4. **Document**: Maintain deployment runbooks
5. **Have Rollback Plan**: Always be able to rollback quickly
6. **Database Migrations**: Make them backward compatible
7. **Feature Flags**: Decouple deployment from release

## Deployment Comparison

| Strategy | Downtime | Rollback Speed | Resource Usage | Complexity |
|----------|----------|----------------|----------------|------------|
| Rolling | None | Medium | Low | Low |
| Blue-Green | None | Instant | High (2x) | Medium |
| Canary | None | Fast | Medium | High |
| A/B Testing | None | N/A | Medium-High | High |

## Conclusion

Choose deployment strategy based on your risk tolerance, resource availability, and application characteristics. Canary deployments offer the best risk mitigation for critical applications.
