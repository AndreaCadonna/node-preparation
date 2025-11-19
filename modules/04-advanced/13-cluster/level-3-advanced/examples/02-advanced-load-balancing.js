/**
 * Example 2: Advanced Load Balancing Strategies
 *
 * This example demonstrates custom load balancing algorithms beyond simple
 * round-robin. It implements several production-grade strategies for
 * distributing requests across worker processes.
 *
 * Key Concepts:
 * - Least connections algorithm
 * - Weighted load balancing
 * - Response time-based routing
 * - Resource-based balancing
 * - Dynamic weight adjustment
 *
 * Implemented Strategies:
 * - Round Robin: Equal distribution
 * - Least Connections: Route to least busy worker
 * - Weighted: Distribute based on worker capacity
 * - Least Response Time: Route to fastest worker
 * - Resource-Based: Consider CPU/memory usage
 *
 * Run this: node 02-advanced-load-balancing.js
 * Test: ab -n 1000 -c 10 http://localhost:8000/
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const numCPUs = Math.min(4, os.cpus().length);
const STRATEGY = process.env.STRATEGY || 'least-connections'; // round-robin, least-connections, weighted, least-response-time, resource-based

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting cluster with ${numCPUs} workers`);
  console.log(`[Master] Load balancing strategy: ${STRATEGY}\n`);

  // Worker tracking with metrics
  const workers = [];
  const workerStats = new Map();

  // Initialize workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);

    // Initialize worker stats
    workerStats.set(worker.id, {
      id: worker.id,
      pid: worker.process.pid,
      activeConnections: 0,
      totalRequests: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      weight: 1, // Default weight
      cpuUsage: 0,
      memoryUsage: 0,
      errorCount: 0,
      lastHealthCheck: Date.now()
    });

    // Listen for worker messages
    worker.on('message', (msg) => {
      const stats = workerStats.get(worker.id);
      if (!stats) return;

      switch (msg.type) {
        case 'request-start':
          stats.activeConnections++;
          stats.totalRequests++;
          break;

        case 'request-complete':
          stats.activeConnections--;
          stats.totalResponseTime += msg.duration;
          stats.avgResponseTime = stats.totalResponseTime / stats.totalRequests;
          break;

        case 'request-error':
          stats.activeConnections--;
          stats.errorCount++;
          break;

        case 'health-update':
          stats.cpuUsage = msg.cpu;
          stats.memoryUsage = msg.memory;
          stats.lastHealthCheck = Date.now();
          break;
      }
    });

    console.log(`[Master] Worker ${worker.id} (PID ${worker.process.pid}) started`);
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} died, restarting...`);

    const index = workers.findIndex(w => w.id === worker.id);
    if (index > -1) {
      const newWorker = cluster.fork();
      workers[index] = newWorker;

      // Transfer stats
      const oldStats = workerStats.get(worker.id);
      workerStats.delete(worker.id);
      workerStats.set(newWorker.id, {
        id: newWorker.id,
        pid: newWorker.process.pid,
        activeConnections: 0,
        totalRequests: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        weight: oldStats?.weight || 1,
        cpuUsage: 0,
        memoryUsage: 0,
        errorCount: 0,
        lastHealthCheck: Date.now()
      });
    }
  });

  /**
   * Load Balancing Strategies
   */

  // Strategy 1: Round Robin
  let roundRobinIndex = 0;
  function roundRobin() {
    const worker = workers[roundRobinIndex];
    roundRobinIndex = (roundRobinIndex + 1) % workers.length;
    return worker;
  }

  // Strategy 2: Least Connections
  function leastConnections() {
    let minConnections = Infinity;
    let selectedWorker = workers[0];

    for (const worker of workers) {
      const stats = workerStats.get(worker.id);
      if (stats && stats.activeConnections < minConnections) {
        minConnections = stats.activeConnections;
        selectedWorker = worker;
      }
    }

    return selectedWorker;
  }

  // Strategy 3: Weighted Load Balancing
  function weighted() {
    // Calculate total weight
    let totalWeight = 0;
    const availableWorkers = [];

    for (const worker of workers) {
      const stats = workerStats.get(worker.id);
      if (stats) {
        totalWeight += stats.weight;
        availableWorkers.push({ worker, stats });
      }
    }

    // Generate random number and select worker based on weight
    let random = Math.random() * totalWeight;

    for (const { worker, stats } of availableWorkers) {
      random -= stats.weight;
      if (random <= 0) {
        return worker;
      }
    }

    return availableWorkers[0]?.worker || workers[0];
  }

  // Strategy 4: Least Response Time
  function leastResponseTime() {
    let minResponseTime = Infinity;
    let selectedWorker = workers[0];

    for (const worker of workers) {
      const stats = workerStats.get(worker.id);
      if (stats) {
        // Consider both response time and active connections
        const score = stats.avgResponseTime * (1 + stats.activeConnections * 0.1);

        if (score < minResponseTime) {
          minResponseTime = score;
          selectedWorker = worker;
        }
      }
    }

    return selectedWorker;
  }

  // Strategy 5: Resource-Based (CPU + Memory)
  function resourceBased() {
    let minResourceUsage = Infinity;
    let selectedWorker = workers[0];

    for (const worker of workers) {
      const stats = workerStats.get(worker.id);
      if (stats) {
        // Combine CPU and memory usage as resource score
        const resourceScore = (stats.cpuUsage * 0.6) + (stats.memoryUsage * 0.4);

        // Also factor in active connections
        const totalScore = resourceScore * (1 + stats.activeConnections * 0.2);

        if (totalScore < minResourceUsage) {
          minResourceUsage = totalScore;
          selectedWorker = worker;
        }
      }
    }

    return selectedWorker;
  }

  // Select strategy based on configuration
  const strategies = {
    'round-robin': roundRobin,
    'least-connections': leastConnections,
    'weighted': weighted,
    'least-response-time': leastResponseTime,
    'resource-based': resourceBased
  };

  const selectWorker = strategies[STRATEGY] || leastConnections;

  /**
   * Master HTTP Server (Load Balancer)
   */
  const server = http.createServer((req, res) => {
    // Special endpoint for load balancer stats
    if (req.url === '/lb-stats') {
      const stats = Array.from(workerStats.values());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        strategy: STRATEGY,
        workers: stats,
        totalRequests: stats.reduce((sum, s) => sum + s.totalRequests, 0),
        totalActive: stats.reduce((sum, s) => sum + s.activeConnections, 0)
      }, null, 2));
      return;
    }

    // Select worker using configured strategy
    const worker = selectWorker();
    const stats = workerStats.get(worker.id);

    // Create unique request ID
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Log routing decision
    console.log(`[Master] ${req.method} ${req.url} -> Worker ${worker.id} ` +
      `(conn: ${stats.activeConnections}, avg: ${stats.avgResponseTime.toFixed(2)}ms)`);

    // Send request to worker
    worker.send({
      type: 'http-request',
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers
    });

    // Wait for response
    const responseHandler = (msg) => {
      if (msg.type === 'http-response' && msg.requestId === requestId) {
        worker.removeListener('message', responseHandler);
        res.writeHead(msg.statusCode, msg.headers);
        res.end(msg.body);
      }
    };

    worker.on('message', responseHandler);

    // Handle client disconnect
    req.on('close', () => {
      worker.removeListener('message', responseHandler);
    });
  });

  server.listen(PORT, () => {
    console.log(`\n[Master] Load balancer listening on port ${PORT}`);
    console.log(`[Master] Strategy: ${STRATEGY}`);
    console.log(`[Master] View stats: http://localhost:${PORT}/lb-stats\n`);
  });

  // Periodic stats display
  setInterval(() => {
    console.log('\n=== Load Balancer Stats ===');
    workerStats.forEach((stats, workerId) => {
      console.log(`Worker ${workerId}: ` +
        `Active: ${stats.activeConnections}, ` +
        `Total: ${stats.totalRequests}, ` +
        `Avg RT: ${stats.avgResponseTime.toFixed(2)}ms, ` +
        `Weight: ${stats.weight}, ` +
        `CPU: ${stats.cpuUsage.toFixed(1)}%, ` +
        `Mem: ${stats.memoryUsage.toFixed(1)}%`);
    });
    console.log('===========================\n');
  }, 10000);

  // Dynamic weight adjustment based on performance
  if (STRATEGY === 'weighted') {
    setInterval(() => {
      workerStats.forEach((stats, workerId) => {
        // Adjust weight based on performance metrics
        const errorRate = stats.totalRequests > 0 ? stats.errorCount / stats.totalRequests : 0;
        const normalizedResponseTime = stats.avgResponseTime / 100; // Normalize to 0-10 range

        // Calculate new weight (higher is better)
        // Base weight 1, reduce for slow response times and errors
        let newWeight = 1.0;
        newWeight -= (normalizedResponseTime * 0.3);
        newWeight -= (errorRate * 0.5);
        newWeight -= (stats.cpuUsage / 100 * 0.2);

        // Ensure weight stays in reasonable range
        stats.weight = Math.max(0.1, Math.min(2.0, newWeight));
      });
    }, 5000);
  }

} else {
  // === WORKER PROCESS ===

  // Request tracking
  const activeRequests = new Map();

  /**
   * Handle HTTP requests from master
   */
  process.on('message', (msg) => {
    if (msg.type === 'http-request') {
      handleRequest(msg);
    }
  });

  function handleRequest(msg) {
    const { requestId, method, url } = msg;
    const startTime = Date.now();

    // Notify master of request start
    process.send({ type: 'request-start', requestId });

    // Store request info
    activeRequests.set(requestId, { startTime, method, url });

    // Simulate different workloads
    let processingTime;
    if (url === '/slow') {
      processingTime = 100 + Math.random() * 200; // 100-300ms
    } else if (url === '/fast') {
      processingTime = 10 + Math.random() * 20; // 10-30ms
    } else if (url === '/variable') {
      processingTime = Math.random() * 500; // 0-500ms
    } else {
      processingTime = 30 + Math.random() * 70; // 30-100ms
    }

    // Simulate request processing
    setTimeout(() => {
      const duration = Date.now() - startTime;
      activeRequests.delete(requestId);

      // Random errors for testing
      if (Math.random() < 0.05) { // 5% error rate
        process.send({ type: 'request-error', requestId, duration });
        sendResponse(requestId, 500, `Error from worker ${cluster.worker.id}`);
        return;
      }

      // Send successful response
      const response = {
        workerId: cluster.worker.id,
        workerPid: process.pid,
        processingTime: processingTime.toFixed(2) + 'ms',
        actualTime: duration + 'ms',
        timestamp: new Date().toISOString()
      };

      process.send({ type: 'request-complete', requestId, duration });
      sendResponse(requestId, 200, JSON.stringify(response, null, 2));
    }, processingTime);
  }

  function sendResponse(requestId, statusCode, body) {
    process.send({
      type: 'http-response',
      requestId,
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body
    });
  }

  // Send health updates to master
  setInterval(() => {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();

    process.send({
      type: 'health-update',
      cpu: (usage.user + usage.system) / 1000000, // Convert to percentage approximation
      memory: (memory.heapUsed / memory.heapTotal) * 100
    });
  }, 2000);

  console.log(`[Worker ${cluster.worker.id}] Ready to handle requests`);
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Load Balancing Strategies:
 *    - Round Robin: Simple, equal distribution
 *    - Least Connections: Better for varying request durations
 *    - Weighted: Handles heterogeneous workers
 *    - Least Response Time: Optimizes for latency
 *    - Resource-Based: Considers system resources
 *
 * 2. Worker Metrics:
 *    - Track active connections per worker
 *    - Monitor response times
 *    - Record error rates
 *    - Measure resource usage (CPU/memory)
 *
 * 3. Dynamic Weight Adjustment:
 *    - Adjust weights based on performance
 *    - Reduce weight for slow/failing workers
 *    - Increase weight for healthy workers
 *    - Smooth adjustments to avoid oscillation
 *
 * 4. Strategy Selection:
 *    - Round Robin: Best for uniform workloads
 *    - Least Connections: Best for variable request times
 *    - Weighted: Best for heterogeneous infrastructure
 *    - Response Time: Best for latency-sensitive apps
 *    - Resource-Based: Best for CPU/memory intensive tasks
 *
 * 5. Monitoring:
 *    - Collect metrics from all workers
 *    - Expose stats endpoint for observability
 *    - Log routing decisions
 *    - Track distribution fairness
 *
 * TESTING:
 *
 * 1. Test round-robin distribution:
 *    STRATEGY=round-robin node 02-advanced-load-balancing.js
 *    ab -n 100 -c 1 http://localhost:8000/
 *
 * 2. Test least connections:
 *    STRATEGY=least-connections node 02-advanced-load-balancing.js
 *    ab -n 1000 -c 10 http://localhost:8000/slow
 *
 * 3. Test weighted balancing:
 *    STRATEGY=weighted node 02-advanced-load-balancing.js
 *    ab -n 1000 -c 10 http://localhost:8000/variable
 *
 * 4. Compare strategies:
 *    # Run benchmarks with each strategy
 *    # Compare total time, failed requests, distribution
 *
 * 5. View live stats:
 *    curl http://localhost:8000/lb-stats | jq
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. External Load Balancer:
 *    - Use nginx, HAProxy, or cloud load balancer
 *    - Configure appropriate algorithm
 *    - Enable health checks
 *    - Set connection limits
 *
 * 2. Health Checks:
 *    - Implement worker health endpoints
 *    - Remove unhealthy workers from pool
 *    - Automatic recovery detection
 *    - Gradual weight restoration
 *
 * 3. Sticky Sessions:
 *    - Combine with session affinity when needed
 *    - Use consistent hashing
 *    - Handle worker failures gracefully
 *
 * 4. Auto-Scaling:
 *    - Add/remove workers based on load
 *    - Graceful worker shutdown
 *    - Drain connections before removal
 *    - Smooth traffic shifting
 *
 * 5. Metrics & Alerting:
 *    - Export metrics to monitoring system
 *    - Alert on uneven distribution
 *    - Track strategy effectiveness
 *    - Monitor worker health
 */
