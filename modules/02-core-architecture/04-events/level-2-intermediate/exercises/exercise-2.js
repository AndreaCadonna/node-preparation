/**
 * Exercise 2: Implement Error Handling and Recovery
 *
 * Task:
 * Create a ResilientService class that implements automatic error recovery
 * with a circuit breaker pattern. The service should track failures and
 * temporarily stop accepting requests after too many failures.
 *
 * Requirements:
 * 1. Create a ResilientService class that extends EventEmitter
 * 2. Track consecutive failure count
 * 3. When failures reach threshold (3), open the circuit:
 *    - Emit 'circuit:open' event
 *    - Reject new requests immediately
 * 4. After a timeout (2 seconds), automatically close the circuit:
 *    - Emit 'circuit:closed' event
 *    - Reset failure count
 *    - Accept requests again
 * 5. Implement execute(operation) method that:
 *    - Checks if circuit is open
 *    - Executes operation if closed
 *    - Handles errors and tracks failures
 *    - Emits appropriate events
 * 6. Reset failure count on successful execution
 *
 * Hints:
 * - Use setTimeout for circuit recovery
 * - Emit 'error' events with context
 * - Track state: 'closed' (working) vs 'open' (broken)
 */

const EventEmitter = require('events');

// YOUR CODE HERE
class ResilientService extends EventEmitter {
  constructor(failureThreshold = 3, resetTimeout = 2000) {
    super();

    // TODO: Initialize properties
    // - circuitState ('closed' or 'open')
    // - failureCount
    // - failureThreshold
    // - resetTimeout
  }

  async execute(operation) {
    // TODO: Check if circuit is open
    // TODO: Execute operation if circuit is closed
    // TODO: Handle success/failure
    // TODO: Open circuit if threshold reached
  }

  openCircuit() {
    // TODO: Set circuit to open state
    // TODO: Emit 'circuit:open'
    // TODO: Schedule automatic close
  }

  closeCircuit() {
    // TODO: Set circuit to closed state
    // TODO: Reset failure count
    // TODO: Emit 'circuit:closed'
  }

  recordSuccess() {
    // TODO: Reset failure count on success
  }

  recordFailure() {
    // TODO: Increment failure count
    // TODO: Check if threshold reached
  }
}


// Test your ResilientService
const service = new ResilientService(3, 2000);

service.on('circuit:open', () => {
  console.log('[Event] Circuit opened - service unavailable');
});

service.on('circuit:closed', () => {
  console.log('[Event] Circuit closed - service recovered');
});

service.on('operation:success', (data) => {
  console.log('[Event] Operation succeeded:', data.name);
});

service.on('operation:failed', ({ operation, error }) => {
  console.log('[Event] Operation failed:', operation.name, '-', error.message);
});

service.on('operation:rejected', (operation) => {
  console.log('[Event] Operation rejected (circuit open):', operation.name);
});

service.on('error', (error) => {
  console.error('[Error]:', error.message);
});

// Simulate operations
(async () => {
  console.log('Operation 1 (success):');
  await service.execute({
    name: 'fetch-data-1',
    run: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'success';
    }
  });

  console.log('\nOperation 2 (fail):');
  await service.execute({
    name: 'fetch-data-2',
    run: async () => {
      throw new Error('Network error');
    }
  });

  console.log('\nOperation 3 (fail):');
  await service.execute({
    name: 'fetch-data-3',
    run: async () => {
      throw new Error('Timeout');
    }
  });

  console.log('\nOperation 4 (fail - should open circuit):');
  await service.execute({
    name: 'fetch-data-4',
    run: async () => {
      throw new Error('Connection refused');
    }
  });

  console.log('\nOperation 5 (should be rejected):');
  await service.execute({
    name: 'fetch-data-5',
    run: async () => {
      return 'success';
    }
  });

  console.log('\nWaiting for circuit to recover...');

  setTimeout(async () => {
    console.log('\nOperation 6 (should succeed after recovery):');
    await service.execute({
      name: 'fetch-data-6',
      run: async () => {
        return 'success';
      }
    });
  }, 2500);
})();

/*
 * Expected output:
 * Operation 1 (success):
 * [Event] Operation succeeded: fetch-data-1
 *
 * Operation 2 (fail):
 * [Event] Operation failed: fetch-data-2 - Network error
 *
 * Operation 3 (fail):
 * [Event] Operation failed: fetch-data-3 - Timeout
 *
 * Operation 4 (fail - should open circuit):
 * [Event] Operation failed: fetch-data-4 - Connection refused
 * [Event] Circuit opened - service unavailable
 *
 * Operation 5 (should be rejected):
 * [Event] Operation rejected (circuit open): fetch-data-5
 *
 * Waiting for circuit to recover...
 * [Event] Circuit closed - service recovered
 *
 * Operation 6 (should succeed after recovery):
 * [Event] Operation succeeded: fetch-data-6
 */

// After completing, compare with: solutions/exercise-2-solution.js
