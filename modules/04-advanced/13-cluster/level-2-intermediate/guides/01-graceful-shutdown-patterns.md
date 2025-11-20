# Guide 1: Graceful Shutdown Patterns

## Introduction

Graceful shutdown is one of the most critical patterns in production Node.js applications. It ensures that your application exits cleanly without dropping active requests, losing data, or corrupting state. This guide covers comprehensive strategies for implementing graceful shutdown in clustered applications.

## Why Graceful Shutdown Matters

### The Problem with Abrupt Termination

When a Node.js process is killed abruptly:

```javascript
// Without graceful shutdown
process.exit(1); // Immediate exit

// Problems:
// - Active HTTP requests are dropped
// - Database connections are not closed
// - In-flight transactions are lost
// - File handles remain open
// - Worker processes are orphaned
```

**Real-world impact:**
- User sees "Connection reset" errors
- Database connections accumulate
- Data corruption or partial writes
- Resource leaks
- Poor user experience

### Benefits of Graceful Shutdown

```javascript
// With graceful shutdown
async function gracefulShutdown() {
  // 1. Stop accepting new requests
  server.close();

  // 2. Wait for active requests to complete
  await drainConnections();

  // 3. Close database connections
  await database.close();

  // 4. Clean up resources
  await cleanup();

  // 5. Exit cleanly
  process.exit(0);
}
```

**Benefits:**
- Zero dropped requests
- Clean resource cleanup
- Data consistency maintained
- Better user experience
- Predictable behavior

## Understanding Shutdown Signals

### Common Signals

Node.js processes receive different signals for shutdown:

```javascript
// SIGTERM - Graceful shutdown request
// Sent by: systemd, Docker, Kubernetes, kill command
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');
  await gracefulShutdown();
});

// SIGINT - Interrupt from terminal
// Sent by: Ctrl+C, kill -2
process.on('SIGINT', async () => {
  console.log('SIGINT received, starting graceful shutdown');
  await gracefulShutdown();
});

// SIGUSR2 - User-defined signal
// Often used for: Rolling restart, reload config
process.on('SIGUSR2', async () => {
  console.log('SIGUSR2 received, custom action');
  await customAction();
});

// SIGKILL - Force kill (cannot be caught!)
// Sent by: kill -9, OOM killer
// No graceful shutdown possible
```

### Signal Handling Best Practices

```javascript
// 1. Handle signals once
let isShuttingDown = false;

async function handleShutdown(signal) {
  if (isShuttingDown) {
    console.log(`Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received, starting graceful shutdown`);

  try {
    await gracefulShutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// 2. Register handlers
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// 3. Don't ignore errors in shutdown
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection during shutdown:', reason);
  // Decide if this should trigger shutdown
});
```

## Connection Draining

### The Challenge

HTTP servers maintain connections that may have active requests:

```javascript
// Problem: server.close() doesn't wait for active requests
const server = http.createServer(handler);

// This only stops accepting NEW connections
server.close(() => {
  console.log('No new connections accepted');
  // But active requests may still be processing!
});
```

### Basic Connection Tracking

```javascript
const http = require('http');

// Track all active connections
const connections = new Set();
let isShuttingDown = false;

const server = http.createServer((req, res) => {
  // Reject new requests during shutdown
  if (isShuttingDown) {
    res.writeHead(503, {
      'Connection': 'close',
      'Content-Type': 'text/plain'
    });
    res.end('Service Unavailable - Server is shutting down\n');
    return;
  }

  // Handle request normally
  res.writeHead(200);
  res.end('Hello World\n');
});

// Track connections
server.on('connection', (socket) => {
  connections.add(socket);

  socket.on('close', () => {
    connections.delete(socket);
  });
});

// Graceful shutdown
async function shutdown() {
  isShuttingDown = true;
  console.log(`Active connections: ${connections.size}`);

  // Stop accepting new connections
  server.close(() => {
    console.log('Server closed, no new connections');
  });

  // Wait for active connections to close naturally
  await waitForConnections();

  console.log('All connections closed gracefully');
  process.exit(0);
}

function waitForConnections() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (connections.size === 0) {
        clearInterval(checkInterval);
        resolve();
      } else {
        console.log(`Waiting for ${connections.size} connections...`);
      }
    }, 100);
  });
}
```

### Connection Draining with Timeout

```javascript
async function drainConnections(timeout = 30000) {
  isShuttingDown = true;

  return new Promise((resolve, reject) => {
    // Stop accepting new connections
    server.close(() => {
      console.log('Server closed');
      resolve();
    });

    // Set timeout to force close
    const forceCloseTimer = setTimeout(() => {
      console.log(`Timeout reached, destroying ${connections.size} active connections`);

      connections.forEach((socket) => {
        socket.destroy();
      });

      resolve();
    }, timeout);

    // Check if all connections closed naturally
    const checkInterval = setInterval(() => {
      if (connections.size === 0) {
        clearInterval(checkInterval);
        clearTimeout(forceCloseTimer);
        console.log('All connections closed gracefully');
        resolve();
      }
    }, 100);
  });
}
```

## Clustered Application Shutdown

### Master Process Coordination

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  const workers = new Map();

  // Track workers
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork();
    workers.set(worker.id, {
      worker,
      shuttingDown: false
    });
  }

  // Coordinate graceful shutdown
  async function masterShutdown() {
    console.log(`Shutting down ${workers.size} workers`);

    // Signal all workers to shutdown
    workers.forEach((info, id) => {
      info.shuttingDown = true;
      info.worker.send({ type: 'shutdown' });
    });

    // Wait for all workers to exit
    await waitForWorkers(30000);

    console.log('All workers exited');
    process.exit(0);
  }

  function waitForWorkers(timeout) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (workers.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('Timeout, forcing worker shutdown');
        workers.forEach((info) => {
          info.worker.kill('SIGKILL');
        });
        resolve();
      }, timeout);
    });
  }

  cluster.on('exit', (worker, code, signal) => {
    const info = workers.get(worker.id);
    if (info && info.shuttingDown) {
      console.log(`Worker ${worker.id} exited gracefully`);
    } else {
      console.log(`Worker ${worker.id} crashed unexpectedly`);
    }
    workers.delete(worker.id);
  });

  process.on('SIGTERM', masterShutdown);
  process.on('SIGINT', masterShutdown);
}
```

### Worker Process Shutdown

```javascript
else {
  // Worker process
  const connections = new Set();
  let isShuttingDown = false;

  const server = http.createServer((req, res) => {
    if (isShuttingDown) {
      res.writeHead(503, { 'Connection': 'close' });
      res.end('Shutting down\n');
      return;
    }

    // Normal request handling
    res.writeHead(200);
    res.end(`Worker ${cluster.worker.id}\n`);
  });

  server.on('connection', (socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  async function workerShutdown() {
    isShuttingDown = true;
    console.log(`Worker ${cluster.worker.id} shutting down`);

    // Close server
    await new Promise((resolve) => {
      server.close(resolve);
    });

    // Wait for connections with timeout
    const timeout = setTimeout(() => {
      connections.forEach(socket => socket.destroy());
    }, 10000);

    while (connections.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    clearTimeout(timeout);

    // Notify master
    if (process.send) {
      process.send({ type: 'shutdown-complete' });
    }

    process.exit(0);
  }

  // Listen for shutdown message from master
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      workerShutdown();
    }
  });

  // Also handle direct signals
  process.on('SIGTERM', workerShutdown);

  server.listen(8000);
}
```

## Resource Cleanup

### Database Connections

```javascript
const database = {
  pool: null,

  async close() {
    if (this.pool) {
      console.log('Closing database connection pool');

      // Wait for active queries to complete
      await this.pool.drain();

      // Close all connections
      await this.pool.clear();

      console.log('Database connections closed');
    }
  }
};

async function gracefulShutdown() {
  // 1. Stop accepting requests
  await drainConnections();

  // 2. Close database
  await database.close();

  // 3. Exit
  process.exit(0);
}
```

### Redis Connections

```javascript
const redis = {
  client: null,

  async close() {
    if (this.client) {
      console.log('Closing Redis connection');

      await new Promise((resolve) => {
        this.client.quit((err) => {
          if (err) console.error('Redis quit error:', err);
          resolve();
        });
      });

      console.log('Redis connection closed');
    }
  }
};
```

### File Handles

```javascript
const fileHandles = new Set();

function trackFileHandle(handle) {
  fileHandles.add(handle);

  handle.on('close', () => {
    fileHandles.delete(handle);
  });
}

async function closeFileHandles() {
  console.log(`Closing ${fileHandles.size} file handles`);

  const promises = Array.from(fileHandles).map(handle => {
    return new Promise((resolve) => {
      handle.close(resolve);
    });
  });

  await Promise.all(promises);
  console.log('All file handles closed');
}
```

### Timers and Intervals

```javascript
const timers = new Set();

function trackTimer(timer) {
  timers.add(timer);
}

function clearAllTimers() {
  console.log(`Clearing ${timers.size} timers`);

  timers.forEach((timer) => {
    clearTimeout(timer);
    clearInterval(timer);
  });

  timers.clear();
}

// Example usage
const timer = setInterval(() => {
  console.log('Periodic task');
}, 5000);

trackTimer(timer);

// In shutdown
async function gracefulShutdown() {
  clearAllTimers();
  // ... other cleanup
}
```

## Complete Shutdown Pattern

### Production-Ready Implementation

```javascript
const cluster = require('cluster');
const http = require('http');

const SHUTDOWN_TIMEOUT = 30000; // 30 seconds

class GracefulShutdownManager {
  constructor() {
    this.isShuttingDown = false;
    this.connections = new Set();
    this.resources = [];
  }

  /**
   * Register a resource for cleanup
   */
  registerResource(name, cleanupFn) {
    this.resources.push({ name, cleanupFn });
  }

  /**
   * Track HTTP connection
   */
  trackConnection(socket) {
    this.connections.add(socket);
    socket.on('close', () => this.connections.delete(socket));
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      console.log('Already shutting down');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\n=== Graceful Shutdown Started (${signal}) ===`);
    console.log(`Active connections: ${this.connections.size}`);
    console.log(`Resources to cleanup: ${this.resources.length}`);

    const startTime = Date.now();

    try {
      // 1. Stop accepting new connections
      await this.stopAcceptingConnections();

      // 2. Drain active connections
      await this.drainConnections();

      // 3. Cleanup resources
      await this.cleanupResources();

      const duration = Date.now() - startTime;
      console.log(`=== Graceful Shutdown Complete (${duration}ms) ===\n`);

      process.exit(0);

    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  async stopAcceptingConnections() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('✓ Server closed, no new connections accepted');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async drainConnections() {
    if (this.connections.size === 0) {
      console.log('✓ No active connections to drain');
      return;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();

      const timeout = setTimeout(() => {
        const remaining = this.connections.size;
        console.log(`⚠ Timeout reached, destroying ${remaining} connections`);
        this.connections.forEach(socket => socket.destroy());
        resolve();
      }, SHUTDOWN_TIMEOUT);

      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (this.connections.size === 0) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          console.log(`✓ All connections drained (${elapsed}ms)`);
          resolve();
        } else if (elapsed % 5000 === 0) {
          console.log(`  Waiting for ${this.connections.size} connections...`);
        }
      }, 100);
    });
  }

  async cleanupResources() {
    console.log('Cleaning up resources...');

    for (const { name, cleanupFn } of this.resources) {
      try {
        console.log(`  Cleaning up: ${name}`);
        await cleanupFn();
        console.log(`  ✓ ${name} cleaned up`);
      } catch (error) {
        console.error(`  ✗ Error cleaning up ${name}:`, error);
      }
    }

    console.log('✓ All resources cleaned up');
  }

  /**
   * Setup signal handlers
   */
  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT'];

    signals.forEach(signal => {
      process.on(signal, () => this.shutdown(signal));
    });
  }
}

// Usage
const shutdownManager = new GracefulShutdownManager();

const server = http.createServer((req, res) => {
  if (shutdownManager.isShuttingDown) {
    res.writeHead(503, { 'Connection': 'close' });
    res.end('Service Unavailable\n');
    return;
  }

  res.writeHead(200);
  res.end('OK\n');
});

server.on('connection', (socket) => {
  shutdownManager.trackConnection(socket);
});

shutdownManager.server = server;

// Register resources
shutdownManager.registerResource('database', async () => {
  // await database.close();
});

shutdownManager.registerResource('redis', async () => {
  // await redis.quit();
});

shutdownManager.registerResource('timers', async () => {
  // clearAllTimers();
});

// Setup signal handlers
shutdownManager.setupSignalHandlers();

server.listen(8000, () => {
  console.log('Server listening on port 8000');
  console.log('Press Ctrl+C for graceful shutdown');
});
```

## Testing Graceful Shutdown

### Manual Testing

```bash
# 1. Start server
node server.js

# 2. Make a slow request in another terminal
curl http://localhost:8000/slow &

# 3. Immediately send SIGTERM
kill -SIGTERM <pid>

# 4. Observe that request completes before shutdown
```

### Automated Testing

```javascript
const { spawn } = require('child_process');
const http = require('http');

async function testGracefulShutdown() {
  // Start server
  const server = spawn('node', ['server.js']);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Make request
  const req = http.get('http://localhost:8000/slow', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✓ Request completed:', data);
    });
  });

  // Send SIGTERM after small delay
  setTimeout(() => {
    console.log('Sending SIGTERM');
    server.kill('SIGTERM');
  }, 100);

  // Wait for server to exit
  server.on('exit', (code) => {
    console.log(`✓ Server exited with code ${code}`);
  });
}

testGracefulShutdown();
```

## Common Pitfalls

### 1. Not Setting Timeouts

```javascript
// ❌ Bad: Can hang forever
server.close(() => {
  process.exit(0);
});

// ✅ Good: Always set timeout
setTimeout(() => {
  console.log('Shutdown timeout, forcing exit');
  process.exit(1);
}, 30000);

server.close(() => {
  process.exit(0);
});
```

### 2. Forgetting to Close Resources

```javascript
// ❌ Bad: Database connections leak
process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});

// ✅ Good: Close all resources
process.on('SIGTERM', async () => {
  server.close();
  await database.close();
  await redis.quit();
  process.exit(0);
});
```

### 3. Not Handling Clustered Applications

```javascript
// ❌ Bad: Workers don't coordinate
cluster.fork(); // Each worker shuts down independently

// ✅ Good: Master coordinates shutdown
if (cluster.isMaster) {
  process.on('SIGTERM', async () => {
    // Coordinate worker shutdown
    await shutdownAllWorkers();
  });
}
```

## Summary

Graceful shutdown is essential for production applications:

1. **Handle signals** properly (SIGTERM, SIGINT)
2. **Stop accepting** new connections
3. **Drain** active connections with timeout
4. **Cleanup** all resources (DB, Redis, files)
5. **Coordinate** shutdown in clustered apps
6. **Test** shutdown procedures regularly

Benefits:
- Zero dropped requests
- Clean resource cleanup
- Better user experience
- Predictable deployments
- Production reliability
