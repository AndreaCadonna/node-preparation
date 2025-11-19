/**
 * Exercise 5 Solution: Passing Data with Events
 */

const EventEmitter = require('events');

// Create the ShoppingCart class
class ShoppingCart extends EventEmitter {
  constructor() {
    super();
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
    this.emit('itemAdded', item);
  }

  removeItem(itemName) {
    const index = this.items.findIndex(item => item.name === itemName);

    if (index === -1) {
      this.emit('error', new Error(`Item "${itemName}" not found in cart`));
      return false;
    }

    const removedItem = this.items.splice(index, 1)[0];
    this.emit('itemRemoved', removedItem);
    return true;
  }

  getTotal() {
    const total = this.items.reduce((sum, item) => sum + item.price, 0);
    this.emit('totalCalculated', total);
    return total;
  }

  getItems() {
    return [...this.items]; // Return copy
  }
}

// Create an instance
const cart = new ShoppingCart();

// Add listener for itemAdded
cart.on('itemAdded', (item) => {
  console.log(`Added to cart: ${item.name} ($${item.price.toFixed(2)})`);
});

// Add listener for itemRemoved
cart.on('itemRemoved', (item) => {
  console.log(`Removed from cart: ${item.name}`);
});

// Add listener for totalCalculated
cart.on('totalCalculated', (total) => {
  console.log(`Cart total: $${total.toFixed(2)}`);
});

// Add error listener
cart.on('error', (err) => {
  console.log(`Error: ${err.message}`);
});

// Test: Add items
cart.addItem({ name: 'Book', price: 12.99 });
cart.addItem({ name: 'Pen', price: 2.50 });
cart.addItem({ name: 'Notebook', price: 5.99 });

// Remove an item
cart.removeItem('Pen');

// Try to remove non-existent item
cart.removeItem('Laptop');

// Calculate total
cart.getTotal();

/*
 * Output:
 * Added to cart: Book ($12.99)
 * Added to cart: Pen ($2.50)
 * Added to cart: Notebook ($5.99)
 * Removed from cart: Pen
 * Error: Item "Laptop" not found in cart
 * Cart total: $18.98
 */
