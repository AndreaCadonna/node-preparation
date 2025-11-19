# Event-Driven Architecture

A comprehensive guide to designing event-driven systems with Node.js.

## What is Event-Driven Architecture?

**Event-Driven Architecture (EDA)** is a software design pattern where components communicate through events, enabling loose coupling and scalability.

### Traditional vs Event-Driven

```
Traditional (Synchronous):          Event-Driven (Asynchronous):

Service A ──────> Service B         Service A ──> Event ──> Service B
    │                                   │            │
    └──────> Service C                  └────────────┴───> Service C

Tight coupling                      Loose coupling
Blocking                           Non-blocking
Point-to-point                     Broadcast
```

## Core Principles

### 1. Events as First-Class Citizens

Events are the primary means of communication:

```javascript
// Instead of calling methods directly
orderService.createOrder(data);
inventoryService.reserve(data);
paymentService.charge(data);

// Use events
eventBus.emit('order:created', data);
// Multiple services react independently
```

### 2. Loose Coupling

Services don't need to know about each other:

```javascript
// Service A doesn't know about Service B
class ServiceA {
  doWork() {
    const result = this.process();
    this.eventBus.emit('work:completed', result);
    // Doesn't care who listens
  }
}

// Service B reacts independently
class ServiceB {
  constructor(eventBus) {
    eventBus.on('work:completed', (result) => {
      this.handleResult(result);
    });
  }
}
```

### 3. Asynchronous Communication

Non-blocking operations:

```javascript
// Fire and forget
eventBus.emit('notification:send', {
  userId: '123',
  message: 'Hello'
});

// Continue immediately
console.log('Notification queued');
```

## Architecture Patterns

### 1. Event Bus Pattern

Centralized communication hub:

```javascript
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.modules = new Map();
  }

  registerModule(name, module) {
    this.modules.set(name, module);
    module.initialize(this);
  }

  getModule(name) {
    return this.modules.get(name);
  }
}

// Register modules
const bus = new EventBus();
bus.registerModule('orders', orderModule);
bus.registerModule('inventory', inventoryModule);
bus.registerModule('payments', paymentModule);
```

### 2. Domain Events

Events that represent business domain concepts:

```javascript
// Domain events
class OrderCreated {
  constructor(orderId, customerId, items) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.items = items;
    this.timestamp = Date.now();
  }
}

class PaymentProcessed {
  constructor(paymentId, orderId, amount) {
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
    this.timestamp = Date.now();
  }
}

// Usage
eventBus.emit('domain:event', new OrderCreated('ORD1', 'CUST1', items));
```

### 3. Saga Pattern

Coordinating long-running transactions:

```javascript
class OrderSaga {
  constructor(eventBus) {
    this.eventBus = eventBus;

    // React to events
    eventBus.on('order:created', (order) => this.handleOrderCreated(order));
    eventBus.on('inventory:reserved', (data) => this.handleInventoryReserved(data));
    eventBus.on('payment:succeeded', (data) => this.handlePaymentSucceeded(data));

    // Handle failures
    eventBus.on('payment:failed', (data) => this.compensate(data));
  }

  async handleOrderCreated(order) {
    // Step 1: Reserve inventory
    this.eventBus.emit('inventory:reserve', order);
  }

  async handleInventoryReserved(data) {
    // Step 2: Process payment
    this.eventBus.emit('payment:process', data);
  }

  async handlePaymentSucceeded(data) {
    // Step 3: Complete order
    this.eventBus.emit('order:completed', data);
  }

  async compensate(data) {
    // Rollback: Release inventory
    this.eventBus.emit('inventory:release', data);
    this.eventBus.emit('order:cancelled', data);
  }
}
```

### 4. CQRS (Command Query Responsibility Segregation)

Separate read and write models:

```javascript
// Write model (commands)
class CommandHandler {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  createOrder(command) {
    // Validate
    this.validate(command);

    // Create event
    const event = {
      type: 'OrderCreated',
      data: command.data
    };

    // Persist and publish
    this.eventBus.emit('event:persist', event);
  }
}

// Read model (queries)
class QueryHandler {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.readModels = new Map();

    // Build read models from events
    eventBus.on('OrderCreated', (e) => this.updateReadModel(e));
  }

  getOrder(orderId) {
    return this.readModels.get(orderId);
  }

  updateReadModel(event) {
    const order = {
      id: event.data.orderId,
      status: 'created',
      createdAt: event.timestamp
    };

    this.readModels.set(order.id, order);
  }
}
```

## Design Patterns

### Event Choreography

Services react to events autonomously:

```javascript
// Each service handles events independently

// Order Service
orderService.on('payment:succeeded', (data) => {
  updateOrderStatus(data.orderId, 'paid');
});

// Inventory Service
inventoryService.on('payment:succeeded', (data) => {
  confirmReservation(data.items);
});

// Shipping Service
shippingService.on('payment:succeeded', (data) => {
  createShipment(data.orderId);
});

// No central coordinator
```

### Event Orchestration

Central coordinator manages workflow:

```javascript
class OrderOrchestrator {
  constructor(eventBus) {
    this.eventBus = eventBus;

    eventBus.on('order:create', (order) => this.orchestrate(order));
  }

  async orchestrate(order) {
    // Step 1
    await this.reserveInventory(order);

    // Step 2
    await this.processPayment(order);

    // Step 3
    await this.createShipment(order);

    // Complete
    this.eventBus.emit('order:completed', order);
  }

  async reserveInventory(order) {
    return new Promise((resolve) => {
      this.eventBus.once('inventory:reserved', resolve);
      this.eventBus.emit('inventory:reserve', order);
    });
  }
}
```

## Production Considerations

### 1. Event Versioning

```javascript
class VersionedEvent {
  constructor(type, data, version = 1) {
    this.type = type;
    this.data = data;
    this.version = version;
    this.timestamp = Date.now();
  }
}

// Handle multiple versions
eventBus.on('OrderCreated', (event) => {
  if (event.version === 1) {
    handleV1(event);
  } else if (event.version === 2) {
    handleV2(event);
  }
});
```

### 2. Error Handling

```javascript
class RobustEventBus extends EventBus {
  emit(event, ...args) {
    const listeners = this.listeners(event);

    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        this.handleError(event, error, args);
      }
    });
  }

  handleError(event, error, args) {
    console.error(`Error in ${event}:`, error);

    // Send to dead letter queue
    this.emit('error', {
      event,
      error,
      data: args,
      timestamp: Date.now()
    });
  }
}
```

### 3. Monitoring

```javascript
class MonitoredEventBus extends EventBus {
  emit(event, ...args) {
    // Metrics
    metrics.increment(`events.${event}`);
    metrics.timing(`events.${event}.duration`, () => {
      super.emit(event, ...args);
    });

    // Logging
    logger.debug('Event emitted', {
      event,
      listenerCount: this.listenerCount(event),
      timestamp: Date.now()
    });

    return super.emit(event, ...args);
  }
}
```

### 4. Circuit Breaker

```javascript
class CircuitBreakerEventBus extends EventBus {
  constructor() {
    super();
    this.circuits = new Map();
  }

  emit(event, ...args) {
    if (this.isCircuitOpen(event)) {
      console.warn(`Circuit open for ${event}`);
      return false;
    }

    try {
      super.emit(event, ...args);
      this.recordSuccess(event);
    } catch (error) {
      this.recordFailure(event);
      throw error;
    }
  }

  isCircuitOpen(event) {
    const circuit = this.circuits.get(event);
    return circuit && circuit.state === 'open';
  }

  recordFailure(event) {
    // Implementation details...
  }
}
```

## Best Practices

### 1. Event Naming

```javascript
// ✅ Good: Past tense, descriptive
'OrderCreated'
'PaymentProcessed'
'UserRegistered'

// ❌ Bad: Present tense, vague
'CreateOrder'
'Process'
'Event'
```

### 2. Event Granularity

```javascript
// ✅ Good: Specific events
emit('user:emailChanged', { userId, newEmail });
emit('user:passwordChanged', { userId });

// ❌ Bad: Generic event
emit('user:updated', { userId, changes });
```

### 3. Idempotency

```javascript
// Handle duplicate events gracefully
eventBus.on('payment:process', (payment) => {
  // Check if already processed
  if (isPaymentProcessed(payment.id)) {
    return; // Idempotent
  }

  processPayment(payment);
  markPaymentProcessed(payment.id);
});
```

## Summary

**Key Takeaways:**

1. **EDA** enables loose coupling and scalability
2. **Events** are the primary communication mechanism
3. **Patterns**: Event bus, domain events, saga, CQRS
4. **Choreography vs Orchestration**: Autonomous vs coordinated
5. **Production**: Versioning, error handling, monitoring, circuit breakers
6. **Best practices**: Clear naming, granularity, idempotency

Event-driven architecture is powerful for building scalable, maintainable systems, but requires careful design and robust error handling.
