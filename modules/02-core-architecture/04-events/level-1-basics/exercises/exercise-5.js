/**
 * Exercise 5: Passing Data with Events
 *
 * Task:
 * Create a shopping cart system that emits events when items are added or removed,
 * passing detailed information about each operation.
 *
 * Requirements:
 * 1. Create a ShoppingCart class that extends EventEmitter
 * 2. Implement addItem(item) that emits 'itemAdded' with item details
 * 3. Implement removeItem(itemName) that emits 'itemRemoved' with item details
 * 4. Implement getTotal() that emits 'totalCalculated' with the total
 * 5. Add listeners that:
 *    - Log when items are added (showing name and price)
 *    - Log when items are removed
 *    - Display the total when calculated
 * 6. Handle errors properly (e.g., removing non-existent items)
 */

const EventEmitter = require('events');

// YOUR CODE HERE
// Create the ShoppingCart class

// Create an instance

// Add listeners for itemAdded, itemRemoved, totalCalculated, and error

// Test: Add items, remove an item, calculate total


/*
 * Expected output:
 * Added to cart: Book ($12.99)
 * Added to cart: Pen ($2.50)
 * Added to cart: Notebook ($5.99)
 * Removed from cart: Pen
 * Cart total: $18.98
 */

// After completing, compare with: solutions/exercise-5-solution.js
