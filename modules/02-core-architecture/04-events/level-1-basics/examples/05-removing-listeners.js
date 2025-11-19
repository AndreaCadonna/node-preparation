/**
 * Example 5: Removing Event Listeners
 *
 * This example demonstrates:
 * - Removing specific listeners with removeListener() and off()
 * - Removing all listeners for an event
 * - Removing all listeners for all events
 * - Preventing memory leaks
 * - Listener lifecycle management
 */

const EventEmitter = require('events');

console.log('=== Removing Event Listeners ===\n');

console.log('--- Removing a Specific Listener ---\n');

const emitter = new EventEmitter();

// Must use a named function to remove it later
function handleData(data) {
  console.log('Handling data:', data);
}

emitter.on('data', handleData);

console.log('Emitting with listener:');
emitter.emit('data', 'test 1');

// Remove the specific listener
emitter.removeListener('data', handleData);
console.log('\nListener removed');

console.log('Emitting after removal:');
emitter.emit('data', 'test 2'); // Nothing happens

console.log('\n--- Using off() Alias ---\n');

function handleMessage(msg) {
  console.log('Message:', msg);
}

emitter.on('message', handleMessage);
emitter.emit('message', 'Hello');

// off() is an alias for removeListener()
emitter.off('message', handleMessage);
console.log('Listener removed with off()');

emitter.emit('message', 'World'); // Nothing happens

console.log('\n--- Anonymous Functions Cannot Be Removed ---\n');

// ❌ Bad: Can't remove anonymous function
emitter.on('bad', () => {
  console.log('This cannot be removed!');
});

// This won't work - different function instance
emitter.removeListener('bad', () => {
  console.log('This cannot be removed!');
});

console.log('Listeners for "bad" event:', emitter.listenerCount('bad')); // Still 1

// ✅ Good: Use named function
const goodHandler = () => {
  console.log('This can be removed');
};

emitter.on('good', goodHandler);
emitter.removeListener('good', goodHandler);
console.log('Listeners for "good" event:', emitter.listenerCount('good')); // 0

console.log('\n--- Removing All Listeners for an Event ---\n');

emitter.on('multi', () => console.log('Listener 1'));
emitter.on('multi', () => console.log('Listener 2'));
emitter.on('multi', () => console.log('Listener 3'));

console.log('Listeners before removal:', emitter.listenerCount('multi')); // 3

// Remove all listeners for 'multi' event
emitter.removeAllListeners('multi');

console.log('Listeners after removal:', emitter.listenerCount('multi')); // 0
emitter.emit('multi'); // Nothing happens

console.log('\n--- Removing All Listeners for All Events ---\n');

emitter.on('event1', () => console.log('Event 1'));
emitter.on('event2', () => console.log('Event 2'));
emitter.on('event3', () => console.log('Event 3'));

console.log('Total listeners:', emitter.eventNames().length); // 3 events

// Remove ALL listeners for ALL events
emitter.removeAllListeners();

console.log('Total events after removal:', emitter.eventNames().length); // 0

console.log('\n--- Practical Cleanup Pattern ---\n');

class Component extends EventEmitter {
  constructor(externalEmitter) {
    super();
    this.externalEmitter = externalEmitter;

    // Store handler references for cleanup
    this.handlers = {
      data: (data) => this.handleData(data),
      error: (err) => this.handleError(err)
    };

    // Register listeners
    this.externalEmitter.on('data', this.handlers.data);
    this.externalEmitter.on('error', this.handlers.error);

    console.log('Component initialized with listeners');
  }

  handleData(data) {
    console.log('[Component] Received data:', data);
  }

  handleError(err) {
    console.log('[Component] Received error:', err.message);
  }

  destroy() {
    // Clean up all listeners when component is destroyed
    this.externalEmitter.removeListener('data', this.handlers.data);
    this.externalEmitter.removeListener('error', this.handlers.error);
    console.log('Component destroyed, listeners removed');
  }
}

const external = new EventEmitter();
const component = new Component(external);

external.emit('data', 'test');
console.log('Listeners before destroy:', external.listenerCount('data')); // 1

component.destroy();
console.log('Listeners after destroy:', external.listenerCount('data')); // 0

external.emit('data', 'test'); // Nothing happens

console.log('\n--- Conditional Listener Removal ---\n');

let count = 0;
const MAX_COUNT = 3;

function handleCount() {
  count++;
  console.log(`Count: ${count}`);

  if (count >= MAX_COUNT) {
    console.log('Max count reached, removing listener');
    counterEmitter.removeListener('tick', handleCount);
  }
}

const counterEmitter = new EventEmitter();
counterEmitter.on('tick', handleCount);

// Emit multiple times
for (let i = 0; i < 5; i++) {
  counterEmitter.emit('tick');
}

console.log('\n--- Checking What Gets Removed ---\n');

const testEmitter = new EventEmitter();

testEmitter.on('test', () => console.log('Handler 1'));
testEmitter.on('test', () => console.log('Handler 2'));
testEmitter.on('other', () => console.log('Other event'));

console.log('Before removal:');
console.log('  "test" listeners:', testEmitter.listenerCount('test')); // 2
console.log('  "other" listeners:', testEmitter.listenerCount('other')); // 1

testEmitter.removeAllListeners('test');

console.log('After removing "test" listeners:');
console.log('  "test" listeners:', testEmitter.listenerCount('test')); // 0
console.log('  "other" listeners:', testEmitter.listenerCount('other')); // 1 (unchanged)

/*
 * Key Takeaways:
 * 1. removeListener() and off() remove a specific listener function
 * 2. Must use named functions to remove them later (not anonymous)
 * 3. removeAllListeners(event) removes all listeners for one event
 * 4. removeAllListeners() removes all listeners for all events
 * 5. Always remove listeners when components/objects are destroyed
 * 6. Forgetting to remove listeners causes memory leaks
 * 7. Store handler references if you need to remove them later
 * 8. once() listeners remove themselves automatically
 */
