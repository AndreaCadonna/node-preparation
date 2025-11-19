/**
 * Example 7: Saga Pattern for Distributed Transactions
 *
 * This example demonstrates:
 * - Saga pattern implementation
 * - Coordinating multi-step transactions
 * - Compensation logic for failures
 * - Event choreography
 * - Long-running processes
 * - Error recovery
 */

const EventEmitter = require('events');

console.log('=== Saga Pattern for Distributed Transactions ===\n');

// ============================================================================
// Part 1: Basic Saga Implementation
// ============================================================================

console.log('--- Part 1: Basic Saga Pattern ---\n');

class Saga extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.steps = [];
    this.currentStep = 0;
    this.state = 'pending';
    this.executedSteps = [];
    this.compensations = [];
  }

  /**
   * Add a step to the saga
   */
  addStep(name, execute, compensate) {
    this.steps.push({
      name,
      execute,
      compensate
    });
    return this;
  }

  /**
   * Execute the saga
   */
  async execute(context = {}) {
    this.state = 'running';
    this.context = context;
    this.emit('saga:started', { saga: this.name, context });

    try {
      for (const step of this.steps) {
        await this.executeStep(step);
      }

      this.state = 'completed';
      this.emit('saga:completed', { saga: this.name, context: this.context });
      console.log(`✅ Saga "${this.name}" completed successfully\n`);

      return this.context;

    } catch (error) {
      this.state = 'failed';
      this.emit('saga:failed', { saga: this.name, error, context: this.context });
      console.log(`❌ Saga "${this.name}" failed: ${error.message}\n`);

      // Run compensations
      await this.compensate();

      throw error;
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(step) {
    console.log(`  ⚙️  Executing step: ${step.name}`);
    this.emit('step:started', { saga: this.name, step: step.name });

    try {
      const result = await step.execute(this.context);

      // Update context with result
      if (result !== undefined) {
        this.context = { ...this.context, ...result };
      }

      this.executedSteps.push(step);
      this.compensations.unshift(step.compensate); // LIFO for compensations

      this.emit('step:completed', { saga: this.name, step: step.name });
      console.log(`  ✅ Step "${step.name}" completed`);

    } catch (error) {
      this.emit('step:failed', { saga: this.name, step: step.name, error });
      throw new Error(`Step "${step.name}" failed: ${error.message}`);
    }
  }

  /**
   * Run compensation logic (rollback)
   */
  async compensate() {
    console.log(`  🔄 Starting compensation for ${this.executedSteps.length} steps...`);
    this.emit('saga:compensating', { saga: this.name });

    for (const compensate of this.compensations) {
      if (compensate) {
        try {
          await compensate(this.context);
          console.log(`  ↩️  Compensation executed`);
        } catch (error) {
          console.error(`  ⚠️  Compensation failed: ${error.message}`);
          this.emit('compensation:failed', { saga: this.name, error });
        }
      }
    }

    this.emit('saga:compensated', { saga: this.name });
    console.log(`  ✅ Compensation completed\n`);
  }
}

// Example: Order processing saga
async function demonstrateBasicSaga() {
  const orderSaga = new Saga('CreateOrder');

  orderSaga
    .addStep(
      'ValidateOrder',
      async (ctx) => {
        if (!ctx.items || ctx.items.length === 0) {
          throw new Error('No items in order');
        }
        console.log(`    Validated order with ${ctx.items.length} items`);
        return { validated: true };
      },
      async (ctx) => {
        console.log('    [Compensate] Validation cleanup');
      }
    )
    .addStep(
      'ReserveInventory',
      async (ctx) => {
        console.log(`    Reserved inventory for items`);
        return { inventoryReserved: true };
      },
      async (ctx) => {
        console.log('    [Compensate] Release inventory reservation');
      }
    )
    .addStep(
      'ProcessPayment',
      async (ctx) => {
        if (ctx.amount > 10000) {
          throw new Error('Payment amount too high');
        }
        console.log(`    Processed payment: $${ctx.amount}`);
        return { paymentId: 'PAY123' };
      },
      async (ctx) => {
        console.log('    [Compensate] Refund payment');
      }
    )
    .addStep(
      'CreateShipment',
      async (ctx) => {
        console.log(`    Created shipment`);
        return { shipmentId: 'SHIP123' };
      },
      async (ctx) => {
        console.log('    [Compensate] Cancel shipment');
      }
    );

  // Successful execution
  console.log('Executing successful order saga:\n');

  try {
    const result = await orderSaga.execute({
      orderId: 'ORD1',
      items: ['Widget', 'Gadget'],
      amount: 150
    });

    console.log('Final result:', result);
  } catch (error) {
    console.error('Saga failed:', error.message);
  }

  // Failed execution (payment too high)
  console.log('\nExecuting failed order saga (payment too high):\n');

  const failedSaga = new Saga('CreateOrder');
  failedSaga
    .addStep('ValidateOrder', async (ctx) => {
      console.log('    Validated order');
      return { validated: true };
    }, async (ctx) => {
      console.log('    [Compensate] Validation cleanup');
    })
    .addStep('ReserveInventory', async (ctx) => {
      console.log('    Reserved inventory');
      return { inventoryReserved: true };
    }, async (ctx) => {
      console.log('    [Compensate] Release inventory');
    })
    .addStep('ProcessPayment', async (ctx) => {
      if (ctx.amount > 10000) {
        throw new Error('Payment amount too high');
      }
      console.log('    Processed payment');
      return { paymentId: 'PAY123' };
    }, async (ctx) => {
      console.log('    [Compensate] Refund payment');
    });

  try {
    await failedSaga.execute({
      orderId: 'ORD2',
      items: ['Expensive Item'],
      amount: 15000 // Too high!
    });
  } catch (error) {
    // Expected to fail and compensate
  }

  setTimeout(continuePart2, 100);
}

demonstrateBasicSaga();

// ============================================================================
// Part 2: Event Choreography Saga
// ============================================================================

function continuePart2() {
  console.log('--- Part 2: Event Choreography Pattern ---\n');

  class ChoreographySaga extends EventEmitter {
    constructor(name, eventBus) {
      super();
      this.name = name;
      this.eventBus = eventBus;
      this.state = new Map();
    }

    /**
     * Start the saga by emitting the initial event
     */
    start(initialEvent, data) {
      const sagaId = this.generateSagaId();

      this.state.set(sagaId, {
        status: 'started',
        data,
        events: [],
        startedAt: Date.now()
      });

      this.eventBus.emit(initialEvent, {
        sagaId,
        ...data
      });

      return sagaId;
    }

    /**
     * Handle saga events
     */
    on(event, handler) {
      this.eventBus.on(event, async (data) => {
        const sagaState = this.state.get(data.sagaId);

        if (!sagaState) return;

        sagaState.events.push({ event, timestamp: Date.now() });

        try {
          await handler(data, sagaState);
        } catch (error) {
          this.handleError(data.sagaId, error);
        }
      });
    }

    /**
     * Complete the saga
     */
    complete(sagaId) {
      const sagaState = this.state.get(sagaId);
      if (sagaState) {
        sagaState.status = 'completed';
        sagaState.completedAt = Date.now();
        this.emit('saga:completed', { sagaId, duration: sagaState.completedAt - sagaState.startedAt });
      }
    }

    /**
     * Fail the saga
     */
    fail(sagaId, error) {
      const sagaState = this.state.get(sagaId);
      if (sagaState) {
        sagaState.status = 'failed';
        sagaState.error = error;
        this.emit('saga:failed', { sagaId, error });
      }
    }

    handleError(sagaId, error) {
      console.error(`❌ Saga ${sagaId} error: ${error.message}`);
      this.fail(sagaId, error);
      this.eventBus.emit('saga:compensate', { sagaId, error });
    }

    generateSagaId() {
      return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // Example: Travel booking choreography
  const eventBus = new EventEmitter();
  eventBus.setMaxListeners(Infinity);

  const travelBookingSaga = new ChoreographySaga('TravelBooking', eventBus);

  // Service 1: Flight service
  eventBus.on('booking:flight:reserve', async (data) => {
    console.log(`  ✈️  Flight service: Reserving flight for ${data.destination}`);

    setTimeout(() => {
      eventBus.emit('booking:flight:reserved', {
        sagaId: data.sagaId,
        flightId: 'FL123',
        destination: data.destination
      });
    }, 50);
  });

  // Service 2: Hotel service
  eventBus.on('booking:flight:reserved', async (data) => {
    console.log(`  🏨 Hotel service: Booking hotel in ${data.destination}`);

    setTimeout(() => {
      eventBus.emit('booking:hotel:reserved', {
        sagaId: data.sagaId,
        hotelId: 'HTL123',
        destination: data.destination
      });
    }, 50);
  });

  // Service 3: Car rental service
  eventBus.on('booking:hotel:reserved', async (data) => {
    console.log(`  🚗 Car service: Renting car in ${data.destination}`);

    setTimeout(() => {
      eventBus.emit('booking:car:reserved', {
        sagaId: data.sagaId,
        carId: 'CAR123'
      });
    }, 50);
  });

  // Service 4: Payment service
  eventBus.on('booking:car:reserved', async (data) => {
    console.log(`  💳 Payment service: Processing payment`);

    setTimeout(() => {
      eventBus.emit('booking:payment:completed', {
        sagaId: data.sagaId,
        paymentId: 'PAY123'
      });
    }, 50);
  });

  // Saga completion
  eventBus.on('booking:payment:completed', (data) => {
    console.log(`  ✅ Booking completed: ${data.sagaId}`);
    travelBookingSaga.complete(data.sagaId);
  });

  // Start the saga
  console.log('Starting travel booking choreography:\n');

  const sagaId = travelBookingSaga.start('booking:flight:reserve', {
    destination: 'Paris',
    checkIn: '2024-06-01',
    checkOut: '2024-06-07'
  });

  travelBookingSaga.on('saga:completed', (data) => {
    console.log(`\n✅ Saga completed in ${data.duration}ms\n`);
    setTimeout(continuePart3, 100);
  });
}

// ============================================================================
// Part 3: Saga with Timeout and Retry
// ============================================================================

function continuePart3() {
  console.log('--- Part 3: Saga with Timeout and Retry ---\n');

  class ResilientSaga extends Saga {
    constructor(name, options = {}) {
      super(name);
      this.timeout = options.timeout || 5000;
      this.retries = options.retries || 3;
    }

    async executeStep(step) {
      let lastError;
      let attempt = 0;

      while (attempt < this.retries) {
        attempt++;

        try {
          console.log(`  ⚙️  Step "${step.name}" - Attempt ${attempt}/${this.retries}`);

          // Execute with timeout
          const result = await Promise.race([
            step.execute(this.context),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), this.timeout)
            )
          ]);

          // Success
          if (result !== undefined) {
            this.context = { ...this.context, ...result };
          }

          this.executedSteps.push(step);
          this.compensations.unshift(step.compensate);

          console.log(`  ✅ Step "${step.name}" completed`);
          return;

        } catch (error) {
          lastError = error;
          console.log(`  ⚠️  Attempt ${attempt} failed: ${error.message}`);

          if (attempt < this.retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`  ⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      throw new Error(`Step "${step.name}" failed after ${this.retries} attempts: ${lastError.message}`);
    }
  }

  // Example with retries
  async function demonstrateResilience() {
    const resilientSaga = new ResilientSaga('ResilientOrder', {
      timeout: 2000,
      retries: 3
    });

    let attemptCount = 0;

    resilientSaga.addStep(
      'FlakeyService',
      async (ctx) => {
        attemptCount++;

        // Fail first 2 attempts, succeed on 3rd
        if (attemptCount < 3) {
          throw new Error('Service temporarily unavailable');
        }

        console.log('    Service succeeded!');
        return { success: true };
      },
      async (ctx) => {
        console.log('    [Compensate] Rollback flakey service');
      }
    );

    console.log('Testing resilient saga with retries:\n');

    try {
      await resilientSaga.execute({ orderId: 'ORD3' });
    } catch (error) {
      console.error('Saga failed:', error.message);
    }

    console.log('\n✅ Saga succeeded after retries\n');

    setTimeout(continuePart4, 100);
  }

  demonstrateResilience();
}

// ============================================================================
// Part 4: Saga Orchestrator
// ============================================================================

function continuePart4() {
  console.log('--- Part 4: Saga Orchestrator Pattern ---\n');

  class SagaOrchestrator extends EventEmitter {
    constructor() {
      super();
      this.sagas = new Map();
      this.runningCount = 0;
    }

    /**
     * Register a saga definition
     */
    register(name, sagaFactory) {
      this.sagas.set(name, sagaFactory);
    }

    /**
     * Execute a saga by name
     */
    async execute(name, context) {
      const sagaFactory = this.sagas.get(name);

      if (!sagaFactory) {
        throw new Error(`Saga "${name}" not registered`);
      }

      const saga = sagaFactory();
      const sagaId = this.generateSagaId();

      this.runningCount++;
      this.emit('saga:started', { name, sagaId });

      try {
        const result = await saga.execute(context);
        this.emit('saga:completed', { name, sagaId, result });
        return result;
      } catch (error) {
        this.emit('saga:failed', { name, sagaId, error });
        throw error;
      } finally {
        this.runningCount--;
      }
    }

    /**
     * Get metrics
     */
    getMetrics() {
      return {
        registeredSagas: this.sagas.size,
        runningSagas: this.runningCount
      };
    }

    generateSagaId() {
      return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  const orchestrator = new SagaOrchestrator();

  // Register saga definitions
  orchestrator.register('createOrder', () => {
    const saga = new Saga('CreateOrder');

    saga
      .addStep('Validate', async (ctx) => {
        console.log('    Validating order...');
        return { validated: true };
      }, null)
      .addStep('Reserve', async (ctx) => {
        console.log('    Reserving inventory...');
        return { reserved: true };
      }, null)
      .addStep('Charge', async (ctx) => {
        console.log('    Charging customer...');
        return { charged: true };
      }, null);

    return saga;
  });

  orchestrator.register('cancelOrder', () => {
    const saga = new Saga('CancelOrder');

    saga
      .addStep('Refund', async (ctx) => {
        console.log('    Refunding payment...');
        return { refunded: true };
      }, null)
      .addStep('ReleaseInventory', async (ctx) => {
        console.log('    Releasing inventory...');
        return { released: true };
      }, null);

    return saga;
  });

  // Use orchestrator
  async function demonstrateOrchestrator() {
    console.log('Executing sagas through orchestrator:\n');

    console.log('Creating order:');
    await orchestrator.execute('createOrder', { orderId: 'ORD1', amount: 100 });

    console.log('\nCanceling order:');
    await orchestrator.execute('cancelOrder', { orderId: 'ORD1' });

    console.log('\n📊 Orchestrator metrics:', orchestrator.getMetrics());

    console.log('\n' + '='.repeat(60));
    console.log('Saga Pattern Summary:');
    console.log('='.repeat(60));
    console.log('✅ Coordinate distributed transactions');
    console.log('✅ Automatic compensation on failure');
    console.log('✅ Event choreography for loose coupling');
    console.log('✅ Retry logic for resilience');
    console.log('✅ Centralized orchestration');
    console.log('✅ Long-running process support');
    console.log('='.repeat(60));
  }

  demonstrateOrchestrator();
}

/*
 * Key Takeaways:
 *
 * 1. SAGA PATTERN OVERVIEW:
 *    - Sequence of local transactions
 *    - Each step has compensation logic
 *    - Forward recovery or rollback
 *    - Eventual consistency
 *
 * 2. TWO MAIN APPROACHES:
 *    - Orchestration: Central coordinator
 *    - Choreography: Event-driven, decentralized
 *
 * 3. KEY FEATURES:
 *    - Compensation transactions
 *    - Retry logic
 *    - Timeout handling
 *    - State tracking
 *    - Error recovery
 *
 * 4. USE CASES:
 *    - Distributed transactions
 *    - Microservices coordination
 *    - Long-running workflows
 *    - Order processing
 *    - Booking systems
 *
 * 5. CONSIDERATIONS:
 *    - Design idempotent operations
 *    - Handle partial failures
 *    - Compensation may not be perfect
 *    - Monitor saga execution
 *    - Dead letter queues for failed sagas
 */
