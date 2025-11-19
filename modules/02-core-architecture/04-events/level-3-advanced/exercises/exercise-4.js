/**
 * Exercise 4: Create a Publish-Subscribe System
 *
 * Task:
 * Build a pub-sub system with advanced features:
 *
 * 1. Topic-based routing (e.g., 'user.login', 'order.created')
 * 2. Wildcard subscriptions ('user.*', '**')
 * 3. Message filtering (subscribe with filter function)
 * 4. Message persistence (store last N messages)
 * 5. Replay capability (new subscribers get historical messages)
 *
 * Requirements:
 * - Support hierarchical topics (dot-separated)
 * - Wildcard patterns: '*' matches one level, '**' matches all
 * - Filter messages based on content
 * - Store configurable number of messages per topic
 * - Allow subscribers to receive historical messages
 */

const EventEmitter = require('events');

// YOUR CODE HERE

class PubSubSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    // Initialize:
    // - Topic registry
    // - Message history (per topic)
    // - Max history size
    // - Subscription registry
  }

  /**
   * Publish a message to a topic
   */
  publish(topic, message) {
    // TODO: Implement
    // 1. Create publication object with metadata
    // 2. Store in history
    // 3. Emit to exact topic subscribers
    // 4. Emit to wildcard subscribers
    // 5. Return publication
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic, handler, options = {}) {
    // TODO: Implement
    // 1. Register subscription
    // 2. If options.replay, send historical messages
    // 3. Set up listener
    // 4. Return unsubscribe function
  }

  /**
   * Subscribe with message filter
   */
  subscribeWithFilter(topic, filter, handler, options = {}) {
    // TODO: Implement
    // Wrap handler to only call if filter returns true
  }

  /**
   * Match topic pattern (support wildcards)
   */
  matchesPattern(topic, pattern) {
    // TODO: Implement
    // Return true if topic matches pattern
    // Examples:
    //   'user.login' matches 'user.*'
    //   'user.login.success' matches 'user.**'
    //   'user.login' matches '**'
  }

  /**
   * Get message history for a topic
   */
  getHistory(topic, limit = 10) {
    // TODO: Implement
    // Return last N messages for topic
  }

  /**
   * Clear history for a topic
   */
  clearHistory(topic) {
    // TODO: Implement
  }

  /**
   * Get statistics
   */
  getStats() {
    // TODO: Implement
    // Return: active topics, total subscriptions, total messages
  }
}

// Test your implementation:

const pubsub = new PubSubSystem({ maxHistory: 50 });

console.log('=== Testing Topic-Based Pub-Sub ===\n');

// Set up subscribers
console.log('Setting up subscribers:\n');

pubsub.subscribe('user.login', (msg) => {
  console.log(`[user.login] ${msg.username} logged in`);
});

pubsub.subscribe('user.*', (msg) => {
  console.log(`[user.*] User event: ${msg.action || 'unknown'}`);
});

pubsub.subscribe('**', (msg) => {
  console.log(`[**] Global listener: ${JSON.stringify(msg).substring(0, 50)}...`);
});

// Filtered subscription (only premium users)
pubsub.subscribeWithFilter(
  'user.login',
  (msg) => msg.premium === true,
  (msg) => {
    console.log(`[filtered] Premium user logged in: ${msg.username}`);
  }
);

console.log('Publishing messages:\n');

// Publish messages
pubsub.publish('user.login', {
  username: 'alice',
  premium: false,
  action: 'login'
});

console.log();

pubsub.publish('user.login', {
  username: 'bob',
  premium: true,
  action: 'login'
});

console.log();

pubsub.publish('user.logout', {
  username: 'alice',
  action: 'logout'
});

console.log();

pubsub.publish('order.created', {
  orderId: 'ORD1',
  total: 99.99
});

// Test history replay
console.log('\n--- Testing History Replay ---\n');

pubsub.subscribe('user.login', (msg) => {
  console.log(`[new subscriber] Historical login: ${msg.username}`);
}, { replay: true, limit: 5 });

// Test statistics
setTimeout(() => {
  console.log('\n--- System Statistics ---\n');
  const stats = pubsub.getStats();
  console.log('Stats:', stats);

  console.log('\nMessage history for user.login:');
  const history = pubsub.getHistory('user.login');
  console.log(`Stored ${history.length} messages`);
}, 100);

/*
 * Expected output:
 * Setting up subscribers:
 *
 * Publishing messages:
 *
 * [user.login] alice logged in
 * [user.*] User event: login
 * [**] Global listener: {"username":"alice","premium":false...
 *
 * [user.login] bob logged in
 * [user.*] User event: login
 * [**] Global listener: {"username":"bob","premium":true...
 * [filtered] Premium user logged in: bob
 *
 * [user.*] User event: logout
 * [**] Global listener: {"username":"alice","action":"logout"}
 *
 * [**] Global listener: {"orderId":"ORD1","total":99.99}
 *
 * --- Testing History Replay ---
 * [new subscriber] Historical login: alice
 * [new subscriber] Historical login: bob
 *
 * --- System Statistics ---
 * Stats: {
 *   activeTopics: 4,
 *   totalSubscriptions: 6,
 *   totalMessages: 4
 * }
 *
 * Message history for user.login:
 * Stored 2 messages
 */

// After completing, compare with: solutions/exercise-4-solution.js
