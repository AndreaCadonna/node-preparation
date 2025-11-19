# Event Sourcing Pattern

A comprehensive guide to implementing event sourcing in Node.js applications.

## Table of Contents

1. [What is Event Sourcing?](#what-is-event-sourcing)
2. [Core Concepts](#core-concepts)
3. [Benefits and Trade-offs](#benefits-and-trade-offs)
4. [Implementation Patterns](#implementation-patterns)
5. [Advanced Topics](#advanced-topics)
6. [Production Considerations](#production-considerations)

---

## What is Event Sourcing?

**Event Sourcing** is a pattern where state changes are stored as a sequence of events, rather than storing just the current state.

### Traditional Approach

```
Database stores current state:

User Table:
┌────────┬───────┬────────┐
│ ID     │ Name  │ Email  │
├────────┼───────┼────────┤
│ user_1 │ Alice │ a@...  │
└────────┴───────┴────────┘

Problem: How did we get here?
History is lost!
```

### Event Sourcing Approach

```
Event Store:
┌────────┬─────────────────┬──────────────────┐
│ Ver    │ Event           │ Data             │
├────────┼─────────────────┼──────────────────┤
│ 1      │ UserCreated     │ {name: "Alice"}  │
│ 2      │ EmailChanged    │ {email: "a@..."} │
│ 3      │ NameChanged     │ {name: "Alicia"} │
└────────┴─────────────────┴──────────────────┘

Current state = replay all events
Complete history preserved!
```

---

## Core Concepts

### 1. Events

Events are immutable facts about what happened:

```javascript
const events = [
  {
    type: 'OrderCreated',
    data: { orderId: 'ORD1', customerId: 'CUST1' },
    metadata: { timestamp: 1234567890, version: 1 }
  },
  {
    type: 'ItemAdded',
    data: { orderId: 'ORD1', item: 'Widget', price: 10 },
    metadata: { timestamp: 1234567891, version: 2 }
  },
  {
    type: 'OrderCompleted',
    data: { orderId: 'ORD1', total: 10 },
    metadata: { timestamp: 1234567892, version: 3 }
  }
];
```

**Properties:**
- Immutable (never changed)
- Past tense (UserCreated, not CreateUser)
- Contain all data needed to reconstruct state
- Ordered sequence
- Versioned

### 2. Event Store

Central repository for events:

```javascript
class EventStore {
  constructor() {
    this.events = [];
    this.version = 0;
  }

  append(type, data) {
    const event = {
      id: this.generateId(),
      type,
      data,
      metadata: {
        timestamp: Date.now(),
        version: ++this.version
      }
    };

    this.events.push(event);
    return event;
  }

  getEvents(aggregateId) {
    return this.events.filter(e =>
      e.data.aggregateId === aggregateId
    );
  }

  getAllEvents() {
    return [...this.events];
  }
}
```

### 3. Aggregates

Business entities that apply events:

```javascript
class ShoppingCart {
  constructor(id) {
    this.id = id;
    this.state = { items: [], total: 0 };
    this.version = 0;
  }

  // Commands (intent)
  addItem(item) {
    // Validate
    if (!item.price || item.price <= 0) {
      throw new Error('Invalid price');
    }

    // Create event
    const event = {
      type: 'ItemAdded',
      data: { ...item, cartId: this.id }
    };

    // Apply event
    this.apply(event);

    return event;
  }

  // Event handlers (state changes)
  apply(event) {
    switch (event.type) {
      case 'ItemAdded':
        this.state.items.push(event.data);
        this.state.total += event.data.price;
        break;

      case 'ItemRemoved':
        this.state.items = this.state.items.filter(
          i => i.id !== event.data.itemId
        );
        this.recalculateTotal();
        break;
    }

    this.version++;
  }

  recalculateTotal() {
    this.state.total = this.state.items.reduce(
      (sum, item) => sum + item.price,
      0
    );
  }
}
```

### 4. Projection (Read Model)

Optimized views of data:

```javascript
class OrderSummaryProjection {
  constructor(eventStore) {
    this.eventStore = eventStore;
    this.summaries = new Map();

    // Build projections from events
    this.rebuild();

    // Keep updated
    eventStore.on('event:appended', (event) => {
      this.project(event);
    });
  }

  rebuild() {
    this.summaries.clear();
    this.eventStore.getAllEvents().forEach(e => this.project(e));
  }

  project(event) {
    const orderId = event.data.orderId;
    if (!orderId) return;

    if (!this.summaries.has(orderId)) {
      this.summaries.set(orderId, {
        orderId,
        itemCount: 0,
        total: 0,
        status: 'pending'
      });
    }

    const summary = this.summaries.get(orderId);

    switch (event.type) {
      case 'ItemAdded':
        summary.itemCount++;
        summary.total += event.data.price;
        break;

      case 'OrderCompleted':
        summary.status = 'completed';
        break;
    }
  }

  getOrderSummary(orderId) {
    return this.summaries.get(orderId);
  }
}
```

---

## Benefits and Trade-offs

### Benefits

✅ **Complete Audit Trail**
```javascript
// Know exactly what happened and when
events.forEach(e => {
  console.log(`${e.metadata.timestamp}: ${e.type}`);
});
```

✅ **Time Travel**
```javascript
// View state at any point in time
function getStateAtVersion(version) {
  const events = store.events.filter(e => e.metadata.version <= version);
  return events.reduce(reducer, initialState);
}
```

✅ **Event Replay**
```javascript
// Rebuild state from scratch
function rebuild() {
  const state = {};
  store.getAllEvents().forEach(event => {
    applyEvent(state, event);
  });
  return state;
}
```

✅ **Multiple Read Models**
```javascript
// Same events, different views
const orderSummary = new OrderSummaryProjection(store);
const inventoryView = new InventoryProjection(store);
const analyticsView = new AnalyticsProjection(store);
```

✅ **Debugging**
```javascript
// Reproduce bugs by replaying exact event sequence
const bugEvents = loadEventsFromProduction();
bugEvents.forEach(e => aggregate.apply(e));
// Now in same state as production bug
```

### Trade-offs

❌ **Storage Requirements**
- Events accumulate forever
- More storage than current state
- Mitigation: Snapshots, archiving old events

❌ **Query Complexity**
- Must replay events for current state
- Slow without projections
- Mitigation: Maintain read models/projections

❌ **Eventual Consistency**
- Projections may lag behind events
- Not all queries can be answered immediately
- Mitigation: CQRS pattern

❌ **Schema Evolution**
- Event schemas must be versioned
- Old events must always be processable
- Mitigation: Event upcasting, versioning strategy

---

## Implementation Patterns

### Pattern 1: Simple Event Store

```javascript
class SimpleEventStore extends EventEmitter {
  constructor() {
    super();
    this.events = [];
    this.version = 0;
  }

  append(eventType, data, metadata = {}) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  getEventsSince(version) {
    return this.events.filter(e => e.metadata.version > version);
  }

  getState(reducer, initialState = {}) {
    return this.events.reduce((state, event) => {
      return reducer(state, event);
    }, initialState);
  }
}
```

### Pattern 2: Snapshots

```javascript
class SnapshotEventStore extends SimpleEventStore {
  constructor(snapshotInterval = 100) {
    super();
    this.snapshotInterval = snapshotInterval;
    this.snapshots = new Map();
  }

  createSnapshot(aggregateId, state) {
    const snapshot = {
      aggregateId,
      state: JSON.parse(JSON.stringify(state)),
      version: this.version,
      timestamp: Date.now()
    };

    this.snapshots.set(aggregateId, snapshot);
    this.emit('snapshot:created', snapshot);

    return snapshot;
  }

  getStateEfficiently(aggregateId, reducer, initialState) {
    const snapshot = this.snapshots.get(aggregateId);

    if (!snapshot) {
      // No snapshot, replay all
      return this.getState(reducer, initialState);
    }

    // Replay only events after snapshot
    const recentEvents = this.events.filter(e =>
      e.data.aggregateId === aggregateId &&
      e.metadata.version > snapshot.version
    );

    return recentEvents.reduce(reducer, snapshot.state);
  }

  autoSnapshot(aggregateId, state) {
    if (this.version % this.snapshotInterval === 0) {
      this.createSnapshot(aggregateId, state);
    }
  }
}
```

### Pattern 3: CQRS (Command Query Responsibility Segregation)

```javascript
// Write side
class CommandHandler {
  constructor(eventStore) {
    this.eventStore = eventStore;
  }

  handle(command) {
    // Validate command
    this.validate(command);

    // Execute business logic
    const events = this.execute(command);

    // Persist events
    events.forEach(event => {
      this.eventStore.append(event.type, event.data);
    });

    return events;
  }

  execute(command) {
    switch (command.type) {
      case 'CreateOrder':
        return [{
          type: 'OrderCreated',
          data: command.data
        }];

      case 'AddItem':
        return [{
          type: 'ItemAdded',
          data: command.data
        }];

      default:
        throw new Error(`Unknown command: ${command.type}`);
    }
  }

  validate(command) {
    // Business rule validation
  }
}

// Read side
class QueryHandler {
  constructor(eventStore) {
    this.eventStore = eventStore;
    this.readModels = new Map();

    this.buildReadModels();

    eventStore.on('event:appended', (event) => {
      this.updateReadModels(event);
    });
  }

  buildReadModels() {
    this.eventStore.getAllEvents().forEach(event => {
      this.updateReadModels(event);
    });
  }

  updateReadModels(event) {
    // Update various projections
    switch (event.type) {
      case 'OrderCreated':
        this.createOrderReadModel(event.data);
        break;

      case 'ItemAdded':
        this.updateOrderReadModel(event.data);
        break;
    }
  }

  query(queryType, params) {
    switch (queryType) {
      case 'GetOrder':
        return this.readModels.get(params.orderId);

      case 'GetOrdersByCustomer':
        return Array.from(this.readModels.values())
          .filter(o => o.customerId === params.customerId);

      default:
        throw new Error(`Unknown query: ${queryType}`);
    }
  }
}
```

---

## Advanced Topics

### Event Versioning

```javascript
class VersionedEventStore extends EventStore {
  constructor() {
    super();
    this.upcasters = new Map();
  }

  // Register upcaster for old event versions
  registerUpcaster(eventType, fromVersion, toVersion, upcaster) {
    const key = `${eventType}:${fromVersion}`;
    this.upcasters.set(key, { toVersion, upcaster });
  }

  // Apply upcasters when retrieving events
  getEvents(aggregateId) {
    const events = super.getEvents(aggregateId);

    return events.map(event => {
      return this.upcast(event);
    });
  }

  upcast(event) {
    const eventVersion = event.metadata.schemaVersion || 1;
    const key = `${event.type}:${eventVersion}`;
    const upcaster = this.upcasters.get(key);

    if (upcaster) {
      const upcastedData = upcaster.upcaster(event.data);
      return {
        ...event,
        data: upcastedData,
        metadata: {
          ...event.metadata,
          schemaVersion: upcaster.toVersion
        }
      };
    }

    return event;
  }
}

// Usage
const store = new VersionedEventStore();

// Upcast old UserCreated v1 to v2
store.registerUpcaster('UserCreated', 1, 2, (data) => {
  return {
    ...data,
    email: data.emailAddress, // Renamed field
    emailAddress: undefined
  };
});
```

---

## Production Considerations

### Storage

```javascript
// PostgreSQL event store example
class PostgresEventStore {
  async append(type, data) {
    const event = {
      type,
      data: JSON.stringify(data),
      timestamp: new Date(),
      version: await this.getNextVersion()
    };

    await db.query(
      `INSERT INTO events (type, data, timestamp, version)
       VALUES ($1, $2, $3, $4)`,
      [event.type, event.data, event.timestamp, event.version]
    );

    return event;
  }

  async getEvents(aggregateId, fromVersion = 0) {
    const result = await db.query(
      `SELECT * FROM events
       WHERE data->>'aggregateId' = $1
       AND version > $2
       ORDER BY version`,
      [aggregateId, fromVersion]
    );

    return result.rows;
  }
}
```

### Monitoring

```javascript
class MonitoredEventStore extends EventStore {
  append(type, data) {
    const event = super.append(type, data);

    // Metrics
    metrics.increment('events.appended');
    metrics.increment(`events.${type}`);
    metrics.gauge('events.total', this.events.length);

    // Logging
    logger.info('Event appended', {
      type,
      version: event.metadata.version
    });

    return event;
  }
}
```

---

## Summary

**Key Takeaways:**

1. **Event Sourcing** stores events, not state
2. **Benefits**: Audit trail, time travel, debugging, flexibility
3. **Trade-offs**: Storage, complexity, eventual consistency
4. **Patterns**: Event Store, Aggregates, Projections, CQRS
5. **Advanced**: Snapshots, versioning, multiple read models
6. **Production**: Storage strategy, monitoring, scaling

Event sourcing is powerful but complex. Use it when you need audit trails, time travel, or complex business logic. For simple CRUD, traditional state storage may be better.
