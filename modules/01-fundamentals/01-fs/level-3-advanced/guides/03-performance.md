# Performance Optimization

## Introduction

This guide covers techniques for optimizing file system operations in Node.js, from choosing the right approach for your use case to implementing advanced caching and batching strategies.

## Part 1: Choosing the Right Approach

### Decision Tree

```
File Size?
├─ < 1MB → readFile() / writeFile()
├─ 1-100MB → Streams with default chunk size
├─ > 100MB → Streams with larger chunks
└─ > 1GB → Streams + line-by-line processing

Operation Type?
├─ One-time read → readFile()
├─ Multiple reads → File descriptor + caching
├─ Sequential processing → Streams
└─ Random access → File descriptors
```

### Benchmarking Example

```javascript
const fs = require('fs').promises;

async function benchmark(name, fn) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)}ms`);
}

// Compare approaches
await benchmark('readFile', async () => {
  await fs.readFile('10mb-file.txt');
});

await benchmark('Stream', async () => {
  const stream = fs.createReadStream('10mb-file.txt');
  for await (const chunk of stream) {
    // Process chunk
  }
});
```

## Part 2: Batching Operations

### Parallel File Operations

```javascript
// ❌ SLOW: Sequential
for (const file of files) {
  await fs.readFile(file);
}

// ✅ FAST: Parallel
await Promise.all(
  files.map(file => fs.readFile(file))
);

// ✅ BETTER: Parallel with concurrency limit
async function batchProcess(items, fn, concurrency = 5) {
  const results = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

await batchProcess(files, file => fs.readFile(file), 10);
```

### Batch Writes

```javascript
class BatchWriter {
  constructor(filepath, batchSize = 100) {
    this.filepath = filepath;
    this.batchSize = batchSize;
    this.buffer = [];
  }

  async write(data) {
    this.buffer.push(data);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const data = this.buffer.join('\n') + '\n';
    await fs.appendFile(this.filepath, data);
    this.buffer = [];
  }

  async close() {
    await this.flush();
  }
}

// Usage: 100x faster than individual writes
const writer = new BatchWriter('output.txt', 100);
for (let i = 0; i < 10000; i++) {
  await writer.write(`Line ${i}`);
}
await writer.close();
```

## Part 3: Caching Strategies

### Metadata Caching

```javascript
class FileCache {
  constructor(ttl = 60000) { // 60 second TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  async stat(filepath) {
    const cached = this.cache.get(filepath);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.stats;
    }

    const stats = await fs.stat(filepath);
    this.cache.set(filepath, {
      stats,
      timestamp: Date.now()
    });

    return stats;
  }

  invalidate(filepath) {
    this.cache.delete(filepath);
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const cache = new FileCache();
const stats1 = await cache.stat('file.txt'); // Hits filesystem
const stats2 = await cache.stat('file.txt'); // Returns cached
```

### Content Caching

```javascript
class FileContentCache {
  constructor(maxSize = 10 * 1024 * 1024) { // 10MB max
    this.cache = new Map();
    this.maxSize = maxSize;
    this.currentSize = 0;
  }

  async read(filepath) {
    if (this.cache.has(filepath)) {
      return this.cache.get(filepath);
    }

    const content = await fs.readFile(filepath);

    // Only cache if under size limit
    if (content.length <= this.maxSize - this.currentSize) {
      this.cache.set(filepath, content);
      this.currentSize += content.length;
    }

    return content;
  }

  evict(filepath) {
    const content = this.cache.get(filepath);
    if (content) {
      this.currentSize -= content.length;
      this.cache.delete(filepath);
    }
  }
}
```

## Part 4: Stream Optimization

### Optimal Chunk Sizes

```javascript
// Small files: default (64KB)
fs.createReadStream('small.txt');

// Large files: 1MB chunks
fs.createReadStream('large.txt', {
  highWaterMark: 1024 * 1024
});

// Very large sequential: 4MB chunks
fs.createReadStream('huge.txt', {
  highWaterMark: 4 * 1024 * 1024
});
```

### Stream Pooling

```javascript
class StreamPool {
  constructor(maxStreams = 10) {
    this.maxStreams = maxStreams;
    this.active = new Set();
    this.queue = [];
  }

  async createReadStream(filepath, options) {
    while (this.active.size >= this.maxStreams) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    const stream = fs.createReadStream(filepath, options);
    this.active.add(stream);

    stream.on('close', () => {
      this.active.delete(stream);
      const next = this.queue.shift();
      if (next) next();
    });

    return stream;
  }
}
```

## Part 5: Minimizing Syscalls

### Avoid Repeated Stats

```javascript
// ❌ BAD: Multiple stat calls
const stats = await fs.stat('file.txt');
if (stats.isFile()) {
  const size = stats.size;
  const stats2 = await fs.stat('file.txt'); // Redundant!
}

// ✅ GOOD: Reuse stats object
const stats = await fs.stat('file.txt');
if (stats.isFile()) {
  const size = stats.size;
  const modified = stats.mtime;
}
```

### Use withFileTypes

```javascript
// ❌ SLOW: Extra stat for each entry
const files = await fs.readdir('dir');
for (const file of files) {
  const stats = await fs.stat(path.join('dir', file));
  if (stats.isFile()) {
    // process
  }
}

// ✅ FAST: Type info included
const entries = await fs.readdir('dir', { withFileTypes: true });
for (const entry of entries) {
  if (entry.isFile()) {
    // process
  }
}
```

## Part 6: Memory Optimization

### Streaming vs Loading

```javascript
// ❌ BAD: Loads entire file (memory intensive)
async function countLines(filepath) {
  const content = await fs.readFile(filepath, 'utf8');
  return content.split('\n').length;
}

// ✅ GOOD: Streams line by line (memory efficient)
async function countLinesStreaming(filepath) {
  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    count++;
  }

  return count;
}
```

### Buffer Reuse

```javascript
// ❌ BAD: Creates new buffer every iteration
for (let i = 0; i < 1000; i++) {
  const buffer = Buffer.alloc(1024);
  await fd.read(buffer, 0, 1024, i * 1024);
}

// ✅ GOOD: Reuse buffer
const buffer = Buffer.alloc(1024);
for (let i = 0; i < 1000; i++) {
  await fd.read(buffer, 0, 1024, i * 1024);
  // Process buffer contents
}
```

## Part 7: Monitoring Performance

### Tracking File Operations

```javascript
class FileSystemMonitor {
  constructor() {
    this.metrics = {
      reads: 0,
      writes: 0,
      totalBytesRead: 0,
      totalBytesWritten: 0,
      errors: 0
    };
  }

  async readFile(filepath) {
    const start = Date.now();

    try {
      const content = await fs.readFile(filepath);
      this.metrics.reads++;
      this.metrics.totalBytesRead += content.length;
      return content;
    } catch (err) {
      this.metrics.errors++;
      throw err;
    } finally {
      console.log(`Read took ${Date.now() - start}ms`);
    }
  }

  getStats() {
    return {
      ...this.metrics,
      avgBytesPerRead: this.metrics.totalBytesRead / this.metrics.reads || 0
    };
  }
}
```

### Memory Usage Tracking

```javascript
function logMemoryUsage(label) {
  const used = process.memoryUsage();
  console.log(`${label}:`);
  console.log(`  Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(used.external / 1024 / 1024).toFixed(2)} MB`);
}

logMemoryUsage('Before processing');
await processLargeFile('huge.txt');
logMemoryUsage('After processing');
```

## Summary

### Quick Wins

1. **Use streams for files > 1MB**
2. **Batch operations with Promise.all()**
3. **Cache metadata when possible**
4. **Use withFileTypes: true**
5. **Limit concurrent operations**
6. **Choose appropriate chunk sizes**

### Performance Checklist

- [ ] Using streams for large files?
- [ ] Batching parallel operations?
- [ ] Caching frequently accessed data?
- [ ] Avoiding redundant stat() calls?
- [ ] Using appropriate buffer sizes?
- [ ] Monitoring memory usage?
- [ ] Reusing buffers when possible?
- [ ] Limiting concurrent file operations?

## Next Guide

Continue to [File Locking](./04-file-locking.md).
