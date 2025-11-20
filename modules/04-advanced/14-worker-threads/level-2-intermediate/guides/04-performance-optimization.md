# Performance Optimization in Worker Threads

## Understanding Worker Thread Performance

Worker threads can dramatically improve performance for CPU-intensive tasks, but only when used correctly. This guide covers optimization strategies and performance patterns.

## Performance Principles

### 1. Worker Creation Overhead

Creating a worker is expensive:

```javascript
const { performance } = require('perf_hooks');

const start = performance.now();
const worker = new Worker('./worker.js');
const end = performance.now();

console.log(`Worker creation: ${end - start}ms`);
// Typically 10-50ms depending on system
```

**Impact:**
- Creating 100 workers: 1-5 seconds
- For short tasks, overhead exceeds benefit

**Solution: Worker Pool**
```javascript
// ❌ Bad: Create new worker each time
async function process(data) {
  const worker = new Worker('./worker.js');
  const result = await execute(worker, data);
  await worker.terminate();
  return result;
}

// ✅ Good: Reuse workers from pool
const pool = new WorkerPool('./worker.js', 4);
async function process(data) {
  return pool.execute(data);
}
```

### 2. Message Passing Overhead

Structured clone has overhead:

```javascript
// Test message passing cost
const largeObject = {
  data: new Array(100000).fill({ value: 42 })
};

const start = performance.now();
worker.postMessage(largeObject);
const end = performance.now();

console.log(`Message passing: ${end - start}ms`);
// Larger objects = more time
```

**Optimization Strategies:**

#### Strategy 1: Use Transferables for Large Data
```javascript
// Clone (slow for large data)
const buffer = new ArrayBuffer(100 * 1024 * 1024); // 100MB
worker.postMessage(buffer); // ~100ms

// Transfer (fast, constant time)
worker.postMessage(buffer, [buffer]); // <1ms
```

#### Strategy 2: Send Only Necessary Data
```javascript
// ❌ Bad: Send entire object
worker.postMessage({
  data: largeDataset,
  metadata: { ... },
  config: { ... },
  unused: { ... } // Not needed!
});

// ✅ Good: Send only what's needed
worker.postMessage({
  data: largeDataset,
  config: { timeout: 5000 }
});
```

#### Strategy 3: Batch Messages
```javascript
// ❌ Bad: Many small messages
data.forEach(item => {
  worker.postMessage(item);
});

// ✅ Good: Batch messages
const batchSize = 100;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  worker.postMessage(batch);
}
```

### 3. Task Granularity

Tasks should be appropriately sized:

```javascript
// ❌ Too small: Overhead exceeds benefit
for (let i = 0; i < 1000000; i++) {
  pool.execute(i); // Each task processes 1 item
}
// Overhead: Creating 1M tasks, 1M message passes

// ✅ Right size: Amortize overhead
const batchSize = 1000;
const tasks = [];
for (let i = 0; i < 1000000; i += batchSize) {
  tasks.push(pool.execute(data.slice(i, i + batchSize)));
}
// Only 1000 tasks, much less overhead
```

**Rule of Thumb:**
- Task should take at least 10-50ms
- If faster, batch multiple items per task

## Benchmarking Workers

### Basic Benchmark

```javascript
const { performance } = require('perf_hooks');

async function benchmark(name, fn, iterations = 10) {
  const times = [];

  // Warmup
  await fn();

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`${name}:`);
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);

  return { avg, min, max };
}

// Usage
await benchmark('Single Thread', () => processSync(data));
await benchmark('Worker Thread', () => processAsync(data));
```

### CPU Utilization

Monitor CPU usage across cores:

```javascript
const os = require('os');

function getCPUUsage() {
  const cpus = os.cpus();

  return cpus.map((cpu, i) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    const usage = ((total - idle) / total) * 100;

    return {
      core: i,
      usage: usage.toFixed(2) + '%'
    };
  });
}

// Monitor while workers running
setInterval(() => {
  console.log('CPU Usage:', getCPUUsage());
}, 1000);
```

### Memory Profiling

Track memory usage:

```javascript
class MemoryProfiler {
  constructor() {
    this.samples = [];
  }

  sample() {
    const usage = process.memoryUsage();
    this.samples.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    });
  }

  startProfiling(interval = 100) {
    this.interval = setInterval(() => this.sample(), interval);
  }

  stopProfiling() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  getStats() {
    if (this.samples.length === 0) return null;

    const heapUsed = this.samples.map(s => s.heapUsed);

    return {
      samples: this.samples.length,
      avgHeapUsed: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length,
      peakHeapUsed: Math.max(...heapUsed),
      minHeapUsed: Math.min(...heapUsed)
    };
  }
}

// Usage
const profiler = new MemoryProfiler();
profiler.startProfiling(100);

// Run workers
await runWorkerTasks();

profiler.stopProfiling();
console.log('Memory Stats:', profiler.getStats());
```

## Optimization Patterns

### Pattern 1: Optimal Pool Sizing

```javascript
const os = require('os');

function getOptimalPoolSize(taskType) {
  const cpuCount = os.cpus().length;

  switch (taskType) {
    case 'cpu-intensive':
      // One worker per core
      return cpuCount;

    case 'mixed':
      // More workers for mixed I/O and CPU
      return cpuCount * 2;

    case 'short-tasks':
      // Fewer workers for high-overhead tasks
      return Math.max(2, Math.floor(cpuCount / 2));

    default:
      return cpuCount;
  }
}

const poolSize = getOptimalPoolSize('cpu-intensive');
const pool = new WorkerPool('./worker.js', poolSize);
```

### Pattern 2: Data Streaming

For large datasets, stream data instead of sending all at once:

```javascript
// worker.js
const { parentPort } = require('worker_threads');

let results = [];

parentPort.on('message', (msg) => {
  if (msg.type === 'data') {
    // Process chunk
    const processed = msg.chunk.map(item => process(item));
    results.push(...processed);

  } else if (msg.type === 'end') {
    // Send final results
    parentPort.postMessage({ type: 'result', data: results });
    results = [];
  }
});
```

```javascript
// main.js
const chunkSize = 10000;

for (let i = 0; i < data.length; i += chunkSize) {
  const chunk = data.slice(i, i + chunkSize);
  worker.postMessage({ type: 'data', chunk });
}

worker.postMessage({ type: 'end' });
```

### Pattern 3: Result Streaming

Stream results back as they're computed:

```javascript
// worker.js
parentPort.on('message', (data) => {
  data.forEach((item, index) => {
    const result = processItem(item);

    // Send each result as it's ready
    parentPort.postMessage({
      type: 'result',
      index,
      data: result
    });
  });

  parentPort.postMessage({ type: 'complete' });
});
```

```javascript
// main.js
const results = new Array(data.length);
let completed = 0;

worker.on('message', (msg) => {
  if (msg.type === 'result') {
    results[msg.index] = msg.data;
    completed++;

    // Update progress
    console.log(`Progress: ${completed}/${data.length}`);

  } else if (msg.type === 'complete') {
    console.log('All results received');
  }
});
```

### Pattern 4: Lazy Worker Creation

Create workers only when needed:

```javascript
class LazyWorkerPool {
  constructor(workerScript, maxWorkers = 4) {
    this.workerScript = workerScript;
    this.maxWorkers = maxWorkers;
    this.workers = [];
  }

  getWorker() {
    // Try to find idle worker
    let worker = this.workers.find(w => !w.busy);

    // Create new worker if needed and under limit
    if (!worker && this.workers.length < this.maxWorkers) {
      worker = this.createWorker();
    }

    return worker;
  }

  createWorker() {
    const worker = {
      worker: new Worker(this.workerScript),
      busy: false
    };

    this.workers.push(worker);
    return worker;
  }
}
```

## Performance Metrics

### Measuring Speedup

```javascript
async function measureSpeedup(dataSize) {
  const data = generateData(dataSize);

  // Single-threaded
  const start1 = performance.now();
  const result1 = processSingleThreaded(data);
  const time1 = performance.now() - start1;

  // Multi-threaded
  const start2 = performance.now();
  const result2 = await processMultiThreaded(data);
  const time2 = performance.now() - start2;

  const speedup = time1 / time2;

  console.log(`Data size: ${dataSize}`);
  console.log(`Single-threaded: ${time1.toFixed(2)}ms`);
  console.log(`Multi-threaded: ${time2.toFixed(2)}ms`);
  console.log(`Speedup: ${speedup.toFixed(2)}x`);

  return speedup;
}

// Test different data sizes
for (const size of [1000, 10000, 100000, 1000000]) {
  await measureSpeedup(size);
  console.log('');
}
```

### Throughput Measurement

```javascript
class ThroughputMonitor {
  constructor() {
    this.completed = 0;
    this.startTime = Date.now();
  }

  recordCompletion() {
    this.completed++;
  }

  getThroughput() {
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    return this.completed / elapsed; // tasks per second
  }

  reset() {
    this.completed = 0;
    this.startTime = Date.now();
  }
}

// Usage
const monitor = new ThroughputMonitor();

worker.on('message', () => {
  monitor.recordCompletion();

  if (monitor.completed % 100 === 0) {
    console.log(`Throughput: ${monitor.getThroughput().toFixed(2)} tasks/sec`);
  }
});
```

## Common Performance Pitfalls

### ❌ Pitfall 1: Over-Parallelization

```javascript
// ❌ Bad: Too many workers
const workers = Array.from({ length: 100 }, () => new Worker('./worker.js'));
// Context switching overhead, resource contention

// ✅ Good: Match CPU cores
const workers = Array.from(
  { length: os.cpus().length },
  () => new Worker('./worker.js')
);
```

### ❌ Pitfall 2: Synchronous Bottlenecks

```javascript
// ❌ Bad: Serial processing of results
for (const task of tasks) {
  const result = await pool.execute(task);
  processResult(result); // Blocks next task
}

// ✅ Good: Parallel execution
const results = await Promise.all(
  tasks.map(task => pool.execute(task))
);
results.forEach(processResult);
```

### ❌ Pitfall 3: Memory Leaks

```javascript
// ❌ Bad: Not cleaning up workers
function processData(data) {
  const worker = new Worker('./worker.js');
  return executeWorker(worker, data);
  // Worker never terminated!
}

// ✅ Good: Proper cleanup
async function processData(data) {
  const worker = new Worker('./worker.js');
  try {
    return await executeWorker(worker, data);
  } finally {
    await worker.terminate();
  }
}
```

## Best Practices

### 1. Profile Before Optimizing

```javascript
// Measure current performance
const baseline = await benchmark('Baseline', currentImplementation);

// Try optimization
const optimized = await benchmark('Optimized', newImplementation);

// Compare
console.log(`Improvement: ${(baseline.avg / optimized.avg).toFixed(2)}x`);
```

### 2. Use Appropriate Data Structures

```javascript
// For large datasets, use typed arrays
const data = new Float64Array(1000000);

// Transfer efficiently
worker.postMessage(data.buffer, [data.buffer]);
```

### 3. Monitor in Production

```javascript
class WorkerMetrics {
  constructor() {
    this.metrics = {
      tasksCompleted: 0,
      tasksErrored: 0,
      avgProcessingTime: 0,
      throughput: 0
    };
  }

  update(stats) {
    Object.assign(this.metrics, stats);

    // Send to monitoring service
    sendToMonitoring(this.metrics);
  }
}
```

## Key Takeaways

1. **Worker creation is expensive** - Use pools to reuse workers
2. **Message passing has overhead** - Use transferables for large data
3. **Right-size tasks** - Tasks should be substantial enough to amortize overhead
4. **Measure everything** - Profile before and after optimization
5. **Match CPU cores** - Don't over-parallelize
6. **Stream when possible** - Break large operations into chunks
7. **Monitor in production** - Track metrics and adjust

## Next Steps

Learn about [debugging worker threads](./05-debugging-workers.md) to troubleshoot performance issues.
