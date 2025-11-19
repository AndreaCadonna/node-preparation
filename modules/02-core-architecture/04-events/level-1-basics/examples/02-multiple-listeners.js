/**
 * Example 2: Multiple Event Listeners
 *
 * This example demonstrates:
 * - Adding multiple listeners to the same event
 * - Listener execution order
 * - Each listener receives the same arguments
 * - Listeners are called synchronously
 */

const EventEmitter = require('events');

const emitter = new EventEmitter();

console.log('=== Multiple Listeners Example ===\n');

// Add first listener
emitter.on('data', (message) => {
  console.log('[Listener 1] Received:', message);
});

// Add second listener
emitter.on('data', (message) => {
  console.log('[Listener 2] Processing:', message);
});

// Add third listener
emitter.on('data', (message) => {
  console.log('[Listener 3] Logging:', message);
});

console.log('Three listeners registered for "data" event\n');

// Emit the event - all listeners will be called in order
emitter.emit('data', 'Hello');

console.log('\n--- Listeners are Synchronous ---\n');

emitter.on('sync', () => {
  console.log('  First listener');
});

emitter.on('sync', () => {
  console.log('  Second listener');
});

console.log('Before emit');
emitter.emit('sync');
console.log('After emit');

console.log('\n--- Different Functionality per Listener ---\n');

// Each listener can do different things with the same data
emitter.on('user:created', (user) => {
  console.log('[Email Service] Sending welcome email to:', user.email);
});

emitter.on('user:created', (user) => {
  console.log('[Analytics] Tracking new user:', user.id);
});

emitter.on('user:created', (user) => {
  console.log('[Database] Updating user count');
});

emitter.emit('user:created', {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com'
});

console.log('\n--- Counting Listeners ---\n');

const count = emitter.listenerCount('user:created');
console.log(`Number of listeners for "user:created":`, count);

// Get all listeners for an event
const listeners = emitter.listeners('user:created');
console.log('Number of listener functions:', listeners.length);

/*
 * Key Takeaways:
 * 1. Multiple listeners can be registered for the same event
 * 2. Listeners are called in the order they were added
 * 3. All listeners receive the same arguments
 * 4. Listeners are called synchronously, one after another
 * 5. Use listenerCount() to check how many listeners exist
 * 6. Use listeners() to get the actual listener functions
 */
