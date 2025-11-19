# File Locking and Atomic Operations

## Introduction

File locking prevents multiple processes from simultaneously modifying the same file, which can lead to data corruption. This guide covers file locking strategies, atomic operations, and safe concurrent file access patterns in Node.js.

## Part 1: Understanding the Problem

### The Race Condition

```javascript
// ❌ DANGEROUS: Race condition
const data = JSON.parse(await fs.readFile('counter.json', 'utf8'));
data.count++;
await fs.writeFile('counter.json', JSON.stringify(data));

// If two processes run this simultaneously:
// Process A reads: { count: 10 }
// Process B reads: { count: 10 }
// Process A writes: { count: 11 }
// Process B writes: { count: 11 }
// Result: Should be 12, but it's 11!
```

### Why Node.js Doesn't Have Built-in Locking

Node.js file system API doesn't provide cross-process locking (unlike some other languages). We need to implement our own locking mechanisms.

## Part 2: Lock File Pattern

### Basic Lock File

```javascript
class FileLock {
  constructor(filepath) {
    this.filepath = filepath;
    this.lockPath = `${filepath}.lock`;
  }

  async acquire(timeout = 5000) {
    const startTime = Date.now();

    while (true) {
      try {
        // Try to create lock file (exclusive)
        await fs.writeFile(this.lockPath, String(process.pid), { flag: 'wx' });
        return; // Success!
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;

        // Lock exists, check if stale
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeout) {
          throw new Error('Lock acquisition timeout');
        }

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async release() {
    try {
      await fs.unlink(this.lockPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}

// Usage
const lock = new FileLock('data.json');
await lock.acquire();
try {
  // Perform file operations
  const data = JSON.parse(await fs.readFile('data.json', 'utf8'));
  data.count++;
  await fs.writeFile('data.json', JSON.stringify(data));
} finally {
  await lock.release();
}
```

### Advanced Lock with Stale Detection

```javascript
class RobustFileLock {
  constructor(filepath, staleTimeout = 30000) {
    this.filepath = filepath;
    this.lockPath = `${filepath}.lock`;
    this.staleTimeout = staleTimeout;
  }

  async acquire(timeout = 5000) {
    const startTime = Date.now();

    while (true) {
      try {
        await fs.writeFile(
          this.lockPath,
          JSON.stringify({
            pid: process.pid,
            timestamp: Date.now()
          }),
          { flag: 'wx' }
        );
        return;
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;

        // Check if lock is stale
        try {
          const lockData = JSON.parse(await fs.readFile(this.lockPath, 'utf8'));
          const lockAge = Date.now() - lockData.timestamp;

          if (lockAge > this.staleTimeout) {
            console.warn(`Removing stale lock (age: ${lockAge}ms)`);
            await fs.unlink(this.lockPath);
            continue; // Try again
          }
        } catch {
          // Lock file corrupted, remove it
          try {
            await fs.unlink(this.lockPath);
          } catch {}
          continue;
        }

        // Check timeout
        if (Date.now() - startTime >= timeout) {
          throw new Error('Lock acquisition timeout');
        }

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async release() {
    try {
      await fs.unlink(this.lockPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}
```

## Part 3: Atomic Operations

### Atomic Write with Rename

```javascript
async function atomicWriteFile(filepath, data) {
  const tmpPath = `${filepath}.tmp.${process.pid}`;

  try {
    // Write to temporary file
    await fs.writeFile(tmpPath, data);

    // Atomic rename (on most systems)
    await fs.rename(tmpPath, filepath);
  } catch (err) {
    // Clean up temp file on error
    try {
      await fs.unlink(tmpPath);
    } catch {}
    throw err;
  }
}

// Usage
await atomicWriteFile('config.json', JSON.stringify(config));
// Either the write completes fully or not at all (no partial writes)
```

### Atomic Append

```javascript
async function atomicAppend(filepath, line) {
  // appendFile is atomic for single writes on most systems
  await fs.appendFile(filepath, line + '\n');
}
```

## Part 4: Coordinated File Access

### Queue-Based Access Control

```javascript
class FileAccessQueue {
  constructor(filepath) {
    this.filepath = filepath;
    this.queue = [];
    this.processing = false;
  }

  async enqueue(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { operation, resolve, reject } = this.queue.shift();

      try {
        const result = await operation();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }

    this.processing = false;
  }

  async read() {
    return this.enqueue(async () => {
      return fs.readFile(this.filepath, 'utf8');
    });
  }

  async write(data) {
    return this.enqueue(async () => {
      await atomicWriteFile(this.filepath, data);
    });
  }

  async update(updateFn) {
    return this.enqueue(async () => {
      const content = await fs.readFile(this.filepath, 'utf8');
      const data = JSON.parse(content);
      const updated = await updateFn(data);
      await atomicWriteFile(this.filepath, JSON.stringify(updated, null, 2));
      return updated;
    });
  }
}

// Usage
const queue = new FileAccessQueue('data.json');

// Multiple processes can safely access the file
await queue.update(data => {
  data.count++;
  return data;
});
```

## Part 5: Database-Style Locking

### Read-Write Lock

```javascript
class ReadWriteLock {
  constructor(filepath) {
    this.filepath = filepath;
    this.readers = 0;
    this.writer = false;
    this.writeQueue = [];
    this.readQueue = [];
  }

  async acquireRead() {
    while (this.writer || this.writeQueue.length > 0) {
      await new Promise(resolve => this.readQueue.push(resolve));
    }

    this.readers++;
  }

  async releaseRead() {
    this.readers--;

    if (this.readers === 0 && this.writeQueue.length > 0) {
      const resolve = this.writeQueue.shift();
      resolve();
    }
  }

  async acquireWrite() {
    while (this.writer || this.readers > 0) {
      await new Promise(resolve => this.writeQueue.push(resolve));
    }

    this.writer = true;
  }

  async releaseWrite() {
    this.writer = false;

    // Prefer writers
    if (this.writeQueue.length > 0) {
      const resolve = this.writeQueue.shift();
      resolve();
    } else {
      // Release all waiting readers
      while (this.readQueue.length > 0) {
        const resolve = this.readQueue.shift();
        resolve();
      }
    }
  }

  async read(fn) {
    await this.acquireRead();
    try {
      return await fn();
    } finally {
      await this.releaseRead();
    }
  }

  async write(fn) {
    await this.acquireWrite();
    try {
      return await fn();
    } finally {
      await this.releaseWrite();
    }
  }
}

// Usage
const lock = new ReadWriteLock('data.json');

// Multiple readers can access simultaneously
await lock.read(async () => {
  const data = await fs.readFile('data.json', 'utf8');
  console.log(data);
});

// Writers get exclusive access
await lock.write(async () => {
  await fs.writeFile('data.json', '{"count": 42}');
});
```

## Part 6: Practical Patterns

### Pattern 1: Safe Counter Increment

```javascript
async function incrementCounter(filepath) {
  const lock = new FileLock(filepath);

  await lock.acquire();
  try {
    let count = 0;

    try {
      const data = await fs.readFile(filepath, 'utf8');
      count = parseInt(data, 10) || 0;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    count++;
    await atomicWriteFile(filepath, String(count));

    return count;
  } finally {
    await lock.release();
  }
}
```

### Pattern 2: Transaction-Like Updates

```javascript
class FileTransaction {
  constructor(filepath) {
    this.filepath = filepath;
    this.lock = new FileLock(filepath);
  }

  async execute(updateFn) {
    await this.lock.acquire();

    try {
      // Read current state
      let data = {};
      try {
        const content = await fs.readFile(this.filepath, 'utf8');
        data = JSON.parse(content);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }

      // Apply updates
      const updated = await updateFn(data);

      // Write atomically
      await atomicWriteFile(this.filepath, JSON.stringify(updated, null, 2));

      return updated;
    } finally {
      await this.lock.release();
    }
  }
}

// Usage
const transaction = new FileTransaction('accounts.json');

await transaction.execute(async (accounts) => {
  accounts.alice = (accounts.alice || 0) + 100;
  accounts.bob = (accounts.bob || 0) - 100;
  return accounts;
});
```

### Pattern 3: Log File with Rotation

```javascript
class LockedLogFile {
  constructor(filepath, maxSize = 10 * 1024 * 1024) {
    this.filepath = filepath;
    this.maxSize = maxSize;
    this.lock = new FileLock(filepath);
  }

  async append(message) {
    await this.lock.acquire();

    try {
      const line = `${new Date().toISOString()} ${message}\n`;

      // Check if rotation needed
      try {
        const stats = await fs.stat(this.filepath);
        if (stats.size + line.length > this.maxSize) {
          await this.rotate();
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }

      // Atomic append
      await fs.appendFile(this.filepath, line);
    } finally {
      await this.lock.release();
    }
  }

  async rotate() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const archivePath = `${this.filepath}.${timestamp}`;

    await fs.rename(this.filepath, archivePath);
  }
}

// Usage - safe from multiple processes
const log = new LockedLogFile('app.log');
await log.append('Application started');
```

## Summary

### Key Takeaways

1. **Use lock files** for cross-process synchronization
2. **Detect and remove stale locks** with timestamps
3. **Use atomic rename** for safe file writes
4. **Implement timeout** to avoid indefinite waiting
5. **Always release locks** in finally blocks
6. **Consider lock granularity** (file vs directory vs operation)

### When to Use Locking

- ✅ Multiple processes accessing same file
- ✅ Critical data updates (counters, accounts)
- ✅ Configuration files shared across processes
- ✅ Log file rotation

### When NOT to Use Locking

- ❌ Single-process applications
- ❌ Read-only operations
- ❌ Immutable files
- ❌ When database would be better choice

## Next Guide

Continue to [Production Patterns](./05-production-patterns.md).
