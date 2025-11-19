/**
 * Example 7: Extending EventEmitter
 *
 * This example demonstrates:
 * - Creating custom classes that extend EventEmitter
 * - When and why to extend EventEmitter
 * - Calling super() properly
 * - Best practices for custom emitters
 * - Real-world patterns
 */

const EventEmitter = require('events');

console.log('=== Extending EventEmitter ===\n');

console.log('--- Basic Extension ---\n');

// Most classes in Node.js core extend EventEmitter
class Counter extends EventEmitter {
  constructor() {
    super(); // Must call super() first!
    this.count = 0;
  }

  increment() {
    this.count++;
    this.emit('incremented', this.count);

    if (this.count >= 10) {
      this.emit('max-reached', this.count);
    }
  }

  reset() {
    this.count = 0;
    this.emit('reset');
  }
}

const counter = new Counter();

counter.on('incremented', (count) => {
  console.log('Count is now:', count);
});

counter.on('max-reached', (count) => {
  console.log('Maximum reached!', count);
});

counter.on('reset', () => {
  console.log('Counter was reset');
});

counter.increment();
counter.increment();
counter.reset();

console.log('\n--- Real-World Example: User Manager ---\n');

class UserManager extends EventEmitter {
  constructor() {
    super();
    this.users = new Map();
  }

  createUser(username, email) {
    if (this.users.has(username)) {
      this.emit('error', new Error(`User ${username} already exists`));
      return null;
    }

    const user = {
      username,
      email,
      createdAt: Date.now()
    };

    this.users.set(username, user);
    this.emit('user:created', user);

    return user;
  }

  deleteUser(username) {
    if (!this.users.has(username)) {
      this.emit('error', new Error(`User ${username} not found`));
      return false;
    }

    const user = this.users.get(username);
    this.users.delete(username);
    this.emit('user:deleted', user);

    return true;
  }

  updateUser(username, updates) {
    if (!this.users.has(username)) {
      this.emit('error', new Error(`User ${username} not found`));
      return null;
    }

    const user = this.users.get(username);
    const oldUser = { ...user };
    Object.assign(user, updates);

    this.emit('user:updated', {
      user,
      oldUser,
      changes: updates
    });

    return user;
  }
}

const userManager = new UserManager();

// Set up event listeners
userManager.on('user:created', (user) => {
  console.log('[Audit] User created:', user.username);
});

userManager.on('user:deleted', (user) => {
  console.log('[Audit] User deleted:', user.username);
});

userManager.on('user:updated', ({ user, changes }) => {
  console.log('[Audit] User updated:', user.username);
  console.log('  Changes:', Object.keys(changes).join(', '));
});

userManager.on('error', (err) => {
  console.log('[Error]:', err.message);
});

// Use the user manager
userManager.createUser('alice', 'alice@example.com');
userManager.createUser('bob', 'bob@example.com');
userManager.createUser('alice', 'duplicate@example.com'); // Error
userManager.updateUser('bob', { email: 'bob.new@example.com' });
userManager.deleteUser('alice');
userManager.deleteUser('charlie'); // Error

console.log('\n--- Task Queue Example ---\n');

class TaskQueue extends EventEmitter {
  constructor() {
    super();
    this.tasks = [];
    this.isProcessing = false;
  }

  addTask(task) {
    this.tasks.push(task);
    this.emit('task:added', task);

    if (!this.isProcessing) {
      this.processTasks();
    }
  }

  async processTasks() {
    if (this.tasks.length === 0) {
      this.isProcessing = false;
      this.emit('queue:empty');
      return;
    }

    this.isProcessing = true;
    this.emit('queue:processing');

    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      this.emit('task:processing', task);

      try {
        // Simulate task execution
        await new Promise(resolve => setTimeout(resolve, 50));
        this.emit('task:completed', task);
      } catch (error) {
        this.emit('task:failed', { task, error });
      }
    }

    this.isProcessing = false;
    this.emit('queue:empty');
  }
}

const queue = new TaskQueue();

queue.on('task:added', (task) => {
  console.log('[Queue] Task added:', task.name);
});

queue.on('task:processing', (task) => {
  console.log('[Queue] Processing:', task.name);
});

queue.on('task:completed', (task) => {
  console.log('[Queue] Completed:', task.name);
});

queue.on('queue:empty', () => {
  console.log('[Queue] All tasks completed');
});

queue.addTask({ name: 'Send email', type: 'email' });
queue.addTask({ name: 'Generate report', type: 'report' });
queue.addTask({ name: 'Update database', type: 'database' });

console.log('\n--- Connection Pool Example ---\n');

class ConnectionPool extends EventEmitter {
  constructor(maxConnections = 5) {
    super();
    this.maxConnections = maxConnections;
    this.activeConnections = 0;
    this.availableConnections = [];
  }

  getConnection() {
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop();
      this.emit('connection:acquired', connection);
      return connection;
    }

    if (this.activeConnections < this.maxConnections) {
      const connection = { id: ++this.activeConnections };
      this.emit('connection:created', connection);
      return connection;
    }

    this.emit('pool:exhausted');
    return null;
  }

  releaseConnection(connection) {
    this.availableConnections.push(connection);
    this.emit('connection:released', connection);
  }
}

const pool = new ConnectionPool(2);

pool.on('connection:created', (conn) => {
  console.log('[Pool] New connection created:', conn.id);
});

pool.on('connection:acquired', (conn) => {
  console.log('[Pool] Connection acquired:', conn.id);
});

pool.on('connection:released', (conn) => {
  console.log('[Pool] Connection released:', conn.id);
});

pool.on('pool:exhausted', () => {
  console.log('[Pool] Pool exhausted! No available connections');
});

const conn1 = pool.getConnection();
const conn2 = pool.getConnection();
const conn3 = pool.getConnection(); // Should trigger exhausted event

pool.releaseConnection(conn1);
const conn4 = pool.getConnection(); // Should reuse conn1

// Wait for async operations
setTimeout(() => {
  console.log('\n=== Example Complete ===');
}, 500);

/*
 * Key Takeaways:
 * 1. Extend EventEmitter to create custom event-driven classes
 * 2. Always call super() in the constructor
 * 3. Emit events at significant points in your class methods
 * 4. Use descriptive event names like 'user:created', 'task:completed'
 * 5. Common pattern: emit events for create, update, delete operations
 * 6. Error events should be emitted for error conditions
 * 7. This pattern is used throughout Node.js core (http.Server, fs.ReadStream, etc.)
 * 8. Makes your code more flexible and easier to extend
 */
