/**
 * Solution 2: Implement Error Handling and Recovery
 *
 * This solution demonstrates:
 * - Circuit breaker pattern implementation
 * - Automatic error recovery
 * - State management
 * - Error tracking and thresholds
 */

const EventEmitter = require('events');

class ResilientService extends EventEmitter {
  constructor(failureThreshold = 3, resetTimeout = 2000) {
    super();

    this.circuitState = 'closed'; // 'closed' = working, 'open' = broken
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async execute(operation) {
    // Check if circuit is open
    if (this.circuitState === 'open') {
      this.emit('operation:rejected', operation);
      return null;
    }

    // Circuit is closed, try to execute
    try {
      const result = await operation.run();
      this.recordSuccess();
      this.emit('operation:success', operation);
      return result;

    } catch (error) {
      this.recordFailure();
      this.emit('operation:failed', {
        operation,
        error
      });
      return null;
    }
  }

  recordSuccess() {
    // Reset failure count on success
    this.failureCount = 0;
  }

  recordFailure() {
    this.failureCount++;

    // Check if threshold reached
    if (this.failureCount >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  openCircuit() {
    this.circuitState = 'open';
    this.emit('circuit:open');

    // Schedule automatic recovery
    setTimeout(() => {
      this.closeCircuit();
    }, this.resetTimeout);
  }

  closeCircuit() {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.emit('circuit:closed');
  }
}

// Test the ResilientService
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
 * Key Implementation Details:
 *
 * 1. Circuit has two states: 'closed' (working) and 'open' (broken)
 * 2. Failure count tracks consecutive failures
 * 3. When threshold reached, circuit opens automatically
 * 4. Open circuit rejects all operations immediately
 * 5. setTimeout schedules automatic recovery
 * 6. Success resets failure count
 * 7. Events provide visibility into circuit state
 * 8. Pattern prevents cascading failures
 */
