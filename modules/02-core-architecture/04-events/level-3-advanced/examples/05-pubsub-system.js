/**
 * Example 5: Publish-Subscribe System
 *
 * This example demonstrates:
 * - Building a pub-sub message bus
 * - Topic-based routing
 * - Wildcard subscriptions
 * - Message filtering
 * - Priority subscriptions
 * - Message persistence
 */

const EventEmitter = require('events');

console.log('=== Publish-Subscribe System ===\n');

// ============================================================================
// Part 1: Basic Pub-Sub
// ============================================================================

console.log('--- Part 1: Basic Pub-Sub Pattern ---\n');

class PubSub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
    this.topics = new Map();
  }

  /**
   * Publish a message to a topic
   */
  publish(topic, message) {
    const publication = {
      topic,
      message,
      timestamp: Date.now()
    };

    // Emit to exact topic
    this.emit(`topic:${topic}`, publication);

    // Track topic activity
    if (!this.topics.has(topic)) {
      this.topics.set(topic, { count: 0, lastPublished: 0 });
    }

    const stats = this.topics.get(topic);
    stats.count++;
    stats.lastPublished = Date.now();

    return publication;
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic, handler) {
    const wrappedHandler = (publication) => {
      handler(publication.message, publication);
    };

    this.on(`topic:${topic}`, wrappedHandler);

    return () => {
      this.off(`topic:${topic}`, wrappedHandler);
    };
  }

  /**
   * Subscribe once to a topic
   */
  subscribeOnce(topic, handler) {
    const wrappedHandler = (publication) => {
      handler(publication.message, publication);
    };

    this.once(`topic:${topic}`, wrappedHandler);
  }

  /**
   * Get topic statistics
   */
  getTopicStats(topic) {
    return this.topics.get(topic) || { count: 0, lastPublished: null };
  }

  /**
   * Get all active topics
   */
  getActiveTopics() {
    return Array.from(this.topics.keys());
  }
}

// Use basic pub-sub
const pubsub = new PubSub();

console.log('Setting up subscribers:\n');

const unsubscribe1 = pubsub.subscribe('user.login', (message) => {
  console.log('📧 Email service:', `Send welcome email to ${message.username}`);
});

const unsubscribe2 = pubsub.subscribe('user.login', (message) => {
  console.log('📊 Analytics:', `Track login for user ${message.username}`);
});

const unsubscribe3 = pubsub.subscribe('user.login', (message) => {
  console.log('🔔 Notification:', `User ${message.username} logged in`);
});

console.log('Publishing to user.login topic:\n');

pubsub.publish('user.login', {
  username: 'alice',
  timestamp: Date.now()
});

console.log('\nAll subscribers received the message!\n');

setTimeout(continuePart2, 100);

// ============================================================================
// Part 2: Wildcard Subscriptions
// ============================================================================

function continuePart2() {
  console.log('--- Part 2: Wildcard Subscriptions ---\n');

  class WildcardPubSub extends PubSub {
    publish(topic, message) {
      const publication = super.publish(topic, message);

      // Support wildcard patterns
      const parts = topic.split('.');

      // Emit for each level with wildcard
      // user.login.success -> user.*, user.login.*, etc.
      for (let i = 1; i <= parts.length; i++) {
        const pattern = parts.slice(0, i).join('.') + '.*';
        this.emit(`pattern:${pattern}`, publication);
      }

      // Emit for ** (all) pattern
      this.emit('pattern:**', publication);

      return publication;
    }

    subscribe(topic, handler) {
      if (topic.includes('*')) {
        const wrappedHandler = (publication) => {
          handler(publication.message, publication);
        };

        this.on(`pattern:${topic}`, wrappedHandler);

        return () => {
          this.off(`pattern:${topic}`, wrappedHandler);
        };
      }

      return super.subscribe(topic, handler);
    }
  }

  const wildcardPubSub = new WildcardPubSub();

  console.log('Setting up wildcard subscribers:\n');

  // Subscribe to all user events
  wildcardPubSub.subscribe('user.*', (message, publication) => {
    console.log(`[user.*] Event: ${publication.topic}`, message);
  });

  // Subscribe to all events
  wildcardPubSub.subscribe('**', (message, publication) => {
    console.log(`[**] Event: ${publication.topic}`);
  });

  console.log('Publishing various events:\n');

  wildcardPubSub.publish('user.login', { user: 'alice' });
  wildcardPubSub.publish('user.logout', { user: 'alice' });
  wildcardPubSub.publish('order.created', { orderId: 'ORD1' });

  console.log('\n✅ Wildcard subscribers receive matching events\n');

  setTimeout(continuePart3, 100);
}

// ============================================================================
// Part 3: Message Filtering
// ============================================================================

function continuePart3() {
  console.log('--- Part 3: Message Filtering ---\n');

  class FilteredPubSub extends WildcardPubSub {
    subscribeWithFilter(topic, filter, handler) {
      const filteredHandler = (message, publication) => {
        if (filter(message, publication)) {
          handler(message, publication);
        }
      };

      return this.subscribe(topic, filteredHandler);
    }
  }

  const filteredPubSub = new FilteredPubSub();

  console.log('Setting up filtered subscribers:\n');

  // Only handle high-value orders
  filteredPubSub.subscribeWithFilter(
    'order.created',
    (message) => message.total > 100,
    (message) => {
      console.log(`💰 High-value order: $${message.total}`);
    }
  );

  // Only handle premium users
  filteredPubSub.subscribeWithFilter(
    'user.*',
    (message) => message.isPremium === true,
    (message, publication) => {
      console.log(`⭐ Premium user event: ${publication.topic} - ${message.username}`);
    }
  );

  console.log('Publishing events with filtering:\n');

  filteredPubSub.publish('order.created', { orderId: 'ORD1', total: 50 });
  console.log('  Order $50 - filtered out (below $100)\n');

  filteredPubSub.publish('order.created', { orderId: 'ORD2', total: 250 });
  console.log('  Order $250 - processed (above $100)\n');

  filteredPubSub.publish('user.login', { username: 'alice', isPremium: false });
  console.log('  User alice (regular) - filtered out\n');

  filteredPubSub.publish('user.login', { username: 'bob', isPremium: true });
  console.log('  User bob (premium) - processed\n');

  setTimeout(continuePart4, 100);
}

// ============================================================================
// Part 4: Priority Subscriptions
// ============================================================================

function continuePart4() {
  console.log('--- Part 4: Priority Subscriptions ---\n');

  class PriorityPubSub extends EventEmitter {
    constructor() {
      super();
      this.priorityHandlers = new Map();
    }

    publish(topic, message) {
      const publication = { topic, message, timestamp: Date.now() };

      // Get handlers for this topic
      const handlers = this.priorityHandlers.get(topic) || [];

      // Sort by priority (higher first)
      handlers.sort((a, b) => b.priority - a.priority);

      // Execute handlers in priority order
      handlers.forEach(({ handler }) => {
        handler(publication.message, publication);
      });

      return publication;
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
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      };
    }
  }

  const priorityPubSub = new PriorityPubSub();

  console.log('Setting up subscribers with different priorities:\n');

  priorityPubSub.subscribe('request', (msg) => {
    console.log('  [Priority 0 - Default] Processing request');
  }, 0);

  priorityPubSub.subscribe('request', (msg) => {
    console.log('  [Priority 100 - High] Security check');
  }, 100);

  priorityPubSub.subscribe('request', (msg) => {
    console.log('  [Priority 50 - Medium] Logging');
  }, 50);

  priorityPubSub.subscribe('request', (msg) => {
    console.log('  [Priority -10 - Low] Cleanup');
  }, -10);

  console.log('Publishing request:\n');
  priorityPubSub.publish('request', { id: 1 });

  console.log('\n✅ Handlers executed in priority order: 100 → 50 → 0 → -10\n');

  setTimeout(continuePart5, 100);
}

// ============================================================================
// Part 5: Message Persistence and Replay
// ============================================================================

function continuePart5() {
  console.log('--- Part 5: Message Persistence and Replay ---\n');

  class PersistentPubSub extends WildcardPubSub {
    constructor(options = {}) {
      super();
      this.maxMessages = options.maxMessages || 100;
      this.messageHistory = [];
    }

    publish(topic, message) {
      const publication = super.publish(topic, message);

      // Store message in history
      this.messageHistory.push({
        ...publication,
        id: this.generateMessageId()
      });

      // Keep history bounded
      if (this.messageHistory.length > this.maxMessages) {
        this.messageHistory.shift();
      }

      return publication;
    }

    /**
     * Subscribe and receive historical messages
     */
    subscribeWithHistory(topic, handler, options = {}) {
      const limit = options.limit || 10;
      const since = options.since || 0;

      // Send historical messages first
      const historical = this.getMessageHistory(topic, { limit, since });

      console.log(`  📜 Replaying ${historical.length} historical messages for ${topic}`);

      historical.forEach(msg => {
        handler(msg.message, msg);
      });

      // Then subscribe to new messages
      return this.subscribe(topic, handler);
    }

    /**
     * Get message history for a topic
     */
    getMessageHistory(topic, options = {}) {
      const limit = options.limit || 100;
      const since = options.since || 0;

      return this.messageHistory
        .filter(msg => {
          if (topic.includes('*')) {
            return this.matchesPattern(msg.topic, topic);
          }
          return msg.topic === topic;
        })
        .filter(msg => msg.timestamp >= since)
        .slice(-limit);
    }

    matchesPattern(topic, pattern) {
      if (pattern === '**') return true;

      const topicParts = topic.split('.');
      const patternParts = pattern.split('.');

      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '*') {
          if (i === patternParts.length - 1) return true;
          continue;
        }

        if (topicParts[i] !== patternParts[i]) {
          return false;
        }
      }

      return true;
    }

    generateMessageId() {
      return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    clearHistory() {
      this.messageHistory = [];
    }
  }

  const persistentPubSub = new PersistentPubSub({ maxMessages: 50 });

  console.log('Publishing some historical messages:\n');

  // Publish messages before subscriber joins
  persistentPubSub.publish('notifications', { text: 'Message 1', time: '10:00' });
  persistentPubSub.publish('notifications', { text: 'Message 2', time: '10:05' });
  persistentPubSub.publish('notifications', { text: 'Message 3', time: '10:10' });

  console.log('✅ Published 3 messages\n');

  setTimeout(() => {
    console.log('New subscriber joining and requesting history:\n');

    persistentPubSub.subscribeWithHistory(
      'notifications',
      (message) => {
        console.log(`  📨 Received: "${message.text}" at ${message.time}`);
      },
      { limit: 5 }
    );

    console.log('\nPublishing new message:\n');

    persistentPubSub.publish('notifications', { text: 'Message 4', time: '10:15' });

    setTimeout(() => {
      console.log('\n' + '='.repeat(60));
      console.log('Pub-Sub System Capabilities:');
      console.log('='.repeat(60));
      console.log('✅ Topic-based routing');
      console.log('✅ Wildcard subscriptions (* and **)');
      console.log('✅ Message filtering');
      console.log('✅ Priority handling');
      console.log('✅ Message persistence and replay');
      console.log('✅ Multiple independent subscribers');
      console.log('✅ Decoupled communication');
      console.log('='.repeat(60));
      console.log('\nUse Cases:');
      console.log('  - Microservices communication');
      console.log('  - Event-driven architectures');
      console.log('  - Real-time notifications');
      console.log('  - Log aggregation');
      console.log('  - Message queuing');
      console.log('='.repeat(60));
    }, 100);
  }, 100);
}

/*
 * Key Takeaways:
 *
 * 1. PUB-SUB VS OBSERVER:
 *    - Pub-sub is more decoupled (via message bus)
 *    - Publishers don't know about subscribers
 *    - Topic-based routing
 *    - Can be distributed
 *
 * 2. KEY FEATURES:
 *    - Topic hierarchy (user.login, user.logout)
 *    - Wildcard subscriptions (user.*, **)
 *    - Message filtering
 *    - Priority handling
 *    - Message persistence
 *    - Replay capability
 *
 * 3. PATTERNS:
 *    - Topic-based: Direct topic matching
 *    - Content-based: Filter by message content
 *    - Priority-based: Order of execution
 *    - Persistent: Store and replay messages
 *
 * 4. PRODUCTION CONSIDERATIONS:
 *    - Message size limits
 *    - History retention policies
 *    - Dead letter queues
 *    - Monitoring and metrics
 *    - Backpressure handling
 *    - Security (topic permissions)
 */
