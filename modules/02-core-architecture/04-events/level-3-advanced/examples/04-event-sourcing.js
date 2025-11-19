/**
 * Example 4: Event Sourcing Pattern
 *
 * This example demonstrates:
 * - Event sourcing fundamentals
 * - Building an event store
 * - State reconstruction from events
 * - Event replay and rehydration
 * - Snapshots for optimization
 * - Practical event sourcing application
 */

const EventEmitter = require('events');

console.log('=== Event Sourcing Pattern ===\n');

// ============================================================================
// Part 1: Basic Event Store
// ============================================================================

console.log('--- Part 1: Basic Event Store ---\n');

class EventStore extends EventEmitter {
  constructor() {
    super();
    this.events = [];
    this.version = 0;
  }

  /**
   * Append an event to the store
   */
  append(eventType, data, metadata = {}) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      data,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        version: ++this.version
      }
    };

    this.events.push(event);
    this.emit('event:appended', event);
    this.emit(eventType, event);

    return event;
  }

  /**
   * Get all events
   */
  getAllEvents() {
    return [...this.events];
  }

  /**
   * Get events from a specific version
   */
  getEventsSince(version) {
    return this.events.filter(e => e.metadata.version > version);
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type) {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Replay all events through a reducer to get current state
   */
  getState(reducer, initialState = {}) {
    return this.events.reduce((state, event) => {
      return reducer(state, event);
    }, initialState);
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Example: Bank Account with Event Sourcing
console.log('Building a bank account using event sourcing:\n');

const accountStore = new EventStore();

// Log all events as they're appended
accountStore.on('event:appended', (event) => {
  console.log(`📝 Event: ${event.type} (v${event.metadata.version})`);
  console.log(`   Data:`, JSON.stringify(event.data));
});

// Append events
accountStore.append('AccountCreated', { accountId: 'ACC123', owner: 'Alice' });
accountStore.append('MoneyDeposited', { amount: 1000, accountId: 'ACC123' });
accountStore.append('MoneyDeposited', { amount: 500, accountId: 'ACC123' });
accountStore.append('MoneyWithdrawn', { amount: 200, accountId: 'ACC123' });
accountStore.append('MoneyWithdrawn', { amount: 100, accountId: 'ACC123' });

// Reducer to rebuild state from events
function accountReducer(state, event) {
  switch (event.type) {
    case 'AccountCreated':
      return {
        ...state,
        accountId: event.data.accountId,
        owner: event.data.owner,
        balance: 0,
        createdAt: event.metadata.timestamp
      };

    case 'MoneyDeposited':
      return {
        ...state,
        balance: (state.balance || 0) + event.data.amount
      };

    case 'MoneyWithdrawn':
      return {
        ...state,
        balance: (state.balance || 0) - event.data.amount
      };

    default:
      return state;
  }
}

const currentState = accountStore.getState(accountReducer);
console.log('\n💰 Current Account State:');
console.log(JSON.stringify(currentState, null, 2));

setTimeout(continuePart2, 100);

// ============================================================================
// Part 2: Aggregate with Event Sourcing
// ============================================================================

function continuePart2() {
  console.log('\n--- Part 2: Aggregate Pattern ---\n');

  class Aggregate extends EventEmitter {
    constructor(id, eventStore) {
      super();
      this.id = id;
      this.eventStore = eventStore;
      this.version = 0;
      this.state = {};
    }

    /**
     * Apply an event to update state
     */
    applyEvent(event) {
      // Let subclass handle the event
      this.apply(event);

      // Update version
      this.version = event.metadata.version;

      // Emit that state changed
      this.emit('stateChanged', this.state);
    }

    /**
     * Persist an event and apply it
     */
    persistEvent(eventType, data) {
      const event = this.eventStore.append(eventType, {
        ...data,
        aggregateId: this.id
      });

      this.applyEvent(event);
      return event;
    }

    /**
     * Replay events to rebuild state
     */
    rehydrate() {
      const events = this.eventStore.getAllEvents()
        .filter(e => e.data.aggregateId === this.id);

      events.forEach(event => this.applyEvent(event));

      return this;
    }

    /**
     * Override this to handle events
     */
    apply(event) {
      throw new Error('Subclass must implement apply()');
    }
  }

  class BankAccount extends Aggregate {
    constructor(id, eventStore) {
      super(id, eventStore);
      this.state = {
        accountId: id,
        balance: 0,
        owner: null,
        isOpen: false,
        transactions: []
      };
    }

    // Commands (business logic)
    open(owner) {
      if (this.state.isOpen) {
        throw new Error('Account already open');
      }

      this.persistEvent('AccountOpened', { owner });
    }

    deposit(amount) {
      if (!this.state.isOpen) {
        throw new Error('Account is not open');
      }

      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      this.persistEvent('MoneyDeposited', { amount });
    }

    withdraw(amount) {
      if (!this.state.isOpen) {
        throw new Error('Account is not open');
      }

      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      if (this.state.balance < amount) {
        throw new Error('Insufficient funds');
      }

      this.persistEvent('MoneyWithdrawn', { amount });
    }

    close() {
      if (!this.state.isOpen) {
        throw new Error('Account is not open');
      }

      if (this.state.balance !== 0) {
        throw new Error('Account must have zero balance to close');
      }

      this.persistEvent('AccountClosed', {});
    }

    // Event handlers
    apply(event) {
      switch (event.type) {
        case 'AccountOpened':
          this.state.owner = event.data.owner;
          this.state.isOpen = true;
          break;

        case 'MoneyDeposited':
          this.state.balance += event.data.amount;
          this.state.transactions.push({
            type: 'deposit',
            amount: event.data.amount,
            timestamp: event.metadata.timestamp
          });
          break;

        case 'MoneyWithdrawn':
          this.state.balance -= event.data.amount;
          this.state.transactions.push({
            type: 'withdrawal',
            amount: event.data.amount,
            timestamp: event.metadata.timestamp
          });
          break;

        case 'AccountClosed':
          this.state.isOpen = false;
          break;
      }
    }

    getBalance() {
      return this.state.balance;
    }

    getTransactionHistory() {
      return this.state.transactions;
    }
  }

  // Use the aggregate
  const store = new EventStore();
  const account = new BankAccount('ACC456', store);

  console.log('Performing account operations:\n');

  account.open('Bob');
  console.log('✅ Account opened for Bob');

  account.deposit(1000);
  console.log('✅ Deposited $1000');

  account.deposit(250);
  console.log('✅ Deposited $250');

  account.withdraw(300);
  console.log('✅ Withdrew $300');

  console.log(`\n💰 Current Balance: $${account.getBalance()}`);
  console.log('\n📊 Transaction History:');
  console.table(account.getTransactionHistory());

  console.log('\n📜 Event Store Contains:');
  store.getAllEvents().forEach(event => {
    console.log(`   ${event.type} (v${event.metadata.version})`);
  });

  setTimeout(continuePart3, 100);
}

// ============================================================================
// Part 3: Snapshots for Performance
// ============================================================================

function continuePart3() {
  console.log('\n--- Part 3: Snapshots for Optimization ---\n');

  class SnapshotEventStore extends EventStore {
    constructor(snapshotInterval = 10) {
      super();
      this.snapshots = new Map();
      this.snapshotInterval = snapshotInterval;
    }

    /**
     * Create a snapshot of state at current version
     */
    createSnapshot(aggregateId, state) {
      const snapshot = {
        aggregateId,
        state: JSON.parse(JSON.stringify(state)), // Deep copy
        version: this.version,
        timestamp: Date.now()
      };

      this.snapshots.set(aggregateId, snapshot);
      this.emit('snapshot:created', snapshot);

      return snapshot;
    }

    /**
     * Get latest snapshot for an aggregate
     */
    getSnapshot(aggregateId) {
      return this.snapshots.get(aggregateId);
    }

    /**
     * Get state efficiently using snapshots
     */
    getStateWithSnapshot(aggregateId, reducer, initialState) {
      const snapshot = this.getSnapshot(aggregateId);

      if (!snapshot) {
        // No snapshot, replay all events
        const events = this.events.filter(e => e.data.aggregateId === aggregateId);
        return events.reduce((state, event) => reducer(state, event), initialState);
      }

      // Start from snapshot and replay only newer events
      const eventsAfterSnapshot = this.events.filter(e =>
        e.data.aggregateId === aggregateId &&
        e.metadata.version > snapshot.version
      );

      return eventsAfterSnapshot.reduce(
        (state, event) => reducer(state, event),
        snapshot.state
      );
    }
  }

  const snapshotStore = new SnapshotEventStore(5);

  snapshotStore.on('snapshot:created', (snapshot) => {
    console.log(`📸 Snapshot created at version ${snapshot.version}`);
  });

  console.log('Creating account with many transactions:\n');

  // Create many events
  snapshotStore.append('AccountOpened', { aggregateId: 'ACC789', owner: 'Charlie' });

  for (let i = 1; i <= 20; i++) {
    snapshotStore.append('MoneyDeposited', {
      aggregateId: 'ACC789',
      amount: 100 * i
    });

    // Create snapshot every 5 events
    if (i % 5 === 0) {
      const state = snapshotStore.getState(
        accountReducer,
        { accountId: 'ACC789', balance: 0 }
      );
      snapshotStore.createSnapshot('ACC789', state);
    }
  }

  console.log(`\n📊 Total events: ${snapshotStore.getAllEvents().length}`);
  console.log(`📸 Total snapshots: ${snapshotStore.snapshots.size}`);

  const finalState = snapshotStore.getStateWithSnapshot(
    'ACC789',
    accountReducer,
    { accountId: 'ACC789', balance: 0 }
  );

  console.log('\n💰 Final State (rebuilt from snapshot):');
  console.log(`   Balance: $${finalState.balance}`);

  function accountReducer(state, event) {
    switch (event.type) {
      case 'AccountOpened':
        return {
          ...state,
          owner: event.data.owner,
          balance: 0
        };
      case 'MoneyDeposited':
        return {
          ...state,
          balance: (state.balance || 0) + event.data.amount
        };
      default:
        return state;
    }
  }

  setTimeout(continuePart4, 100);
}

// ============================================================================
// Part 4: Event Replay and Time Travel
// ============================================================================

function continuePart4() {
  console.log('\n--- Part 4: Event Replay and Time Travel ---\n');

  class TimeTravelStore extends EventStore {
    /**
     * Get state at a specific point in time
     */
    getStateAtTime(timestamp, reducer, initialState) {
      const eventsUntilTime = this.events.filter(e =>
        e.metadata.timestamp <= timestamp
      );

      return eventsUntilTime.reduce(
        (state, event) => reducer(state, event),
        initialState
      );
    }

    /**
     * Get state at a specific version
     */
    getStateAtVersion(version, reducer, initialState) {
      const eventsUntilVersion = this.events.filter(e =>
        e.metadata.version <= version
      );

      return eventsUntilVersion.reduce(
        (state, event) => reducer(state, event),
        initialState
      );
    }

    /**
     * Replay events from a specific version
     */
    replayFrom(version, handler) {
      const events = this.events.filter(e => e.metadata.version > version);

      events.forEach(event => {
        handler(event);
      });

      return events.length;
    }
  }

  const timeStore = new TimeTravelStore();

  console.log('Creating shopping cart events:\n');

  const timestamps = [];

  timeStore.append('CartCreated', { cartId: 'CART1', userId: 'USER1' });
  timestamps.push(Date.now());

  setTimeout(() => {
    timeStore.append('ItemAdded', { cartId: 'CART1', item: 'Laptop', price: 1000 });
    timestamps.push(Date.now());
  }, 10);

  setTimeout(() => {
    timeStore.append('ItemAdded', { cartId: 'CART1', item: 'Mouse', price: 50 });
    timestamps.push(Date.now());
  }, 20);

  setTimeout(() => {
    timeStore.append('ItemRemoved', { cartId: 'CART1', item: 'Mouse' });
    timestamps.push(Date.now());
  }, 30);

  setTimeout(() => {
    timeStore.append('ItemAdded', { cartId: 'CART1', item: 'Keyboard', price: 100 });
    timestamps.push(Date.now());
  }, 40);

  setTimeout(() => {
    console.log('All events recorded\n');

    function cartReducer(state, event) {
      switch (event.type) {
        case 'CartCreated':
          return { items: [], total: 0 };

        case 'ItemAdded':
          return {
            items: [...state.items, event.data.item],
            total: state.total + event.data.price
          };

        case 'ItemRemoved':
          return {
            items: state.items.filter(i => i !== event.data.item),
            total: state.total
          };

        default:
          return state;
      }
    }

    // Show state at different versions
    console.log('🕐 Time Travel through cart states:\n');

    for (let v = 1; v <= timeStore.version; v++) {
      const state = timeStore.getStateAtVersion(v, cartReducer, {});
      const event = timeStore.events[v - 1];
      console.log(`Version ${v}: ${event.type}`);
      console.log(`  Items: [${state.items?.join(', ') || 'none'}]`);
      console.log(`  Total: $${state.total || 0}`);
    }

    console.log('\n✅ Event sourcing enables perfect audit trail and time travel!');

    continuePart5();
  }, 100);
}

// ============================================================================
// Part 5: CQRS Pattern
// ============================================================================

function continuePart5() {
  console.log('\n--- Part 5: CQRS (Command Query Responsibility Segregation) ---\n');

  // Write side - Commands modify state through events
  class CommandHandler {
    constructor(eventStore) {
      this.eventStore = eventStore;
    }

    handle(command) {
      // Validate command
      // Apply business rules
      // Emit events

      switch (command.type) {
        case 'CreateOrder':
          return this.eventStore.append('OrderCreated', command.data);

        case 'AddItem':
          return this.eventStore.append('ItemAdded', command.data);

        case 'CompleteOrder':
          return this.eventStore.append('OrderCompleted', command.data);

        default:
          throw new Error(`Unknown command: ${command.type}`);
      }
    }
  }

  // Read side - Queries read from optimized projections
  class QueryHandler {
    constructor(eventStore) {
      this.eventStore = eventStore;
      this.projections = new Map();

      // Build projections from events
      this.rebuildProjections();

      // Keep projections updated
      this.eventStore.on('event:appended', (event) => {
        this.updateProjection(event);
      });
    }

    rebuildProjections() {
      this.eventStore.getAllEvents().forEach(event => {
        this.updateProjection(event);
      });
    }

    updateProjection(event) {
      const orderId = event.data.orderId;
      if (!orderId) return;

      if (!this.projections.has(orderId)) {
        this.projections.set(orderId, {
          orderId,
          items: [],
          total: 0,
          status: 'pending'
        });
      }

      const projection = this.projections.get(orderId);

      switch (event.type) {
        case 'OrderCreated':
          projection.customerId = event.data.customerId;
          break;

        case 'ItemAdded':
          projection.items.push(event.data.item);
          projection.total += event.data.price;
          break;

        case 'OrderCompleted':
          projection.status = 'completed';
          break;
      }
    }

    getOrder(orderId) {
      return this.projections.get(orderId);
    }

    getAllOrders() {
      return Array.from(this.projections.values());
    }

    getOrdersByStatus(status) {
      return this.getAllOrders().filter(o => o.status === status);
    }
  }

  // Use CQRS
  const cqrsStore = new EventStore();
  const commandHandler = new CommandHandler(cqrsStore);
  const queryHandler = new QueryHandler(cqrsStore);

  console.log('Executing commands:\n');

  commandHandler.handle({
    type: 'CreateOrder',
    data: { orderId: 'ORD1', customerId: 'CUST1' }
  });
  console.log('✅ Created order ORD1');

  commandHandler.handle({
    type: 'AddItem',
    data: { orderId: 'ORD1', item: 'Widget', price: 25 }
  });
  console.log('✅ Added Widget to ORD1');

  commandHandler.handle({
    type: 'AddItem',
    data: { orderId: 'ORD1', item: 'Gadget', price: 75 }
  });
  console.log('✅ Added Gadget to ORD1');

  console.log('\nExecuting queries:\n');

  const order = queryHandler.getOrder('ORD1');
  console.log('Order Details:');
  console.log(`  ID: ${order.orderId}`);
  console.log(`  Items: ${order.items.join(', ')}`);
  console.log(`  Total: $${order.total}`);
  console.log(`  Status: ${order.status}`);

  console.log('\n' + '='.repeat(60));
  console.log('Event Sourcing Key Benefits:');
  console.log('='.repeat(60));
  console.log('✅ Complete audit trail');
  console.log('✅ Time travel capabilities');
  console.log('✅ Event replay for debugging');
  console.log('✅ Multiple read models (CQRS)');
  console.log('✅ Business logic in events');
  console.log('✅ Never lose data');
  console.log('='.repeat(60));
}

/*
 * Key Takeaways:
 *
 * 1. EVENT SOURCING PRINCIPLES:
 *    - Store events, not state
 *    - State is derived from events
 *    - Events are immutable
 *    - Events capture business intent
 *
 * 2. BENEFITS:
 *    - Complete audit trail
 *    - Time travel / replay
 *    - Event-driven integration
 *    - Debugging and analysis
 *    - Temporal queries
 *
 * 3. PATTERNS:
 *    - Event Store: Central repository
 *    - Aggregates: Business logic
 *    - Snapshots: Performance optimization
 *    - CQRS: Separate read/write models
 *
 * 4. CONSIDERATIONS:
 *    - Event schema evolution
 *    - Storage requirements
 *    - Eventual consistency
 *    - Snapshot strategy
 *    - Event replay performance
 */
