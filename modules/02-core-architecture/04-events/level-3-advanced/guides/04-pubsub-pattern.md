# Publish-Subscribe Pattern

Deep dive into the pub-sub pattern for building decoupled, scalable event systems.

## Overview

**Publish-Subscribe** (Pub-Sub) is a messaging pattern where publishers send messages to topics without knowing who will receive them, and subscribers receive messages from topics they're interested in.

### Pub-Sub vs Observer Pattern

```
Observer Pattern:          Pub-Sub Pattern:
Direct connection         Message broker intermediary

Publisher                 Publisher
    │                         │
    ├──> Observer1            ▼
    ├──> Observer2        Message Broker
    └──> Observer3            │
                              ├──> Subscriber1
Tight coupling              ├──> Subscriber2
                              └──> Subscriber3

                          Loose coupling
```

## Core Concepts

### 1. Topics

Logical channels for messages:

```javascript
// Hierarchical topics
'user.created'
'user.updated'
'user.deleted'
'order.created'
'order.shipped'
'payment.processed'
```

### 2. Wildcards

```javascript
'user.*'        // Matches user.created, user.updated, etc.
'user.**'       // Matches all under user
'**'            // Matches everything
```

### 3. Message Structure

```javascript
{
  topic: 'order.created',
  message: {
    orderId: 'ORD123',
    customerId: 'CUST456',
    total: 99.99
  },
  metadata: {
    timestamp: 1234567890,
    publisher: 'order-service',
    correlationId: 'abc-123'
  }
}
```

## Implementation

### Basic Pub-Sub

```javascript
class PubSub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
  }

  publish(topic, message) {
    const publication = {
      topic,
      message,
      timestamp: Date.now()
    };

    this.emit(`topic:${topic}`, publication);
    return publication;
  }

  subscribe(topic, handler) {
    const wrapper = (pub) => handler(pub.message, pub);
    this.on(`topic:${topic}`, wrapper);

    return () => this.off(`topic:${topic}`, wrapper);
  }
}
```

### With Wildcards

```javascript
class WildcardPubSub extends PubSub {
  publish(topic, message) {
    const pub = super.publish(topic, message);

    // Emit to wildcard subscribers
    const parts = topic.split('.');
    for (let i = 1; i <= parts.length; i++) {
      const pattern = parts.slice(0, i).join('.') + '.*';
      this.emit(`pattern:${pattern}`, pub);
    }

    // Global wildcard
    this.emit('pattern:**', pub);

    return pub;
  }

  subscribe(topic, handler) {
    if (topic.includes('*')) {
      const wrapper = (pub) => handler(pub.message, pub);
      this.on(`pattern:${topic}`, wrapper);
      return () => this.off(`pattern:${topic}`, wrapper);
    }

    return super.subscribe(topic, handler);
  }
}
```

## Advanced Features

### Message Filtering

```javascript
class FilteredPubSub extends WildcardPubSub {
  subscribeWithFilter(topic, filter, handler) {
    const filteredHandler = (message, pub) => {
      if (filter(message, pub)) {
        handler(message, pub);
      }
    };

    return this.subscribe(topic, filteredHandler);
  }
}

// Usage
pubsub.subscribeWithFilter(
  'order.*',
  (msg) => msg.total > 100,  // Only high-value orders
  (msg) => console.log('High-value order:', msg)
);
```

### Message History

```javascript
class PersistentPubSub extends FilteredPubSub {
  constructor(options = {}) {
    super();
    this.maxHistory = options.maxHistory || 100;
    this.history = new Map();
  }

  publish(topic, message) {
    const pub = super.publish(topic, message);

    // Store in history
    if (!this.history.has(topic)) {
      this.history.set(topic, []);
    }

    const topicHistory = this.history.get(topic);
    topicHistory.push(pub);

    if (topicHistory.length > this.maxHistory) {
      topicHistory.shift();
    }

    return pub;
  }

  subscribeWithHistory(topic, handler, options = {}) {
    const limit = options.limit || 10;

    // Send historical messages
    const history = this.getHistory(topic, limit);
    history.forEach(pub => handler(pub.message, pub));

    // Subscribe to new messages
    return this.subscribe(topic, handler);
  }

  getHistory(topic, limit = 10) {
    const topicHistory = this.history.get(topic) || [];
    return topicHistory.slice(-limit);
  }
}
```

### Priority Subscriptions

```javascript
class PriorityPubSub extends EventEmitter {
  constructor() {
    super();
    this.priorityHandlers = new Map();
  }

  publish(topic, message) {
    const pub = { topic, message, timestamp: Date.now() };
    const handlers = this.priorityHandlers.get(topic) || [];

    // Sort by priority (higher first)
    handlers.sort((a, b) => b.priority - a.priority);

    // Execute in priority order
    handlers.forEach(({ handler }) => {
      handler(pub.message, pub);
    });

    return pub;
  }

  subscribe(topic, handler, priority = 0) {
    if (!this.priorityHandlers.has(topic)) {
      this.priorityHandlers.set(topic, []);
    }

    this.priorityHandlers.get(topic).push({
      handler,
      priority
    });

    return () => {
      const handlers = this.priorityHandlers.get(topic);
      const index = handlers.findIndex(h => h.handler === handler);
      if (index !== -1) handlers.splice(index, 1);
    };
  }
}
```

## Use Cases

### 1. Microservices Communication

```javascript
// Order Service
orderPubSub.publish('order.created', {
  orderId: 'ORD123',
  items: [...],
  customerId: 'CUST456'
});

// Inventory Service
inventoryPubSub.subscribe('order.created', (order) => {
  reserveInventory(order.items);
});

// Email Service
emailPubSub.subscribe('order.created', (order) => {
  sendOrderConfirmation(order);
});

// Analytics Service
analyticsPubSub.subscribe('**', (data, pub) => {
  trackEvent(pub.topic, data);
});
```

### 2. Real-Time Notifications

```javascript
// Backend publishes
notificationPubSub.publish('notification', {
  userId: 'USER123',
  type: 'message',
  data: { from: 'Alice', text: 'Hello!' }
});

// Multiple clients subscribe
clientPubSub.subscribe('notification', (notification) => {
  if (notification.userId === currentUserId) {
    showNotification(notification);
  }
});
```

### 3. Event Aggregation

```javascript
// Multiple sources publish metrics
metricsPubSub.publish('metrics.cpu', { value: 45 });
metricsPubSub.publish('metrics.memory', { value: 78 });
metricsPubSub.publish('metrics.requests', { count: 1250 });

// Aggregator collects all
metricsPubSub.subscribe('metrics.*', (metric, pub) => {
  const metricType = pub.topic.split('.')[1];
  dashboardData[metricType] = metric;
  updateDashboard();
});
```

## Production Patterns

### Dead Letter Queue

```javascript
class ResilientPubSub extends PubSub {
  constructor() {
    super();
    this.deadLetterQueue = [];
  }

  publish(topic, message) {
    try {
      return super.publish(topic, message);
    } catch (error) {
      this.deadLetterQueue.push({
        topic,
        message,
        error: error.message,
        timestamp: Date.now()
      });

      this.emit('deadLetter', { topic, message, error });
    }
  }

  getDeadLetters() {
    return [...this.deadLetterQueue];
  }

  retryDeadLetters() {
    const letters = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    letters.forEach(({ topic, message }) => {
      this.publish(topic, message);
    });
  }
}
```

### Message Acknowledgment

```javascript
class AckPubSub extends PubSub {
  subscribe(topic, handler) {
    const ackHandler = async (message, pub) => {
      try {
        await handler(message, pub);
        this.emit('ack', pub);
      } catch (error) {
        this.emit('nack', { pub, error });
      }
    };

    return super.subscribe(topic, ackHandler);
  }
}
```

## Best Practices

### 1. Topic Naming

```javascript
// ✅ Good: Hierarchical, specific
'user.created'
'order.payment.succeeded'
'inventory.item.reserved'

// ❌ Bad: Generic, flat
'event'
'userEvent'
'data'
```

### 2. Message Immutability

```javascript
// ✅ Good: Immutable messages
const message = Object.freeze({
  orderId: 'ORD123',
  total: 99.99
});

// ❌ Bad: Mutable
const message = { orderId: 'ORD123' };
message.total = 99.99; // Can be changed
```

### 3. Error Handling

```javascript
pubsub.subscribe('order.created', async (order) => {
  try {
    await processOrder(order);
  } catch (error) {
    logger.error('Order processing failed', { order, error });
    pubsub.publish('order.failed', { order, error });
  }
});
```

## Summary

**Key Points:**

1. **Pub-Sub** decouples publishers from subscribers
2. **Topics** organize messages hierarchically
3. **Wildcards** enable flexible subscriptions
4. **Features**: Filtering, history, priority, acknowledgment
5. **Use cases**: Microservices, notifications, aggregation
6. **Production**: Dead letters, retries, monitoring

Pub-Sub is ideal for building scalable, decoupled systems where components don't need to know about each other.
