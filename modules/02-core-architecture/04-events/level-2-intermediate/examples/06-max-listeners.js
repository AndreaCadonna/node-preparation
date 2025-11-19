/**
 * Example 6: Maximum Listeners Configuration
 *
 * This example demonstrates:
 * - Understanding max listeners warnings
 * - Configuring max listeners per emitter
 * - Setting global defaults
 * - When to increase the limit
 * - Detecting memory leaks vs legitimate use
 */

const EventEmitter = require('events');

console.log('=== Maximum Listeners Configuration ===\n');

console.log('--- Default Behavior ---\n');

const emitter = new EventEmitter();

console.log('Default max listeners:', EventEmitter.defaultMaxListeners); // 10
console.log('Emitter max listeners:', emitter.getMaxListeners()); // 10

console.log('\n--- Warning Demo ---\n');

const warningEmitter = new EventEmitter();

// Capture warnings
const originalEmitWarning = process.emitWarning;
let warnings = [];

process.emitWarning = function(warning, type, code) {
  if (typeof warning === 'string' && warning.includes('possible EventEmitter memory leak')) {
    warnings.push({ warning, type, code });
    console.log(`[Warning] Exceeded max listeners (${warningEmitter.listenerCount('data')} listeners)`);
  } else {
    originalEmitWarning.apply(process, arguments);
  }
};

console.log('Adding 11 listeners to trigger warning...');

for (let i = 1; i <= 11; i++) {
  warningEmitter.on('data', () => {
    // Each listener
  });

  if (i <= 10) {
    console.log(`  Added ${i}/10 - no warning`);
  } else {
    console.log(`  Added ${i}/10 - WARNING TRIGGERED`);
  }
}

// Restore original
process.emitWarning = originalEmitWarning;

console.log('\n--- Configuring Per Emitter ---\n');

const customEmitter = new EventEmitter();

console.log('Initial max:', customEmitter.getMaxListeners()); // 10

// Set to 20
customEmitter.setMaxListeners(20);
console.log('After setMaxListeners(20):', customEmitter.getMaxListeners());

// Add 15 listeners (no warning)
console.log('\nAdding 15 listeners...');
for (let i = 1; i <= 15; i++) {
  customEmitter.on('event', () => {});
}
console.log('Added 15 listeners - no warning');
console.log('Current count:', customEmitter.listenerCount('event'));

console.log('\n--- Unlimited Listeners ---\n');

const unlimited = new EventEmitter();

// Set to 0 for unlimited
unlimited.setMaxListeners(0);
console.log('Max listeners:', unlimited.getMaxListeners(), '(0 = unlimited)');

console.log('\nAdding 50 listeners...');
for (let i = 1; i <= 50; i++) {
  unlimited.on('event', () => {});
}
console.log('Added 50 listeners - no warning');
console.log('Current count:', unlimited.listenerCount('event'));

console.log('\n--- Global Default ---\n');

console.log('Current global default:', EventEmitter.defaultMaxListeners);

// Change global default
const oldDefault = EventEmitter.defaultMaxListeners;
EventEmitter.defaultMaxListeners = 15;

console.log('New global default:', EventEmitter.defaultMaxListeners);

// New emitters will use new default
const newEmitter = new EventEmitter();
console.log('New emitter max:', newEmitter.getMaxListeners()); // 15

// Restore
EventEmitter.defaultMaxListeners = oldDefault;

console.log('\n--- Legitimate High Listener Count ---\n');

// Example: Plugin system where many plugins listen
class PluginSystem extends EventEmitter {
  constructor() {
    super();
    this.plugins = [];

    // Set higher limit for plugin events
    this.setMaxListeners(50); // Expect many plugins
  }

  registerPlugin(plugin) {
    console.log(`[System] Registering plugin: ${plugin.name}`);

    this.plugins.push(plugin);

    // Each plugin listens to lifecycle events
    this.on('app:start', plugin.onStart.bind(plugin));
    this.on('app:stop', plugin.onStop.bind(plugin));
    this.on('request', plugin.onRequest.bind(plugin));

    console.log(`  Total plugins: ${this.plugins.length}`);
    console.log(`  Listeners for 'app:start': ${this.listenerCount('app:start')}`);
  }

  start() {
    console.log('\n[System] Starting application...');
    this.emit('app:start');
  }

  stop() {
    console.log('[System] Stopping application...');
    this.emit('app:stop');
  }
}

// Plugin class
class Plugin {
  constructor(name) {
    this.name = name;
  }

  onStart() {
    console.log(`[Plugin: ${this.name}] Started`);
  }

  onStop() {
    console.log(`[Plugin: ${this.name}] Stopped`);
  }

  onRequest() {
    console.log(`[Plugin: ${this.name}] Request handled`);
  }
}

const system = new PluginSystem();

console.log('Registering 12 plugins:');
for (let i = 1; i <= 12; i++) {
  system.registerPlugin(new Plugin(`Plugin${i}`));
}

console.log('\nMax listeners:', system.getMaxListeners());
console.log('No warning because we set max to 50!');

system.start();

console.log('\n--- Memory Leak Detection ---\n');

class LeakDetector extends EventEmitter {
  constructor(maxListeners = 10) {
    super();
    this.setMaxListeners(maxListeners);
    this.checkInterval = setInterval(() => {
      this.checkForLeaks();
    }, 1000);
  }

  checkForLeaks() {
    const events = this.eventNames();

    for (const event of events) {
      const count = this.listenerCount(event);
      const max = this.getMaxListeners();

      if (count > max * 0.8) {
        console.log(`[Leak Detector] Warning: '${event}' has ${count} listeners (max: ${max})`);
      }
    }
  }

  destroy() {
    clearInterval(this.checkInterval);
    this.removeAllListeners();
  }
}

console.log('Creating leak detector (will check every second)...');
const detector = new LeakDetector(10);

// Simulate gradual listener addition (leak scenario)
console.log('\nSimulating memory leak:');

let leakCount = 0;
const leakInterval = setInterval(() => {
  detector.on('data', () => {});
  leakCount++;

  console.log(`Added listener ${leakCount}, total: ${detector.listenerCount('data')}`);

  if (leakCount >= 12) {
    clearInterval(leakInterval);

    setTimeout(() => {
      detector.destroy();

      console.log('\n--- Proper Cleanup Pattern ---\n');

      class ManagedComponent {
        constructor(name, emitter) {
          this.name = name;
          this.emitter = emitter;
          this.handlers = new Map();
        }

        addListener(event, handler) {
          // Keep track of handler
          if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
          }

          this.handlers.get(event).push(handler);
          this.emitter.on(event, handler);

          console.log(`[${this.name}] Added listener for '${event}'`);
          console.log(`  Total for this event: ${this.emitter.listenerCount(event)}`);
        }

        cleanup() {
          console.log(`[${this.name}] Cleaning up...`);

          let removed = 0;
          for (const [event, handlers] of this.handlers) {
            handlers.forEach(handler => {
              this.emitter.removeListener(event, handler);
              removed++;
            });
          }

          this.handlers.clear();
          console.log(`[${this.name}] Removed ${removed} listeners`);
        }
      }

      const sharedEmitter = new EventEmitter();
      sharedEmitter.setMaxListeners(20); // Increase for multiple components

      console.log('Creating components:');
      const comp1 = new ManagedComponent('Component1', sharedEmitter);
      const comp2 = new ManagedComponent('Component2', sharedEmitter);
      const comp3 = new ManagedComponent('Component3', sharedEmitter);

      console.log('\nAdding listeners:');
      comp1.addListener('update', () => {});
      comp1.addListener('update', () => {});
      comp2.addListener('update', () => {});
      comp3.addListener('update', () => {});

      console.log('\nTotal listeners for "update":', sharedEmitter.listenerCount('update'));

      console.log('\nCleaning up Component1:');
      comp1.cleanup();

      console.log('Remaining listeners for "update":', sharedEmitter.listenerCount('update'));

      console.log('\n--- Best Practices Summary ---\n');

      console.log('✅ DO:');
      console.log('  - Set max listeners based on expected usage');
      console.log('  - Use setMaxListeners(0) for unlimited (cautiously)');
      console.log('  - Track listener counts in long-running apps');
      console.log('  - Clean up listeners when components unmount');
      console.log('  - Document why max listeners is increased');

      console.log('\n❌ DON\'T:');
      console.log('  - Ignore max listener warnings');
      console.log('  - Set to unlimited without good reason');
      console.log('  - Add listeners in loops without cleanup');
      console.log('  - Forget to remove temporary listeners');
      console.log('  - Set max too high to hide memory leaks');

      console.log('\n=== Example Complete ===');
    }, 2500);
  }
}, 200);

/*
 * Key Takeaways:
 * 1. Default max listeners is 10
 * 2. Warning triggers at (max + 1) listeners
 * 3. Use setMaxListeners() to configure per emitter
 * 4. Set to 0 for unlimited (use carefully!)
 * 5. EventEmitter.defaultMaxListeners sets global default
 * 6. Warnings help detect memory leaks
 * 7. Some cases legitimately need many listeners
 * 8. Document why you increase max listeners
 * 9. Monitor listener counts in production
 * 10. Always clean up listeners when done
 */
