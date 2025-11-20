/**
 * Example 5: Canary Deployment Strategy
 *
 * This example demonstrates canary deployments in a clustered Node.js
 * application. Canary deployments gradually roll out new versions to a
 * small subset of users/traffic before full deployment.
 *
 * Key Concepts:
 * - Gradual traffic shifting
 * - Version management
 * - Health monitoring during rollout
 * - Automatic rollback on errors
 * - A/B testing capabilities
 *
 * Deployment Phases:
 * 1. Deploy canary version to small percentage of workers
 * 2. Monitor canary metrics vs baseline
 * 3. Gradually increase canary traffic
 * 4. Complete rollout or rollback based on metrics
 *
 * Traffic Distribution:
 * - Start: 90% stable, 10% canary
 * - Mid: 50% stable, 50% canary
 * - End: 0% stable, 100% canary (or rollback)
 *
 * Run this: node 05-canary-deployment.js
 * Control: curl http://localhost:8000/canary/status
 *          curl -X POST http://localhost:8000/canary/increase
 *          curl -X POST http://localhost:8000/canary/rollback
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const numCPUs = Math.min(6, os.cpus().length); // Use 6 workers for demo

// Application versions
const STABLE_VERSION = 'v1.0.0';
const CANARY_VERSION = 'v2.0.0';

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting canary deployment cluster`);
  console.log(`[Master] Total workers: ${numCPUs}`);
  console.log(`[Master] Stable version: ${STABLE_VERSION}`);
  console.log(`[Master] Canary version: ${CANARY_VERSION}\n`);

  // Deployment state
  const deploymentState = {
    canaryPercentage: 10, // Start with 10% canary traffic
    isRollingOut: false,
    isRollingBack: false,
    autoRollbackEnabled: true,
    startTime: Date.now()
  };

  // Worker tracking
  const workers = {
    stable: [],
    canary: []
  };

  // Metrics tracking
  const metrics = {
    stable: {
      version: STABLE_VERSION,
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      errorRate: 0,
      requestsPerSecond: 0,
      recentRequests: []
    },
    canary: {
      version: CANARY_VERSION,
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      errorRate: 0,
      requestsPerSecond: 0,
      recentRequests: []
    }
  };

  /**
   * Fork worker with specific version
   */
  function forkWorker(version) {
    const worker = cluster.fork({ APP_VERSION: version });

    if (version === CANARY_VERSION) {
      workers.canary.push(worker);
    } else {
      workers.stable.push(worker);
    }

    // Handle worker messages
    worker.on('message', (msg) => {
      handleWorkerMessage(version, msg);
    });

    console.log(`[Master] Worker ${worker.id} started (${version}, PID ${worker.process.pid})`);
    return worker;
  }

  /**
   * Initialize workers based on canary percentage
   */
  function initializeWorkers() {
    const canaryCount = Math.ceil(numCPUs * (deploymentState.canaryPercentage / 100));
    const stableCount = numCPUs - canaryCount;

    console.log(`[Master] Initializing: ${stableCount} stable, ${canaryCount} canary\n`);

    for (let i = 0; i < stableCount; i++) {
      forkWorker(STABLE_VERSION);
    }

    for (let i = 0; i < canaryCount; i++) {
      forkWorker(CANARY_VERSION);
    }
  }

  initializeWorkers();

  /**
   * Handle metrics from workers
   */
  function handleWorkerMessage(version, msg) {
    const versionMetrics = version === CANARY_VERSION ? metrics.canary : metrics.stable;

    switch (msg.type) {
      case 'request-complete':
        versionMetrics.requests++;
        versionMetrics.totalResponseTime += msg.duration;
        versionMetrics.avgResponseTime = versionMetrics.totalResponseTime / versionMetrics.requests;
        versionMetrics.recentRequests.push({ timestamp: Date.now(), success: true });
        break;

      case 'request-error':
        versionMetrics.errors++;
        versionMetrics.recentRequests.push({ timestamp: Date.now(), success: false });
        break;
    }

    // Update error rate
    if (versionMetrics.requests > 0) {
      versionMetrics.errorRate = (versionMetrics.errors / versionMetrics.requests) * 100;
    }

    // Calculate requests per second
    const now = Date.now();
    versionMetrics.recentRequests = versionMetrics.recentRequests.filter(
      r => now - r.timestamp < 60000
    );
    versionMetrics.requestsPerSecond = versionMetrics.recentRequests.length / 60;

    // Auto-rollback check
    if (deploymentState.autoRollbackEnabled && version === CANARY_VERSION) {
      checkAutoRollback();
    }
  }

  /**
   * Check if canary should be automatically rolled back
   */
  function checkAutoRollback() {
    // Only check if we have enough data
    if (metrics.canary.requests < 20) return;

    const canaryErrorRate = metrics.canary.errorRate;
    const stableErrorRate = metrics.stable.errorRate;
    const canaryAvgRT = metrics.canary.avgResponseTime;
    const stableAvgRT = metrics.stable.avgResponseTime;

    // Rollback conditions
    const errorRateTooHigh = canaryErrorRate > stableErrorRate * 2 && canaryErrorRate > 5;
    const responseTimeTooSlow = canaryAvgRT > stableAvgRT * 1.5 && canaryAvgRT > 500;

    if (errorRateTooHigh || responseTimeTooSlow) {
      console.log('\n⚠️  AUTO-ROLLBACK TRIGGERED!');
      console.log(`   Canary Error Rate: ${canaryErrorRate.toFixed(2)}% vs Stable: ${stableErrorRate.toFixed(2)}%`);
      console.log(`   Canary Avg RT: ${canaryAvgRT.toFixed(2)}ms vs Stable: ${stableAvgRT.toFixed(2)}ms\n`);
      rollbackCanary();
    }
  }

  /**
   * Increase canary traffic percentage
   */
  function increaseCanary(targetPercentage = null) {
    if (deploymentState.isRollingBack) {
      console.log('[Master] Cannot increase during rollback');
      return;
    }

    const newPercentage = targetPercentage || Math.min(100, deploymentState.canaryPercentage + 20);

    if (newPercentage === deploymentState.canaryPercentage) {
      console.log('[Master] Already at target percentage');
      return;
    }

    console.log(`\n[Master] Increasing canary: ${deploymentState.canaryPercentage}% -> ${newPercentage}%`);

    const targetCanaryCount = Math.ceil(numCPUs * (newPercentage / 100));
    const currentCanaryCount = workers.canary.length;

    if (targetCanaryCount > currentCanaryCount) {
      // Need to convert stable workers to canary
      const toConvert = targetCanaryCount - currentCanaryCount;

      for (let i = 0; i < toConvert && workers.stable.length > 0; i++) {
        const stableWorker = workers.stable.shift();
        console.log(`[Master] Converting Worker ${stableWorker.id} from stable to canary`);

        // Gracefully shutdown stable worker
        stableWorker.send({ type: 'shutdown' });
        stableWorker.once('exit', () => {
          // Fork new canary worker
          forkWorker(CANARY_VERSION);
        });
      }
    }

    deploymentState.canaryPercentage = newPercentage;

    if (newPercentage === 100) {
      console.log('\n✅ Canary deployment complete! All workers running ' + CANARY_VERSION + '\n');
    }
  }

  /**
   * Rollback canary deployment
   */
  function rollbackCanary() {
    console.log('\n[Master] 🔄 Rolling back canary deployment...\n');

    deploymentState.isRollingBack = true;
    deploymentState.isRollingOut = false;

    // Kill all canary workers
    const canaryWorkers = [...workers.canary];
    workers.canary = [];

    canaryWorkers.forEach(worker => {
      console.log(`[Master] Removing canary Worker ${worker.id}`);
      worker.send({ type: 'shutdown' });
      worker.once('exit', () => {
        // Replace with stable version
        forkWorker(STABLE_VERSION);
      });
    });

    deploymentState.canaryPercentage = 0;
    deploymentState.isRollingBack = false;

    console.log('\n✅ Rollback complete! All workers running ' + STABLE_VERSION + '\n');
  }

  /**
   * Gradual rollout automation
   */
  function startGradualRollout() {
    if (deploymentState.isRollingOut) {
      console.log('[Master] Rollout already in progress');
      return;
    }

    console.log('\n[Master] 🚀 Starting gradual canary rollout...\n');
    deploymentState.isRollingOut = true;

    const rolloutSteps = [10, 25, 50, 75, 100];
    let currentStep = rolloutSteps.findIndex(p => p > deploymentState.canaryPercentage);

    if (currentStep === -1) {
      console.log('[Master] Already at 100% canary');
      return;
    }

    const rolloutInterval = setInterval(() => {
      if (currentStep >= rolloutSteps.length || !deploymentState.isRollingOut) {
        clearInterval(rolloutInterval);
        deploymentState.isRollingOut = false;
        return;
      }

      // Check canary health before proceeding
      if (metrics.canary.requests > 10) {
        const canaryHealth = 100 - metrics.canary.errorRate;
        const stableHealth = 100 - metrics.stable.errorRate;

        if (canaryHealth < stableHealth - 10) {
          console.log('[Master] Canary health degraded, pausing rollout');
          clearInterval(rolloutInterval);
          deploymentState.isRollingOut = false;
          return;
        }
      }

      increaseCanary(rolloutSteps[currentStep]);
      currentStep++;
    }, 15000); // Increase every 15 seconds
  }

  /**
   * Handle worker crashes
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} died`);

    // Determine which version died
    const wasCanary = workers.canary.includes(worker);
    const wasStable = workers.stable.includes(worker);

    if (wasCanary) {
      workers.canary = workers.canary.filter(w => w.id !== worker.id);
      forkWorker(CANARY_VERSION);
    } else if (wasStable) {
      workers.stable = workers.stable.filter(w => w.id !== worker.id);
      forkWorker(STABLE_VERSION);
    }
  });

  /**
   * Master HTTP Server
   */
  const server = http.createServer((req, res) => {
    if (req.url === '/canary/status') {
      serveCanaryStatus(req, res);
    } else if (req.url === '/canary/increase' && req.method === 'POST') {
      increaseCanary();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Canary increased', percentage: deploymentState.canaryPercentage }));
    } else if (req.url === '/canary/rollback' && req.method === 'POST') {
      rollbackCanary();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Canary rolled back' }));
    } else if (req.url === '/canary/rollout' && req.method === 'POST') {
      startGradualRollout();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Gradual rollout started' }));
    } else {
      proxyToWorker(req, res);
    }
  });

  /**
   * Serve canary status
   */
  function serveCanaryStatus(req, res) {
    const status = {
      deployment: {
        canaryPercentage: deploymentState.canaryPercentage,
        stableWorkers: workers.stable.length,
        canaryWorkers: workers.canary.length,
        isRollingOut: deploymentState.isRollingOut,
        isRollingBack: deploymentState.isRollingBack,
        autoRollbackEnabled: deploymentState.autoRollbackEnabled
      },
      versions: {
        stable: STABLE_VERSION,
        canary: CANARY_VERSION
      },
      metrics: {
        stable: {
          ...metrics.stable,
          recentRequests: undefined
        },
        canary: {
          ...metrics.canary,
          recentRequests: undefined
        }
      },
      comparison: {
        errorRateDiff: (metrics.canary.errorRate - metrics.stable.errorRate).toFixed(2) + '%',
        responseTimeDiff: (metrics.canary.avgResponseTime - metrics.stable.avgResponseTime).toFixed(2) + 'ms',
        canaryHealthy: metrics.canary.errorRate <= metrics.stable.errorRate * 1.5
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  /**
   * Route request to worker based on canary percentage
   */
  function proxyToWorker(req, res) {
    // Determine if this request should go to canary
    const shouldUseCanary = Math.random() * 100 < deploymentState.canaryPercentage;

    let worker;
    let version;

    if (shouldUseCanary && workers.canary.length > 0) {
      worker = workers.canary[Math.floor(Math.random() * workers.canary.length)];
      version = CANARY_VERSION;
    } else if (workers.stable.length > 0) {
      worker = workers.stable[Math.floor(Math.random() * workers.stable.length)];
      version = STABLE_VERSION;
    } else {
      // No workers available
      res.writeHead(503);
      res.end('No workers available');
      return;
    }

    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    worker.send({
      type: 'http-request',
      requestId,
      method: req.method,
      url: req.url
    });

    const responseHandler = (msg) => {
      if (msg.type === 'http-response' && msg.requestId === requestId) {
        worker.removeListener('message', responseHandler);
        res.writeHead(msg.statusCode, msg.headers);
        res.end(msg.body);
      }
    };

    worker.on('message', responseHandler);
  }

  server.listen(PORT, () => {
    console.log(`\n[Master] Canary deployment server listening on port ${PORT}`);
    console.log(`[Master] Status: http://localhost:${PORT}/canary/status`);
    console.log(`[Master] Increase: curl -X POST http://localhost:${PORT}/canary/increase`);
    console.log(`[Master] Rollback: curl -X POST http://localhost:${PORT}/canary/rollback`);
    console.log(`[Master] Auto-rollout: curl -X POST http://localhost:${PORT}/canary/rollout\n`);
  });

  // Periodic status display
  setInterval(() => {
    console.log(`\n=== Canary Status: ${deploymentState.canaryPercentage}% ===`);
    console.log(`Stable (${STABLE_VERSION}): ${workers.stable.length} workers, ` +
      `${metrics.stable.requests} reqs, ${metrics.stable.errorRate.toFixed(2)}% errors, ` +
      `${metrics.stable.avgResponseTime.toFixed(2)}ms avg`);
    console.log(`Canary (${CANARY_VERSION}): ${workers.canary.length} workers, ` +
      `${metrics.canary.requests} reqs, ${metrics.canary.errorRate.toFixed(2)}% errors, ` +
      `${metrics.canary.avgResponseTime.toFixed(2)}ms avg`);
    console.log('================================\n');
  }, 10000);

} else {
  // === WORKER PROCESS ===

  const version = process.env.APP_VERSION || STABLE_VERSION;

  /**
   * Handle requests from master
   */
  process.on('message', async (msg) => {
    if (msg.type === 'http-request') {
      const startTime = Date.now();

      // Simulate different behavior for different versions
      let processingTime = 50 + Math.random() * 50; // 50-100ms
      let shouldError = Math.random() < 0.02; // 2% error rate

      // Canary version has different characteristics
      if (version === CANARY_VERSION) {
        // Simulate that canary is slightly slower (or faster, depending on testing)
        processingTime = 60 + Math.random() * 60; // 60-120ms

        // Simulate higher/lower error rate for testing
        shouldError = Math.random() < 0.01; // 1% error rate (better)
        // For testing rollback: shouldError = Math.random() < 0.15; // 15% error rate (worse)
      }

      setTimeout(() => {
        const duration = Date.now() - startTime;

        if (shouldError) {
          process.send({ type: 'request-error', duration });
          process.send({
            type: 'http-response',
            requestId: msg.requestId,
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Internal Server Error',
              version,
              worker: cluster.worker.id
            })
          });
        } else {
          process.send({ type: 'request-complete', duration });
          process.send({
            type: 'http-response',
            requestId: msg.requestId,
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-App-Version': version
            },
            body: JSON.stringify({
              message: 'Success',
              version,
              worker: cluster.worker.id,
              processingTime: processingTime.toFixed(2) + 'ms',
              timestamp: new Date().toISOString()
            })
          });
        }
      }, processingTime);
    } else if (msg.type === 'shutdown') {
      console.log(`[Worker ${cluster.worker.id}] Graceful shutdown (${version})`);
      process.exit(0);
    }
  });

  console.log(`[Worker ${cluster.worker.id}] Running version ${version}`);
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Canary Deployment Benefits:
 *    - Gradual risk mitigation
 *    - Early problem detection
 *    - Easy rollback
 *    - Real user validation
 *
 * 2. Traffic Splitting:
 *    - Start small (5-10%)
 *    - Monitor closely
 *    - Increase gradually
 *    - Full rollout or rollback
 *
 * 3. Metrics to Monitor:
 *    - Error rates
 *    - Response times
 *    - Throughput
 *    - Resource usage
 *    - User experience metrics
 *
 * 4. Rollback Triggers:
 *    - Error rate increase
 *    - Performance degradation
 *    - Failed health checks
 *    - User complaints
 *
 * 5. Automation:
 *    - Gradual traffic increase
 *    - Automatic rollback on issues
 *    - Health-based progression
 *    - Scheduled promotions
 *
 * TESTING:
 *
 * 1. Monitor deployment:
 *    watch -n 1 'curl -s http://localhost:8000/canary/status | jq'
 *
 * 2. Generate traffic:
 *    ab -n 1000 -c 10 http://localhost:8000/
 *
 * 3. Gradual rollout:
 *    curl -X POST http://localhost:8000/canary/rollout
 *
 * 4. Manual control:
 *    curl -X POST http://localhost:8000/canary/increase
 *    curl -X POST http://localhost:8000/canary/rollback
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Feature Flags:
 *    - Fine-grained control
 *    - A/B testing
 *    - User targeting
 *    - Instant rollback
 *
 * 2. Monitoring Integration:
 *    - Real-time metrics
 *    - Automated decisions
 *    - Alert integration
 *    - Dashboard visibility
 *
 * 3. Deployment Tools:
 *    - Kubernetes canary with Istio/Linkerd
 *    - AWS CodeDeploy
 *    - Spinnaker
 *    - Argo Rollouts
 *
 * 4. Best Practices:
 *    - Define success criteria
 *    - Set rollback thresholds
 *    - Monitor user experience
 *    - Document decisions
 */
