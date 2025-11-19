/**
 * Solution 3: Create a Listener Management System
 *
 * This solution demonstrates:
 * - Tracking listeners by owner
 * - Preventing memory leaks
 * - Batch cleanup operations
 * - Subscription management
 */

const EventEmitter = require('events');

class ManagedEventBus extends EventEmitter {
  constructor() {
    super();

    // Set higher max listeners for multiple components
    this.setMaxListeners(50);

    // Track subscriptions: Map<owner, Array<{event, listener}>>
    this.subscriptions = new Map();
  }

  subscribe(owner, event, listener) {
    // Add listener
    this.on(event, listener);

    // Track subscription
    if (!this.subscriptions.has(owner)) {
      this.subscriptions.set(owner, []);
    }

    this.subscriptions.get(owner).push({
      event,
      listener
    });

    // Return listener count
    return this.listenerCount(event);
  }

  unsubscribe(owner, event, listener) {
    const ownerSubs = this.subscriptions.get(owner);

    if (!ownerSubs) {
      return false;
    }

    // Find and remove subscription
    const index = ownerSubs.findIndex(
      sub => sub.event === event && sub.listener === listener
    );

    if (index === -1) {
      return false;
    }

    // Remove from tracking
    ownerSubs.splice(index, 1);

    // Remove listener
    this.removeListener(event, listener);

    return true;
  }

  unsubscribeAll(owner) {
    const ownerSubs = this.subscriptions.get(owner);

    if (!ownerSubs || ownerSubs.length === 0) {
      return 0;
    }

    const count = ownerSubs.length;

    // Remove all listeners
    ownerSubs.forEach(({ event, listener }) => {
      this.removeListener(event, listener);
    });

    // Clean up tracking
    this.subscriptions.delete(owner);

    // Emit cleanup event
    this.emit('cleanup:complete', { owner, count });

    return count;
  }

  getSubscriptions(owner) {
    const ownerSubs = this.subscriptions.get(owner);

    if (!ownerSubs) {
      return [];
    }

    // Return copy to prevent external modification
    return ownerSubs.map(sub => ({ ...sub }));
  }

  getStats() {
    const stats = {
      totalOwners: this.subscriptions.size,
      totalSubscriptions: 0,
      subscriptionsPerOwner: {}
    };

    for (const [owner, subs] of this.subscriptions) {
      stats.totalSubscriptions += subs.length;
      stats.subscriptionsPerOwner[owner] = subs.length;
    }

    return stats;
  }
}

// Test the ManagedEventBus
const bus = new ManagedEventBus();

bus.on('cleanup:complete', ({ owner, count }) => {
  console.log(`[Event] Cleanup complete for ${owner}: ${count} listeners removed`);
});

// Simulate components
class Component {
  constructor(name, bus) {
    this.name = name;
    this.bus = bus;
  }

  init() {
    console.log(`[${this.name}] Initializing...`);

    // Subscribe to events
    bus.subscribe(this.name, 'data', (data) => {
      console.log(`[${this.name}] Received data:`, data);
    });

    bus.subscribe(this.name, 'update', (update) => {
      console.log(`[${this.name}] Received update:`, update);
    });

    bus.subscribe(this.name, 'notification', (notification) => {
      console.log(`[${this.name}] Notification:`, notification);
    });

    console.log(`[${this.name}] Subscribed to events`);
  }

  destroy() {
    console.log(`[${this.name}] Destroying...`);
    const removed = bus.unsubscribeAll(this.name);
    console.log(`[${this.name}] Cleanup complete`);
  }
}

console.log('=== Creating Components ===\n');

const userPanel = new Component('UserPanel', bus);
const dashboard = new Component('Dashboard', bus);
const sidebar = new Component('Sidebar', bus);

userPanel.init();
dashboard.init();
sidebar.init();

console.log('\n=== Bus Statistics ===\n');
console.log(bus.getStats());

console.log('\n=== Emitting Events ===\n');

bus.emit('data', { type: 'user', id: 123 });
console.log();
bus.emit('update', 'New version available');
console.log();
bus.emit('notification', 'You have 3 new messages');

console.log('\n=== Destroying Dashboard Component ===\n');

dashboard.destroy();

console.log('\n=== Updated Statistics ===\n');
console.log(bus.getStats());

console.log('\n=== Emitting Events Again ===\n');

bus.emit('data', { type: 'post', id: 456 });
console.log();

console.log('=== Cleaning Up Remaining Components ===\n');

userPanel.destroy();
sidebar.destroy();

console.log('\n=== Final Statistics ===\n');
console.log(bus.getStats());

/*
 * Key Implementation Details:
 *
 * 1. Map tracks subscriptions by owner
 * 2. Each subscription stores event name and listener reference
 * 3. setMaxListeners(50) accommodates multiple components
 * 4. unsubscribeAll removes all of an owner's listeners
 * 5. getStats provides visibility into subscription counts
 * 6. Components can clean up easily on destroy
 * 7. Prevents memory leaks from forgotten listeners
 * 8. Supports multiple listeners per event per owner
 */
