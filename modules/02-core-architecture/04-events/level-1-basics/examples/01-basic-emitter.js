/**
 * Example 1: Basic EventEmitter
 *
 * This example demonstrates:
 * - Creating an EventEmitter instance
 * - Registering an event listener with on()
 * - Emitting events with emit()
 * - Basic event-driven flow
 */

const EventEmitter = require('events');

// Create a new EventEmitter instance
const emitter = new EventEmitter();

console.log('=== Basic EventEmitter Example ===\n');

// Register an event listener
// The first argument is the event name
// The second argument is the handler function
emitter.on('greet', () => {
  console.log('Hello, World!');
});

console.log('Listener registered for "greet" event');

// Emit the event
console.log('Emitting "greet" event...');
emitter.emit('greet');

console.log('\n--- With Arguments ---\n');

// You can also pass arguments to event listeners
emitter.on('welcome', (name) => {
  console.log(`Welcome, ${name}!`);
});

emitter.emit('welcome', 'Alice');
emitter.emit('welcome', 'Bob');

console.log('\n--- Multiple Arguments ---\n');

// Events can have multiple arguments
emitter.on('user:login', (username, time) => {
  console.log(`User ${username} logged in at ${time}`);
});

emitter.emit('user:login', 'charlie', new Date().toLocaleTimeString());

console.log('\n--- Non-existent Event ---\n');

// Emitting an event with no listeners does nothing (no error)
const result = emitter.emit('noListeners');
console.log('Emit result for event with no listeners:', result); // false

console.log('\n--- Event with Listener ---\n');

emitter.on('hasListener', () => {});
const hasListenerResult = emitter.emit('hasListener');
console.log('Emit result for event with listener:', hasListenerResult); // true

/*
 * Key Takeaways:
 * 1. EventEmitter is the core class for event-driven programming
 * 2. on() registers a listener, emit() triggers it
 * 3. You can pass any number of arguments to listeners
 * 4. emit() returns true if there are listeners, false otherwise
 * 5. Emitting non-existent events is safe (no error)
 */
