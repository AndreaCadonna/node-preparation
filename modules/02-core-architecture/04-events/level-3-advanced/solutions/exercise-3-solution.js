/**
 * Exercise 3 Solution: Implement Event Sourcing
 */

const EventEmitter = require('events');

class EventStore extends EventEmitter {
  constructor() {
    super();
    this.events = [];
    this.version = 0;
    this.snapshots = new Map();
  }

  append(eventType, data) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      data,
      metadata: {
        timestamp: Date.now(),
        version: ++this.version
      }
    };

    this.events.push(event);
    this.emit('event:appended', event);
    this.emit(eventType, event);

    return event;
  }

  getEvents(aggregateId) {
    return this.events.filter(e => e.data.aggregateId === aggregateId || e.data.cartId === aggregateId);
  }

  getEventsSince(aggregateId, version) {
    return this.getEvents(aggregateId).filter(e => e.metadata.version > version);
  }

  createSnapshot(aggregateId, state, version) {
    this.snapshots.set(aggregateId, { state: JSON.parse(JSON.stringify(state)), version });
  }

  getSnapshot(aggregateId) {
    return this.snapshots.get(aggregateId);
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

  create(userId) {
    const event = this.eventStore.append('CartCreated', {
      cartId: this.cartId,
      userId
    });
    this.apply(event);
    console.log('✅ Cart created');
  }

  addItem(productId, name, price, quantity = 1) {
    if (this.state.status !== 'active') {
      throw new Error('Cannot modify checked out cart');
    }

    const event = this.eventStore.append('ItemAdded', {
      cartId: this.cartId,
      productId,
      name,
      price,
      quantity
    });
    this.apply(event);
    console.log(`✅ Added ${name} x${quantity} ($${price * quantity})`);
  }

  removeItem(productId) {
    const event = this.eventStore.append('ItemRemoved', {
      cartId: this.cartId,
      productId
    });
    this.apply(event);
    console.log(`✅ Removed ${productId}`);
  }

  updateQuantity(productId, quantity) {
    const event = this.eventStore.append('QuantityUpdated', {
      cartId: this.cartId,
      productId,
      quantity
    });
    this.apply(event);
    console.log(`✅ Updated ${productId} quantity to ${quantity}`);
  }

  checkout() {
    if (this.state.items.length === 0) {
      throw new Error('Cannot checkout empty cart');
    }

    const event = this.eventStore.append('CartCheckedOut', {
      cartId: this.cartId,
      total: this.state.total
    });
    this.apply(event);
    console.log('✅ Cart checked out');
  }

  apply(event) {
    switch (event.type) {
      case 'CartCreated':
        this.state.userId = event.data.userId;
        break;

      case 'ItemAdded': {
        const existing = this.state.items.find(i => i.productId === event.data.productId);
        if (existing) {
          existing.quantity += event.data.quantity;
        } else {
          this.state.items.push({
            productId: event.data.productId,
            name: event.data.name,
            price: event.data.price,
            quantity: event.data.quantity
          });
        }
        this.state.total = this.state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        break;
      }

      case 'ItemRemoved':
        this.state.items = this.state.items.filter(i => i.productId !== event.data.productId);
        this.state.total = this.state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        break;

      case 'QuantityUpdated': {
        const item = this.state.items.find(i => i.productId === event.data.productId);
        if (item) {
          item.quantity = event.data.quantity;
        }
        this.state.total = this.state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        break;
      }

      case 'CartCheckedOut':
        this.state.status = 'checked_out';
        break;
    }

    this.version = event.metadata.version;
  }

  rehydrate() {
    const events = this.eventStore.getEvents(this.cartId);
    events.forEach(event => this.apply(event));
    return this;
  }

  getState() {
    return { ...this.state };
  }
}

// Test
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

console.log('\n--- Testing Event Replay ---');
const cart2 = new ShoppingCart('CART1', store);
cart2.rehydrate();

console.log('Rehydrated cart state:');
console.log(cart2.getState());

console.log('\n--- Testing Time Travel ---');
console.log('All events:');
store.getEvents('CART1').forEach(event => {
  console.log(`  v${event.metadata.version}: ${event.type}`);
});
