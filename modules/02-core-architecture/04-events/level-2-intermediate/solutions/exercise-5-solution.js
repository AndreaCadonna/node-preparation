/**
 * Solution 5: Build an Event Middleware System
 *
 * This solution demonstrates:
 * - Middleware chain implementation
 * - Data transformation through pipeline
 * - Conditional event emission
 * - Async middleware support
 * - Error handling in middleware
 */

const EventEmitter = require('events');

class MiddlewareEventBus extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
  }

  use(middlewareFn) {
    this.middleware.push(middlewareFn);
    return this; // Enable chaining
  }

  async emitWithMiddleware(event, data) {
    let processedData = data;

    try {
      // Run through middleware chain
      for (const mw of this.middleware) {
        const result = await mw(event, processedData);

        // If middleware returns false, stop the chain
        if (result === false) {
          console.log('[Middleware] Event blocked by middleware');
          return false;
        }

        // If middleware returns data, use it
        if (result !== undefined && result !== true) {
          processedData = result;
        }
      }

      // All middleware passed, emit event
      this.emit(event, processedData);
      return true;

    } catch (error) {
      // Middleware threw an error
      this.emit('middleware:error', {
        event,
        data: processedData,
        error
      });
      return false;
    }
  }
}

// Test the MiddlewareEventBus
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

// Test cases
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
 * Key Implementation Details:
 *
 * 1. Middleware array stores functions in order
 * 2. use() returns this for method chaining
 * 3. Each middleware receives (event, data)
 * 4. Middleware can:
 *    - Return modified data
 *    - Return false to stop chain
 *    - Throw error to abort
 * 5. async/await enables I/O in middleware
 * 6. try-catch captures middleware errors
 * 7. Event only emitted if all middleware pass
 * 8. Useful for validation, auth, logging
 */
