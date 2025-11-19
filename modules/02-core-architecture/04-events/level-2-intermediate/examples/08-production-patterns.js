/**
 * Example 8: Production Patterns
 *
 * This example demonstrates:
 * - Combining all intermediate concepts
 * - Production-ready event-driven architecture
 * - Real-world application patterns
 * - Best practices in action
 * - Scalable event systems
 */

const EventEmitter = require('events');

console.log('=== Production Event Patterns ===\n');

console.log('--- Complete Application Example ---\n');

/**
 * Production-ready EventEmitter wrapper with:
 * - Error handling
 * - Middleware support
 * - Listener management
 * - Memory leak prevention
 * - Logging and debugging
 */
class ProductionEmitter extends EventEmitter {
  constructor(name, options = {}) {
    super();

    this.name = name;
    this.options = {
      maxListeners: options.maxListeners || 20,
      enableLogging: options.enableLogging !== false,
      enableMetrics: options.enableMetrics !== false,
      errorHandler: options.errorHandler || null
    };

    // Set max listeners
    this.setMaxListeners(this.options.maxListeners);

    // Middleware
    this.middleware = [];

    // Metrics
    this.metrics = {
      emitCount: {},
      errorCount: 0,
      listenerAdditions: 0,
      listenerRemovals: 0
    };

    // Listener registry for cleanup
    this.listenerRegistry = new Map();

    // Setup error handler
    this.setupErrorHandler();

    // Track listener additions/removals
    this.on('newListener', () => {
      this.metrics.listenerAdditions++;
    });

    this.on('removeListener', () => {
      this.metrics.listenerRemovals++;
    });
  }

  setupErrorHandler() {
    if (this.options.errorHandler) {
      this.on('error', this.options.errorHandler);
    } else {
      this.on('error', (error, context = {}) => {
        console.error(`[${this.name}] Error:`, error.message);
        if (context.event) {
          console.error(`  Event: ${context.event}`);
        }
        this.metrics.errorCount++;
      });
    }
  }

  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  async emitAsync(event, data) {
    if (this.options.enableLogging) {
      console.log(`[${this.name}] Emitting '${event}'`);
    }

    // Update metrics
    this.metrics.emitCount[event] = (this.metrics.emitCount[event] || 0) + 1;

    let processedData = data;

    // Run middleware
    try {
      for (const mw of this.middleware) {
        const result = await mw(event, processedData);
        if (result === false) {
          return false;
        }
        if (result !== undefined && result !== true) {
          processedData = result;
        }
      }
    } catch (error) {
      this.emit('error', error, { event, data });
      return false;
    }

    // Emit event
    try {
      this.emit(event, processedData);
      return true;
    } catch (error) {
      this.emit('error', error, { event, data: processedData });
      return false;
    }
  }

  registerListener(event, listener, owner) {
    this.on(event, listener);

    if (!this.listenerRegistry.has(owner)) {
      this.listenerRegistry.set(owner, []);
    }

    this.listenerRegistry.get(owner).push({ event, listener });
  }

  cleanupOwner(owner) {
    const listeners = this.listenerRegistry.get(owner);
    if (!listeners) return 0;

    listeners.forEach(({ event, listener }) => {
      this.removeListener(event, listener);
    });

    this.listenerRegistry.delete(owner);
    return listeners.length;
  }

  getMetrics() {
    return {
      ...this.metrics,
      totalListeners: this.eventNames().reduce((sum, event) => {
        return sum + this.listenerCount(event);
      }, 0),
      events: this.eventNames()
    };
  }
}

/**
 * User Service with comprehensive event handling
 */
class UserService extends ProductionEmitter {
  constructor() {
    super('UserService', {
      maxListeners: 30,
      enableLogging: true,
      enableMetrics: true
    });

    this.users = new Map();

    // Add middleware
    this.use(async (event, data) => {
      // Add timestamp to all events
      return { ...data, timestamp: Date.now() };
    });

    this.use(async (event, data) => {
      // Validate data
      if (event.startsWith('user:') && !data.username && !data.userId) {
        throw new Error('Username or userId required');
      }
      return data;
    });
  }

  async createUser(username, email) {
    if (this.users.has(username)) {
      const error = new Error(`User ${username} already exists`);
      await this.emitAsync('user:create:failed', {
        username,
        reason: error.message
      });
      throw error;
    }

    const user = {
      username,
      email,
      id: Date.now(),
      createdAt: new Date()
    };

    this.users.set(username, user);

    await this.emitAsync('user:created', {
      username: user.username,
      userId: user.id
    });

    return user;
  }

  async deleteUser(username) {
    if (!this.users.has(username)) {
      const error = new Error(`User ${username} not found`);
      await this.emitAsync('user:delete:failed', {
        username,
        reason: error.message
      });
      throw error;
    }

    const user = this.users.get(username);
    this.users.delete(username);

    await this.emitAsync('user:deleted', {
      username: user.username,
      userId: user.id
    });

    return true;
  }

  async authenticateUser(username, password) {
    await this.emitAsync('user:auth:attempt', { username });

    const user = this.users.get(username);

    if (!user) {
      await this.emitAsync('user:auth:failed', {
        username,
        reason: 'User not found'
      });
      return null;
    }

    // Simulate auth
    const authenticated = true;

    if (authenticated) {
      await this.emitAsync('user:auth:success', {
        username: user.username,
        userId: user.id
      });
      return user;
    }

    return null;
  }
}

/**
 * Audit Logger - listens to all user events
 */
class AuditLogger {
  constructor(service) {
    this.service = service;
    this.logs = [];

    // Register all listeners
    service.registerListener('user:created', this.logCreate.bind(this), 'AuditLogger');
    service.registerListener('user:deleted', this.logDelete.bind(this), 'AuditLogger');
    service.registerListener('user:auth:attempt', this.logAuthAttempt.bind(this), 'AuditLogger');
    service.registerListener('user:auth:success', this.logAuthSuccess.bind(this), 'AuditLogger');
    service.registerListener('user:auth:failed', this.logAuthFailure.bind(this), 'AuditLogger');
  }

  log(action, data) {
    const entry = {
      action,
      data,
      timestamp: new Date()
    };
    this.logs.push(entry);
    console.log(`[Audit] ${action}:`, data.username || data.userId);
  }

  logCreate(data) {
    this.log('USER_CREATED', data);
  }

  logDelete(data) {
    this.log('USER_DELETED', data);
  }

  logAuthAttempt(data) {
    this.log('AUTH_ATTEMPT', data);
  }

  logAuthSuccess(data) {
    this.log('AUTH_SUCCESS', data);
  }

  logAuthFailure(data) {
    this.log('AUTH_FAILURE', data);
  }

  getAuditTrail() {
    return this.logs;
  }

  cleanup() {
    this.service.cleanupOwner('AuditLogger');
    console.log('[Audit] Cleaned up listeners');
  }
}

/**
 * Email Service - sends notifications
 */
class EmailService {
  constructor(service) {
    this.service = service;

    service.registerListener('user:created', this.sendWelcome.bind(this), 'EmailService');
    service.registerListener('user:deleted', this.sendGoodbye.bind(this), 'EmailService');
  }

  sendWelcome(data) {
    console.log(`[Email] Sending welcome email to user ${data.username}`);
  }

  sendGoodbye(data) {
    console.log(`[Email] Sending account deletion confirmation to user ${data.username}`);
  }

  cleanup() {
    this.service.cleanupOwner('EmailService');
    console.log('[Email] Cleaned up listeners');
  }
}

/**
 * Analytics Service - tracks metrics
 */
class AnalyticsService {
  constructor(service) {
    this.service = service;
    this.stats = {
      usersCreated: 0,
      usersDeleted: 0,
      authAttempts: 0,
      authSuccesses: 0,
      authFailures: 0
    };

    service.on('user:created', () => this.stats.usersCreated++);
    service.on('user:deleted', () => this.stats.usersDeleted++);
    service.on('user:auth:attempt', () => this.stats.authAttempts++);
    service.on('user:auth:success', () => this.stats.authSuccesses++);
    service.on('user:auth:failed', () => this.stats.authFailures++);
  }

  getStats() {
    return { ...this.stats };
  }

  report() {
    console.log('[Analytics] Current Stats:', this.stats);
  }
}

// Create the system
const userService = new UserService();
const auditLogger = new AuditLogger(userService);
const emailService = new EmailService(userService);
const analytics = new AnalyticsService(userService);

console.log('System initialized with:');
console.log('- UserService (main service)');
console.log('- AuditLogger (tracks all user events)');
console.log('- EmailService (sends notifications)');
console.log('- AnalyticsService (tracks metrics)');

// Use the system
(async () => {
  try {
    console.log('\n--- Creating Users ---\n');

    await userService.createUser('alice', 'alice@example.com');
    await userService.createUser('bob', 'bob@example.com');
    await userService.createUser('charlie', 'charlie@example.com');

    console.log('\n--- Authenticating Users ---\n');

    await userService.authenticateUser('alice', 'password123');
    await userService.authenticateUser('bob', 'wrongpass');
    await userService.authenticateUser('charlie', 'secret');

    console.log('\n--- Deleting User ---\n');

    await userService.deleteUser('bob');

    console.log('\n--- Trying Invalid Operations ---\n');

    try {
      await userService.createUser('alice', 'duplicate@example.com');
    } catch (error) {
      console.log('Expected error caught:', error.message);
    }

    try {
      await userService.deleteUser('nonexistent');
    } catch (error) {
      console.log('Expected error caught:', error.message);
    }

    console.log('\n--- System Metrics ---\n');

    console.log('Service Metrics:', userService.getMetrics());
    analytics.report();

    console.log('\n--- Audit Trail ---\n');

    const trail = auditLogger.getAuditTrail();
    console.log(`Total audit entries: ${trail.length}`);
    trail.forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.action} - ${entry.timestamp.toISOString()}`);
    });

    console.log('\n--- Cleanup ---\n');

    // Clean up services
    auditLogger.cleanup();
    emailService.cleanup();

    console.log('\nFinal metrics:', userService.getMetrics());

    console.log('\n=== Example Complete ===');

  } catch (error) {
    console.error('Fatal error:', error);
  }
})();

/*
 * Key Takeaways - Production Patterns:
 *
 * 1. Architecture:
 *    - Extend EventEmitter for domain services
 *    - Separate concerns into different services
 *    - Use events for cross-cutting concerns
 *
 * 2. Error Handling:
 *    - Always have error event listeners
 *    - Wrap operations in try-catch
 *    - Emit specific error events
 *
 * 3. Middleware:
 *    - Use for cross-cutting concerns
 *    - Add timestamps, validation, logging
 *    - Keep middleware focused and simple
 *
 * 4. Listener Management:
 *    - Track listeners by owner
 *    - Implement cleanup methods
 *    - Prevent memory leaks
 *
 * 5. Metrics and Monitoring:
 *    - Track emit counts
 *    - Monitor listener counts
 *    - Collect business metrics
 *
 * 6. Namespacing:
 *    - Use clear event names: 'module:action'
 *    - Include success/failure variants
 *    - Document all events
 *
 * 7. Async Operations:
 *    - Use emitAsync for I/O-heavy operations
 *    - Handle async errors properly
 *    - Consider event ordering
 *
 * 8. Testing:
 *    - Events make code highly testable
 *    - Easy to mock and spy on events
 *    - Can test components in isolation
 *
 * 9. Scalability:
 *    - Loose coupling enables scaling
 *    - Easy to add/remove services
 *    - Can distribute across processes
 *
 * 10. Documentation:
 *     - Document all emitted events
 *     - Include event payload schemas
 *     - Provide usage examples
 */
