/**
 * Example 4: Passing Data to Event Listeners
 *
 * This example demonstrates:
 * - Passing single and multiple arguments
 * - Passing different data types
 * - Object and array arguments
 * - Best practices for event data
 */

const EventEmitter = require('events');

const emitter = new EventEmitter();

console.log('=== Passing Data to Events ===\n');

console.log('--- Single Argument ---\n');

emitter.on('message', (text) => {
  console.log('Message received:', text);
});

emitter.emit('message', 'Hello, Events!');

console.log('\n--- Multiple Arguments ---\n');

emitter.on('user:action', (username, action, timestamp) => {
  console.log(`[${timestamp}] User ${username} performed: ${action}`);
});

emitter.emit('user:action', 'alice', 'login', new Date().toISOString());
emitter.emit('user:action', 'bob', 'logout', new Date().toISOString());

console.log('\n--- Passing Objects ---\n');

// It's common to pass a single object with all data
emitter.on('order:created', (order) => {
  console.log('New order received:');
  console.log('  ID:', order.id);
  console.log('  Customer:', order.customer);
  console.log('  Total:', `$${order.total}`);
  console.log('  Items:', order.items.length);
});

emitter.emit('order:created', {
  id: 'ORD-001',
  customer: 'Alice Smith',
  total: 99.99,
  items: ['Book', 'Pen', 'Notebook']
});

console.log('\n--- Passing Arrays ---\n');

emitter.on('batch:process', (items) => {
  console.log(`Processing batch of ${items.length} items:`);
  items.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item}`);
  });
});

emitter.emit('batch:process', ['task1', 'task2', 'task3']);

console.log('\n--- Different Data Types ---\n');

emitter.on('data:received', (data) => {
  console.log('Data type:', typeof data);
  console.log('Value:', data);
  console.log('');
});

emitter.emit('data:received', 'string');
emitter.emit('data:received', 123);
emitter.emit('data:received', true);
emitter.emit('data:received', { key: 'value' });
emitter.emit('data:received', [1, 2, 3]);
emitter.emit('data:received', null);

console.log('--- Error Object ---\n');

emitter.on('error', (error) => {
  console.log('Error event received:');
  console.log('  Message:', error.message);
  console.log('  Stack:', error.stack.split('\n')[0]);
});

emitter.emit('error', new Error('Something went wrong'));

console.log('\n--- Complex Data Structure ---\n');

emitter.on('transaction:complete', (transaction) => {
  console.log('Transaction completed:');
  console.log(JSON.stringify(transaction, null, 2));
});

emitter.emit('transaction:complete', {
  id: 'TXN-123',
  type: 'purchase',
  user: {
    id: 1,
    name: 'Alice'
  },
  items: [
    { id: 101, name: 'Product A', price: 29.99 },
    { id: 102, name: 'Product B', price: 49.99 }
  ],
  total: 79.98,
  timestamp: Date.now()
});

console.log('\n--- No Arguments ---\n');

emitter.on('ping', () => {
  console.log('Ping received (no data)');
});

emitter.emit('ping');

console.log('\n--- Event Data Best Practice ---\n');

// Best practice: Use an object with clear properties
class PaymentProcessor extends EventEmitter {
  processPayment(amount, cardNumber) {
    // Emit with structured data
    this.emit('payment:processing', {
      amount,
      cardNumber: cardNumber.slice(-4), // Only last 4 digits
      timestamp: Date.now(),
      status: 'processing'
    });

    // Simulate processing
    setTimeout(() => {
      this.emit('payment:success', {
        amount,
        transactionId: 'TXN-' + Date.now(),
        timestamp: Date.now(),
        status: 'completed'
      });
    }, 100);
  }
}

const processor = new PaymentProcessor();

processor.on('payment:processing', (data) => {
  console.log(`Processing payment of $${data.amount}...`);
});

processor.on('payment:success', (data) => {
  console.log(`Payment successful! Transaction ID: ${data.transactionId}`);
});

processor.processPayment(100, '1234-5678-9012-3456');

// Wait for async operation
setTimeout(() => {
  console.log('\n=== Example Complete ===');
}, 200);

/*
 * Key Takeaways:
 * 1. Events can pass any number of arguments to listeners
 * 2. All data types can be passed: strings, numbers, objects, arrays, etc.
 * 3. Common pattern: pass a single object with all relevant data
 * 4. Objects make it easy to add more properties later without breaking listeners
 * 5. Event data should be immutable - don't modify objects after emitting
 * 6. For security, be careful what data you include (e.g., don't pass full credit card numbers)
 * 7. Error events should pass Error objects
 */
