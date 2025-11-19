/**
 * Exercise 2: Build Custom Load Balancer with Multiple Strategies
 *
 * Create a sophisticated load balancer that supports multiple routing
 * strategies and can dynamically switch between them based on conditions.
 *
 * Requirements:
 * 1. Implement at least 3 load balancing strategies:
 *    - Least Connections
 *    - Weighted Round Robin
 *    - Response Time-based
 * 2. Allow dynamic strategy switching via API
 * 3. Track detailed metrics per worker
 * 4. Implement health-based worker exclusion
 * 5. Create a load balancer dashboard/API
 * 6. Handle worker failures gracefully
 *
 * Features to Implement:
 * - Strategy pattern for different algorithms
 * - Real-time metric collection
 * - Worker health scoring
 * - Automatic unhealthy worker removal
 * - Strategy comparison metrics
 * - Load distribution visualization
 *
 * Bonus Challenges:
 * 1. Implement consistent hashing strategy
 * 2. Add predictive load balancing (based on historical patterns)
 * 3. Implement request queueing when all workers busy
 * 4. Add worker capacity planning (auto-scale simulation)
 * 5. Create strategy auto-selection based on workload
 * 6. Implement connection draining for workers being removed
 *
 * Testing Requirements:
 * - Each strategy distributes load appropriately
 * - Unhealthy workers are excluded
 * - Strategy can be changed without downtime
 * - Metrics are accurate
 * - Worker failures handled gracefully
 *
 * Your implementation should be below this comment block.
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

const PORT = 8000;
const numCPUs = Math.min(4, os.cpus().length);

// TODO: Define LoadBalancingStrategy interface
class LoadBalancingStrategy {
  constructor(name) {
    this.name = name;
  }

  // TODO: Implement selectWorker(workers, workerStats)
  selectWorker(workers, workerStats) {
    // Return selected worker based on strategy
    throw new Error('Not implemented');
  }
}

// TODO: Implement LeastConnectionsStrategy
class LeastConnectionsStrategy extends LoadBalancingStrategy {
  constructor() {
    super('least-connections');
  }

  selectWorker(workers, workerStats) {
    // TODO: Select worker with least active connections
  }
}

// TODO: Implement WeightedRoundRobinStrategy
class WeightedRoundRobinStrategy extends LoadBalancingStrategy {
  constructor() {
    super('weighted-round-robin');
  }

  selectWorker(workers, workerStats) {
    // TODO: Implement weighted round robin
    // Workers with higher weights should get more requests
  }
}

// TODO: Implement ResponseTimeStrategy
class ResponseTimeStrategy extends LoadBalancingStrategy {
  constructor() {
    super('response-time');
  }

  selectWorker(workers, workerStats) {
    // TODO: Select worker with best response time
    // Consider both avg response time and current load
  }
}

// TODO: Implement WorkerHealthMonitor
class WorkerHealthMonitor {
  constructor() {
    // TODO: Initialize health tracking
  }

  // TODO: Implement updateHealth(workerId, metrics)
  updateHealth(workerId, metrics) {
    // Update worker health score based on metrics
  }

  // TODO: Implement isHealthy(workerId)
  isHealthy(workerId) {
    // Return true if worker is healthy
  }

  // TODO: Implement getHealthScore(workerId)
  getHealthScore(workerId) {
    // Return health score 0-100
  }
}

if (cluster.isMaster) {
  console.log('[Master] TODO: Implement load balancer master process');

  // TODO: Initialize strategies
  // TODO: Set default strategy
  // TODO: Fork workers
  // TODO: Implement worker metrics collection
  // TODO: Implement health monitoring
  // TODO: Create HTTP server with:
  //   - Request routing
  //   - Strategy switching endpoint
  //   - Metrics endpoint
  //   - Dashboard endpoint
  // TODO: Handle worker failures

} else {
  console.log('[Worker] TODO: Implement worker process');

  // TODO: Handle requests
  // TODO: Send metrics to master
  // TODO: Simulate variable workloads

}

/**
 * API ENDPOINTS TO IMPLEMENT:
 *
 * GET  /lb/status          - Current strategy and stats
 * POST /lb/strategy        - Change strategy
 * GET  /lb/workers         - Worker details and health
 * GET  /lb/metrics         - Detailed metrics
 * GET  /lb/dashboard       - HTML dashboard
 *
 * TESTING CHECKLIST:
 *
 * [ ] Least connections routes to least busy worker
 * [ ] Weighted round robin respects worker weights
 * [ ] Response time strategy routes to fastest worker
 * [ ] Unhealthy workers are excluded from pool
 * [ ] Strategy can be changed dynamically
 * [ ] Worker failures don't crash load balancer
 * [ ] Metrics accurately reflect load distribution
 * [ ] At least 2 bonus challenges implemented
 *
 * SUCCESS CRITERIA:
 * - All 3 core strategies working correctly
 * - Health monitoring functional
 * - Dynamic strategy switching works
 * - Clean API design
 * - Production-ready error handling
 */
