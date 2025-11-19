/**
 * Example 6: Centralized Event Bus
 *
 * This example demonstrates:
 * - Building a centralized event bus
 * - Cross-module communication
 * - Namespace isolation
 * - Event middleware
 * - Event logging and debugging
 * - Plugin architecture
 */

const EventEmitter = require('events');

console.log('=== Centralized Event Bus ===\n');

// ============================================================================
// Part 1: Basic Event Bus
// ============================================================================

console.log('--- Part 1: Basic Event Bus ---\n');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
    this.modules = new Map();
  }

  /**
   * Register a module with the bus
   */
  registerModule(name, module) {
    if (this.modules.has(name)) {
      throw new Error(`Module ${name} already registered`);
    }

    this.modules.set(name, module);

    // Initialize module with bus reference
    if (typeof module.initialize === 'function') {
      module.initialize(this);
    }

    this.emit('module:registered', { name, module });
    console.log(`✅ Registered module: ${name}`);
  }

  /**
   * Unregister a module
   */
  unregisterModule(name) {
    const module = this.modules.get(name);

    if (module && typeof module.cleanup === 'function') {
      module.cleanup(this);
    }

    this.modules.delete(name);
    this.emit('module:unregistered', { name });
  }

  /**
   * Get a registered module
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * List all registered modules
   */
  listModules() {
    return Array.from(this.modules.keys());
  }
}

// Create modules that communicate via the bus
const UserModule = {
  name: 'UserModule',

  initialize(bus) {
    this.bus = bus;

    // Listen to auth events
    bus.on('auth:login', (data) => {
      console.log(`[UserModule] User logged in: ${data.username}`);
      // Load user profile
      bus.emit('user:profileLoaded', {
        username: data.username,
        profile: { name: 'Alice', email: 'alice@example.com' }
      });
    });
  },

  cleanup(bus) {
    bus.removeAllListeners('auth:login');
  }
};

const NotificationModule = {
  name: 'NotificationModule',

  initialize(bus) {
    this.bus = bus;

    // Listen to user events
    bus.on('user:profileLoaded', (data) => {
      console.log(`[NotificationModule] Sending welcome notification to ${data.username}`);
    });

    // Listen to order events
    bus.on('order:created', (data) => {
      console.log(`[NotificationModule] Sending order confirmation for ${data.orderId}`);
    });
  },

  cleanup(bus) {
    bus.removeAllListeners('user:profileLoaded');
    bus.removeAllListeners('order:created');
  }
};

const AnalyticsModule = {
  name: 'AnalyticsModule',

  initialize(bus) {
    this.bus = bus;
    this.events = [];

    // Track all events
    bus.on('auth:login', (data) => this.track('login', data));
    bus.on('user:profileLoaded', (data) => this.track('profile_loaded', data));
    bus.on('order:created', (data) => this.track('order_created', data));
  },

  track(eventType, data) {
    this.events.push({ type: eventType, timestamp: Date.now(), data });
    console.log(`[AnalyticsModule] Tracked: ${eventType}`);
  },

  cleanup(bus) {
    bus.removeAllListeners('auth:login');
    bus.removeAllListeners('user:profileLoaded');
    bus.removeAllListeners('order:created');
  }
};

// Use the event bus
const bus = new EventBus();

console.log('Registering modules:\n');
bus.registerModule('user', UserModule);
bus.registerModule('notification', NotificationModule);
bus.registerModule('analytics', AnalyticsModule);

console.log('\nEmitting events through the bus:\n');

bus.emit('auth:login', { username: 'alice', timestamp: Date.now() });

console.log('\n✅ All modules communicated through the centralized bus\n');

setTimeout(continuePart2, 100);

// ============================================================================
// Part 2: Namespaced Event Bus
// ============================================================================

function continuePart2() {
  console.log('--- Part 2: Namespace Isolation ---\n');

  class NamespacedEventBus extends EventBus {
    constructor() {
      super();
      this.namespaces = new Map();
    }

    /**
     * Get or create a namespace
     */
    namespace(name) {
      if (!this.namespaces.has(name)) {
        const ns = new NamespaceProxy(this, name);
        this.namespaces.set(name, ns);
      }

      return this.namespaces.get(name);
    }

    /**
     * Emit event with namespace prefix
     */
    nsEmit(namespace, event, ...args) {
      return this.emit(`${namespace}:${event}`, ...args);
    }

    /**
     * Listen to namespaced event
     */
    nsOn(namespace, event, handler) {
      return this.on(`${namespace}:${event}`, handler);
    }
  }

  class NamespaceProxy {
    constructor(bus, namespace) {
      this.bus = bus;
      this.namespace = namespace;
    }

    emit(event, ...args) {
      return this.bus.nsEmit(this.namespace, event, ...args);
    }

    on(event, handler) {
      return this.bus.nsOn(this.namespace, event, handler);
    }

    once(event, handler) {
      return this.bus.once(`${this.namespace}:${event}`, handler);
    }

    off(event, handler) {
      return this.bus.off(`${this.namespace}:${event}`, handler);
    }
  }

  const nsBus = new NamespacedEventBus();

  // Create namespaces for different domains
  const authNs = nsBus.namespace('auth');
  const userNs = nsBus.namespace('user');
  const orderNs = nsBus.namespace('order');

  console.log('Setting up namespaced listeners:\n');

  authNs.on('login', (data) => {
    console.log(`[auth namespace] Login: ${data.username}`);
  });

  userNs.on('created', (data) => {
    console.log(`[user namespace] User created: ${data.username}`);
  });

  orderNs.on('created', (data) => {
    console.log(`[order namespace] Order created: ${data.orderId}`);
  });

  console.log('Emitting events in different namespaces:\n');

  authNs.emit('login', { username: 'bob' });
  userNs.emit('created', { username: 'bob' });
  orderNs.emit('created', { orderId: 'ORD1' });

  console.log('\n✅ Namespaces provide isolation between different domains\n');

  setTimeout(continuePart3, 100);
}

// ============================================================================
// Part 3: Event Middleware
// ============================================================================

function continuePart3() {
  console.log('--- Part 3: Event Middleware ---\n');

  class MiddlewareEventBus extends EventBus {
    constructor() {
      super();
      this.middleware = [];
    }

    /**
     * Add middleware function
     */
    use(middleware) {
      this.middleware.push(middleware);
    }

    /**
     * Emit with middleware chain
     */
    emit(event, ...args) {
      const context = {
        event,
        args,
        cancelled: false,
        metadata: {}
      };

      // Run middleware chain
      for (const mw of this.middleware) {
        mw(context, () => {});

        if (context.cancelled) {
          console.log(`⚠️  Event ${event} cancelled by middleware`);
          return false;
        }
      }

      // Emit the event with potentially modified args
      return super.emit(event, ...context.args);
    }
  }

  const mwBus = new MiddlewareEventBus();

  console.log('Adding middleware:\n');

  // Middleware 1: Logging
  mwBus.use((context, next) => {
    console.log(`📝 [Logger] Event: ${context.event}`);
    next();
  });

  // Middleware 2: Validation
  mwBus.use((context, next) => {
    if (context.event === 'user:create') {
      const data = context.args[0];
      if (!data || !data.username) {
        console.log(`❌ [Validator] Invalid user data`);
        context.cancelled = true;
        return;
      }
    }
    next();
  });

  // Middleware 3: Timestamp injection
  mwBus.use((context, next) => {
    context.metadata.timestamp = Date.now();
    console.log(`⏰ [Timestamp] Added timestamp`);
    next();
  });

  // Middleware 4: Rate limiting (simplified)
  const rateLimits = new Map();
  mwBus.use((context, next) => {
    const key = `${context.event}:rate`;
    const now = Date.now();
    const lastCall = rateLimits.get(key) || 0;

    if (now - lastCall < 100) {
      console.log(`⚠️  [RateLimit] Event ${context.event} rate limited`);
      context.cancelled = true;
      return;
    }

    rateLimits.set(key, now);
    next();
  });

  console.log('\nTesting middleware:\n');

  mwBus.on('user:create', (data) => {
    console.log(`✅ User created: ${data.username}`);
  });

  console.log('Valid event:');
  mwBus.emit('user:create', { username: 'charlie' });

  console.log('\nInvalid event (no username):');
  mwBus.emit('user:create', {});

  console.log('\nValid event again:');
  mwBus.emit('user:create', { username: 'david' });

  setTimeout(continuePart4, 100);
}

// ============================================================================
// Part 4: Event Debugging and Logging
// ============================================================================

function continuePart4() {
  console.log('\n--- Part 4: Event Debugging and Monitoring ---\n');

  class DebugEventBus extends EventBus {
    constructor(options = {}) {
      super();
      this.enableDebug = options.debug || false;
      this.eventLog = [];
      this.maxLogSize = options.maxLogSize || 1000;
    }

    emit(event, ...args) {
      const entry = {
        event,
        args,
        timestamp: Date.now(),
        listenerCount: this.listenerCount(event),
        stack: this.enableDebug ? new Error().stack : null
      };

      this.eventLog.push(entry);

      if (this.eventLog.length > this.maxLogSize) {
        this.eventLog.shift();
      }

      if (this.enableDebug) {
        console.log(`🐛 [DEBUG] Emit: ${event}`);
        console.log(`   Listeners: ${entry.listenerCount}`);
        console.log(`   Args:`, args);
      }

      return super.emit(event, ...args);
    }

    on(event, handler) {
      if (this.enableDebug) {
        console.log(`🐛 [DEBUG] Listener added for: ${event}`);
      }

      return super.on(event, handler);
    }

    getEventLog(filter) {
      if (!filter) return this.eventLog;

      return this.eventLog.filter(entry => {
        if (typeof filter === 'string') {
          return entry.event === filter;
        }
        if (typeof filter === 'function') {
          return filter(entry);
        }
        return true;
      });
    }

    getEventStats() {
      const stats = {};

      this.eventLog.forEach(entry => {
        if (!stats[entry.event]) {
          stats[entry.event] = { count: 0, avgListeners: 0 };
        }

        stats[entry.event].count++;
        stats[entry.event].avgListeners += entry.listenerCount;
      });

      Object.keys(stats).forEach(event => {
        stats[event].avgListeners =
          (stats[event].avgListeners / stats[event].count).toFixed(2);
      });

      return stats;
    }

    clearLog() {
      this.eventLog = [];
    }
  }

  const debugBus = new DebugEventBus({ debug: true });

  console.log('Event bus with debugging enabled:\n');

  debugBus.on('test:event', (data) => {});
  debugBus.on('test:event', (data) => {});

  debugBus.emit('test:event', { value: 123 });
  debugBus.emit('test:event', { value: 456 });
  debugBus.emit('other:event', 'data');

  console.log('\n📊 Event Statistics:');
  console.table(debugBus.getEventStats());

  setTimeout(continuePart5, 100);
}

// ============================================================================
// Part 5: Plugin Architecture with Event Bus
// ============================================================================

function continuePart5() {
  console.log('\n--- Part 5: Plugin Architecture ---\n');

  class PluginEventBus extends EventBus {
    constructor() {
      super();
      this.plugins = new Map();
    }

    /**
     * Register a plugin
     */
    registerPlugin(name, plugin) {
      if (this.plugins.has(name)) {
        throw new Error(`Plugin ${name} already registered`);
      }

      // Initialize plugin
      if (typeof plugin.install === 'function') {
        plugin.install(this);
      }

      this.plugins.set(name, plugin);
      this.emit('plugin:registered', { name, plugin });

      console.log(`🔌 Plugin registered: ${name}`);
    }

    /**
     * Unregister a plugin
     */
    unregisterPlugin(name) {
      const plugin = this.plugins.get(name);

      if (plugin && typeof plugin.uninstall === 'function') {
        plugin.uninstall(this);
      }

      this.plugins.delete(name);
      this.emit('plugin:unregistered', { name });
    }

    /**
     * Get plugin by name
     */
    getPlugin(name) {
      return this.plugins.get(name);
    }
  }

  // Example plugins
  const LoggerPlugin = {
    name: 'Logger',

    install(bus) {
      this.logFile = [];

      this.handler = (event, ...args) => {
        this.logFile.push({
          event,
          args,
          timestamp: new Date().toISOString()
        });
      };

      // Log all events
      const originalEmit = bus.emit.bind(bus);
      bus.emit = (event, ...args) => {
        this.handler(event, ...args);
        return originalEmit(event, ...args);
      };

      console.log('  Logger plugin initialized');
    },

    uninstall(bus) {
      console.log('  Logger plugin removed');
    },

    getLogs() {
      return this.logFile;
    }
  };

  const MetricsPlugin = {
    name: 'Metrics',

    install(bus) {
      this.metrics = new Map();

      bus.on('*', (event) => {
        if (!this.metrics.has(event)) {
          this.metrics.set(event, 0);
        }
        this.metrics.set(event, this.metrics.get(event) + 1);
      });

      // Intercept emit to track metrics
      const originalEmit = bus.emit.bind(bus);
      bus.emit = (event, ...args) => {
        if (!this.metrics.has(event)) {
          this.metrics.set(event, 0);
        }
        this.metrics.set(event, this.metrics.get(event) + 1);
        return originalEmit(event, ...args);
      };

      console.log('  Metrics plugin initialized');
    },

    getMetrics() {
      return Object.fromEntries(this.metrics);
    }
  };

  const CachePlugin = {
    name: 'Cache',

    install(bus) {
      this.cache = new Map();

      bus.on('cache:get', (key, callback) => {
        const value = this.cache.get(key);
        callback(value);
      });

      bus.on('cache:set', ({ key, value }) => {
        this.cache.set(key, value);
        console.log(`  [Cache] Set: ${key}`);
      });

      console.log('  Cache plugin initialized');
    },

    uninstall(bus) {
      this.cache.clear();
    }
  };

  // Use plugin system
  const pluginBus = new PluginEventBus();

  console.log('Installing plugins:\n');

  pluginBus.registerPlugin('logger', LoggerPlugin);
  pluginBus.registerPlugin('metrics', MetricsPlugin);
  pluginBus.registerPlugin('cache', CachePlugin);

  console.log('\nUsing the event bus with plugins:\n');

  pluginBus.emit('user:login', { username: 'alice' });
  pluginBus.emit('user:login', { username: 'bob' });
  pluginBus.emit('order:created', { orderId: 'ORD1' });
  pluginBus.emit('cache:set', { key: 'user:1', value: { name: 'Alice' } });

  console.log('\n📊 Metrics from plugin:');
  console.log(pluginBus.getPlugin('metrics').getMetrics());

  console.log('\n' + '='.repeat(60));
  console.log('Event Bus Benefits:');
  console.log('='.repeat(60));
  console.log('✅ Centralized communication');
  console.log('✅ Module isolation and independence');
  console.log('✅ Plugin architecture support');
  console.log('✅ Middleware for cross-cutting concerns');
  console.log('✅ Built-in debugging and monitoring');
  console.log('✅ Namespace isolation');
  console.log('✅ Easy to test modules independently');
  console.log('='.repeat(60));
}

/*
 * Key Takeaways:
 *
 * 1. EVENT BUS BENEFITS:
 *    - Centralized communication hub
 *    - Loose coupling between modules
 *    - Easy to add/remove modules
 *    - Plugin architecture support
 *
 * 2. KEY FEATURES:
 *    - Module registration
 *    - Namespace isolation
 *    - Middleware support
 *    - Event logging/debugging
 *    - Plugin system
 *
 * 3. PATTERNS:
 *    - Module pattern: Self-contained modules
 *    - Middleware pattern: Cross-cutting concerns
 *    - Plugin pattern: Extensibility
 *    - Namespace pattern: Domain isolation
 *
 * 4. USE CASES:
 *    - Modular applications
 *    - Microservices communication (in-process)
 *    - Plugin systems
 *    - Cross-cutting concerns (logging, metrics)
 *    - Testing (mock modules)
 */
