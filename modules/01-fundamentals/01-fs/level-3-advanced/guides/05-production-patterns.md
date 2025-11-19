# Production-Ready Patterns

## Introduction

This guide covers battle-tested patterns for using file system operations in production environments, including error handling, retry logic, monitoring, and graceful degradation.

## Part 1: Robust Error Handling

### Comprehensive Error Handling

```javascript
async function robustReadFile(filepath, options = {}) {
  const { retries = 3, timeout = 5000 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await Promise.race([
        fs.readFile(filepath, 'utf8'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
    } catch (err) {
      const isLastAttempt = attempt === retries;

      // Different strategies for different errors
      switch (err.code) {
        case 'ENOENT':
          // File not found - no point retrying
          throw new Error(`File not found: ${filepath}`);

        case 'EACCES':
        case 'EPERM':
          // Permission error - no point retrying
          throw new Error(`Permission denied: ${filepath}`);

        case 'EMFILE':
        case 'ENFILE':
          // Too many open files - wait and retry
          if (!isLastAttempt) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw new Error('Too many open files');

        case 'EBUSY':
        case 'EAGAIN':
          // Resource busy - retry with backoff
          if (!isLastAttempt) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
          throw err;

        default:
          if (!isLastAttempt) {
            console.warn(`Read failed (attempt ${attempt}/${retries}):`, err.message);
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw err;
      }
    }
  }
}
```

### Error Classification

```javascript
class FileSystemError extends Error {
  constructor(message, code, filepath, originalError) {
    super(message);
    this.name = 'FileSystemError';
    this.code = code;
    this.filepath = filepath;
    this.originalError = originalError;
    this.isRetryable = this.determineRetryable(code);
  }

  determineRetryable(code) {
    const retryableCodes = ['EBUSY', 'EAGAIN', 'EMFILE', 'ENFILE', 'ETIMEDOUT'];
    return retryableCodes.includes(code);
  }

  static wrap(err, filepath) {
    return new FileSystemError(
      err.message,
      err.code,
      filepath,
      err
    );
  }
}

// Usage
try {
  await fs.readFile('file.txt');
} catch (err) {
  const fsError = FileSystemError.wrap(err, 'file.txt');

  if (fsError.isRetryable) {
    // Retry logic
  } else {
    // Handle non-retryable error
  }
}
```

## Part 2: Retry Strategies

### Exponential Backoff

```javascript
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry = () => {}
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries) break;

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      onRetry({ attempt: attempt + 1, delay, error: err });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const data = await withRetry(
  () => fs.readFile('flaky-file.txt', 'utf8'),
  {
    maxRetries: 5,
    onRetry: ({ attempt, delay, error }) => {
      console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
    }
  }
);
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failures++;

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}

// Usage
const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 });

try {
  const data = await breaker.execute(() => fs.readFile('unreliable.txt', 'utf8'));
} catch (err) {
  console.error('Operation failed:', err.message);
}
```

## Part 3: Graceful Degradation

### Fallback Strategies

```javascript
async function readConfigWithFallback(configPaths) {
  for (const configPath of configPaths) {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.warn(`Failed to read ${configPath}: ${err.message}`);
      continue;
    }
  }

  // All configs failed, return defaults
  console.warn('All config files failed, using defaults');
  return getDefaultConfig();
}

// Usage
const config = await readConfigWithFallback([
  '/etc/myapp/config.json',
  path.join(os.homedir(), '.myapp/config.json'),
  './config.json'
]);
```

### Degraded Mode Operation

```javascript
class FileService {
  constructor() {
    this.degraded = false;
    this.cache = new Map();
  }

  async readFile(filepath) {
    if (this.degraded) {
      // In degraded mode, return cached version if available
      if (this.cache.has(filepath)) {
        console.warn('Using cached version (degraded mode)');
        return this.cache.get(filepath);
      }
      throw new Error('Service degraded and no cache available');
    }

    try {
      const content = await fs.readFile(filepath, 'utf8');
      this.cache.set(filepath, content);
      return content;
    } catch (err) {
      if (this.cache.has(filepath)) {
        console.warn('Using cached version after read error');
        return this.cache.get(filepath);
      }
      throw err;
    }
  }

  enterDegradedMode() {
    console.warn('Entering degraded mode');
    this.degraded = true;
  }

  exitDegradedMode() {
    console.log('Exiting degraded mode');
    this.degraded = false;
  }
}
```

## Part 4: Monitoring and Logging

### Operation Metrics

```javascript
class FileMetrics {
  constructor() {
    this.metrics = {
      reads: { count: 0, bytes: 0, errors: 0, totalTime: 0 },
      writes: { count: 0, bytes: 0, errors: 0, totalTime: 0 }
    };
  }

  async trackRead(filepath, fn) {
    const start = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - start;

      this.metrics.reads.count++;
      this.metrics.reads.bytes += result.length;
      this.metrics.reads.totalTime += duration;

      if (duration > 1000) {
        console.warn(`Slow read: ${filepath} took ${duration}ms`);
      }

      return result;
    } catch (err) {
      this.metrics.reads.errors++;
      throw err;
    }
  }

  getStats() {
    const { reads, writes } = this.metrics;

    return {
      reads: {
        ...reads,
        avgTime: reads.count ? reads.totalTime / reads.count : 0,
        avgBytes: reads.count ? reads.bytes / reads.count : 0,
        errorRate: reads.count ? reads.errors / reads.count : 0
      },
      writes: {
        ...writes,
        avgTime: writes.count ? writes.totalTime / writes.count : 0,
        avgBytes: writes.count ? writes.bytes / writes.count : 0,
        errorRate: writes.count ? writes.errors / writes.count : 0
      }
    };
  }
}

// Usage
const metrics = new FileMetrics();
const data = await metrics.trackRead('file.txt', () =>
  fs.readFile('file.txt', 'utf8')
);

// Periodically log metrics
setInterval(() => {
  console.log('File System Metrics:', metrics.getStats());
}, 60000);
```

### Structured Logging

```javascript
class FileLogger {
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      pid: process.pid
    };

    console.log(JSON.stringify(entry));
  }

  async logOperation(operation, filepath, fn) {
    this.log('info', `${operation} started`, { operation, filepath });

    const start = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - start;

      this.log('info', `${operation} completed`, {
        operation,
        filepath,
        duration,
        success: true
      });

      return result;
    } catch (err) {
      const duration = Date.now() - start;

      this.log('error', `${operation} failed`, {
        operation,
        filepath,
        duration,
        error: err.message,
        errorCode: err.code,
        success: false
      });

      throw err;
    }
  }
}

// Usage
const logger = new FileLogger();
const data = await logger.logOperation('read', 'config.json', () =>
  fs.readFile('config.json', 'utf8')
);
```

## Part 5: Health Checks

### File System Health Check

```javascript
class FileSystemHealthCheck {
  constructor(testDir = '/tmp') {
    this.testDir = testDir;
    this.healthy = true;
    this.lastCheck = null;
  }

  async check() {
    const testFile = path.join(this.testDir, `.health-check-${process.pid}`);

    try {
      // Test write
      await fs.writeFile(testFile, 'health check');

      // Test read
      const content = await fs.readFile(testFile, 'utf8');

      if (content !== 'health check') {
        throw new Error('Read/write mismatch');
      }

      // Test delete
      await fs.unlink(testFile);

      this.healthy = true;
      this.lastCheck = new Date();

      return { healthy: true, message: 'File system operational' };
    } catch (err) {
      this.healthy = false;
      this.lastCheck = new Date();

      return {
        healthy: false,
        message: `File system error: ${err.message}`,
        error: err.code
      };
    }
  }

  async monitor(interval = 60000) {
    const runCheck = async () => {
      const result = await this.check();

      if (!result.healthy) {
        console.error('Health check failed:', result);
      }
    };

    // Initial check
    await runCheck();

    // Periodic checks
    setInterval(runCheck, interval);
  }
}

// Usage
const healthCheck = new FileSystemHealthCheck();
await healthCheck.monitor(60000); // Check every minute
```

## Part 6: Cleanup and Resource Management

### Automatic Cleanup

```javascript
class ManagedFileHandle {
  constructor(filepath, mode) {
    this.filepath = filepath;
    this.mode = mode;
    this.fd = null;
  }

  async open() {
    this.fd = await fs.open(this.filepath, this.mode);
    return this;
  }

  async read(buffer, offset, length, position) {
    if (!this.fd) throw new Error('File not open');
    return this.fd.read(buffer, offset, length, position);
  }

  async write(buffer, offset, length, position) {
    if (!this.fd) throw new Error('File not open');
    return this.fd.write(buffer, offset, length, position);
  }

  async close() {
    if (this.fd) {
      await this.fd.close();
      this.fd = null;
    }
  }

  [Symbol.asyncDispose || 'asyncDispose']() {
    return this.close();
  }
}

// Usage with explicit disposal
const file = await new ManagedFileHandle('data.bin', 'r').open();
try {
  const buffer = Buffer.alloc(1024);
  await file.read(buffer, 0, 1024, 0);
} finally {
  await file.close();
}
```

### Process Exit Cleanup

```javascript
class FileSystemCleanup {
  constructor() {
    this.tempFiles = new Set();
    this.fileHandles = new Set();

    this.setupCleanup();
  }

  setupCleanup() {
    const cleanup = async () => {
      console.log('Cleaning up file system resources...');

      // Close all file handles
      for (const fd of this.fileHandles) {
        try {
          await fd.close();
        } catch (err) {
          console.error('Error closing file handle:', err.message);
        }
      }

      // Delete temp files
      for (const filepath of this.tempFiles) {
        try {
          await fs.unlink(filepath);
        } catch (err) {
          console.error(`Error deleting ${filepath}:`, err.message);
        }
      }

      console.log('Cleanup complete');
    };

    process.on('exit', () => {
      // Note: async operations don't work in 'exit' handler
      console.log('Process exiting');
    });

    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });
  }

  addTempFile(filepath) {
    this.tempFiles.add(filepath);
  }

  addFileHandle(fd) {
    this.fileHandles.add(fd);
  }
}

// Global cleanup manager
const cleanup = new FileSystemCleanup();
```

## Summary

### Production Checklist

- [ ] Comprehensive error handling
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker for failing operations
- [ ] Graceful degradation strategies
- [ ] Metrics and monitoring
- [ ] Structured logging
- [ ] Health checks
- [ ] Resource cleanup on exit
- [ ] Timeout handling
- [ ] Rate limiting

### Key Takeaways

1. **Always handle errors comprehensively**
2. **Implement retry logic for transient failures**
3. **Use circuit breakers to prevent cascade failures**
4. **Monitor and log all operations**
5. **Implement health checks**
6. **Clean up resources on exit**
7. **Have fallback strategies**

## Next Guide

Continue to [Security](./06-security.md).
