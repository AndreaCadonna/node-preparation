/**
 * Example 4: Event Namespacing
 *
 * This example demonstrates:
 * - Organizing events with namespaces
 * - Colon notation conventions
 * - Hierarchical event structures
 * - Pattern-based event handling
 * - Best practices for event naming
 */

const EventEmitter = require('events');

console.log('=== Event Namespacing ===\n');

console.log('--- Basic Namespace Pattern ---\n');

// Use colon notation for namespaces: 'module:action' or 'module:action:detail'
class NamespacedApp extends EventEmitter {
  constructor() {
    super();
  }

  // User-related operations
  createUser(username) {
    console.log(`Creating user: ${username}`);
    this.emit('user:created', { username, timestamp: Date.now() });
  }

  updateUser(username, changes) {
    console.log(`Updating user: ${username}`);
    this.emit('user:updated', { username, changes });
  }

  deleteUser(username) {
    console.log(`Deleting user: ${username}`);
    this.emit('user:deleted', { username });
  }

  // Database operations
  connectDatabase() {
    console.log('Connecting to database...');
    this.emit('db:connecting');

    setTimeout(() => {
      this.emit('db:connected', { host: 'localhost', port: 5432 });
    }, 100);
  }

  queryDatabase(sql) {
    console.log(`Executing query: ${sql}`);
    this.emit('db:query:start', { sql });

    setTimeout(() => {
      this.emit('db:query:complete', { sql, rows: 5 });
    }, 50);
  }

  // Server operations
  startServer(port) {
    console.log(`Starting server on port ${port}...`);
    this.emit('server:starting', { port });

    setTimeout(() => {
      this.emit('server:started', { port, url: `http://localhost:${port}` });
    }, 100);
  }
}

const app = new NamespacedApp();

// Listen to user events
app.on('user:created', (data) => {
  console.log('[User Handler] User created:', data.username);
});

app.on('user:updated', (data) => {
  console.log('[User Handler] User updated:', data.username);
});

app.on('user:deleted', (data) => {
  console.log('[User Handler] User deleted:', data.username);
});

// Listen to database events
app.on('db:connecting', () => {
  console.log('[DB Handler] Connecting...');
});

app.on('db:connected', (data) => {
  console.log('[DB Handler] Connected to', data.host);
});

app.on('db:query:start', (data) => {
  console.log('[DB Handler] Query started:', data.sql);
});

app.on('db:query:complete', (data) => {
  console.log('[DB Handler] Query complete:', data.rows, 'rows');
});

// Listen to server events
app.on('server:starting', (data) => {
  console.log('[Server Handler] Starting on port', data.port);
});

app.on('server:started', (data) => {
  console.log('[Server Handler] Server ready at', data.url);
});

// Use the app
app.createUser('alice');
app.updateUser('alice', { email: 'alice@example.com' });
app.deleteUser('alice');

setTimeout(() => {
  app.connectDatabase();

  setTimeout(() => {
    app.queryDatabase('SELECT * FROM users');

    setTimeout(() => {
      app.startServer(3000);

      setTimeout(() => {
        console.log('\n--- Wildcard Pattern (Simulated) ---\n');

        // EventEmitter doesn't support wildcards natively,
        // but we can implement a wrapper
        class WildcardEmitter extends EventEmitter {
          emit(event, ...args) {
            // Emit the specific event
            super.emit(event, ...args);

            // Also emit wildcard patterns
            const parts = event.split(':');

            // Emit partial wildcards
            // For 'user:profile:updated', emit:
            // - 'user:*'
            // - 'user:profile:*'
            for (let i = 1; i <= parts.length; i++) {
              const pattern = parts.slice(0, i).join(':') + ':*';
              if (pattern !== event + ':*') {
                super.emit(pattern, event, ...args);
              }
            }

            // Emit global wildcard
            super.emit('*', event, ...args);

            return true;
          }
        }

        const wildcard = new WildcardEmitter();

        // Listen to all user events
        wildcard.on('user:*', (event, data) => {
          console.log(`[User Wildcard] Event: ${event}`, data);
        });

        // Listen to all database events
        wildcard.on('db:*', (event, data) => {
          console.log(`[DB Wildcard] Event: ${event}`, data);
        });

        // Listen to ALL events
        wildcard.on('*', (event, data) => {
          console.log(`[Global] Event: ${event}`);
        });

        // Also listen to specific events
        wildcard.on('user:login', (data) => {
          console.log('[Specific] User logged in:', data.username);
        });

        // Emit events
        wildcard.emit('user:login', { username: 'bob' });
        console.log();
        wildcard.emit('user:logout', { username: 'bob' });
        console.log();
        wildcard.emit('db:connected', { host: 'localhost' });

        setTimeout(() => {
          console.log('\n--- Hierarchical Events ---\n');

          class HierarchicalApp extends EventEmitter {
            constructor() {
              super();
            }

            // Use hierarchy for related events
            handleRequest(request) {
              // Top-level event
              this.emit('request', request);

              // More specific events based on request type
              if (request.authenticated) {
                this.emit('request:authenticated', request);

                if (request.admin) {
                  this.emit('request:authenticated:admin', request);
                } else {
                  this.emit('request:authenticated:user', request);
                }
              } else {
                this.emit('request:unauthenticated', request);
              }

              // Method-specific events
              this.emit(`request:${request.method.toLowerCase()}`, request);
            }
          }

          const hierarchical = new HierarchicalApp();

          // Listen at different levels
          hierarchical.on('request', (req) => {
            console.log('[Level 1] All requests:', req.url);
          });

          hierarchical.on('request:authenticated', (req) => {
            console.log('[Level 2] Authenticated:', req.url);
          });

          hierarchical.on('request:authenticated:admin', (req) => {
            console.log('[Level 3] Admin access:', req.url);
          });

          hierarchical.on('request:get', (req) => {
            console.log('[Method] GET request:', req.url);
          });

          // Process different requests
          console.log('Request 1 (admin):');
          hierarchical.handleRequest({
            url: '/admin/users',
            method: 'GET',
            authenticated: true,
            admin: true
          });

          console.log('\nRequest 2 (regular user):');
          hierarchical.handleRequest({
            url: '/profile',
            method: 'POST',
            authenticated: true,
            admin: false
          });

          console.log('\nRequest 3 (unauthenticated):');
          hierarchical.handleRequest({
            url: '/login',
            method: 'GET',
            authenticated: false
          });

          setTimeout(() => {
            console.log('\n--- Domain-Driven Events ---\n');

            class OrderSystem extends EventEmitter {
              constructor() {
                super();
              }

              // Order lifecycle events
              createOrder(order) {
                this.emit('order:created', order);
                this.emit('order:state:pending', order);
              }

              confirmOrder(orderId) {
                this.emit('order:confirmed', { orderId });
                this.emit('order:state:confirmed', { orderId });
                this.emit('payment:required', { orderId });
              }

              processPayment(orderId, payment) {
                this.emit('payment:processing', { orderId, payment });
                this.emit('order:state:processing', { orderId });

                setTimeout(() => {
                  this.emit('payment:completed', { orderId, payment });
                  this.emit('order:state:paid', { orderId });
                  this.emit('fulfillment:required', { orderId });
                }, 100);
              }

              shipOrder(orderId, tracking) {
                this.emit('fulfillment:started', { orderId, tracking });
                this.emit('order:state:shipped', { orderId, tracking });

                setTimeout(() => {
                  this.emit('fulfillment:completed', { orderId });
                  this.emit('order:state:delivered', { orderId });
                  this.emit('order:completed', { orderId });
                }, 100);
              }
            }

            const orders = new OrderSystem();

            // Audit trail - listen to all state changes
            orders.on('order:state:pending', (order) => {
              console.log('[Audit] Order pending:', order.id);
            });

            orders.on('order:state:confirmed', (data) => {
              console.log('[Audit] Order confirmed:', data.orderId);
            });

            orders.on('order:state:paid', (data) => {
              console.log('[Audit] Order paid:', data.orderId);
            });

            orders.on('order:state:shipped', (data) => {
              console.log('[Audit] Order shipped:', data.orderId);
            });

            orders.on('order:state:delivered', (data) => {
              console.log('[Audit] Order delivered:', data.orderId);
            });

            // Payment processor
            orders.on('payment:required', (data) => {
              console.log('[Payment] Processing required for:', data.orderId);
            });

            orders.on('payment:completed', (data) => {
              console.log('[Payment] Payment completed:', data.orderId);
            });

            // Fulfillment
            orders.on('fulfillment:required', (data) => {
              console.log('[Warehouse] Fulfillment required:', data.orderId);
            });

            orders.on('fulfillment:completed', (data) => {
              console.log('[Warehouse] Shipped:', data.orderId);
            });

            // Notifications
            orders.on('order:confirmed', (data) => {
              console.log('[Email] Confirmation sent for:', data.orderId);
            });

            orders.on('order:completed', (data) => {
              console.log('[Email] Completion notification:', data.orderId);
            });

            // Process an order
            const order = { id: 'ORD-001', items: ['Book', 'Pen'], total: 25.99 };

            console.log('Processing order:', order.id);
            orders.createOrder(order);

            setTimeout(() => {
              orders.confirmOrder(order.id);

              setTimeout(() => {
                orders.processPayment(order.id, { method: 'credit', amount: 25.99 });

                setTimeout(() => {
                  orders.shipOrder(order.id, 'TRACK-123');

                  setTimeout(() => {
                    console.log('\n=== Example Complete ===');
                  }, 150);
                }, 150);
              }, 50);
            }, 50);
          }, 100);
        }, 150);
      }, 150);
    }, 100);
  }, 150);
}, 100);

/*
 * Key Takeaways:
 * 1. Use colon notation for namespaces: 'module:action'
 * 2. Can have multiple levels: 'module:submodule:action'
 * 3. Makes events self-documenting and organized
 * 4. Easier to filter and manage related events
 * 5. Convention: lowercase with colons as separators
 * 6. Can implement wildcard matching with custom emitter
 * 7. Hierarchical events enable granular listening
 * 8. Domain-driven events reflect business processes
 * 9. State changes make good namespaced events
 * 10. Namespacing prevents name collisions
 */
