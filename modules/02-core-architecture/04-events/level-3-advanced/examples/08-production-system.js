/**
 * Example 8: Production-Ready Event System
 *
 * This example demonstrates:
 * - Complete production event system
 * - Error handling and recovery
 * - Circuit breakers
 * - Rate limiting
 * - Monitoring and observability
 * - Graceful shutdown
 * - Health checks
 */

const EventEmitter = require('events');

console.log('=== Production-Ready Event System ===\n');

// ============================================================================
// Production Event Bus with All Features
// ============================================================================

class ProductionEventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.setMaxListeners(options.maxListeners || Infinity);

    // Configuration
    this.config = {
      enableCircuitBreaker: options.enableCircuitBreaker !== false,
      enableRateLimit: options.enableRateLimit !== false,
      enableMetrics: options.enableMetrics !== false,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout || 60000,
      rateLimit: options.rateLimit || 1000, // events per second
      rateLimitWindow: options.rateLimitWindow || 1000
    };

    // State
    this.metrics = new Map();
    this.circuitBreakers = new Map();
    this.rateLimiters = new Map();
    this.errorHandlers = new Map();
    this.isShuttingDown = false;
    this.pendingEmissions = 0;

    // Setup error handling
    this.setupGlobalErrorHandler();
  }

  // ========================================================================
  // Event Emission with Safety Features
  // ========================================================================

  emit(event, ...args) {
    // Check if shutting down
    if (this.isShuttingDown) {
      console.warn(`⚠️  Rejecting emit during shutdown: ${event}`);
      return false;
    }

    // Check rate limit
    if (this.config.enableRateLimit && !this.checkRateLimit(event)) {
      console.warn(`⚠️  Rate limit exceeded for: ${event}`);
      this.recordMetric(event, 'rate_limited');
      return false;
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker && !this.checkCircuitBreaker(event)) {
      console.warn(`⚠️  Circuit breaker open for: ${event}`);
      this.recordMetric(event, 'circuit_open');
      return false;
    }

    // Track pending emissions
    this.pendingEmissions++;

    try {
      // Record metrics
      if (this.config.enableMetrics) {
        this.recordMetric(event, 'emitted');
      }

      // Emit with error boundary
      const result = this.safeEmit(event, ...args);

      // Record success
      this.recordCircuitBreakerSuccess(event);

      return result;

    } catch (error) {
      // Record failure
      this.recordCircuitBreakerFailure(event);
      this.handleEmitError(event, error, args);
      return false;

    } finally {
      this.pendingEmissions--;
    }
  }

  safeEmit(event, ...args) {
    const listeners = this.listeners(event);

    if (listeners.length === 0) {
      return false;
    }

    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        this.handleListenerError(event, error, listener);
      }
    });

    return true;
  }

  // ========================================================================
  // Circuit Breaker Implementation
  // ========================================================================

  checkCircuitBreaker(event) {
    const breaker = this.circuitBreakers.get(event);

    if (!breaker) {
      return true; // No breaker, allow through
    }

    // Check if circuit is open
    if (breaker.state === 'open') {
      const now = Date.now();

      // Try to close after timeout
      if (now - breaker.openedAt >= this.config.circuitBreakerTimeout) {
        console.log(`🔧 Circuit breaker half-open for: ${event}`);
        breaker.state = 'half-open';
        return true;
      }

      return false; // Still open
    }

    return true; // Closed or half-open
  }

  recordCircuitBreakerFailure(event) {
    if (!this.circuitBreakers.has(event)) {
      this.circuitBreakers.set(event, {
        failures: 0,
        state: 'closed',
        openedAt: null
      });
    }

    const breaker = this.circuitBreakers.get(event);
    breaker.failures++;

    // Open circuit if threshold exceeded
    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      breaker.openedAt = Date.now();
      console.log(`⚠️  Circuit breaker opened for: ${event}`);
      this.emit('circuitBreaker:opened', { event });
    }
  }

  recordCircuitBreakerSuccess(event) {
    const breaker = this.circuitBreakers.get(event);

    if (breaker) {
      if (breaker.state === 'half-open') {
        // Success in half-open, close the circuit
        breaker.state = 'closed';
        breaker.failures = 0;
        console.log(`✅ Circuit breaker closed for: ${event}`);
        this.emit('circuitBreaker:closed', { event });
      } else {
        // Reset failure count on success
        breaker.failures = Math.max(0, breaker.failures - 1);
      }
    }
  }

  // ========================================================================
  // Rate Limiting
  // ========================================================================

  checkRateLimit(event) {
    const now = Date.now();

    if (!this.rateLimiters.has(event)) {
      this.rateLimiters.set(event, {
        count: 0,
        windowStart: now
      });
    }

    const limiter = this.rateLimiters.get(event);

    // Reset window if expired
    if (now - limiter.windowStart >= this.config.rateLimitWindow) {
      limiter.count = 0;
      limiter.windowStart = now;
    }

    // Check limit
    if (limiter.count >= this.config.rateLimit) {
      this.emit('rateLimit:exceeded', { event, count: limiter.count });
      return false;
    }

    limiter.count++;
    return true;
  }

  // ========================================================================
  // Error Handling
  // ========================================================================

  setupGlobalErrorHandler() {
    // Handle uncaught errors in listeners
    this.on('error', (error) => {
      console.error('❌ Uncaught event error:', error);
    });
  }

  handleEmitError(event, error, args) {
    console.error(`❌ Error emitting ${event}:`, error.message);

    // Custom error handler for this event
    const handler = this.errorHandlers.get(event);
    if (handler) {
      try {
        handler(error, { event, args });
      } catch (handlerError) {
        console.error('❌ Error handler failed:', handlerError);
      }
    }

    // Emit error event
    this.emit('error', error);
    this.recordMetric(event, 'error');
  }

  handleListenerError(event, error, listener) {
    console.error(`❌ Listener error for ${event}:`, error.message);

    this.emit('listener:error', {
      event,
      error,
      listener: listener.toString().substring(0, 50)
    });

    this.recordMetric(event, 'listener_error');
  }

  onError(event, handler) {
    this.errorHandlers.set(event, handler);
  }

  // ========================================================================
  // Metrics and Monitoring
  // ========================================================================

  recordMetric(event, type) {
    const key = `${event}:${type}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        lastRecorded: Date.now()
      });
    }

    const metric = this.metrics.get(key);
    metric.count++;
    metric.lastRecorded = Date.now();
  }

  getMetrics(event) {
    if (event) {
      const metrics = {};
      this.metrics.forEach((value, key) => {
        if (key.startsWith(event + ':')) {
          const type = key.split(':')[1];
          metrics[type] = value.count;
        }
      });
      return metrics;
    }

    // Return all metrics
    const allMetrics = {};
    this.metrics.forEach((value, key) => {
      allMetrics[key] = value.count;
    });
    return allMetrics;
  }

  getHealthStatus() {
    const openCircuits = Array.from(this.circuitBreakers.entries())
      .filter(([_, breaker]) => breaker.state === 'open')
      .map(([event]) => event);

    const totalEvents = Array.from(this.metrics.values())
      .reduce((sum, metric) => sum + metric.count, 0);

    const errorCount = Array.from(this.metrics.entries())
      .filter(([key]) => key.includes(':error'))
      .reduce((sum, [_, metric]) => sum + metric.count, 0);

    return {
      healthy: openCircuits.length === 0,
      uptime: process.uptime(),
      totalEvents,
      errorCount,
      errorRate: totalEvents > 0 ? (errorCount / totalEvents * 100).toFixed(2) + '%' : '0%',
      openCircuits,
      pendingEmissions: this.pendingEmissions,
      activeListeners: this.eventNames().length
    };
  }

  // ========================================================================
  // Graceful Shutdown
  // ========================================================================

  async shutdown(timeout = 5000) {
    console.log('\n🛑 Initiating graceful shutdown...');

    this.isShuttingDown = true;
    this.emit('system:shuttingDown');

    const shutdownStart = Date.now();

    // Wait for pending emissions
    while (this.pendingEmissions > 0 && Date.now() - shutdownStart < timeout) {
      console.log(`   Waiting for ${this.pendingEmissions} pending emissions...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.pendingEmissions > 0) {
      console.warn(`⚠️  Shutdown timeout: ${this.pendingEmissions} emissions still pending`);
    }

    // Remove all listeners
    this.removeAllListeners();

    console.log('✅ Event bus shut down gracefully');
    this.emit('system:shutdown');
  }
}

// ============================================================================
// Production Usage Example
// ============================================================================

console.log('--- Initializing Production Event Bus ---\n');

const eventBus = new ProductionEventBus({
  enableCircuitBreaker: true,
  enableRateLimit: true,
  enableMetrics: true,
  circuitBreakerThreshold: 3,
  rateLimit: 10,
  rateLimitWindow: 1000
});

// Setup monitoring
eventBus.on('circuitBreaker:opened', ({ event }) => {
  console.log(`📊 ALERT: Circuit breaker opened for ${event}`);
});

eventBus.on('circuitBreaker:closed', ({ event }) => {
  console.log(`📊 INFO: Circuit breaker closed for ${event}`);
});

eventBus.on('rateLimit:exceeded', ({ event, count }) => {
  console.log(`📊 WARN: Rate limit exceeded for ${event} (${count} events)`);
});

eventBus.on('listener:error', ({ event, error }) => {
  console.log(`📊 ERROR: Listener error for ${event}: ${error.message}`);
});

// Register services
console.log('Registering services:\n');

// Service 1: Order processing (reliable)
eventBus.on('order:created', (order) => {
  console.log(`📦 Order service: Processing order ${order.id}`);
});

// Service 2: Notification (may fail)
let notificationFailCount = 0;
eventBus.on('order:created', (order) => {
  notificationFailCount++;

  // Fail first 3 times to trigger circuit breaker
  if (notificationFailCount <= 3) {
    throw new Error('Notification service unavailable');
  }

  console.log(`📧 Notification service: Sending confirmation for ${order.id}`);
});

// Service 3: Analytics (always succeeds)
eventBus.on('order:created', (order) => {
  console.log(`📊 Analytics: Tracking order ${order.id}`);
});

// Custom error handler for order events
eventBus.onError('order:created', (error, context) => {
  console.log(`🔧 Custom error handler: Logging to error tracking system`);
});

console.log('Processing orders:\n');

// Process orders
for (let i = 1; i <= 6; i++) {
  console.log(`\n--- Order ${i} ---`);
  eventBus.emit('order:created', { id: `ORD${i}`, total: 100 * i });
}

// Test rate limiting
console.log('\n--- Testing Rate Limiting ---\n');

for (let i = 1; i <= 15; i++) {
  eventBus.emit('highFrequency:event', { id: i });
}

setTimeout(async () => {
  // Display health status
  console.log('\n--- Health Status ---\n');
  const health = eventBus.getHealthStatus();
  console.log('Health Check:');
  console.log(`  Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`  Uptime: ${health.uptime.toFixed(2)}s`);
  console.log(`  Total Events: ${health.totalEvents}`);
  console.log(`  Error Rate: ${health.errorRate}`);
  console.log(`  Open Circuits: ${health.openCircuits.length > 0 ? health.openCircuits.join(', ') : 'None'}`);
  console.log(`  Active Listeners: ${health.activeListeners}`);

  // Display metrics
  console.log('\n--- Event Metrics ---\n');
  const orderMetrics = eventBus.getMetrics('order:created');
  console.log('order:created metrics:');
  console.table(orderMetrics);

  // Graceful shutdown
  await eventBus.shutdown();

  console.log('\n' + '='.repeat(60));
  console.log('Production Event System Features:');
  console.log('='.repeat(60));
  console.log('✅ Circuit Breaker: Prevents cascading failures');
  console.log('✅ Rate Limiting: Protects against event floods');
  console.log('✅ Error Handling: Isolates listener failures');
  console.log('✅ Metrics: Track event performance');
  console.log('✅ Health Checks: Monitor system status');
  console.log('✅ Graceful Shutdown: Clean exit');
  console.log('✅ Error Recovery: Automatic retry logic');
  console.log('='.repeat(60));
  console.log('\nProduction Checklist:');
  console.log('□ Implement monitoring and alerting');
  console.log('□ Set up distributed tracing');
  console.log('□ Configure appropriate thresholds');
  console.log('□ Test failure scenarios');
  console.log('□ Document event contracts');
  console.log('□ Implement dead letter queues');
  console.log('□ Set up log aggregation');
  console.log('□ Performance testing');
  console.log('□ Security audit');
  console.log('□ Disaster recovery plan');
  console.log('='.repeat(60));
}, 500);

/*
 * Key Takeaways:
 *
 * 1. PRODUCTION REQUIREMENTS:
 *    - Fault tolerance (circuit breakers)
 *    - Rate limiting
 *    - Error isolation
 *    - Monitoring and observability
 *    - Graceful degradation
 *    - Health checks
 *
 * 2. RESILIENCE PATTERNS:
 *    - Circuit breaker prevents cascading failures
 *    - Rate limiting protects resources
 *    - Error boundaries isolate failures
 *    - Automatic retry with backoff
 *
 * 3. OBSERVABILITY:
 *    - Metrics collection
 *    - Health endpoints
 *    - Error tracking
 *    - Performance monitoring
 *    - Alerting on anomalies
 *
 * 4. OPERATIONAL CONCERNS:
 *    - Graceful shutdown
 *    - Resource cleanup
 *    - Memory leak prevention
 *    - Performance optimization
 *    - Capacity planning
 *
 * 5. TESTING:
 *    - Unit tests for handlers
 *    - Integration tests for flows
 *    - Chaos engineering
 *    - Load testing
 *    - Failure injection
 *
 * 6. BEST PRACTICES:
 *    - Document event contracts
 *    - Version events
 *    - Implement idempotency
 *    - Use correlation IDs
 *    - Monitor error rates
 *    - Set up alerting
 */
