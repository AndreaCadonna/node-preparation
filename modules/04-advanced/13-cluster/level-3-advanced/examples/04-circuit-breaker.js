/**
 * Example 4: Circuit Breaker Pattern for Clustered Applications
 *
 * This example demonstrates the circuit breaker pattern for handling failures
 * in a clustered Node.js application. Circuit breakers prevent cascading
 * failures and allow the system to recover gracefully.
 *
 * Key Concepts:
 * - Circuit breaker states (Closed, Open, Half-Open)
 * - Failure threshold detection
 * - Automatic recovery mechanisms
 * - Fallback responses
 * - Health restoration
 *
 * Circuit Breaker States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, reject requests immediately
 * - HALF_OPEN: Testing if service recovered
 *
 * Use Cases:
 * - External API calls
 * - Database connections
 * - Downstream services
 * - Worker failure handling
 *
 * Run this: node 04-circuit-breaker.js
 * Test: curl http://localhost:8000/api/external
 *       curl http://localhost:8000/circuit-status
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Configuration
const PORT = 8000;
const numCPUs = Math.min(4, os.cpus().length);

// Circuit Breaker Configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,        // Number of failures before opening
  successThreshold: 3,        // Successes needed to close from half-open
  timeout: 10000,             // Time to wait before trying again (ms)
  monitoringPeriod: 60000,    // Time window for failure rate (ms)
  halfOpenMaxAttempts: 3      // Max attempts in half-open state
};

/**
 * Circuit Breaker Class
 */
class CircuitBreaker {
  constructor(name, config = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.halfOpenAttempts = 0;

    // Configuration
    this.failureThreshold = config.failureThreshold || CIRCUIT_BREAKER_CONFIG.failureThreshold;
    this.successThreshold = config.successThreshold || CIRCUIT_BREAKER_CONFIG.successThreshold;
    this.timeout = config.timeout || CIRCUIT_BREAKER_CONFIG.timeout;
    this.monitoringPeriod = config.monitoringPeriod || CIRCUIT_BREAKER_CONFIG.monitoringPeriod;
    this.halfOpenMaxAttempts = config.halfOpenMaxAttempts || CIRCUIT_BREAKER_CONFIG.halfOpenMaxAttempts;

    // Recent failures for rate calculation
    this.recentFailures = [];
    this.recentSuccesses = [];

    // Statistics
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalRejections: 0,
      stateChanges: [],
      lastFailure: null,
      lastSuccess: null
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    this.stats.totalRequests++;

    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        // Circuit is open, reject request
        this.stats.totalRejections++;
        console.log(`[Circuit Breaker: ${this.name}] REJECTED (circuit OPEN)`);

        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      } else {
        // Timeout expired, enter half-open state
        this.setState('HALF_OPEN');
        this.halfOpenAttempts = 0;
      }
    }

    // Try to execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.stats.totalSuccesses++;
    this.stats.lastSuccess = Date.now();

    // Track recent successes
    this.recentSuccesses.push(Date.now());
    this.cleanOldEntries();

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      console.log(`[Circuit Breaker: ${this.name}] Success in HALF_OPEN (${this.successCount}/${this.successThreshold})`);

      if (this.successCount >= this.successThreshold) {
        this.setState('CLOSED');
        this.successCount = 0;
        this.failureCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.stats.totalFailures++;
    this.stats.lastFailure = Date.now();

    // Track recent failures
    this.recentFailures.push(Date.now());
    this.cleanOldEntries();

    this.failureCount++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      console.log(`[Circuit Breaker: ${this.name}] Failure in HALF_OPEN`);

      // Failed in half-open, go back to open
      this.setState('OPEN');
      this.nextAttempt = Date.now() + this.timeout;
      this.successCount = 0;
    } else if (this.state === 'CLOSED') {
      console.log(`[Circuit Breaker: ${this.name}] Failure ${this.failureCount}/${this.failureThreshold}`);

      if (this.failureCount >= this.failureThreshold) {
        this.setState('OPEN');
        this.nextAttempt = Date.now() + this.timeout;
      }
    }
  }

  /**
   * Change circuit breaker state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;

    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });

    console.log(`[Circuit Breaker: ${this.name}] State changed: ${oldState} -> ${newState}`);
  }

  /**
   * Clean old entries from tracking arrays
   */
  cleanOldEntries() {
    const cutoff = Date.now() - this.monitoringPeriod;
    this.recentFailures = this.recentFailures.filter(t => t > cutoff);
    this.recentSuccesses = this.recentSuccesses.filter(t => t > cutoff);
  }

  /**
   * Get current status
   */
  getStatus() {
    this.cleanOldEntries();

    const failureRate = this.recentFailures.length /
      (this.recentFailures.length + this.recentSuccesses.length) || 0;

    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate: (failureRate * 100).toFixed(2) + '%',
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
      stats: {
        ...this.stats,
        recentFailures: this.recentFailures.length,
        recentSuccesses: this.recentSuccesses.length
      }
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.recentFailures = [];
    this.recentSuccesses = [];
    console.log(`[Circuit Breaker: ${this.name}] Manually reset to CLOSED`);
  }
}

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting cluster with circuit breakers`);
  console.log(`[Master] Workers: ${numCPUs}\n`);

  // Circuit breakers for different services
  const circuitBreakers = {
    externalAPI: new CircuitBreaker('ExternalAPI', {
      failureThreshold: 3,
      timeout: 5000
    }),
    database: new CircuitBreaker('Database', {
      failureThreshold: 5,
      timeout: 10000
    }),
    worker: new Map() // Per-worker circuit breakers
  };

  // Fork workers
  const workers = [];
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);

    // Create circuit breaker for each worker
    circuitBreakers.worker.set(worker.id, new CircuitBreaker(`Worker-${worker.id}`, {
      failureThreshold: 3,
      timeout: 5000
    }));

    console.log(`[Master] Worker ${worker.id} (PID ${worker.process.pid}) started`);
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} died`);

    // Trigger circuit breaker for dead worker
    const workerCircuit = circuitBreakers.worker.get(worker.id);
    if (workerCircuit) {
      workerCircuit.onFailure();
    }

    // Restart worker
    const newWorker = cluster.fork();
    const index = workers.findIndex(w => w.id === worker.id);
    if (index > -1) {
      workers[index] = newWorker;
    }

    // Create new circuit breaker for new worker
    circuitBreakers.worker.delete(worker.id);
    circuitBreakers.worker.set(newWorker.id, new CircuitBreaker(`Worker-${newWorker.id}`));
  });

  /**
   * Master HTTP Server
   */
  const server = http.createServer((req, res) => {
    if (req.url === '/circuit-status') {
      serveCircuitStatus(req, res);
    } else if (req.url === '/circuit-reset') {
      resetCircuits(req, res);
    } else {
      proxyToWorker(req, res);
    }
  });

  /**
   * Serve circuit breaker status
   */
  function serveCircuitStatus(req, res) {
    const status = {
      externalAPI: circuitBreakers.externalAPI.getStatus(),
      database: circuitBreakers.database.getStatus(),
      workers: Array.from(circuitBreakers.worker.entries()).map(([id, cb]) => cb.getStatus())
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  /**
   * Reset all circuit breakers
   */
  function resetCircuits(req, res) {
    circuitBreakers.externalAPI.reset();
    circuitBreakers.database.reset();
    circuitBreakers.worker.forEach(cb => cb.reset());

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'All circuit breakers reset' }));
  }

  /**
   * Proxy to worker with circuit breaker protection
   */
  async function proxyToWorker(req, res) {
    // Round-robin worker selection
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const workerCircuit = circuitBreakers.worker.get(worker.id);

    try {
      await workerCircuit.execute(async () => {
        return new Promise((resolve, reject) => {
          const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

          // Send request to worker
          worker.send({
            type: 'http-request',
            requestId,
            method: req.method,
            url: req.url
          });

          // Wait for response with timeout
          const timeout = setTimeout(() => {
            worker.removeListener('message', responseHandler);
            reject(new Error('Worker timeout'));
          }, 5000);

          const responseHandler = (msg) => {
            if (msg.type === 'http-response' && msg.requestId === requestId) {
              clearTimeout(timeout);
              worker.removeListener('message', responseHandler);

              if (msg.statusCode >= 500) {
                reject(new Error('Worker error'));
              } else {
                res.writeHead(msg.statusCode, msg.headers);
                res.end(msg.body);
                resolve();
              }
            }
          };

          worker.on('message', responseHandler);
        });
      }, () => {
        // Fallback response
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Service temporarily unavailable',
          message: 'Circuit breaker is open, please try again later'
        }));
      });
    } catch (error) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Service error',
        message: error.message
      }));
    }
  }

  server.listen(PORT, () => {
    console.log(`\n[Master] Server with circuit breakers listening on port ${PORT}`);
    console.log(`[Master] Circuit status: http://localhost:${PORT}/circuit-status`);
    console.log(`[Master] Reset circuits: http://localhost:${PORT}/circuit-reset\n`);
  });

  // Periodic status logging
  setInterval(() => {
    console.log('\n=== Circuit Breaker Status ===');
    console.log(`External API: ${circuitBreakers.externalAPI.state}`);
    console.log(`Database: ${circuitBreakers.database.state}`);
    circuitBreakers.worker.forEach((cb, id) => {
      console.log(`Worker ${id}: ${cb.state}`);
    });
    console.log('============================\n');
  }, 15000);

} else {
  // === WORKER PROCESS ===

  // Simulate external API
  async function callExternalAPI() {
    // Simulate random failures
    if (Math.random() < 0.3) {
      throw new Error('External API failed');
    }
    return { data: 'API response', timestamp: Date.now() };
  }

  // Simulate database query
  async function queryDatabase() {
    // Simulate random failures
    if (Math.random() < 0.2) {
      throw new Error('Database query failed');
    }
    return { result: 'Query result', timestamp: Date.now() };
  }

  /**
   * Handle requests from master
   */
  process.on('message', async (msg) => {
    if (msg.type === 'http-request') {
      const { requestId, url } = msg;

      try {
        let response;

        if (url === '/api/external') {
          // Simulate external API call
          const data = await callExternalAPI();
          response = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worker: cluster.worker.id,
              service: 'external-api',
              data
            })
          };
        } else if (url === '/api/database') {
          // Simulate database query
          const data = await queryDatabase();
          response = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worker: cluster.worker.id,
              service: 'database',
              data
            })
          };
        } else if (url === '/api/fail') {
          // Force failure for testing
          throw new Error('Forced failure');
        } else {
          response = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worker: cluster.worker.id,
              message: 'OK',
              timestamp: Date.now()
            })
          };
        }

        process.send({
          type: 'http-response',
          requestId,
          ...response
        });
      } catch (error) {
        console.log(`[Worker ${cluster.worker.id}] Error: ${error.message}`);
        process.send({
          type: 'http-response',
          requestId,
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: error.message,
            worker: cluster.worker.id
          })
        });
      }
    }
  });

  console.log(`[Worker ${cluster.worker.id}] Ready with circuit breaker protection`);
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Circuit Breaker States:
 *    - CLOSED: Normal operation
 *    - OPEN: Failing fast, rejecting requests
 *    - HALF_OPEN: Testing recovery
 *
 * 2. Configuration Parameters:
 *    - Failure threshold: When to open circuit
 *    - Success threshold: When to close from half-open
 *    - Timeout: How long to wait before retry
 *    - Monitoring period: Time window for rate calculation
 *
 * 3. Benefits:
 *    - Prevent cascading failures
 *    - Fast failure response
 *    - Automatic recovery
 *    - System stability
 *
 * 4. Fallback Strategies:
 *    - Return cached data
 *    - Return default values
 *    - Degrade gracefully
 *    - Queue for later processing
 *
 * 5. Monitoring:
 *    - Track state changes
 *    - Monitor failure rates
 *    - Alert on circuit opens
 *    - Log recovery events
 *
 * TESTING:
 *
 * 1. Test circuit opening:
 *    for i in {1..10}; do curl http://localhost:8000/api/fail; done
 *    curl http://localhost:8000/circuit-status
 *
 * 2. Test half-open recovery:
 *    # Wait for timeout, then make successful requests
 *    sleep 6
 *    for i in {1..5}; do curl http://localhost:8000/; done
 *
 * 3. Test fallback:
 *    # After circuit opens, should get fallback response
 *    curl http://localhost:8000/api/fail
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Use proven libraries:
 *    - opossum (Node.js circuit breaker)
 *    - cockatiel (TypeScript-friendly)
 *    - brakes
 *
 * 2. Metrics Integration:
 *    - Export circuit state to monitoring
 *    - Track open/close events
 *    - Alert on frequent state changes
 *
 * 3. Configuration:
 *    - Tune thresholds per service
 *    - Different timeouts for different failures
 *    - Consider percentile-based thresholds
 *
 * 4. Testing:
 *    - Chaos engineering
 *    - Failure injection
 *    - Recovery testing
 */
