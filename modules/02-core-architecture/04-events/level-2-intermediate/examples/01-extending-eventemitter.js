/**
 * Example 1: Extending EventEmitter
 *
 * This example demonstrates:
 * - Creating custom classes that extend EventEmitter
 * - Proper constructor and super() usage
 * - Emitting events at key lifecycle points
 * - Real-world patterns for custom emitters
 * - Best practices for class-based event emitters
 */

const EventEmitter = require('events');

console.log('=== Extending EventEmitter ===\n');

console.log('--- Basic Extension Pattern ---\n');

// Most production classes extend EventEmitter to become event-driven
class Timer extends EventEmitter {
  constructor(interval) {
    super(); // MUST call super() before using 'this'
    this.interval = interval;
    this.timerId = null;
    this.ticks = 0;
  }

  start() {
    if (this.timerId) {
      this.emit('error', new Error('Timer already started'));
      return;
    }

    this.emit('start', { interval: this.interval });

    this.timerId = setInterval(() => {
      this.ticks++;
      this.emit('tick', this.ticks);

      if (this.ticks >= 5) {
        this.stop();
      }
    }, this.interval);
  }

  stop() {
    if (!this.timerId) {
      return;
    }

    clearInterval(this.timerId);
    this.timerId = null;
    this.emit('stop', { totalTicks: this.ticks });
  }

  reset() {
    this.stop();
    this.ticks = 0;
    this.emit('reset');
  }
}

const timer = new Timer(200);

timer.on('start', (data) => {
  console.log('Timer started with interval:', data.interval);
});

timer.on('tick', (count) => {
  console.log('Tick #', count);
});

timer.on('stop', (data) => {
  console.log('Timer stopped. Total ticks:', data.totalTicks);
});

timer.on('error', (err) => {
  console.error('Timer error:', err.message);
});

timer.start();

// Wait for timer to complete
setTimeout(() => {
  console.log('\n--- User Authentication System ---\n');

  // Real-world example: Authentication service
  class AuthService extends EventEmitter {
    constructor() {
      super();
      this.users = new Map();
      this.sessions = new Map();
    }

    register(username, password) {
      if (this.users.has(username)) {
        this.emit('error', new Error(`User ${username} already exists`));
        return null;
      }

      const user = {
        username,
        password, // In reality, hash this!
        createdAt: new Date(),
        id: Date.now()
      };

      this.users.set(username, user);
      this.emit('user:registered', {
        username: user.username,
        id: user.id
      });

      return user;
    }

    login(username, password) {
      this.emit('login:attempt', { username });

      const user = this.users.get(username);

      if (!user) {
        this.emit('login:failed', {
          username,
          reason: 'User not found'
        });
        return null;
      }

      if (user.password !== password) {
        this.emit('login:failed', {
          username,
          reason: 'Invalid password'
        });
        return null;
      }

      const sessionId = `session-${Date.now()}`;
      const session = {
        id: sessionId,
        username,
        createdAt: new Date()
      };

      this.sessions.set(sessionId, session);
      this.emit('login:success', {
        username,
        sessionId
      });

      return session;
    }

    logout(sessionId) {
      const session = this.sessions.get(sessionId);

      if (!session) {
        this.emit('error', new Error('Invalid session'));
        return false;
      }

      this.sessions.delete(sessionId);
      this.emit('logout', {
        username: session.username,
        sessionId
      });

      return true;
    }

    deleteUser(username) {
      if (!this.users.has(username)) {
        this.emit('error', new Error('User not found'));
        return false;
      }

      // Remove all sessions for this user
      for (const [sessionId, session] of this.sessions) {
        if (session.username === username) {
          this.sessions.delete(sessionId);
        }
      }

      this.users.delete(username);
      this.emit('user:deleted', { username });

      return true;
    }

    getStats() {
      const stats = {
        totalUsers: this.users.size,
        activeSessions: this.sessions.size
      };

      this.emit('stats:retrieved', stats);
      return stats;
    }
  }

  const auth = new AuthService();

  // Set up comprehensive logging
  auth.on('user:registered', (data) => {
    console.log('[Audit] User registered:', data.username);
  });

  auth.on('login:attempt', (data) => {
    console.log('[Security] Login attempt:', data.username);
  });

  auth.on('login:success', (data) => {
    console.log('[Audit] Login successful:', data.username);
    console.log('  Session ID:', data.sessionId);
  });

  auth.on('login:failed', (data) => {
    console.log('[Security] Login failed:', data.username);
    console.log('  Reason:', data.reason);
  });

  auth.on('logout', (data) => {
    console.log('[Audit] User logged out:', data.username);
  });

  auth.on('user:deleted', (data) => {
    console.log('[Audit] User deleted:', data.username);
  });

  auth.on('error', (err) => {
    console.error('[Error]:', err.message);
  });

  // Use the auth service
  auth.register('alice', 'password123');
  auth.register('bob', 'secret456');
  auth.register('alice', 'duplicate'); // Should fail

  const session1 = auth.login('alice', 'password123');
  auth.login('bob', 'wrongpass'); // Should fail
  const session2 = auth.login('bob', 'secret456');

  console.log('\nCurrent stats:', auth.getStats());

  auth.logout(session1.id);
  auth.deleteUser('charlie'); // Should fail
  auth.deleteUser('alice');

  console.log('\nFinal stats:', auth.getStats());

  setTimeout(() => {
    console.log('\n--- Task Manager Example ---\n');

    // Production pattern: Task manager with progress tracking
    class TaskManager extends EventEmitter {
      constructor() {
        super();
        this.tasks = new Map();
        this.nextId = 1;
      }

      createTask(title, description) {
        const task = {
          id: this.nextId++,
          title,
          description,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.tasks.set(task.id, task);
        this.emit('task:created', task);

        return task;
      }

      startTask(taskId) {
        const task = this.tasks.get(taskId);

        if (!task) {
          this.emit('error', new Error(`Task ${taskId} not found`));
          return false;
        }

        if (task.status !== 'pending') {
          this.emit('error', new Error(`Task ${taskId} is ${task.status}`));
          return false;
        }

        task.status = 'in-progress';
        task.startedAt = new Date();
        task.updatedAt = new Date();

        this.emit('task:started', task);
        return true;
      }

      completeTask(taskId) {
        const task = this.tasks.get(taskId);

        if (!task) {
          this.emit('error', new Error(`Task ${taskId} not found`));
          return false;
        }

        const oldStatus = task.status;
        task.status = 'completed';
        task.completedAt = new Date();
        task.updatedAt = new Date();

        this.emit('task:completed', {
          task,
          previousStatus: oldStatus
        });

        // Check if all tasks are complete
        const allComplete = Array.from(this.tasks.values())
          .every(t => t.status === 'completed');

        if (allComplete) {
          this.emit('all:completed', {
            totalTasks: this.tasks.size
          });
        }

        return true;
      }

      failTask(taskId, reason) {
        const task = this.tasks.get(taskId);

        if (!task) {
          this.emit('error', new Error(`Task ${taskId} not found`));
          return false;
        }

        task.status = 'failed';
        task.failedAt = new Date();
        task.updatedAt = new Date();
        task.failureReason = reason;

        this.emit('task:failed', {
          task,
          reason
        });

        return true;
      }

      getTasksByStatus(status) {
        return Array.from(this.tasks.values())
          .filter(task => task.status === status);
      }
    }

    const manager = new TaskManager();

    // Set up event tracking
    manager.on('task:created', (task) => {
      console.log(`[Manager] Task created: "${task.title}" (ID: ${task.id})`);
    });

    manager.on('task:started', (task) => {
      console.log(`[Manager] Task started: "${task.title}"`);
    });

    manager.on('task:completed', ({ task }) => {
      console.log(`[Manager] Task completed: "${task.title}"`);
    });

    manager.on('task:failed', ({ task, reason }) => {
      console.log(`[Manager] Task failed: "${task.title}"`);
      console.log(`  Reason: ${reason}`);
    });

    manager.on('all:completed', ({ totalTasks }) => {
      console.log(`[Manager] All ${totalTasks} tasks completed!`);
    });

    manager.on('error', (err) => {
      console.error('[Manager Error]:', err.message);
    });

    // Create and manage tasks
    const task1 = manager.createTask('Write documentation', 'Complete API docs');
    const task2 = manager.createTask('Fix bug #123', 'Resolve login issue');
    const task3 = manager.createTask('Deploy to production', 'Deploy v2.0');

    manager.startTask(task1.id);
    manager.completeTask(task1.id);

    manager.startTask(task2.id);
    manager.failTask(task2.id, 'Cannot reproduce bug');

    manager.startTask(task3.id);
    manager.completeTask(task3.id);
    manager.completeTask(task2.id); // Mark as complete after review

    console.log('\nCompleted tasks:', manager.getTasksByStatus('completed').length);

    console.log('\n=== Example Complete ===');
  }, 1500);
}, 1200);

/*
 * Key Takeaways:
 * 1. Always call super() first in constructor
 * 2. Emit events at significant lifecycle points
 * 3. Use namespaced event names (e.g., 'user:created')
 * 4. Emit errors as 'error' events
 * 5. Include relevant data in event payloads
 * 6. This pattern makes classes more extensible and testable
 * 7. Listeners can be added/removed dynamically
 * 8. Multiple listeners can react to the same event independently
 */
