/**
 * Example 1: Memory Leak Detection
 *
 * This example demonstrates:
 * - Common patterns that cause memory leaks
 * - How to detect memory leaks
 * - Monitoring listener counts
 * - Automatic leak detection
 * - Prevention strategies
 */

const EventEmitter = require('events');

console.log('=== Memory Leak Detection ===\n');

// ============================================================================
// Part 1: Common Memory Leak Pattern
// ============================================================================

console.log('--- Part 1: Common Memory Leak Pattern ---\n');

class LeakyService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.data = new Array(100000).fill('Large data chunk');

    // ❌ MEMORY LEAK: This creates a closure that holds reference to 'this'
    // If LeakyService instances are created repeatedly, old instances
    // cannot be garbage collected because event listeners still reference them
    this.eventBus.on('process', () => {
      console.log(`Processing with data size: ${this.data.length}`);
    });
  }
}

// Simulate creating many service instances (causes leak)
const leakyBus = new EventEmitter();

console.log('Creating 5 LeakyService instances...');
for (let i = 0; i < 5; i++) {
  new LeakyService(leakyBus);
}

console.log(`Listener count after creating 5 instances: ${leakyBus.listenerCount('process')}`);
console.log('⚠️  Each instance adds a listener but never removes it!\n');

// ============================================================================
// Part 2: Leak Detection with Monitoring
// ============================================================================

console.log('--- Part 2: Automatic Leak Detection ---\n');

class LeakDetector extends EventEmitter {
  constructor(options = {}) {
    super();

    this.maxListeners = options.maxListeners || 10;
    this.checkInterval = options.checkInterval || 5000;
    this.warnings = new Map();

    this.setMaxListeners(this.maxListeners);
    this.startMonitoring();
  }

  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.checkForLeaks();
    }, this.checkInterval);
  }

  checkForLeaks() {
    const eventNames = this.eventNames();

    eventNames.forEach(event => {
      const count = this.listenerCount(event);
      const threshold = this.getMaxListeners();

      if (count > threshold * 0.8) {
        const warningKey = String(event);

        if (!this.warnings.has(warningKey)) {
          console.warn(`⚠️  WARNING: Event "${event}" has ${count} listeners (threshold: ${threshold})`);
          this.warnings.set(warningKey, {
            event,
            count,
            firstSeen: Date.now()
          });
        }
      }
    });
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }

  getLeakReport() {
    const report = {
      timestamp: new Date().toISOString(),
      warnings: Array.from(this.warnings.values()),
      events: this.eventNames().map(event => ({
        name: String(event),
        listenerCount: this.listenerCount(event)
      }))
    };

    return report;
  }
}

// Test leak detection
const detector = new LeakDetector({ maxListeners: 5 });

console.log('Adding listeners to trigger warnings...');

for (let i = 0; i < 7; i++) {
  detector.on('data', () => {});
}

// Wait a moment for monitoring to detect
setTimeout(() => {
  console.log('\nLeak Detection Report:');
  console.log(JSON.stringify(detector.getLeakReport(), null, 2));

  detector.stopMonitoring();
  continuePart3();
}, 1000);

// ============================================================================
// Part 3: Memory-Safe Pattern
// ============================================================================

function continuePart3() {
  console.log('\n--- Part 3: Memory-Safe Pattern ---\n');

  class SafeService {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.data = new Array(100000).fill('Large data chunk');

      // ✅ SAFE: Store handler reference for cleanup
      this.handler = this.handleProcess.bind(this);
      this.eventBus.on('process', this.handler);
    }

    handleProcess() {
      console.log(`Processing with data size: ${this.data.length}`);
    }

    // ✅ CRITICAL: Provide cleanup method
    cleanup() {
      console.log('Cleaning up service...');
      this.eventBus.off('process', this.handler);
      this.data = null; // Help garbage collector
    }
  }

  const safeBus = new EventEmitter();

  console.log('Creating 5 SafeService instances with proper cleanup...');
  const services = [];

  for (let i = 0; i < 5; i++) {
    services.push(new SafeService(safeBus));
  }

  console.log(`Listener count after creating 5 instances: ${safeBus.listenerCount('process')}`);

  // Clean up services
  console.log('\nCleaning up all services...');
  services.forEach(service => service.cleanup());

  console.log(`Listener count after cleanup: ${safeBus.listenerCount('process')}`);
  console.log('✅ All listeners properly removed!\n');

  continuePart4();
}

// ============================================================================
// Part 4: WeakMap-Based Handler Registry
// ============================================================================

function continuePart4() {
  console.log('--- Part 4: WeakMap-Based Handler Registry ---\n');

  class MemorySafeEmitter extends EventEmitter {
    constructor() {
      super();
      // WeakMap allows contexts to be garbage collected
      this.handlerRegistry = new WeakMap();
    }

    /**
     * Register an event handler with automatic cleanup capability
     * @param {string} event - Event name
     * @param {Function} handler - Handler function
     * @param {Object} context - Context object (used for cleanup)
     */
    safeOn(event, handler, context) {
      const boundHandler = handler.bind(context);

      // Store handler in registry
      if (!this.handlerRegistry.has(context)) {
        this.handlerRegistry.set(context, new Map());
      }

      const contextHandlers = this.handlerRegistry.get(context);
      if (!contextHandlers.has(event)) {
        contextHandlers.set(event, []);
      }

      contextHandlers.get(event).push(boundHandler);
      this.on(event, boundHandler);

      return boundHandler;
    }

    /**
     * Clean up all handlers for a specific context
     * @param {Object} context - Context object
     */
    cleanupContext(context) {
      const handlers = this.handlerRegistry.get(context);

      if (handlers) {
        handlers.forEach((handlerList, event) => {
          handlerList.forEach(handler => {
            this.off(event, handler);
          });
        });

        this.handlerRegistry.delete(context);
        console.log('✅ Context cleaned up successfully');
      }
    }
  }

  const safeEmitter = new MemorySafeEmitter();

  class Component {
    constructor(name, emitter) {
      this.name = name;
      this.emitter = emitter;
      this.data = new Array(50000).fill(`Data for ${name}`);

      // Use safeOn with context
      emitter.safeOn('update', this.handleUpdate, this);
      emitter.safeOn('refresh', this.handleRefresh, this);
    }

    handleUpdate(data) {
      console.log(`${this.name} handling update:`, data);
    }

    handleRefresh() {
      console.log(`${this.name} refreshing...`);
    }

    destroy() {
      console.log(`Destroying ${this.name}`);
      this.emitter.cleanupContext(this);
      this.data = null;
    }
  }

  console.log('Creating components with safe event handlers...');
  const comp1 = new Component('Component1', safeEmitter);
  const comp2 = new Component('Component2', safeEmitter);

  console.log(`\nListener count for 'update': ${safeEmitter.listenerCount('update')}`);
  console.log(`Listener count for 'refresh': ${safeEmitter.listenerCount('refresh')}`);

  safeEmitter.emit('update', 'test data');

  console.log('\nDestroying components...');
  comp1.destroy();
  comp2.destroy();

  console.log(`\nListener count for 'update': ${safeEmitter.listenerCount('update')}`);
  console.log(`Listener count for 'refresh': ${safeEmitter.listenerCount('refresh')}`);

  continuePart5();
}

// ============================================================================
// Part 5: Memory Usage Monitoring
// ============================================================================

function continuePart5() {
  console.log('\n--- Part 5: Memory Usage Monitoring ---\n');

  class MemoryMonitoredEmitter extends EventEmitter {
    constructor() {
      super();
      this.baseline = process.memoryUsage();
    }

    getMemoryDelta() {
      const current = process.memoryUsage();
      return {
        heapUsed: ((current.heapUsed - this.baseline.heapUsed) / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: ((current.heapTotal - this.baseline.heapTotal) / 1024 / 1024).toFixed(2) + ' MB',
        external: ((current.external - this.baseline.external) / 1024 / 1024).toFixed(2) + ' MB'
      };
    }

    printMemoryReport() {
      const delta = this.getMemoryDelta();
      const eventNames = this.eventNames();

      console.log('Memory Report:');
      console.log('  Heap Used Delta:', delta.heapUsed);
      console.log('  Heap Total Delta:', delta.heapTotal);
      console.log('  External Delta:', delta.external);
      console.log('\nEvent Listeners:');

      eventNames.forEach(event => {
        console.log(`  ${String(event)}: ${this.listenerCount(event)} listeners`);
      });
    }
  }

  const monitoredEmitter = new MemoryMonitoredEmitter();

  console.log('Baseline memory usage recorded');
  console.log('\nAdding many listeners...');

  // Add many listeners
  for (let i = 0; i < 1000; i++) {
    monitoredEmitter.on('test', () => {});
  }

  console.log('Added 1000 listeners\n');
  monitoredEmitter.printMemoryReport();

  console.log('\nRemoving all listeners...');
  monitoredEmitter.removeAllListeners('test');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('Forced garbage collection');
  }

  setTimeout(() => {
    console.log('\nAfter cleanup:\n');
    monitoredEmitter.printMemoryReport();

    console.log('\n' + '='.repeat(60));
    console.log('TIP: Run with --expose-gc to enable manual garbage collection');
    console.log('Example: node --expose-gc 01-memory-leak-detection.js');
    console.log('='.repeat(60));
  }, 100);
}

/*
 * Key Takeaways:
 *
 * 1. MEMORY LEAKS occur when:
 *    - Listeners are added but never removed
 *    - Closures capture large objects
 *    - Context objects can't be garbage collected
 *
 * 2. DETECTION methods:
 *    - Monitor listener counts over time
 *    - Watch for maxListeners warnings
 *    - Track memory usage with process.memoryUsage()
 *    - Use heap snapshots for deep analysis
 *
 * 3. PREVENTION strategies:
 *    - Always provide cleanup methods
 *    - Store handler references for removal
 *    - Use WeakMap for automatic cleanup
 *    - Set appropriate maxListeners
 *    - Remove listeners in lifecycle hooks
 *
 * 4. BEST PRACTICES:
 *    - Use once() for one-time handlers
 *    - Implement destroy/cleanup patterns
 *    - Monitor production applications
 *    - Test for leaks in CI/CD
 *    - Use tools like clinic.js or memlab
 */
