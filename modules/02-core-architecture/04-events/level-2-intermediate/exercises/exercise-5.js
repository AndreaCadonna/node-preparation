/**
 * Exercise 5: Build an Event Middleware System
 *
 * Task:
 * Create a MiddlewareEventBus class that supports middleware functions
 * that can process, transform, or block events before they reach listeners.
 * This is useful for validation, authentication, logging, etc.
 *
 * Requirements:
 * 1. Create a MiddlewareEventBus class that extends EventEmitter
 * 2. Implement use(middlewareFn) method that:
 *    - Adds middleware to a chain
 *    - Returns this for chaining
 * 3. Implement emitWithMiddleware(event, data) method that:
 *    - Runs all middleware in order
 *    - Each middleware receives (event, data) and can:
 *      * Return modified data to pass to next middleware
 *      * Return false to stop the chain (don't emit)
 *      * Throw error to trigger error handler
 *    - Finally emits event with processed data if not stopped
 * 4. Middleware can be async - support async/await
 * 5. If middleware throws, emit 'middleware:error' event
 *
 * Middleware signature: async (event, data) => modifiedData | false
 *
 * Hints:
 * - Use prependListener to run middleware before regular listeners
 * - Process middleware sequentially
 * - Keep track of original vs modified data
 */

const EventEmitter = require('events');

// YOUR CODE HERE
class MiddlewareEventBus extends EventEmitter {
  constructor() {
    super();

    // TODO: Initialize middleware array
  }

  use(middlewareFn) {
    // TODO: Add middleware to chain
    // TODO: Return this for chaining
  }

  async emitWithMiddleware(event, data) {
    // TODO: Process data through middleware chain
    // TODO: Each middleware can transform data or stop chain
    // TODO: Handle async middleware
    // TODO: Emit event with final data if not stopped
    // TODO: Handle middleware errors
  }
}


// Test your MiddlewareEventBus
const bus = new MiddlewareEventBus();

console.log('=== Setting Up Middleware ===\n');

// Middleware 1: Logging
bus.use(async (event, data) => {
  console.log(`[Middleware: Logger] Event '${event}' with data:`, data);
  return data; // Pass through unchanged
});

// Middleware 2: Add timestamp
bus.use(async (event, data) => {
  console.log('[Middleware: Timestamp] Adding timestamp');
  return {
    ...data,
    timestamp: Date.now(),
    timestampISO: new Date().toISOString()
  };
});

// Middleware 3: Validation
bus.use(async (event, data) => {
  console.log('[Middleware: Validation] Validating data');

  if (event.startsWith('user:') && !data.username) {
    console.log('[Middleware: Validation] ❌ Validation failed - missing username');
    return false; // Stop the chain
  }

  if (data.username && data.username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  console.log('[Middleware: Validation] ✅ Validation passed');
  return data;
});

// Middleware 4: Simulate async operation
bus.use(async (event, data) => {
  console.log('[Middleware: Async] Performing async check...');
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('[Middleware: Async] Check complete');
  return { ...data, checked: true };
});

console.log('=== Setting Up Listeners ===\n');

bus.on('user:create', (data) => {
  console.log('[Handler] User create event received:');
  console.log('  Username:', data.username);
  console.log('  Timestamp:', data.timestampISO);
  console.log('  Checked:', data.checked);
});

bus.on('user:update', (data) => {
  console.log('[Handler] User update event received:');
  console.log('  Username:', data.username);
  console.log('  Email:', data.email);
});

bus.on('system:status', (data) => {
  console.log('[Handler] System status event received:');
  console.log('  Status:', data.status);
  console.log('  Has timestamp:', !!data.timestamp);
});

bus.on('middleware:error', ({ event, data, error }) => {
  console.error('[Error Handler] Middleware error in', event);
  console.error('  Error:', error.message);
  console.error('  Data:', data);
});

console.log('=== Emitting Events ===\n');

// Test 1: Valid user:create event
(async () => {
  console.log('--- Test 1: Valid user:create ---\n');
  await bus.emitWithMiddleware('user:create', {
    username: 'alice',
    email: 'alice@example.com'
  });

  console.log('\n--- Test 2: Invalid user:update (no username) ---\n');
  await bus.emitWithMiddleware('user:update', {
    email: 'bob@example.com'
  });

  console.log('\n--- Test 3: Invalid username (too short) ---\n');
  await bus.emitWithMiddleware('user:create', {
    username: 'ab',
    email: 'short@example.com'
  });

  console.log('\n--- Test 4: System event (no username validation) ---\n');
  await bus.emitWithMiddleware('system:status', {
    status: 'healthy',
    uptime: 3600
  });
})();

/*
 * Expected output:
 * === Setting Up Middleware ===
 *
 * === Setting Up Listeners ===
 *
 * === Emitting Events ===
 *
 * --- Test 1: Valid user:create ---
 * [Middleware: Logger] Event 'user:create' with data: { username: 'alice', email: 'alice@example.com' }
 * [Middleware: Timestamp] Adding timestamp
 * [Middleware: Validation] Validating data
 * [Middleware: Validation] ✅ Validation passed
 * [Middleware: Async] Performing async check...
 * [Middleware: Async] Check complete
 * [Handler] User create event received:
 *   Username: alice
 *   Timestamp: 2024-...
 *   Checked: true
 *
 * --- Test 2: Invalid user:update (no username) ---
 * [Middleware: Logger] Event 'user:update' with data: { email: 'bob@example.com' }
 * [Middleware: Timestamp] Adding timestamp
 * [Middleware: Validation] Validating data
 * [Middleware: Validation] ❌ Validation failed - missing username
 * (Event not emitted)
 *
 * --- Test 3: Invalid username (too short) ---
 * [Middleware: Logger] Event 'user:create' with data: { username: 'ab', email: 'short@example.com' }
 * [Middleware: Timestamp] Adding timestamp
 * [Middleware: Validation] Validating data
 * [Error Handler] Middleware error in user:create
 *   Error: Username must be at least 3 characters
 *   Data: { username: 'ab', email: 'short@example.com', timestamp: ..., timestampISO: ... }
 *
 * --- Test 4: System event (no username validation) ---
 * [Middleware: Logger] Event 'system:status' with data: { status: 'healthy', uptime: 3600 }
 * [Middleware: Timestamp] Adding timestamp
 * [Middleware: Validation] Validating data
 * [Middleware: Validation] ✅ Validation passed
 * [Middleware: Async] Performing async check...
 * [Middleware: Async] Check complete
 * [Handler] System status event received:
 *   Status: healthy
 *   Has timestamp: true
 */

// After completing, compare with: solutions/exercise-5-solution.js
