/**
 * Example 2: Error Handling Patterns
 *
 * This example demonstrates:
 * - Advanced error event handling strategies
 * - Centralized error management
 * - Error recovery and retry patterns
 * - Error propagation in event chains
 * - Defensive error handling techniques
 */

const EventEmitter = require('events');

console.log('=== Advanced Error Handling Patterns ===\n');

console.log('--- Pattern 1: Defensive Error Handling ---\n');

// Wrap emit in try-catch to prevent listener errors from crashing
class SafeEmitter extends EventEmitter {
  safeEmit(event, ...args) {
    try {
      // Get the return value
      const hasListeners = this.emit(event, ...args);

      if (!hasListeners && event === 'error') {
        // No error listeners - throw to prevent silent failures
        throw args[0] || new Error('Unhandled error event');
      }

      return hasListeners;
    } catch (error) {
      // If emit itself fails, emit a special error
      if (event !== 'internalError') {
        this.emit('internalError', error);
      } else {
        // Last resort: log to console
        console.error('Critical error in event system:', error);
      }
      return false;
    }
  }
}

const safeEmitter = new SafeEmitter();

safeEmitter.on('data', (data) => {
  console.log('Processing:', data);
  if (data === 'bad') {
    throw new Error('Bad data!'); // This would normally crash
  }
});

safeEmitter.on('internalError', (err) => {
  console.error('[Internal Error Handler]:', err.message);
});

safeEmitter.safeEmit('data', 'good');
safeEmitter.safeEmit('data', 'bad'); // Error caught by safeEmit
safeEmitter.safeEmit('data', 'good again');

console.log('\n--- Pattern 2: Retry Logic ---\n');

class RetryEmitter extends EventEmitter {
  constructor() {
    super();
    this.retryAttempts = new Map();
  }

  emitWithRetry(event, data, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      backoff = true
    } = options;

    const attemptKey = `${event}-${Date.now()}`;
    let attempts = 0;

    const attempt = () => {
      attempts++;

      try {
        this.emit(event, data);
        this.emit('retry:success', {
          event,
          attempts
        });
      } catch (error) {
        console.log(`[Retry] Attempt ${attempts}/${maxRetries} failed`);

        if (attempts < maxRetries) {
          const delay = backoff ? retryDelay * attempts : retryDelay;
          setTimeout(attempt, delay);
        } else {
          this.emit('retry:failed', {
            event,
            data,
            error,
            attempts
          });
        }
      }
    };

    attempt();
  }
}

const retryEmitter = new RetryEmitter();

let callCount = 0;
retryEmitter.on('flaky-operation', (data) => {
  callCount++;
  console.log(`[Operation] Attempt ${callCount} with data:`, data);

  // Simulate failure on first 2 attempts
  if (callCount < 3) {
    throw new Error('Operation failed');
  }

  console.log('[Operation] Success!');
});

retryEmitter.on('retry:success', ({ attempts }) => {
  console.log(`[Retry] Succeeded after ${attempts} attempts\n`);
});

retryEmitter.on('retry:failed', ({ event, attempts, error }) => {
  console.error(`[Retry] Failed after ${attempts} attempts`);
  console.error('Last error:', error.message);
});

retryEmitter.emitWithRetry('flaky-operation', { id: 123 }, {
  maxRetries: 5,
  retryDelay: 100
});

setTimeout(() => {
  console.log('\n--- Pattern 3: Centralized Error Handler ---\n');

  class Application extends EventEmitter {
    constructor() {
      super();

      // Centralized error handling
      this.on('error', this.handleError.bind(this));

      // Set up domain-specific error handlers
      this.errorHandlers = {
        'database': this.handleDatabaseError.bind(this),
        'network': this.handleNetworkError.bind(this),
        'validation': this.handleValidationError.bind(this),
        'auth': this.handleAuthError.bind(this)
      };
    }

    handleError(error, context = {}) {
      const errorType = context.type || 'unknown';

      console.log(`[Error Handler] ${errorType} error:`, error.message);

      // Route to specific handler if available
      const handler = this.errorHandlers[errorType];
      if (handler) {
        handler(error, context);
      } else {
        this.handleUnknownError(error, context);
      }

      // Log to monitoring service (simulated)
      this.logToMonitoring(error, context);
    }

    handleDatabaseError(error, context) {
      console.log('[DB Error Handler] Attempting to reconnect...');
      this.emit('database:reconnect');
    }

    handleNetworkError(error, context) {
      console.log('[Network Error Handler] Retrying request...');
      this.emit('network:retry', context);
    }

    handleValidationError(error, context) {
      console.log('[Validation Error Handler] Returning validation errors');
      this.emit('validation:failed', {
        field: context.field,
        message: error.message
      });
    }

    handleAuthError(error, context) {
      console.log('[Auth Error Handler] Clearing session');
      this.emit('auth:logout', { reason: 'error' });
    }

    handleUnknownError(error, context) {
      console.log('[Unknown Error Handler] Logging and continuing');
    }

    logToMonitoring(error, context) {
      // Simulate sending to monitoring service
      console.log('[Monitoring] Error logged:', {
        message: error.message,
        type: context.type,
        timestamp: new Date().toISOString()
      });
    }
  }

  const app = new Application();

  // Simulate different types of errors
  app.emit('error', new Error('Connection timeout'), {
    type: 'database',
    operation: 'query'
  });

  console.log();

  app.emit('error', new Error('Request failed'), {
    type: 'network',
    url: '/api/data'
  });

  console.log();

  app.emit('error', new Error('Invalid email format'), {
    type: 'validation',
    field: 'email'
  });

  console.log();

  app.emit('error', new Error('Token expired'), {
    type: 'auth',
    userId: 123
  });

  setTimeout(() => {
    console.log('\n--- Pattern 4: Error Recovery ---\n');

    class ResilientService extends EventEmitter {
      constructor() {
        super();
        this.healthy = true;
        this.errorCount = 0;
        this.errorThreshold = 3;
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
      }

      processTask(task) {
        if (!this.healthy) {
          this.emit('error', new Error('Service is unhealthy'), {
            task,
            action: 'queued'
          });
          return;
        }

        try {
          // Simulate processing
          if (task.shouldFail) {
            throw new Error('Task processing failed');
          }

          console.log('[Service] Task completed:', task.id);
          this.emit('task:completed', task);
          this.errorCount = 0; // Reset error count on success

        } catch (error) {
          this.errorCount++;
          console.log(`[Service] Error count: ${this.errorCount}/${this.errorThreshold}`);

          this.emit('error', error, { task });

          if (this.errorCount >= this.errorThreshold) {
            this.enterUnhealthyState();
          }
        }
      }

      enterUnhealthyState() {
        this.healthy = false;
        console.log('[Service] Entering unhealthy state');
        this.emit('service:unhealthy');

        // Start recovery process
        this.attemptRecovery();
      }

      attemptRecovery() {
        this.recoveryAttempts++;

        if (this.recoveryAttempts > this.maxRecoveryAttempts) {
          console.log('[Service] Max recovery attempts reached');
          this.emit('service:failed');
          return;
        }

        console.log(`[Service] Recovery attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`);
        this.emit('service:recovering');

        // Simulate recovery delay
        setTimeout(() => {
          // Simulate recovery (50% success rate)
          const recovered = Math.random() > 0.3;

          if (recovered) {
            this.healthy = true;
            this.errorCount = 0;
            this.recoveryAttempts = 0;
            console.log('[Service] Recovery successful');
            this.emit('service:recovered');
          } else {
            console.log('[Service] Recovery failed');
            this.attemptRecovery();
          }
        }, 500);
      }

      reset() {
        this.healthy = true;
        this.errorCount = 0;
        this.recoveryAttempts = 0;
        this.emit('service:reset');
      }
    }

    const service = new ResilientService();

    service.on('task:completed', (task) => {
      console.log('[Monitor] Task completed:', task.id);
    });

    service.on('error', (error, context) => {
      console.log('[Monitor] Error occurred:', error.message);
    });

    service.on('service:unhealthy', () => {
      console.log('[Monitor] Service became unhealthy!');
    });

    service.on('service:recovering', () => {
      console.log('[Monitor] Service attempting recovery...');
    });

    service.on('service:recovered', () => {
      console.log('[Monitor] Service recovered successfully!');
    });

    service.on('service:failed', () => {
      console.log('[Monitor] Service failed completely!');
    });

    // Process tasks
    service.processTask({ id: 1, shouldFail: false });
    service.processTask({ id: 2, shouldFail: true });
    service.processTask({ id: 3, shouldFail: true });
    service.processTask({ id: 4, shouldFail: true }); // Triggers unhealthy

    setTimeout(() => {
      service.processTask({ id: 5, shouldFail: false }); // Should be queued
      console.log('\n=== Example Complete ===');
    }, 3000);

  }, 600);
}, 800);

/*
 * Key Takeaways:
 * 1. Always have error event listeners to prevent crashes
 * 2. Use try-catch around emit if listener errors are possible
 * 3. Implement retry logic for transient failures
 * 4. Centralize error handling for consistent behavior
 * 5. Route errors to domain-specific handlers
 * 6. Implement circuit breaker patterns for resilience
 * 7. Include context with errors for better debugging
 * 8. Track error rates to detect systemic issues
 * 9. Implement automatic recovery mechanisms
 * 10. Always log errors for monitoring and debugging
 */
