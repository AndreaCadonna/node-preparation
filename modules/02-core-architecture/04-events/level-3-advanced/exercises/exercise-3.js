/**
 * Exercise 3: Implement Event Sourcing
 *
 * Task:
 * Implement an event-sourced shopping cart system:
 *
 * 1. Create an EventStore to persist events
 * 2. Create a ShoppingCart aggregate that rebuilds state from events
 * 3. Implement commands: addItem, removeItem, updateQuantity, checkout
 * 4. Implement event replay to rebuild cart state
 * 5. Support snapshots for performance
 *
 * Requirements:
 * - All state changes must be events
 * - Cart state is derived from events
 * - Support time travel (get state at any version)
 * - Implement snapshots every N events
 * - Events should be: CartCreated, ItemAdded, ItemRemoved, QuantityUpdated, CartCheckedOut
 */

const EventEmitter = require('events');

// YOUR CODE HERE

class EventStore extends EventEmitter {
  constructor() {
    super();
    // Initialize:
    // - events array
    // - version counter
    // - snapshots map
  }

  /**
   * Append an event to the store
   */
  append(eventType, data) {
    // TODO: Implement
    // 1. Create event with version and timestamp
    // 2. Add to events array
    // 3. Emit the event
    // 4. Return the event
  }

  /**
   * Get all events for an aggregate
   */
  getEvents(aggregateId) {
    // TODO: Implement
    // Return events filtered by aggregateId
  }

  /**
   * Get events since a specific version
   */
  getEventsSince(aggregateId, version) {
    // TODO: Implement
  }

  /**
   * Create a snapshot
   */
  createSnapshot(aggregateId, state, version) {
    // TODO: Implement
  }

  /**
   * Get latest snapshot
   */
  getSnapshot(aggregateId) {
    // TODO: Implement
  }
}

class ShoppingCart {
  constructor(cartId, eventStore) {
    this.cartId = cartId;
    this.eventStore = eventStore;
    this.version = 0;
    this.state = {
      items: [],
      total: 0,
      status: 'active'
    };
  }

  /**
   * Create a new cart
   */
  create(userId) {
    // TODO: Implement
    // Emit CartCreated event
  }

  /**
   * Add item to cart
   */
  addItem(productId, name, price, quantity = 1) {
    // TODO: Implement
    // 1. Validate cart is active
    // 2. Emit ItemAdded event
    // 3. Update state
  }

  /**
   * Remove item from cart
   */
  removeItem(productId) {
    // TODO: Implement
  }

  /**
   * Update item quantity
   */
  updateQuantity(productId, quantity) {
    // TODO: Implement
  }

  /**
   * Checkout cart
   */
  checkout() {
    // TODO: Implement
    // 1. Validate cart has items
    // 2. Emit CartCheckedOut event
    // 3. Update state
  }

  /**
   * Apply an event to update state
   */
  apply(event) {
    // TODO: Implement
    // Handle each event type and update state accordingly
    switch (event.type) {
      case 'CartCreated':
        // ...
        break;
      case 'ItemAdded':
        // ...
        break;
      // Handle other events
    }

    this.version = event.metadata.version;
  }

  /**
   * Rebuild cart from events (rehydrate)
   */
  rehydrate() {
    // TODO: Implement
    // 1. Get events from store
    // 2. Apply each event
    // 3. Return this
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }
}

// Test your implementation:

const store = new EventStore();
const cart = new ShoppingCart('CART1', store);

console.log('Creating shopping cart...');
cart.create('USER1');

console.log('\nAdding items...');
cart.addItem('PROD1', 'Laptop', 1000, 1);
cart.addItem('PROD2', 'Mouse', 25, 2);
cart.addItem('PROD3', 'Keyboard', 75, 1);

console.log('\nUpdating quantity...');
cart.updateQuantity('PROD2', 3);

console.log('\nRemoving item...');
cart.removeItem('PROD3');

console.log('\nCurrent cart state:');
console.log(cart.getState());

console.log('\nChecking out...');
cart.checkout();

console.log('\nFinal cart state:');
console.log(cart.getState());

// Test rehydration
console.log('\n--- Testing Event Replay ---');
const cart2 = new ShoppingCart('CART1', store);
cart2.rehydrate();

console.log('Rehydrated cart state:');
console.log(cart2.getState());

// Test time travel
console.log('\n--- Testing Time Travel ---');
console.log('All events:');
store.getEvents('CART1').forEach(event => {
  console.log(`  v${event.metadata.version}: ${event.type}`);
});

/*
 * Expected output:
 * Creating shopping cart...
 * ✅ Cart created
 *
 * Adding items...
 * ✅ Added Laptop x1 ($1000)
 * ✅ Added Mouse x2 ($50)
 * ✅ Added Keyboard x1 ($75)
 *
 * Updating quantity...
 * ✅ Updated Mouse quantity to 3
 *
 * Removing item...
 * ✅ Removed Keyboard
 *
 * Current cart state:
 * {
 *   items: [
 *     { productId: 'PROD1', name: 'Laptop', price: 1000, quantity: 1 },
 *     { productId: 'PROD2', name: 'Mouse', price: 25, quantity: 3 }
 *   ],
 *   total: 1075,
 *   status: 'active'
 * }
 *
 * Checking out...
 * ✅ Cart checked out
 *
 * Final cart state:
 * { items: [...], total: 1075, status: 'checked_out' }
 *
 * Rehydrated cart state:
 * { items: [...], total: 1075, status: 'checked_out' }
 */

// After completing, compare with: solutions/exercise-3-solution.js
