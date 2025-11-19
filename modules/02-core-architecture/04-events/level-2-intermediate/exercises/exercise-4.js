/**
 * Exercise 4: Implement Event Namespacing
 *
 * Task:
 * Create an Application class that uses event namespacing to organize
 * events from different subsystems. Implement a pattern that allows
 * listening to all events in a namespace.
 *
 * Requirements:
 * 1. Create an Application class that extends EventEmitter
 * 2. Use namespace pattern: 'module:action' or 'module:submodule:action'
 * 3. Implement emitNamespaced(event, data) that:
 *    - Emits the specific event
 *    - Also emits a wildcard version for the namespace
 *    - Example: 'user:login' also triggers 'user:*'
 * 4. Implement onNamespace(namespace, listener) that:
 *    - Listens to all events in a namespace
 *    - Use the wildcard pattern (e.g., 'user:*')
 * 5. Create methods for different subsystems:
 *    - Database operations: 'db:connect', 'db:query', 'db:error'
 *    - User operations: 'user:login', 'user:logout', 'user:created'
 *    - Server operations: 'server:start', 'server:stop', 'server:request'
 *
 * Hints:
 * - Use prependListener for wildcard handlers
 * - Parse event names to extract namespace
 * - Wildcard listeners receive (eventName, data) as arguments
 */

const EventEmitter = require('events');

// YOUR CODE HERE
class Application extends EventEmitter {
  constructor() {
    super();
    // TODO: Set appropriate max listeners
  }

  emitNamespaced(event, data) {
    // TODO: Emit the specific event
    // TODO: Extract namespace from event name
    // TODO: Emit wildcard event for namespace
    // Example: 'user:login' should also emit 'user:*'
  }

  onNamespace(namespace, listener) {
    // TODO: Listen to wildcard events for namespace
    // The listener should receive (eventName, data)
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


// Test your Application
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
 * Expected output:
 * === Setting Up Listeners ===
 *
 * === Running Operations ===
 *
 * --- Database Operations ---
 * [DB] Connecting to database...
 * [DB Monitor] Event 'db:connect': { host: 'localhost', port: 5432 }
 * [DB Monitor] Event 'db:connected': { host: 'localhost', status: 'connected' }
 * [Logger] Database connected: localhost
 *
 * [DB] Executing query: SELECT * FROM users
 * [DB Monitor] Event 'db:query': { sql: 'SELECT * FROM users' }
 *
 * --- User Operations ---
 * [User] User logging in: alice
 * [User Monitor] Event 'user:login': { username: 'alice' }
 * [Auth] User logged in: alice
 *
 * [User] Creating user: bob
 * [User Monitor] Event 'user:created': { username: 'bob', email: 'bob@example.com' }
 *
 * [User] User logging out: alice
 * [User Monitor] Event 'user:logout': { username: 'alice' }
 *
 * --- Server Operations ---
 * [Server] Starting on port: 3000
 * [Server Monitor] Event 'server:start': { port: 3000 }
 *
 * [Server] Handling request: /api/users
 * [Server Monitor] Event 'server:request': { path: '/api/users' }
 *
 * [Server] Handling request: /api/posts
 * [Server Monitor] Event 'server:request': { path: '/api/posts' }
 */

// After completing, compare with: solutions/exercise-4-solution.js
