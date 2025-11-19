# Buffer Pooling

Reusing buffers to optimize performance and reduce memory allocation overhead.

## Why Buffer Pooling?

Benefits:
- ✅ Reduces GC pressure
- ✅ Improves performance
- ✅ Predictable memory usage
- ✅ Faster allocation

When to use:
- High-frequency buffer operations
- Network servers (packets)
- Stream processing
- Real-time applications

## Simple Buffer Pool

```javascript
class BufferPool {
  constructor(bufferSize, poolSize = 10) {
    this.bufferSize = bufferSize;
    this.pool = [];

    // Pre-allocate buffers
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(Buffer.allocUnsafe(bufferSize));
    }
  }

  acquire() {
    if (this.pool.length > 0) {
      const buf = this.pool.pop();
      buf.fill(0); // Clear before use
      return buf;
    }
    // Pool exhausted, allocate new
    return Buffer.allocUnsafe(this.bufferSize);
  }

  release(buffer) {
    if (buffer.length === this.bufferSize) {
      this.pool.push(buffer);
    }
  }
}

// Usage
const pool = new BufferPool(1024, 50);

function processMessage(data) {
  const buf = pool.acquire();
  try {
    // Use buffer
    data.copy(buf);
    return doWork(buf);
  } finally {
    pool.release(buf); // Always release
  }
}
```

## Advanced Pool with Metrics

```javascript
class ManagedBufferPool {
  constructor(bufferSize, maxPoolSize = 100) {
    this.bufferSize = bufferSize;
    this.maxPoolSize = maxPoolSize;
    this.pool = [];

    // Metrics
    this.stats = {
      acquired: 0,
      released: 0,
      created: 0,
      hits: 0,
      misses: 0
    };
  }

  acquire() {
    this.stats.acquired++;

    if (this.pool.length > 0) {
      this.stats.hits++;
      return this.pool.pop();
    }

    this.stats.misses++;
    this.stats.created++;
    return Buffer.allocUnsafe(this.bufferSize);
  }

  release(buffer) {
    if (buffer.length !== this.bufferSize) {
      throw new Error('Buffer size mismatch');
    }

    this.stats.released++;

    if (this.pool.length < this.maxPoolSize) {
      buffer.fill(0);
      this.pool.push(buffer);
    }
    // If pool is full, let buffer be GC'd
  }

  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      hitRate: this.stats.hits / this.stats.acquired
    };
  }
}
```

## Best Practices

### 1. Always Release Buffers

```javascript
// ✅ Use try-finally
function process(data) {
  const buf = pool.acquire();
  try {
    // Process
    return doWork(buf);
  } finally {
    pool.release(buf);
  }
}
```

### 2. Clear Buffers Before Release

```javascript
// ✅ Prevent data leakage
release(buffer) {
  buffer.fill(0); // Clear sensitive data
  this.pool.push(buffer);
}
```

### 3. Set Pool Size Limits

```javascript
// ✅ Prevent unbounded growth
if (this.pool.length < this.maxPoolSize) {
  this.pool.push(buffer);
}
```

## Summary

- Pool buffers in high-frequency scenarios
- Always clear before reuse
- Set maximum pool size
- Track metrics for tuning
- Use try-finally for release
