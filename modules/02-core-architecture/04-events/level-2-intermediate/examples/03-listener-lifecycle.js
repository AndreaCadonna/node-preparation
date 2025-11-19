/**
 * Example 3: Listener Lifecycle Management
 *
 * This example demonstrates:
 * - Managing listener lifecycle
 * - Preventing memory leaks
 * - Tracking and cleaning up listeners
 * - Using weak references for auto-cleanup
 * - Maximum listeners configuration
 * - Debugging listener issues
 */

const EventEmitter = require('events');

console.log('=== Listener Lifecycle Management ===\n');

console.log('--- Basic Listener Tracking ---\n');

class ManagedEmitter extends EventEmitter {
  constructor() {
    super();

    // Track listeners by owner
    this.listenerRegistry = new Map();
  }

  registerListener(event, listener, owner) {
    // Add the listener
    this.on(event, listener);

    // Track it
    if (!this.listenerRegistry.has(owner)) {
      this.listenerRegistry.set(owner, []);
    }

    this.listenerRegistry.get(owner).push({
      event,
      listener,
      addedAt: new Date()
    });

    console.log(`[Registry] Added listener for '${event}' (owner: ${owner})`);
  }

  removeListenersFor(owner) {
    const listeners = this.listenerRegistry.get(owner);

    if (!listeners) {
      console.log(`[Registry] No listeners found for owner: ${owner}`);
      return 0;
    }

    let removed = 0;
    listeners.forEach(({ event, listener }) => {
      this.removeListener(event, listener);
      removed++;
    });

    this.listenerRegistry.delete(owner);
    console.log(`[Registry] Removed ${removed} listeners for owner: ${owner}`);

    return removed;
  }

  getStats() {
    const stats = {
      totalOwners: this.listenerRegistry.size,
      listenersByOwner: {}
    };

    for (const [owner, listeners] of this.listenerRegistry) {
      stats.listenersByOwner[owner] = listeners.length;
    }

    return stats;
  }
}

const managed = new ManagedEmitter();

// Component A registers listeners
const handlerA1 = () => console.log('Handler A1');
const handlerA2 = () => console.log('Handler A2');

managed.registerListener('data', handlerA1, 'ComponentA');
managed.registerListener('update', handlerA2, 'ComponentA');

// Component B registers listeners
const handlerB1 = () => console.log('Handler B1');

managed.registerListener('data', handlerB1, 'ComponentB');

console.log('\nStats:', managed.getStats());

// Clean up Component A
console.log('\nCleaning up ComponentA:');
managed.removeListenersFor('ComponentA');

console.log('\nStats after cleanup:', managed.getStats());

console.log('\n--- Memory Leak Detection ---\n');

class LeakDetector extends EventEmitter {
  constructor(warningThreshold = 5) {
    super();
    this.warningThreshold = warningThreshold;
    this.eventStats = new Map();
  }

  on(event, listener) {
    super.on(event, listener);
    this.checkForLeaks(event);
    return this;
  }

  once(event, listener) {
    super.once(event, listener);
    this.checkForLeaks(event);
    return this;
  }

  checkForLeaks(event) {
    const count = this.listenerCount(event);

    if (count > this.warningThreshold) {
      console.warn(`[Leak Warning] Event '${event}' has ${count} listeners (threshold: ${this.warningThreshold})`);

      this.emit('possibleLeak', {
        event,
        count,
        threshold: this.warningThreshold
      });
    }

    // Update stats
    this.eventStats.set(event, {
      count,
      checkedAt: new Date()
    });
  }

  getLeakReport() {
    const report = {
      events: [],
      totalListeners: 0
    };

    for (const [event, stats] of this.eventStats) {
      const count = this.listenerCount(event);
      report.totalListeners += count;

      if (count > this.warningThreshold) {
        report.events.push({
          event,
          count,
          threshold: this.warningThreshold,
          isLeak: true
        });
      }
    }

    return report;
  }
}

const detector = new LeakDetector(3);

detector.on('possibleLeak', ({ event, count }) => {
  console.log(`[Alert] Possible memory leak detected in '${event}': ${count} listeners`);
});

// Simulate adding many listeners (potential leak)
console.log('Adding listeners...');
for (let i = 0; i < 5; i++) {
  detector.on('data', () => {});
}

console.log('\nLeak Report:', detector.getLeakReport());

console.log('\n--- Automatic Cleanup Pattern ---\n');

class Component extends EventEmitter {
  constructor(name, emitter) {
    super();
    this.name = name;
    this.emitter = emitter;
    this.listeners = [];
    this.isActive = true;
  }

  subscribe(event, handler) {
    if (!this.isActive) {
      console.log(`[${this.name}] Cannot subscribe - component destroyed`);
      return;
    }

    // Wrap handler to include cleanup check
    const wrappedHandler = (...args) => {
      if (this.isActive) {
        handler.call(this, ...args);
      }
    };

    this.emitter.on(event, wrappedHandler);
    this.listeners.push({ event, handler: wrappedHandler });

    console.log(`[${this.name}] Subscribed to '${event}'`);
  }

  destroy() {
    console.log(`[${this.name}] Destroying component...`);

    // Remove all listeners
    this.listeners.forEach(({ event, handler }) => {
      this.emitter.removeListener(event, handler);
    });

    this.listeners = [];
    this.isActive = false;
    this.emit('destroyed');

    console.log(`[${this.name}] Cleanup complete`);
  }
}

const eventBus = new EventEmitter();

const comp1 = new Component('User Profile', eventBus);
const comp2 = new Component('Notification Panel', eventBus);

comp1.subscribe('user:update', function(user) {
  console.log(`[${this.name}] User updated:`, user);
});

comp2.subscribe('user:update', function(user) {
  console.log(`[${this.name}] Showing notification for:`, user);
});

console.log('\nEmitting event (both components active):');
eventBus.emit('user:update', 'Alice');

console.log('\nDestroying User Profile component:');
comp1.destroy();

console.log('\nEmitting event (only notification panel active):');
eventBus.emit('user:update', 'Bob');

console.log('\n--- Maximum Listeners Configuration ---\n');

const emitter = new EventEmitter();

console.log('Default max listeners:', EventEmitter.defaultMaxListeners); // 10
console.log('Emitter max listeners:', emitter.getMaxListeners()); // 10

// Add 11 listeners to trigger warning
console.log('\nAdding 11 listeners (should warn at 11):');

// Suppress warning for this example
const originalEmit = process.emitWarning;
let warningCount = 0;

process.emitWarning = function(warning) {
  if (warning.includes('possible EventEmitter memory leak')) {
    warningCount++;
    console.log(`[Warning #${warningCount}] Max listeners exceeded`);
  }
};

for (let i = 1; i <= 11; i++) {
  emitter.on('test', () => {});
  console.log(`  Added listener ${i}, total: ${emitter.listenerCount('test')}`);
}

// Restore original emitWarning
process.emitWarning = originalEmit;

console.log('\nSetting max listeners to 20:');
emitter.setMaxListeners(20);
console.log('New max:', emitter.getMaxListeners());

console.log('\nAdding 5 more listeners (no warning):');
for (let i = 12; i <= 16; i++) {
  emitter.on('test', () => {});
  console.log(`  Added listener ${i}, total: ${emitter.listenerCount('test')}`);
}

console.log('\nSetting max to 0 (unlimited):');
emitter.setMaxListeners(0);
console.log('New max:', emitter.getMaxListeners(), '(0 = unlimited)');

console.log('\n--- Listener Inspection ---\n');

const inspector = new EventEmitter();

function handler1() { console.log('Handler 1'); }
function handler2() { console.log('Handler 2'); }
function handler3() { console.log('Handler 3'); }

inspector.on('event', handler1);
inspector.on('event', handler2);
inspector.once('event', handler3);

console.log('Event names:', inspector.eventNames()); // ['event']
console.log('Listener count:', inspector.listenerCount('event')); // 3
console.log('Raw listeners:', inspector.rawListeners('event').length); // 3

// Get listeners (returns copies for once listeners)
const listeners = inspector.listeners('event');
console.log('Listeners:', listeners.length);

// Remove specific listener
inspector.removeListener('event', handler2);
console.log('After removing handler2:', inspector.listenerCount('event')); // 2

// Remove all listeners for an event
inspector.removeAllListeners('event');
console.log('After removeAllListeners:', inspector.listenerCount('event')); // 0

console.log('\n=== Example Complete ===');

/*
 * Key Takeaways:
 * 1. Track listeners by owner/component for easier cleanup
 * 2. Always clean up listeners when components are destroyed
 * 3. Use listenerCount() to detect potential leaks
 * 4. Default max listeners is 10 - adjust per use case
 * 5. Set max to 0 for unlimited (but be careful!)
 * 6. Use removeAllListeners() to clear all listeners
 * 7. Wrap handlers to prevent execution after cleanup
 * 8. Monitor listener counts in long-running applications
 * 9. Use eventNames() to see what events have listeners
 * 10. Implement automatic cleanup in component lifecycle
 */
