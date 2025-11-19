/**
 * Example 3: Once Listeners
 *
 * This example demonstrates:
 * - Using once() for one-time event listeners
 * - Automatic listener removal after first emit
 * - Comparing once() vs on() behavior
 * - Use cases for one-time listeners
 */

const EventEmitter = require('events');

const emitter = new EventEmitter();

console.log('=== Once Listener Example ===\n');

// Regular listener with on() - triggers every time
emitter.on('repeat', () => {
  console.log('[on] This runs every time');
});

// One-time listener with once() - triggers only once
emitter.once('repeat', () => {
  console.log('[once] This runs only the first time');
});

console.log('First emit:');
emitter.emit('repeat');

console.log('\nSecond emit:');
emitter.emit('repeat');

console.log('\nThird emit:');
emitter.emit('repeat');

console.log('\n--- Practical Use Case: Initialization ---\n');

class Application extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
  }

  initialize() {
    if (!this.initialized) {
      console.log('Initializing application...');
      this.initialized = true;
      this.emit('ready');
    }
  }
}

const app = new Application();

// We only want to run this once when app is ready
app.once('ready', () => {
  console.log('[Startup] Application is ready!');
  console.log('[Startup] Loading plugins...');
});

// This will also run once
app.once('ready', () => {
  console.log('[Startup] Connecting to database...');
});

app.initialize();
app.initialize(); // Calling again won't emit 'ready' again

console.log('\n--- Once with Arguments ---\n');

emitter.once('download', (file, size) => {
  console.log(`Downloaded ${file} (${size} bytes)`);
  console.log('This message appears only once');
});

emitter.emit('download', 'image.jpg', 1024);
emitter.emit('download', 'video.mp4', 2048); // Won't trigger listener

console.log('\n--- Checking Listener Count ---\n');

emitter.once('test', () => {});
console.log('Before emit, listeners:', emitter.listenerCount('test')); // 1

emitter.emit('test');
console.log('After emit, listeners:', emitter.listenerCount('test')); // 0

console.log('\n--- Connection Example ---\n');

class Database extends EventEmitter {
  connect() {
    setTimeout(() => {
      console.log('Database connected!');
      this.emit('connected');
    }, 100);
  }
}

const db = new Database();

// We only care about the first successful connection
db.once('connected', () => {
  console.log('[App] Database is ready, starting server...');
});

db.connect();

// Wait for async operation
setTimeout(() => {
  console.log('\n=== Example Complete ===');
}, 200);

/*
 * Key Takeaways:
 * 1. once() creates a listener that automatically removes itself after first emit
 * 2. Perfect for one-time events like 'ready', 'connected', 'initialized'
 * 3. Multiple once() listeners can be added to the same event
 * 4. After emit, the listener count drops to 0
 * 5. Use once() to prevent memory leaks from forgotten listeners
 * 6. once() vs on(): use once() when you only care about the first occurrence
 */
