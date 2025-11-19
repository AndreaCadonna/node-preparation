/**
 * Exercise 3: Create a Listener Management System
 *
 * Task:
 * Build a ManagedEventBus class that helps prevent memory leaks by tracking
 * and managing listener lifecycles. Components can register listeners that
 * are automatically tracked and can be cleaned up all at once.
 *
 * Requirements:
 * 1. Create a ManagedEventBus class that extends EventEmitter
 * 2. Implement subscribe(owner, event, listener) method that:
 *    - Adds the listener using on()
 *    - Tracks the listener by owner
 *    - Returns the listener count for that event
 * 3. Implement unsubscribe(owner, event, listener) method that:
 *    - Removes specific listener
 *    - Updates tracking
 * 4. Implement unsubscribeAll(owner) method that:
 *    - Removes all listeners for a given owner
 *    - Emits 'cleanup:complete' event with count
 * 5. Implement getSubscriptions(owner) method that:
 *    - Returns array of all subscriptions for owner
 * 6. Set max listeners to 50 to accommodate multiple subscribers
 *
 * Hints:
 * - Use a Map to track listeners by owner
 * - Each owner can have multiple event subscriptions
 * - Store both event name and listener reference
 */

const EventEmitter = require('events');

// YOUR CODE HERE
class ManagedEventBus extends EventEmitter {
  constructor() {
    super();

    // TODO: Set max listeners to 50
    // TODO: Create a Map to track subscriptions
    // Map structure: owner -> [{ event, listener }, ...]
  }

  subscribe(owner, event, listener) {
    // TODO: Add listener using on()
    // TODO: Track in subscriptions Map
    // TODO: Return listener count for this event
  }

  unsubscribe(owner, event, listener) {
    // TODO: Remove listener
    // TODO: Update tracking
    // TODO: Return true if removed, false if not found
  }

  unsubscribeAll(owner) {
    // TODO: Get all subscriptions for owner
    // TODO: Remove each listener
    // TODO: Clean up tracking
    // TODO: Emit 'cleanup:complete' with count
    // TODO: Return number of listeners removed
  }

  getSubscriptions(owner) {
    // TODO: Return array of subscriptions for owner
  }

  getStats() {
    // TODO: Return statistics
    // - Total owners
    // - Total subscriptions
    // - Subscriptions per owner
  }
}


// Test your ManagedEventBus
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
 * Expected output:
 * === Creating Components ===
 *
 * [UserPanel] Initializing...
 * [UserPanel] Subscribed to events
 * [Dashboard] Initializing...
 * [Dashboard] Subscribed to events
 * [Sidebar] Initializing...
 * [Sidebar] Subscribed to events
 *
 * === Bus Statistics ===
 * {
 *   totalOwners: 3,
 *   totalSubscriptions: 9,
 *   subscriptionsPerOwner: {
 *     UserPanel: 3,
 *     Dashboard: 3,
 *     Sidebar: 3
 *   }
 * }
 *
 * === Emitting Events ===
 * [UserPanel] Received data: { type: 'user', id: 123 }
 * [Dashboard] Received data: { type: 'user', id: 123 }
 * [Sidebar] Received data: { type: 'user', id: 123 }
 * ...
 *
 * === Destroying Dashboard Component ===
 * [Dashboard] Destroying...
 * [Event] Cleanup complete for Dashboard: 3 listeners removed
 * ...
 */

// After completing, compare with: solutions/exercise-3-solution.js
