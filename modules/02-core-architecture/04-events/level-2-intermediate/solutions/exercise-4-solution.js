/**
 * Solution 4: Implement Event Namespacing
 *
 * This solution demonstrates:
 * - Event namespacing with colon notation
 * - Wildcard pattern implementation
 * - Listening to all events in a namespace
 * - Organized event hierarchies
 */

const EventEmitter = require('events');

class Application extends EventEmitter {
  constructor() {
    super();

    // Set appropriate max listeners
    this.setMaxListeners(30);
  }

  emitNamespaced(event, data) {
    // Emit the specific event
    this.emit(event, data);

    // Extract namespace and emit wildcard
    const parts = event.split(':');

    if (parts.length > 1) {
      // Get namespace (everything before last colon)
      const namespace = parts[0];
      const wildcardEvent = `${namespace}:*`;

      // Emit wildcard event with original event name
      this.emit(wildcardEvent, event, data);
    }
  }

  onNamespace(namespace, listener) {
    // Listen to wildcard events for namespace
    const wildcardEvent = `${namespace}:*`;

    // Listener receives (eventName, data)
    this.on(wildcardEvent, listener);
  }

  // Database subsystem
  connectDatabase(config) {
    console.log('[DB] Connecting to database...');
    this.emitNamespaced('db:connect', config);

    setTimeout(() => {
      this.emitNamespaced('db:connected', {
        host: config.host,
        status: 'connected'
      });
    }, 100);
  }

  queryDatabase(sql) {
    console.log('[DB] Executing query:', sql);
    this.emitNamespaced('db:query', { sql });
  }

  // User subsystem
  loginUser(username) {
    console.log('[User] User logging in:', username);
    this.emitNamespaced('user:login', { username });
  }

  logoutUser(username) {
    console.log('[User] User logging out:', username);
    this.emitNamespaced('user:logout', { username });
  }

  createUser(username, email) {
    console.log('[User] Creating user:', username);
    this.emitNamespaced('user:created', { username, email });
  }

  // Server subsystem
  startServer(port) {
    console.log('[Server] Starting on port:', port);
    this.emitNamespaced('server:start', { port });
  }

  handleRequest(path) {
    console.log('[Server] Handling request:', path);
    this.emitNamespaced('server:request', { path });
  }
}

// Test the Application
const app = new Application();

console.log('=== Setting Up Listeners ===\n');

// Listen to ALL database events
app.onNamespace('db', (eventName, data) => {
  console.log(`[DB Monitor] Event '${eventName}':`, data);
});

// Listen to ALL user events
app.onNamespace('user', (eventName, data) => {
  console.log(`[User Monitor] Event '${eventName}':`, data);
});

// Listen to ALL server events
app.onNamespace('server', (eventName, data) => {
  console.log(`[Server Monitor] Event '${eventName}':`, data);
});

// Also listen to specific events
app.on('user:login', (data) => {
  console.log(`[Auth] User logged in: ${data.username}`);
});

app.on('db:connected', (data) => {
  console.log(`[Logger] Database connected: ${data.host}`);
});

console.log('=== Running Operations ===\n');

// Database operations
console.log('--- Database Operations ---\n');
app.connectDatabase({ host: 'localhost', port: 5432 });

setTimeout(() => {
  app.queryDatabase('SELECT * FROM users');

  setTimeout(() => {
    // User operations
    console.log('\n--- User Operations ---\n');
    app.loginUser('alice');
    app.createUser('bob', 'bob@example.com');
    app.logoutUser('alice');

    setTimeout(() => {
      // Server operations
      console.log('\n--- Server Operations ---\n');
      app.startServer(3000);
      app.handleRequest('/api/users');
      app.handleRequest('/api/posts');
    }, 200);
  }, 200);
}, 200);

/*
 * Key Implementation Details:
 *
 * 1. emitNamespaced emits both specific and wildcard events
 * 2. Split event name by ':' to extract namespace
 * 3. Wildcard format: 'namespace:*'
 * 4. Wildcard listeners receive (eventName, data)
 * 5. Can listen to all events in namespace or specific events
 * 6. Enables monitoring entire subsystems
 * 7. Maintains backwards compatibility with regular events
 * 8. Convention: lowercase with colons as separators
 */
