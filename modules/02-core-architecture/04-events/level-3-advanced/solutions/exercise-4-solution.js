/**
 * Exercise 4 Solution: Create a Publish-Subscribe System
 */

const EventEmitter = require('events');

class PubSubSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.setMaxListeners(Infinity);
    this.maxHistory = options.maxHistory || 100;
    this.history = new Map();
    this.subscriptions = 0;
  }

  publish(topic, message) {
    const publication = {
      topic,
      message,
      timestamp: Date.now(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Store in history
    if (!this.history.has(topic)) {
      this.history.set(topic, []);
    }
    const topicHistory = this.history.get(topic);
    topicHistory.push(publication);

    if (topicHistory.length > this.maxHistory) {
      topicHistory.shift();
    }

    // Emit to exact subscribers
    this.emit(`topic:${topic}`, publication);

    // Emit to wildcard subscribers
    const parts = topic.split('.');
    for (let i = 1; i <= parts.length; i++) {
      const pattern = parts.slice(0, i).join('.') + '.*';
      this.emit(`pattern:${pattern}`, publication);
    }

    // Emit to global subscribers
    this.emit('pattern:**', publication);

    return publication;
  }

  subscribe(topic, handler, options = {}) {
    this.subscriptions++;

    const wrappedHandler = (pub) => handler(pub.message, pub);

    // Send historical messages if requested
    if (options.replay) {
      const history = this.getHistory(topic, options.limit || 10);
      history.forEach(pub => wrappedHandler(pub));
    }

    // Set up listener
    if (topic.includes('*')) {
      this.on(`pattern:${topic}`, wrappedHandler);
    } else {
      this.on(`topic:${topic}`, wrappedHandler);
    }

    // Return unsubscribe function
    return () => {
      if (topic.includes('*')) {
        this.off(`pattern:${topic}`, wrappedHandler);
      } else {
        this.off(`topic:${topic}`, wrappedHandler);
      }
      this.subscriptions--;
    };
  }

  subscribeWithFilter(topic, filter, handler, options = {}) {
    const filteredHandler = (message, pub) => {
      if (filter(message, pub)) {
        handler(message, pub);
      }
    };

    return this.subscribe(topic, filteredHandler, options);
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

    return topicParts.length === patternParts.length;
  }

  getHistory(topic, limit = 10) {
    if (topic.includes('*')) {
      const allHistory = [];
      this.history.forEach((messages, t) => {
        if (this.matchesPattern(t, topic)) {
          allHistory.push(...messages);
        }
      });
      return allHistory.slice(-limit);
    }

    return (this.history.get(topic) || []).slice(-limit);
  }

  clearHistory(topic) {
    if (topic) {
      this.history.delete(topic);
    } else {
      this.history.clear();
    }
  }

  getStats() {
    const totalMessages = Array.from(this.history.values())
      .reduce((sum, msgs) => sum + msgs.length, 0);

    return {
      activeTopics: this.history.size,
      totalSubscriptions: this.subscriptions,
      totalMessages
    };
  }
}

// Test
const pubsub = new PubSubSystem({ maxHistory: 50 });

console.log('=== Testing Topic-Based Pub-Sub ===\n');
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

pubsub.subscribeWithFilter('user.login', (msg) => msg.premium === true, (msg) => {
  console.log(`[filtered] Premium user logged in: ${msg.username}`);
});

console.log('Publishing messages:\n');

pubsub.publish('user.login', { username: 'alice', premium: false, action: 'login' });
console.log();

pubsub.publish('user.login', { username: 'bob', premium: true, action: 'login' });
console.log();

pubsub.publish('user.logout', { username: 'alice', action: 'logout' });
console.log();

pubsub.publish('order.created', { orderId: 'ORD1', total: 99.99 });

console.log('\n--- Testing History Replay ---\n');

pubsub.subscribe('user.login', (msg) => {
  console.log(`[new subscriber] Historical login: ${msg.username}`);
}, { replay: true, limit: 5 });

setTimeout(() => {
  console.log('\n--- System Statistics ---\n');
  const stats = pubsub.getStats();
  console.log('Stats:', stats);

  console.log('\nMessage history for user.login:');
  const history = pubsub.getHistory('user.login');
  console.log(`Stored ${history.length} messages`);
}, 100);
