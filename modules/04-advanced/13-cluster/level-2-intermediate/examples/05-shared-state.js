/**
 * Example 5: Managing Shared State
 *
 * This example demonstrates how to manage shared state across cluster workers.
 * Since workers have separate memory spaces, shared state requires external
 * storage or coordination through the master process.
 *
 * Approaches demonstrated:
 * - Master as state coordinator
 * - In-memory shared state (via master)
 * - Redis for distributed state (simulated)
 * - State synchronization patterns
 *
 * Key Concepts:
 * - Worker memory isolation
 * - State coordination strategies
 * - Consistency patterns
 * - Lock-free updates
 * - State replication
 *
 * Run this: node 05-shared-state.js
 * Test: curl http://localhost:8000/counter
 */

const cluster = require('cluster');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// Configuration
const PORT = 8000;
const numCPUs = Math.min(os.cpus().length, 4);

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting cluster with shared state management\n`);

  /**
   * Shared State Manager
   * Manages state that needs to be shared across all workers
   */
  class SharedStateManager {
    constructor() {
      // Simple key-value store
      this.state = new Map();

      // Atomic counters
      this.counters = new Map();

      // Locks for critical sections
      this.locks = new Map();

      // Change subscribers
      this.subscribers = new Map();
    }

    /**
     * Get a value
     */
    get(key) {
      return this.state.get(key);
    }

    /**
     * Set a value and notify subscribers
     */
    set(key, value) {
      const oldValue = this.state.get(key);
      this.state.set(key, value);

      // Notify subscribers of change
      this.notifySubscribers(key, value, oldValue);

      return value;
    }

    /**
     * Delete a value
     */
    delete(key) {
      const value = this.state.get(key);
      this.state.delete(key);
      this.notifySubscribers(key, undefined, value);
      return value;
    }

    /**
     * Increment a counter atomically
     */
    increment(key, amount = 1) {
      const current = this.counters.get(key) || 0;
      const newValue = current + amount;
      this.counters.set(key, newValue);
      this.notifySubscribers(key, newValue, current);
      return newValue;
    }

    /**
     * Get counter value
     */
    getCounter(key) {
      return this.counters.get(key) || 0;
    }

    /**
     * Acquire a lock
     */
    acquireLock(key, workerId, timeout = 5000) {
      const lock = this.locks.get(key);

      if (lock && Date.now() < lock.expiresAt) {
        // Lock is held by another worker
        return {
          success: false,
          holder: lock.workerId
        };
      }

      // Acquire lock
      this.locks.set(key, {
        workerId,
        acquiredAt: Date.now(),
        expiresAt: Date.now() + timeout
      });

      return { success: true };
    }

    /**
     * Release a lock
     */
    releaseLock(key, workerId) {
      const lock = this.locks.get(key);

      if (!lock) {
        return { success: false, error: 'Lock not held' };
      }

      if (lock.workerId !== workerId) {
        return { success: false, error: 'Lock held by different worker' };
      }

      this.locks.delete(key);
      return { success: true };
    }

    /**
     * Subscribe to state changes
     */
    subscribe(key, workerId) {
      if (!this.subscribers.has(key)) {
        this.subscribers.set(key, new Set());
      }
      this.subscribers.get(key).add(workerId);
    }

    /**
     * Unsubscribe from state changes
     */
    unsubscribe(key, workerId) {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(workerId);
      }
    }

    /**
     * Notify subscribers of state change
     */
    notifySubscribers(key, newValue, oldValue) {
      const subs = this.subscribers.get(key);
      if (!subs) return;

      subs.forEach(workerId => {
        const worker = cluster.workers[workerId];
        if (worker) {
          worker.send({
            type: 'state-change',
            data: {
              key,
              newValue,
              oldValue
            }
          });
        }
      });
    }

    /**
     * Get all state (for debugging)
     */
    getAll() {
      return {
        state: Object.fromEntries(this.state),
        counters: Object.fromEntries(this.counters),
        locks: Object.fromEntries(this.locks),
        subscribers: Object.fromEntries(
          Array.from(this.subscribers.entries()).map(([k, v]) => [k, Array.from(v)])
        )
      };
    }
  }

  const stateManager = new SharedStateManager();

  /**
   * Handle state-related messages from workers
   */
  function handleStateMessage(workerId, message) {
    const { type, requestId, data } = message;

    let result;

    try {
      switch (type) {
        case 'state-get':
          result = stateManager.get(data.key);
          break;

        case 'state-set':
          result = stateManager.set(data.key, data.value);
          break;

        case 'state-delete':
          result = stateManager.delete(data.key);
          break;

        case 'counter-increment':
          result = stateManager.increment(data.key, data.amount);
          break;

        case 'counter-get':
          result = stateManager.getCounter(data.key);
          break;

        case 'lock-acquire':
          result = stateManager.acquireLock(data.key, workerId, data.timeout);
          break;

        case 'lock-release':
          result = stateManager.releaseLock(data.key, workerId);
          break;

        case 'state-subscribe':
          stateManager.subscribe(data.key, workerId);
          result = { success: true };
          break;

        case 'state-unsubscribe':
          stateManager.unsubscribe(data.key, workerId);
          result = { success: true };
          break;

        case 'state-get-all':
          result = stateManager.getAll();
          break;

        default:
          result = { error: `Unknown type: ${type}` };
      }

      // Send response
      const worker = cluster.workers[workerId];
      if (worker && requestId) {
        worker.send({
          type: 'state-response',
          requestId,
          data: result
        });
      }

    } catch (error) {
      const worker = cluster.workers[workerId];
      if (worker && requestId) {
        worker.send({
          type: 'state-response',
          requestId,
          error: error.message
        });
      }
    }
  }

  /**
   * Fork workers
   */
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`[Master] Forked worker ${worker.id} (PID ${worker.process.pid})`);

    worker.on('message', (message) => {
      if (message.type && message.type.startsWith('state-') ||
          message.type.startsWith('counter-') ||
          message.type.startsWith('lock-')) {
        handleStateMessage(worker.id, message);
      }
    });
  }

  /**
   * Handle worker exits
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.id} exited`);

    // Release all locks held by this worker
    const state = stateManager.getAll();
    Object.entries(state.locks).forEach(([key, lock]) => {
      if (lock.workerId === worker.id) {
        stateManager.releaseLock(key, worker.id);
        console.log(`[Master] Released lock "${key}" held by exited worker ${worker.id}`);
      }
    });

    // Restart worker
    const newWorker = cluster.fork();
    newWorker.on('message', (message) => {
      if (message.type && (message.type.startsWith('state-') ||
          message.type.startsWith('counter-') ||
          message.type.startsWith('lock-'))) {
        handleStateMessage(newWorker.id, message);
      }
    });
  });

  /**
   * Periodic stats
   */
  setInterval(() => {
    const state = stateManager.getAll();
    console.log(`[Master] State stats: ${state.counters.size} counters, ${state.state.size} values, ${state.locks.size} locks`);
  }, 15000);

  /**
   * Cleanup on exit
   */
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    console.log('\n[Master] Shutting down...');
    Object.values(cluster.workers).forEach(worker => {
      worker.kill('SIGTERM');
    });
    setTimeout(() => process.exit(0), 5000);
  }

  console.log(`[Master] Shared state manager ready`);
  console.log(`[Master] Server running on http://localhost:${PORT}\n`);

} else {
  // === WORKER PROCESS ===

  /**
   * State Client
   * Provides an interface for workers to interact with shared state
   */
  class StateClient {
    constructor() {
      this.pendingRequests = new Map();
      this.changeHandlers = new Map();

      // Listen for responses and state changes
      process.on('message', (message) => {
        if (message.type === 'state-response') {
          this.handleResponse(message);
        } else if (message.type === 'state-change') {
          this.handleStateChange(message);
        }
      });
    }

    /**
     * Make a request to master
     */
    request(type, data, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID();

        const timer = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${type}`));
        }, timeout);

        this.pendingRequests.set(requestId, {
          resolve: (data) => {
            clearTimeout(timer);
            resolve(data);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          }
        });

        if (process.send) {
          process.send({ type, requestId, data });
        }
      });
    }

    /**
     * Handle response from master
     */
    handleResponse(message) {
      const { requestId, data, error } = message;
      const pending = this.pendingRequests.get(requestId);

      if (pending) {
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(data);
        }
        this.pendingRequests.delete(requestId);
      }
    }

    /**
     * Handle state change notification
     */
    handleStateChange(message) {
      const { data } = message;
      const handler = this.changeHandlers.get(data.key);

      if (handler) {
        handler(data.newValue, data.oldValue);
      }
    }

    // State operations
    async get(key) {
      return this.request('state-get', { key });
    }

    async set(key, value) {
      return this.request('state-set', { key, value });
    }

    async delete(key) {
      return this.request('state-delete', { key });
    }

    // Counter operations
    async increment(key, amount = 1) {
      return this.request('counter-increment', { key, amount });
    }

    async getCounter(key) {
      return this.request('counter-get', { key });
    }

    // Lock operations
    async acquireLock(key, timeout) {
      return this.request('lock-acquire', { key, timeout });
    }

    async releaseLock(key) {
      return this.request('lock-release', { key });
    }

    // Subscription
    async subscribe(key, handler) {
      this.changeHandlers.set(key, handler);
      return this.request('state-subscribe', { key });
    }

    async unsubscribe(key) {
      this.changeHandlers.delete(key);
      return this.request('state-unsubscribe', { key });
    }

    async getAll() {
      return this.request('state-get-all', {});
    }
  }

  const state = new StateClient();

  /**
   * HTTP Server
   */
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === '/counter') {
        // Increment global counter
        const count = await state.increment('global-counter');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          worker: cluster.worker.id,
          counter: count,
          message: 'Counter incremented'
        }, null, 2));
        return;
      }

      if (req.url === '/set') {
        // Set a value
        const key = `worker-${cluster.worker.id}-timestamp`;
        const value = new Date().toISOString();
        await state.set(key, value);

        res.writeHead(200);
        res.end(`Set ${key} = ${value}\n`);
        return;
      }

      if (req.url === '/get-all') {
        // Get all state
        const allState = await state.getAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(allState, null, 2));
        return;
      }

      if (req.url === '/lock') {
        // Demonstrate lock usage
        const lockKey = 'critical-section';

        // Acquire lock
        const lockResult = await state.acquireLock(lockKey, 5000);

        if (!lockResult.success) {
          res.writeHead(423); // Locked
          res.end(`Lock held by worker ${lockResult.holder}\n`);
          return;
        }

        try {
          // Simulate critical section work
          await new Promise(resolve => setTimeout(resolve, 2000));

          res.writeHead(200);
          res.end(`Worker ${cluster.worker.id} completed critical section\n`);
        } finally {
          // Always release lock
          await state.releaseLock(lockKey);
        }
        return;
      }

      if (req.url === '/subscribe') {
        // Subscribe to counter changes
        await state.subscribe('global-counter', (newValue, oldValue) => {
          console.log(`[Worker ${cluster.worker.id}] Counter changed: ${oldValue} -> ${newValue}`);
        });

        res.writeHead(200);
        res.end(`Worker ${cluster.worker.id} subscribed to global-counter\n`);
        return;
      }

      // Default endpoint
      res.writeHead(200);
      res.end(`Worker ${cluster.worker.id}\n`);

    } catch (error) {
      console.error(`[Worker ${cluster.worker.id}] Error:`, error);
      res.writeHead(500);
      res.end('Internal Server Error\n');
    }
  });

  server.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id}] Listening on port ${PORT}`);
  });
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Worker Memory Isolation:
 *    - Each worker has separate memory
 *    - Variables are NOT shared between workers
 *    - Requires external coordination for shared state
 *
 * 2. Master as Coordinator:
 *    - Master can manage shared state
 *    - Provides single source of truth
 *    - Handles coordination and synchronization
 *
 * 3. Atomic Operations:
 *    - Use atomic operations for counters
 *    - Prevents race conditions
 *    - Ensures consistency
 *
 * 4. Locking:
 *    - Implement locks for critical sections
 *    - Always set lock timeouts
 *    - Release locks in finally blocks
 *    - Clean up locks on worker exit
 *
 * 5. State Synchronization:
 *    - Subscribe to state changes
 *    - Keep local caches synchronized
 *    - Handle network/process delays
 *
 * TESTING:
 *
 * 1. Test atomic counter:
 *    # Make many requests to /counter
 *    for i in {1..100}; do curl http://localhost:8000/counter & done; wait
 *    # Check counter value matches request count
 *
 * 2. Test locking:
 *    # Make concurrent requests to /lock
 *    curl http://localhost:8000/lock &
 *    curl http://localhost:8000/lock &
 *    # Second request should be blocked
 *
 * 3. Test state persistence:
 *    curl http://localhost:8000/set
 *    curl http://localhost:8000/get-all
 *
 * 4. Test subscriptions:
 *    curl http://localhost:8000/subscribe
 *    curl http://localhost:8000/counter
 *    # Check worker logs for change notifications
 *
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. External Storage:
 *    - Use Redis, Memcached, or database
 *    - Master-based state doesn't survive master crash
 *    - External storage provides persistence
 *
 * 2. Performance:
 *    - IPC has overhead
 *    - Cache frequently accessed data
 *    - Batch operations when possible
 *
 * 3. Consistency:
 *    - Choose consistency model (strong vs eventual)
 *    - Handle partial failures
 *    - Implement conflict resolution
 *
 * 4. Scaling:
 *    - Master can become bottleneck
 *    - Consider distributed state management
 *    - Use appropriate data structures
 */
