/**
 * Exercise 5: Build a Complete Event-Driven Application
 *
 * Task:
 * Build a mini e-commerce order processing system using event-driven architecture:
 *
 * Components:
 * 1. Order Service: Handles order creation
 * 2. Inventory Service: Manages stock
 * 3. Payment Service: Processes payments
 * 4. Notification Service: Sends notifications
 * 5. Analytics Service: Tracks events
 *
 * Requirements:
 * - Use event bus for communication
 * - Implement saga pattern for order processing
 * - Add error handling and compensation
 * - Include circuit breaker for resilience
 * - Provide health checks and metrics
 *
 * Events:
 * - order:created
 * - inventory:reserved
 * - inventory:reservationFailed
 * - payment:processed
 * - payment:failed
 * - order:completed
 * - order:failed
 * - notification:sent
 */

const EventEmitter = require('events');

// YOUR CODE HERE

// Create the Event Bus
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
    // Add:
    // - Circuit breaker
    // - Metrics
    // - Error handling
  }

  // Add methods for:
  // - Safe emit with error handling
  // - Metrics collection
  // - Circuit breaker logic
}

// Create Order Service
class OrderService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.orders = new Map();

    // TODO: Set up event listeners
  }

  createOrder(orderData) {
    // TODO: Implement
    // 1. Validate order
    // 2. Create order record
    // 3. Emit order:created event
    // 4. Return order
  }

  handleOrderCompleted(data) {
    // TODO: Update order status
  }

  handleOrderFailed(data) {
    // TODO: Handle failure, maybe retry or notify customer
  }
}

// Create Inventory Service
class InventoryService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.inventory = new Map([
      ['PROD1', { name: 'Laptop', stock: 10, price: 1000 }],
      ['PROD2', { name: 'Mouse', stock: 50, price: 25 }],
      ['PROD3', { name: 'Keyboard', stock: 30, price: 75 }]
    ]);

    // TODO: Listen to order:created
  }

  reserveInventory(order) {
    // TODO: Implement
    // 1. Check stock availability
    // 2. Reserve items
    // 3. Emit inventory:reserved or inventory:reservationFailed
  }

  releaseReservation(order) {
    // TODO: Compensate - release reserved inventory
  }
}

// Create Payment Service
class PaymentService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.payments = new Map();

    // TODO: Listen to inventory:reserved
  }

  processPayment(order) {
    // TODO: Implement
    // 1. Validate payment details
    // 2. Process payment (simulate)
    // 3. Emit payment:processed or payment:failed
  }

  refundPayment(order) {
    // TODO: Compensate - refund payment
  }
}

// Create Notification Service
class NotificationService {
  constructor(eventBus) {
    this.eventBus = eventBus;

    // TODO: Listen to relevant events
  }

  sendNotification(type, order) {
    // TODO: Send appropriate notification
    console.log(`📧 [Notification] ${type}: Order ${order.orderId}`);
  }
}

// Create Analytics Service
class AnalyticsService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.events = [];

    // TODO: Listen to all events
  }

  track(eventType, data) {
    // TODO: Record event
    this.events.push({
      type: eventType,
      data,
      timestamp: Date.now()
    });
  }

  getStats() {
    // TODO: Return analytics
    const stats = {};
    this.events.forEach(e => {
      stats[e.type] = (stats[e.type] || 0) + 1;
    });
    return stats;
  }
}

// Create Order Processing Saga
class OrderProcessingSaga {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.activeSagas = new Map();
  }

  async process(order) {
    // TODO: Implement saga
    // 1. Track saga state
    // 2. Handle success path: order -> inventory -> payment -> complete
    // 3. Handle failure path: compensate in reverse order
    // 4. Emit appropriate events
  }
}

// Initialize the system
console.log('=== E-Commerce Order Processing System ===\n');

const eventBus = new EventBus();

const orderService = new OrderService(eventBus);
const inventoryService = new InventoryService(eventBus);
const paymentService = new PaymentService(eventBus);
const notificationService = new NotificationService(eventBus);
const analyticsService = new AnalyticsService(eventBus);
const orderSaga = new OrderProcessingSaga(eventBus);

console.log('✅ All services initialized\n');

// Test the system
console.log('--- Processing Successful Order ---\n');

orderService.createOrder({
  orderId: 'ORD1',
  customerId: 'CUST1',
  items: [
    { productId: 'PROD1', quantity: 1 },
    { productId: 'PROD2', quantity: 2 }
  ],
  payment: {
    method: 'credit_card',
    amount: 1050
  }
});

setTimeout(() => {
  console.log('\n--- Processing Failed Order (Insufficient Stock) ---\n');

  orderService.createOrder({
    orderId: 'ORD2',
    customerId: 'CUST2',
    items: [
      { productId: 'PROD1', quantity: 100 } // More than available
    ],
    payment: {
      method: 'credit_card',
      amount: 100000
    }
  });

  setTimeout(() => {
    console.log('\n--- Analytics Report ---\n');
    console.log('Event Statistics:');
    console.table(analyticsService.getStats());

    console.log('\n--- System Health ---\n');
    // Display health metrics from event bus
    console.log('✅ System operational');
  }, 500);
}, 500);

/*
 * Expected output:
 * === E-Commerce Order Processing System ===
 *
 * ✅ All services initialized
 *
 * --- Processing Successful Order ---
 *
 * [Order] Created order ORD1
 * [Inventory] Checking stock...
 * [Inventory] ✅ Reserved inventory for ORD1
 * [Payment] Processing payment...
 * [Payment] ✅ Payment processed for ORD1
 * [Order] ✅ Order ORD1 completed
 * 📧 [Notification] order_completed: Order ORD1
 *
 * --- Processing Failed Order (Insufficient Stock) ---
 *
 * [Order] Created order ORD2
 * [Inventory] Checking stock...
 * [Inventory] ❌ Insufficient stock for ORD2
 * [Order] ❌ Order ORD2 failed
 * 📧 [Notification] order_failed: Order ORD2
 *
 * --- Analytics Report ---
 *
 * Event Statistics:
 * ┌─────────────────────────────┬────────┐
 * │ Event                       │ Count  │
 * ├─────────────────────────────┼────────┤
 * │ order:created               │ 2      │
 * │ inventory:reserved          │ 1      │
 * │ inventory:reservationFailed │ 1      │
 * │ payment:processed           │ 1      │
 * │ order:completed             │ 1      │
 * │ order:failed                │ 1      │
 * │ notification:sent           │ 2      │
 * └─────────────────────────────┴────────┘
 *
 * --- System Health ---
 * ✅ System operational
 */

// After completing, compare with: solutions/exercise-5-solution.js
