# Event Namespacing

A comprehensive guide to organizing events using namespaces for clarity, maintainability, and scalability.

## Table of Contents

1. [What is Event Namespacing?](#what-is-event-namespacing)
2. [Naming Conventions](#naming-conventions)
3. [Hierarchical Events](#hierarchical-events)
4. [Wildcard Patterns](#wildcard-patterns)
5. [Benefits and Use Cases](#benefits-and-use-cases)
6. [Implementation Patterns](#implementation-patterns)
7. [Best Practices](#best-practices)

---

## What is Event Namespacing?

Event namespacing is a convention for organizing event names using a hierarchical structure with delimiters (typically colons).

### Without Namespacing

```javascript
// ❌ Unclear, collision-prone
emitter.on('created', handler);
emitter.on('updated', handler);
emitter.on('deleted', handler);
emitter.on('error', handler);

// What was created? User? Post? Comment?
// Hard to filter by domain
// Name collisions likely
```

### With Namespacing

```javascript
// ✅ Clear, organized, collision-free
emitter.on('user:created', handler);
emitter.on('user:updated', handler);
emitter.on('user:deleted', handler);
emitter.on('user:error', handler);

emitter.on('post:created', handler);
emitter.on('post:updated', handler);

// Immediately clear what domain each event belongs to
```

### Why Use Namespacing?

**1. Clarity**
- Self-documenting event names
- Clear domain ownership
- Easier to understand event flow

**2. Organization**
- Group related events
- Separate concerns
- Logical hierarchy

**3. Collision Prevention**
- Avoid name conflicts
- Multiple modules can coexist
- Safe integration

**4. Filtering**
- Listen to all events in a namespace
- Domain-specific monitoring
- Simplified debugging

---

## Naming Conventions

### The Colon Convention

The most common convention uses colons (`:`) as separators:

```javascript
// Pattern: namespace:action
'user:created'
'user:updated'
'user:deleted'

// Pattern: namespace:subnamespace:action
'api:user:created'
'api:post:updated'
'db:connection:lost'

// Pattern: namespace:action:state
'job:process:started'
'job:process:completed'
'job:process:failed'
```

### Common Patterns

**1. Domain:Action**
```javascript
'user:login'
'user:logout'
'order:created'
'payment:processed'
```

**2. Module:Submodule:Action**
```javascript
'database:connection:established'
'database:connection:lost'
'api:request:received'
'api:response:sent'
```

**3. Resource:Action:State**
```javascript
'task:execute:started'
'task:execute:completed'
'task:execute:failed'
```

**4. Error Events**
```javascript
'error:database'
'error:network'
'error:validation'
'error:authentication'
```

### Naming Guidelines

**DO:**
- Use lowercase
- Be consistent with separators (`:`)
- Use descriptive names
- Follow a pattern throughout your app

**DON'T:**
- Mix separators (`:` vs `.` vs `_`)
- Use spaces
- Be too generic (`event`, `data`)
- Mix naming patterns

---

## Hierarchical Events

### Basic Hierarchy

```javascript
class Application extends EventEmitter {
  // Top level: app
  start() {
    this.emit('app:starting');
    this.emit('app:started');
  }

  // Second level: app:module
  connectDatabase() {
    this.emit('app:db:connecting');
    this.emit('app:db:connected');
  }

  // Third level: app:module:resource
  createUser(data) {
    this.emit('app:db:user:created', data);
  }
}
```

### Benefits of Hierarchy

```javascript
// Listen at different levels of specificity

// Level 1: All app events
app.on('app:*', (event, data) => {
  console.log('App event:', event);
});

// Level 2: All database events
app.on('app:db:*', (event, data) => {
  console.log('DB event:', event);
});

// Level 3: Specific user events
app.on('app:db:user:*', (event, data) => {
  console.log('User event:', event);
});

// Level 4: Very specific event
app.on('app:db:user:created', (data) => {
  console.log('User created:', data);
});
```

### Real-World Example

```javascript
class ECommerceSystem extends EventEmitter {
  // Order lifecycle
  createOrder(order) {
    this.emit('order:created', order);
    this.emit('order:state:pending', order);
  }

  confirmOrder(orderId) {
    this.emit('order:confirmed', { orderId });
    this.emit('order:state:confirmed', { orderId });
    this.emit('payment:required', { orderId });
  }

  processPayment(orderId, payment) {
    this.emit('payment:started', { orderId, payment });
    this.emit('order:state:processing', { orderId });

    // ... payment processing ...

    this.emit('payment:completed', { orderId });
    this.emit('order:state:paid', { orderId });
    this.emit('fulfillment:required', { orderId });
  }

  shipOrder(orderId, tracking) {
    this.emit('fulfillment:started', { orderId, tracking });
    this.emit('order:state:shipped', { orderId, tracking });
  }

  deliverOrder(orderId) {
    this.emit('fulfillment:completed', { orderId });
    this.emit('order:state:delivered', { orderId });
    this.emit('order:completed', { orderId });
  }
}

// Usage - listen to different levels
const system = new ECommerceSystem();

// All order events
system.on('order:*', (event, data) => {
  console.log('[Order Event]', event);
});

// All payment events
system.on('payment:*', (event, data) => {
  console.log('[Payment Event]', event);
});

// All fulfillment events
system.on('fulfillment:*', (event, data) => {
  console.log('[Fulfillment Event]', event);
});

// Specific state changes for audit
system.on('order:state:*', (event, data) => {
  auditLog.write(event, data);
});
```

---

## Wildcard Patterns

EventEmitter doesn't support wildcards natively, but we can implement them:

### Simple Wildcard Implementation

```javascript
class WildcardEmitter extends EventEmitter {
  emit(event, ...args) {
    // Emit the specific event
    super.emit(event, ...args);

    // Extract namespace and emit wildcard
    const parts = event.split(':');

    // Emit wildcards for each level
    for (let i = 1; i <= parts.length; i++) {
      const wildcardEvent = parts.slice(0, i).join(':') + ':*';
      super.emit(wildcardEvent, event, ...args);
    }

    return true;
  }
}

const emitter = new WildcardEmitter();

// Listen to all user events
emitter.on('user:*', (actualEvent, data) => {
  console.log('User event:', actualEvent, data);
});

// This triggers both 'user:login' and 'user:*'
emitter.emit('user:login', { username: 'alice' });
```

### Advanced Wildcard Pattern

```javascript
class AdvancedWildcardEmitter extends EventEmitter {
  emit(event, ...args) {
    // Emit specific event
    super.emit(event, ...args);

    // Generate all wildcard variants
    const wildcards = this.generateWildcards(event);

    wildcards.forEach(wildcard => {
      super.emit(wildcard, event, ...args);
    });

    return true;
  }

  generateWildcards(event) {
    const parts = event.split(':');
    const wildcards = [];

    // For 'user:profile:updated':
    // Generate: 'user:*', 'user:profile:*', 'user:*:updated'
    for (let i = 0; i < parts.length; i++) {
      const variant = [...parts];
      variant[i] = '*';
      wildcards.push(variant.join(':'));
    }

    // Also add progressive wildcards
    for (let i = 1; i <= parts.length; i++) {
      wildcards.push(parts.slice(0, i).join(':') + ':*');
    }

    return [...new Set(wildcards)]; // Remove duplicates
  }
}

const emitter = new AdvancedWildcardEmitter();

// Listen to all profile events
emitter.on('user:profile:*', (event, data) => {
  console.log('Profile event:', event);
});

// Listen to all 'updated' events
emitter.on('user:*:updated', (event, data) => {
  console.log('Something updated:', event);
});

emitter.emit('user:profile:updated', { id: 123 });
```

---

## Benefits and Use Cases

### Benefit 1: Domain Monitoring

```javascript
class MonitoredSystem extends EventEmitter {
  // ... system code ...
}

const system = new MonitoredSystem();

// Monitor all database events
system.on('db:*', (event, data) => {
  dbMonitor.log(event, data);
});

// Monitor all authentication events
system.on('auth:*', (event, data) => {
  securityLog.write(event, data);
});

// Monitor all errors
system.on('error:*', (event, error) => {
  errorTracker.report(error);
});
```

### Benefit 2: Audit Trails

```javascript
class AuditedApplication extends EventEmitter {
  // ... application code ...
}

const app = new AuditedApplication();

// Audit all user-related actions
app.on('user:*', (event, data) => {
  auditLog.write({
    type: 'user',
    event,
    data,
    timestamp: Date.now()
  });
});

// Audit all state changes
app.on('*:state:*', (event, data) => {
  stateLog.write(event, data);
});
```

### Benefit 3: Feature Toggles

```javascript
class FeatureToggledApp extends EventEmitter {
  constructor() {
    super();
    this.features = {
      analytics: true,
      notifications: false
    };
  }

  // ... app code ...
}

const app = new FeatureToggledApp();

// Conditionally listen based on features
if (app.features.analytics) {
  app.on('user:*', (event, data) => {
    analytics.track(event, data);
  });
}

if (app.features.notifications) {
  app.on('user:*', (event, data) => {
    notificationService.notify(event, data);
  });
}
```

### Benefit 4: Module Integration

```javascript
// Core system
class CoreSystem extends EventEmitter {
  // Emits: 'system:*' events
}

// Plugin 1 - Analytics
class AnalyticsPlugin {
  attach(system) {
    system.on('user:*', this.trackUserEvent.bind(this));
    system.on('order:*', this.trackOrderEvent.bind(this));
  }
}

// Plugin 2 - Logging
class LoggingPlugin {
  attach(system) {
    system.on('error:*', this.logError.bind(this));
    system.on('*:state:*', this.logStateChange.bind(this));
  }
}

// Clean integration
const system = new CoreSystem();
new AnalyticsPlugin().attach(system);
new LoggingPlugin().attach(system);
```

---

## Implementation Patterns

### Pattern 1: Constants for Events

```javascript
// events.js
module.exports = {
  USER: {
    CREATED: 'user:created',
    UPDATED: 'user:updated',
    DELETED: 'user:deleted',
    LOGIN: 'user:login',
    LOGOUT: 'user:logout'
  },
  ORDER: {
    CREATED: 'order:created',
    CONFIRMED: 'order:confirmed',
    SHIPPED: 'order:shipped',
    DELIVERED: 'order:delivered'
  },
  ERROR: {
    DATABASE: 'error:database',
    NETWORK: 'error:network',
    VALIDATION: 'error:validation'
  }
};

// service.js
const EVENTS = require('./events');

class UserService extends EventEmitter {
  createUser(data) {
    const user = this.create(data);
    this.emit(EVENTS.USER.CREATED, user);
    return user;
  }
}
```

### Pattern 2: Event Builder

```javascript
class EventNameBuilder {
  constructor(namespace) {
    this.namespace = namespace;
  }

  build(action, state = null) {
    const parts = [this.namespace, action];
    if (state) parts.push(state);
    return parts.join(':');
  }

  wildcard() {
    return `${this.namespace}:*`;
  }
}

// Usage
const userEvents = new EventNameBuilder('user');

service.emit(userEvents.build('created'));     // 'user:created'
service.emit(userEvents.build('login', 'success')); // 'user:login:success'

service.on(userEvents.wildcard(), handler); // Listen to 'user:*'
```

### Pattern 3: Typed Events

```javascript
class TypedEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.eventTypes = {};
  }

  registerEvent(namespace, actions) {
    actions.forEach(action => {
      const eventName = `${namespace}:${action}`;
      this.eventTypes[eventName] = { namespace, action };
    });
  }

  emitTyped(namespace, action, data) {
    const eventName = `${namespace}:${action}`;

    if (!this.eventTypes[eventName]) {
      throw new Error(`Unknown event: ${eventName}`);
    }

    this.emit(eventName, data);
  }
}

// Usage
const emitter = new TypedEventEmitter();

emitter.registerEvent('user', ['created', 'updated', 'deleted']);
emitter.registerEvent('order', ['created', 'shipped']);

emitter.emitTyped('user', 'created', { id: 123 }); // OK
// emitter.emitTyped('user', 'unknown', {}); // Error!
```

---

## Best Practices

### 1. Be Consistent

```javascript
// ✅ GOOD: Consistent pattern
'user:created'
'user:updated'
'user:deleted'
'post:created'
'post:updated'
'post:deleted'

// ❌ BAD: Inconsistent
'user:created'
'update-user'
'deleteUser'
'post_created'
```

### 2. Document Your Namespaces

```javascript
/**
 * Event Namespaces:
 *
 * user:*               - User lifecycle events
 * user:auth:*          - Authentication events
 * user:profile:*       - Profile management
 *
 * order:*              - Order lifecycle
 * order:state:*        - Order state transitions
 *
 * payment:*            - Payment events
 *
 * error:*              - Error events by domain
 */
class DocumentedSystem extends EventEmitter {
  // ...
}
```

### 3. Use Past Tense for Events

```javascript
// ✅ GOOD: Past tense (event already happened)
'user:created'
'order:confirmed'
'payment:completed'

// ❌ LESS CLEAR: Present/future tense
'user:create'
'order:confirm'
'payment:complete'
```

### 4. Separate State Changes

```javascript
// Track state explicitly
class StatefulSystem extends EventEmitter {
  updateUserStatus(userId, status) {
    // Emit action
    this.emit('user:status:updated', { userId, status });

    // Emit state
    this.emit(`user:status:${status}`, { userId });
  }
}

// Listen to specific state
system.on('user:status:active', handler);
system.on('user:status:suspended', handler);

// Or listen to all status changes
system.on('user:status:*', handler);
```

### 5. Avoid Over-nesting

```javascript
// ❌ TOO DEEP: Hard to remember
'app:modules:users:profile:settings:email:updated'

// ✅ BETTER: Simpler hierarchy
'user:profile:updated'
'user:email:changed'
```

---

## Summary

**Key Takeaways:**

1. **Use colon notation** for namespaces (`module:action`)
2. **Be consistent** with naming patterns
3. **Implement wildcards** for namespace listening
4. **Document** your event namespaces
5. **Use constants** to avoid typos
6. **Past tense** for event names
7. **Hierarchical structure** enables filtering
8. **Don't over-nest** - keep it simple
9. **Separate concerns** with clear domains
10. **Enable monitoring** per namespace

Event namespacing transforms chaos into order. It makes your event-driven system maintainable, debuggable, and scalable. Start with a clear naming convention and stick to it!
