# Debugging Worker Threads

## Why Debugging Workers is Different

Worker threads run in isolated contexts, making debugging more challenging than single-threaded code. This guide covers strategies and tools for effective worker thread debugging.

## Debugging Strategies

### 1. Console Logging

Basic but effective:

```javascript
// main.js
const { Worker } = require('worker_threads');

const worker = new Worker('./worker.js');

console.log('[MAIN] Worker created');

worker.on('message', (msg) => {
  console.log('[MAIN] Received:', msg);
});

worker.postMessage({ data: 'test' });
```

```javascript
// worker.js
const { parentPort } = require('worker_threads');

console.log('[WORKER] Worker started');

parentPort.on('message', (msg) => {
  console.log('[WORKER] Received:', msg);
  parentPort.postMessage({ processed: msg.data });
});
```

**Enhanced Logging:**

```javascript
function logWithContext(role, message, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${role}]`, message, ...args);
}

// Usage
logWithContext('MAIN', 'Starting worker pool');
logWithContext('WORKER-1', 'Processing task', taskId);
```

### 2. Using Node.js Inspector

Debug workers with Chrome DevTools:

```javascript
// Start with inspect flag
node --inspect-brk main.js

// Or programmatically
const { Worker } = require('worker_threads');

const worker = new Worker('./worker.js', {
  execArgv: ['--inspect-brk=9230'] // Debug port
});
```

**Steps:**
1. Run `node --inspect-brk main.js`
2. Open `chrome://inspect` in Chrome
3. Click "inspect" on your process
4. Set breakpoints in DevTools
5. Step through code

### 3. Worker-Specific Debugging

Enable debugging for specific workers:

```javascript
class DebuggableWorkerPool {
  constructor(workerScript, poolSize, debug = false) {
    this.debug = debug;
    this.workers = [];

    for (let i = 0; i < poolSize; i++) {
      const execArgv = debug ? [`--inspect=${9229 + i}`] : [];

      const worker = new Worker(workerScript, { execArgv });

      if (debug) {
        console.log(`Worker ${i} debugging on port ${9229 + i}`);
      }

      this.workers.push(worker);
    }
  }
}

// Debug mode
const pool = new DebuggableWorkerPool('./worker.js', 4, true);
```

## Debugging Tools

### 1. Message Tracing

Track all messages between threads:

```javascript
class MessageTracer {
  constructor() {
    this.messages = [];
  }

  trace(direction, from, to, message) {
    const entry = {
      timestamp: Date.now(),
      direction, // 'SEND' or 'RECEIVE'
      from,
      to,
      message: JSON.parse(JSON.stringify(message)),
      stack: new Error().stack
    };

    this.messages.push(entry);
  }

  print() {
    this.messages.forEach((entry, i) => {
      console.log(`${i}. [${entry.timestamp}] ${entry.from} -> ${entry.to}:`, entry.message);
    });
  }

  save(filename) {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(this.messages, null, 2));
  }
}

// Usage in main thread
const tracer = new MessageTracer();

worker.postMessage = new Proxy(worker.postMessage, {
  apply(target, thisArg, args) {
    tracer.trace('SEND', 'MAIN', 'WORKER', args[0]);
    return Reflect.apply(target, thisArg, args);
  }
});

worker.on('message', (msg) => {
  tracer.trace('RECEIVE', 'WORKER', 'MAIN', msg);
  // Handle message
});

// Later
tracer.print();
tracer.save('message-trace.json');
```

### 2. Worker State Inspector

Monitor worker state:

```javascript
class WorkerInspector {
  constructor(worker, id) {
    this.worker = worker;
    this.id = id;
    this.state = {
      created: Date.now(),
      messagesReceived: 0,
      messagesSent: 0,
      errors: [],
      currentTask: null,
      status: 'idle'
    };

    this.attachListeners();
  }

  attachListeners() {
    const originalPostMessage = this.worker.postMessage.bind(this.worker);

    this.worker.postMessage = (msg) => {
      this.state.messagesSent++;
      this.state.currentTask = msg;
      this.state.status = 'busy';
      originalPostMessage(msg);
    };

    this.worker.on('message', () => {
      this.state.messagesReceived++;
      this.state.currentTask = null;
      this.state.status = 'idle';
    });

    this.worker.on('error', (err) => {
      this.state.errors.push({
        timestamp: Date.now(),
        error: err.message,
        stack: err.stack
      });
    });
  }

  getState() {
    return {
      id: this.id,
      ...this.state,
      uptime: Date.now() - this.state.created
    };
  }

  printState() {
    console.log(`Worker ${this.id}:`, JSON.stringify(this.getState(), null, 2));
  }
}

// Usage
const inspector = new WorkerInspector(worker, 0);

setInterval(() => {
  inspector.printState();
}, 5000);
```

### 3. Performance Profiling

Profile worker performance:

```javascript
class WorkerProfiler {
  constructor() {
    this.profiles = new Map();
  }

  start(taskId) {
    this.profiles.set(taskId, {
      start: performance.now(),
      checkpoints: []
    });
  }

  checkpoint(taskId, name) {
    const profile = this.profiles.get(taskId);
    if (profile) {
      profile.checkpoints.push({
        name,
        time: performance.now() - profile.start
      });
    }
  }

  end(taskId) {
    const profile = this.profiles.get(taskId);
    if (profile) {
      profile.end = performance.now();
      profile.duration = profile.end - profile.start;
      return profile;
    }
  }

  getReport(taskId) {
    const profile = this.profiles.get(taskId);
    if (!profile) return null;

    return {
      duration: profile.duration,
      checkpoints: profile.checkpoints.map((cp, i) => ({
        name: cp.name,
        time: cp.time,
        delta: i > 0 ? cp.time - profile.checkpoints[i - 1].time : cp.time
      }))
    };
  }
}

// Usage in worker
const profiler = new WorkerProfiler();

parentPort.on('message', (msg) => {
  profiler.start(msg.taskId);

  profiler.checkpoint(msg.taskId, 'parse-input');
  const parsed = parseInput(msg.data);

  profiler.checkpoint(msg.taskId, 'process');
  const result = process(parsed);

  profiler.checkpoint(msg.taskId, 'serialize');
  const serialized = serialize(result);

  profiler.end(msg.taskId);

  parentPort.postMessage({
    result: serialized,
    profile: profiler.getReport(msg.taskId)
  });
});
```

## Common Debugging Scenarios

### Scenario 1: Worker Not Responding

```javascript
function createWorkerWithTimeout(workerFile, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerFile);

    const timer = setTimeout(() => {
      console.error('Worker creation timeout');
      worker.terminate();
      reject(new Error('Worker timeout'));
    }, timeout);

    worker.on('online', () => {
      clearTimeout(timer);
      console.log('Worker came online');
      resolve(worker);
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      console.error('Worker error:', err);
      reject(err);
    });
  });
}

// Usage
try {
  const worker = await createWorkerWithTimeout('./worker.js', 3000);
  console.log('Worker ready');
} catch (err) {
  console.error('Failed to create worker:', err);
}
```

### Scenario 2: Memory Leak Detection

```javascript
class MemoryLeakDetector {
  constructor(worker, threshold = 100 * 1024 * 1024) { // 100MB
    this.worker = worker;
    this.threshold = threshold;
    this.samples = [];

    this.startMonitoring();
  }

  startMonitoring() {
    this.interval = setInterval(() => {
      this.worker.postMessage({ type: 'MEMORY_REPORT' });
    }, 1000);

    this.worker.on('message', (msg) => {
      if (msg.type === 'MEMORY_REPORT') {
        this.samples.push({
          timestamp: Date.now(),
          heapUsed: msg.memory.heapUsed
        });

        if (this.samples.length > 10) {
          this.checkForLeak();
        }
      }
    });
  }

  checkForLeak() {
    // Check if memory is consistently growing
    const recent = this.samples.slice(-10);
    const growing = recent.every((sample, i) => {
      return i === 0 || sample.heapUsed > recent[i - 1].heapUsed;
    });

    if (growing && recent[recent.length - 1].heapUsed > this.threshold) {
      console.warn('⚠️  MEMORY LEAK DETECTED');
      console.warn('Memory grew from', recent[0].heapUsed, 'to', recent[recent.length - 1].heapUsed);

      // Take heap snapshot
      this.worker.postMessage({ type: 'HEAP_SNAPSHOT' });
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

// In worker
parentPort.on('message', (msg) => {
  if (msg.type === 'MEMORY_REPORT') {
    parentPort.postMessage({
      type: 'MEMORY_REPORT',
      memory: process.memoryUsage()
    });
  }
});
```

### Scenario 3: Deadlock Detection

```javascript
class DeadlockDetector {
  constructor(pool, timeout = 10000) {
    this.pool = pool;
    this.timeout = timeout;
    this.taskTimestamps = new Map();

    this.startMonitoring();
  }

  trackTask(taskId) {
    this.taskTimestamps.set(taskId, Date.now());
  }

  completeTask(taskId) {
    this.taskTimestamps.delete(taskId);
  }

  startMonitoring() {
    this.interval = setInterval(() => {
      const now = Date.now();

      for (const [taskId, timestamp] of this.taskTimestamps) {
        if (now - timestamp > this.timeout) {
          console.error('⚠️  POTENTIAL DEADLOCK DETECTED');
          console.error(`Task ${taskId} has been running for ${now - timestamp}ms`);

          // Get pool state
          console.error('Pool state:', this.pool.getStats());

          // Alert or take action
          this.handleDeadlock(taskId);
        }
      }
    }, 1000);
  }

  handleDeadlock(taskId) {
    // Options:
    // 1. Terminate stuck worker
    // 2. Restart pool
    // 3. Alert monitoring system
    // 4. Dump debug information
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
```

## Debugging Best Practices

### 1. Structured Logging

```javascript
// Define log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(level = LOG_LEVELS.INFO) {
    this.level = level;
  }

  log(level, role, message, ...args) {
    if (level <= this.level) {
      const levelName = Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level);
      console.log(`[${levelName}] [${role}]`, message, ...args);
    }
  }

  error(role, message, ...args) {
    this.log(LOG_LEVELS.ERROR, role, message, ...args);
  }

  warn(role, message, ...args) {
    this.log(LOG_LEVELS.WARN, role, message, ...args);
  }

  info(role, message, ...args) {
    this.log(LOG_LEVELS.INFO, role, message, ...args);
  }

  debug(role, message, ...args) {
    this.log(LOG_LEVELS.DEBUG, role, message, ...args);
  }
}

// Set level from environment
const logLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;
const logger = new Logger(logLevel);

// Usage
logger.debug('WORKER-1', 'Processing task', taskId);
logger.info('MAIN', 'Pool created');
logger.error('WORKER-2', 'Task failed', error);
```

### 2. Error Context

Provide rich error context:

```javascript
class WorkerError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'WorkerError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

// Usage in worker
parentPort.on('message', (msg) => {
  try {
    processTask(msg);
  } catch (err) {
    const workerError = new WorkerError('Task processing failed', {
      taskId: msg.id,
      taskData: msg.data,
      workerId: process.pid,
      originalError: err.message
    });

    parentPort.postMessage({
      type: 'error',
      error: workerError.toJSON()
    });
  }
});
```

### 3. Reproducible Test Cases

Create minimal reproducible examples:

```javascript
// debug-case.js
const { Worker } = require('worker_threads');

// Minimal reproduction of the issue
async function reproduceIssue() {
  const worker = new Worker('./problematic-worker.js');

  console.log('Step 1: Creating worker');

  worker.on('online', () => {
    console.log('Step 2: Worker online');
  });

  worker.on('message', (msg) => {
    console.log('Step 3: Received message:', msg);
  });

  worker.on('error', (err) => {
    console.error('ERROR:', err);
    console.error('Stack:', err.stack);
  });

  console.log('Step 4: Sending message');
  worker.postMessage({ data: 'test' });

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Step 5: Complete');
  await worker.terminate();
}

reproduceIssue().catch(console.error);
```

## Key Takeaways

1. **Use structured logging** - Makes debugging much easier
2. **Enable inspector when needed** - Chrome DevTools are powerful
3. **Track message flow** - Message tracing helps understand communication
4. **Monitor resource usage** - Detect leaks and performance issues early
5. **Create reproducible cases** - Minimal examples help isolate issues
6. **Add timeouts** - Prevent hanging indefinitely
7. **Rich error context** - Include all relevant information in errors

## Next Steps

With debugging skills mastered, learn about [production deployment](./06-production-patterns.md) strategies for worker threads.
