/**
 * Exercise 5 Solution: Build a Complete Event-Driven Application
 */

const EventEmitter = require('events');

// Event Bus
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
    this.metrics = new Map();
  }

  emit(event, ...args) {
    this.recordMetric(event);
    return super.emit(event, ...args);
  }

  recordMetric(event) {
    this.metrics.set(event, (this.metrics.get(event) || 0) + 1);
  }
}

// Order Service
class OrderService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.orders = new Map();

    this.eventBus.on('order:completed', (data) => this.handleOrderCompleted(data));
    this.eventBus.on('order:failed', (data) => this.handleOrderFailed(data));
  }

  createOrder(orderData) {
    const order = {
      ...orderData,
      status: 'pending',
      createdAt: Date.now()
    };

    this.orders.set(order.orderId, order);
    console.log(`[Order] Created order ${order.orderId}`);

    this.eventBus.emit('order:created', order);
    return order;
  }

  handleOrderCompleted(data) {
    const order = this.orders.get(data.orderId);
    if (order) {
      order.status = 'completed';
      console.log(`[Order] ✅ Order ${data.orderId} completed`);
    }
  }

  handleOrderFailed(data) {
    const order = this.orders.get(data.orderId);
    if (order) {
      order.status = 'failed';
      order.error = data.error;
      console.log(`[Order] ❌ Order ${data.orderId} failed`);
    }
  }
}

// Inventory Service
class InventoryService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.inventory = new Map([
      ['PROD1', { name: 'Laptop', stock: 10, price: 1000 }],
      ['PROD2', { name: 'Mouse', stock: 50, price: 25 }],
      ['PROD3', { name: 'Keyboard', stock: 30, price: 75 }]
    ]);

    this.eventBus.on('order:created', (order) => this.reserveInventory(order));
  }

  reserveInventory(order) {
    console.log('[Inventory] Checking stock...');

    for (const item of order.items) {
      const product = this.inventory.get(item.productId);

      if (!product || product.stock < item.quantity) {
        console.log(`[Inventory] ❌ Insufficient stock for ${order.orderId}`);
        this.eventBus.emit('inventory:reservationFailed', {
          orderId: order.orderId,
          reason: 'Insufficient stock'
        });
        return;
      }
    }

    // Reserve stock
    for (const item of order.items) {
      const product = this.inventory.get(item.productId);
      product.stock -= item.quantity;
    }

    console.log(`[Inventory] ✅ Reserved inventory for ${order.orderId}`);
    this.eventBus.emit('inventory:reserved', { orderId: order.orderId, items: order.items });
  }

  releaseReservation(order) {
    for (const item of order.items) {
      const product = this.inventory.get(item.productId);
      if (product) {
        product.stock += item.quantity;
      }
    }
    console.log(`[Inventory] Released reservation for ${order.orderId}`);
  }
}

// Payment Service
class PaymentService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.payments = new Map();

    this.eventBus.on('inventory:reserved', (data) => this.processPayment(data));
  }

  async processPayment(data) {
    console.log('[Payment] Processing payment...');

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const paymentId = `PAY_${Date.now()}`;
    this.payments.set(paymentId, {
      orderId: data.orderId,
      status: 'completed'
    });

    console.log(`[Payment] ✅ Payment processed for ${data.orderId}`);
    this.eventBus.emit('payment:processed', {
      orderId: data.orderId,
      paymentId
    });
  }

  refundPayment(orderId) {
    console.log(`[Payment] Refunding payment for ${orderId}`);
  }
}

// Notification Service
class NotificationService {
  constructor(eventBus) {
    this.eventBus = eventBus;

    this.eventBus.on('order:completed', (data) => this.sendNotification('order_completed', data.orderId));
    this.eventBus.on('order:failed', (data) => this.sendNotification('order_failed', data.orderId));
    this.eventBus.on('payment:processed', (data) => this.sendNotification('payment_processed', data.orderId));
  }

  sendNotification(type, orderId) {
    console.log(`📧 [Notification] ${type}: Order ${orderId}`);
  }
}

// Analytics Service
class AnalyticsService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.events = [];

    const eventsToTrack = [
      'order:created', 'inventory:reserved', 'inventory:reservationFailed',
      'payment:processed', 'payment:failed', 'order:completed', 'order:failed'
    ];

    eventsToTrack.forEach(event => {
      this.eventBus.on(event, (data) => this.track(event, data));
    });
  }

  track(eventType, data) {
    this.events.push({ type: eventType, data, timestamp: Date.now() });
  }

  getStats() {
    const stats = {};
    this.events.forEach(e => {
      stats[e.type] = (stats[e.type] || 0) + 1;
    });
    return stats;
  }
}

// Saga
class OrderProcessingSaga {
  constructor(eventBus) {
    this.eventBus = eventBus;

    this.eventBus.on('payment:processed', (data) => {
      this.eventBus.emit('order:completed', { orderId: data.orderId });
    });

    this.eventBus.on('inventory:reservationFailed', (data) => {
      this.eventBus.emit('order:failed', {
        orderId: data.orderId,
        error: data.reason
      });
    });
  }
}

// Initialize
console.log('=== E-Commerce Order Processing System ===\n');

const eventBus = new EventBus();
const orderService = new OrderService(eventBus);
const inventoryService = new InventoryService(eventBus);
const paymentService = new PaymentService(eventBus);
const notificationService = new NotificationService(eventBus);
const analyticsService = new AnalyticsService(eventBus);
const orderSaga = new OrderProcessingSaga(eventBus);

console.log('✅ All services initialized\n');

console.log('--- Processing Successful Order ---\n');

orderService.createOrder({
  orderId: 'ORD1',
  customerId: 'CUST1',
  items: [
    { productId: 'PROD1', quantity: 1 },
    { productId: 'PROD2', quantity: 2 }
  ],
  payment: { method: 'credit_card', amount: 1050 }
});

setTimeout(() => {
  console.log('\n--- Processing Failed Order (Insufficient Stock) ---\n');

  orderService.createOrder({
    orderId: 'ORD2',
    customerId: 'CUST2',
    items: [{ productId: 'PROD1', quantity: 100 }],
    payment: { method: 'credit_card', amount: 100000 }
  });

  setTimeout(() => {
    console.log('\n--- Analytics Report ---\n');
    console.log('Event Statistics:');
    console.table(analyticsService.getStats());

    console.log('\n--- System Health ---');
    console.log('✅ System operational');
  }, 500);
}, 500);
