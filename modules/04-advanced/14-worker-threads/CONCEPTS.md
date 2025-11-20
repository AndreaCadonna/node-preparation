# Worker Threads Module: Core Concepts

This document provides foundational concepts for the Worker Threads module that span all three levels (Basics, Intermediate, Advanced).

## Table of Contents
- [What are Worker Threads?](#what-are-worker-threads)
- [Why Worker Threads Matter](#why-worker-threads-matter)
- [How Worker Threads Work](#how-worker-threads-work)
- [Worker Threads vs Event Loop](#worker-threads-vs-event-loop)
- [Communication Patterns](#communication-patterns)
- [Data Transfer Mechanisms](#data-transfer-mechanisms)
- [Performance Considerations](#performance-considerations)
- [Worker Threads vs Other Approaches](#worker-threads-vs-other-approaches)

---

## What are Worker Threads?

### Definition

**Worker Threads** are a Node.js feature that enables true parallelism by running JavaScript code in separate threads within the same process. Unlike the event loop which handles I/O concurrency, worker threads enable CPU-intensive tasks to run in parallel without blocking the main thread.

```javascript
// Event Loop (I/O concurrency, single thread)
// Good for: file reading, network requests, timers
fs.readFile('file.txt', (err, data) => {
  // Non-blocking I/O
});

// Worker Threads (CPU parallelism, multiple threads)
// Good for: computations, data processing, crypto
const { Worker } = require('worker_threads');
const worker = new Worker('./cpu-intensive.js');
```

### The Node.js Parallelism Challenge

Node.js event loop is single-threaded and CPU-bound tasks block it:

```javascript
// Problem: CPU-intensive task blocks event loop
app.get('/fibonacci', (req, res) => {
  // This blocks ALL other requests
  const result = fibonacci(45); // Takes seconds
  res.send({ result });
});

// Meanwhile, all other requests wait...
app.get('/hello', (req, res) => {
  res.send('Hello'); // Delayed until fibonacci completes!
});

// Solution: Worker threads run in parallel
const worker = new Worker('./fibonacci-worker.js');
worker.postMessage(45); // Doesn't block main thread
```

### Core Purpose

Worker threads exist to:
1. **Enable True Parallelism** - Run JavaScript in multiple threads
2. **Prevent Event Loop Blocking** - Keep main thread responsive
3. **Utilize Multiple CPU Cores** - Distribute CPU-intensive work
4. **Maintain Process Memory** - Share memory space (unlike child_process)
5. **Improve Performance** - Parallel execution of CPU-bound tasks

---

## Why Worker Threads Matter

### 1. CPU-Intensive Operations

Event loop cannot parallelize CPU work:

```javascript
// Without worker threads
// Processing 1000 images takes: 100 seconds (sequential)
for (const image of images) {
  processImage(image); // Blocks for 0.1s each
}

// With worker threads
// Processing 1000 images takes: ~12.5 seconds (8 cores parallel)
const pool = new WorkerPool('./process-image.js', 8);
await Promise.all(images.map(img => pool.execute(img)));
```

### 2. Responsive Applications

Main thread stays responsive during heavy computation:

```javascript
// Problem: Computation blocks everything
app.get('/heavy', async (req, res) => {
  const result = heavyComputation(); // 10 seconds, blocks server
  res.send(result);
});

// Solution: Worker keeps main thread responsive
app.get('/heavy', async (req, res) => {
  const worker = new Worker('./heavy-worker.js');
  worker.on('message', result => {
    res.send(result);
    worker.terminate();
  });
  worker.postMessage(data);
  // Main thread continues handling other requests
});
```

### 3. Leveraging Modern Hardware

Modern CPUs have multiple cores, but Node.js uses one by default:

```javascript
// 8-core CPU
// Without workers: 1 core at 100%, 7 cores idle (12.5% utilization)
// With 8 workers: 8 cores at 100% (100% utilization)

// Performance impact:
// Single thread: Process 100 items in 100 seconds
// 8 worker threads: Process 100 items in 12.5 seconds
```

---

## How Worker Threads Work

### Architecture

```
Main Thread                    Worker Thread
┌─────────────────┐           ┌─────────────────┐
│                 │           │                 │
│  Event Loop     │           │  Event Loop     │
│  ┌───────────┐  │           │  ┌───────────┐  │
│  │ V8 Isolate│  │  Message  │  │ V8 Isolate│  │
│  │           │  │◄─────────►│  │           │  │
│  │  Heap     │  │  Channel  │  │  Heap     │  │
│  └───────────┘  │           │  └───────────┘  │
│                 │           │                 │
└─────────────────┘           └─────────────────┘
```

### Thread Lifecycle

```javascript
const { Worker } = require('worker_threads');

// 1. Creation
const worker = new Worker('./worker.js', {
  workerData: { initial: 'data' }
});

// 2. Communication
worker.postMessage({ task: 'process', data: [1, 2, 3] });

worker.on('message', (result) => {
  console.log('Result from worker:', result);
});

// 3. Error Handling
worker.on('error', (err) => {
  console.error('Worker error:', err);
});

// 4. Completion
worker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Worker stopped with exit code ${code}`);
  }
});

// 5. Termination
worker.terminate();
```

### Worker Script

```javascript
// worker.js
const { parentPort, workerData } = require('worker_threads');

// Access initial data
console.log('Worker started with:', workerData);

// Listen for messages
parentPort.on('message', (msg) => {
  // Do CPU-intensive work
  const result = processData(msg.data);

  // Send result back
  parentPort.postMessage(result);
});
```

---

## Worker Threads vs Event Loop

### Event Loop (I/O Concurrency)

```javascript
// Event loop handles I/O concurrency
// Single thread, non-blocking I/O

// Good for I/O operations:
fs.readFile('file.txt', (err, data) => {
  // Doesn't block - delegates to OS
});

http.get('http://api.example.com', (res) => {
  // Doesn't block - delegates to OS
});

setTimeout(() => {
  // Doesn't block - handled by libuv
}, 1000);
```

### Worker Threads (CPU Parallelism)

```javascript
// Worker threads handle CPU parallelism
// Multiple threads, truly parallel execution

// Good for CPU operations:
const worker = new Worker(`
  const { parentPort } = require('worker_threads');

  // CPU-intensive: runs in parallel
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  parentPort.on('message', (n) => {
    const result = fibonacci(n);
    parentPort.postMessage(result);
  });
`, { eval: true });
```

### Decision Matrix

| Task Type | Use | Reason |
|-----------|-----|---------|
| File I/O | Event Loop | OS handles I/O asynchronously |
| Network requests | Event Loop | OS handles network asynchronously |
| Database queries | Event Loop | Database handles query asynchronously |
| Image processing | Worker Threads | CPU-bound, benefits from parallelism |
| Video encoding | Worker Threads | CPU-bound, benefits from parallelism |
| Cryptography | Worker Threads | CPU-bound, benefits from parallelism |
| Data compression | Worker Threads | CPU-bound, benefits from parallelism |
| Complex calculations | Worker Threads | CPU-bound, benefits from parallelism |

---

## Communication Patterns

### 1. Message Passing

```javascript
// Main thread
const worker = new Worker('./worker.js');

worker.postMessage({ command: 'start', data: [1, 2, 3] });

worker.on('message', (result) => {
  console.log('Got result:', result);
});

// Worker thread
const { parentPort } = require('worker_threads');

parentPort.on('message', (msg) => {
  const result = processData(msg.data);
  parentPort.postMessage(result);
});
```

### 2. Request-Response Pattern

```javascript
// Main thread
function executeInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js');

    worker.on('message', (result) => {
      resolve(result);
      worker.terminate();
    });

    worker.on('error', reject);
    worker.postMessage(data);
  });
}

// Usage
const result = await executeInWorker({ task: 'process', data: [1, 2, 3] });
```

### 3. Event-Based Communication

```javascript
// Worker emits progress updates
const { Worker } = require('worker_threads');

const worker = new Worker('./worker.js');

worker.on('message', (msg) => {
  if (msg.type === 'progress') {
    console.log(`Progress: ${msg.percent}%`);
  } else if (msg.type === 'result') {
    console.log('Final result:', msg.data);
  }
});

// worker.js
parentPort.postMessage({ type: 'progress', percent: 25 });
parentPort.postMessage({ type: 'progress', percent: 50 });
parentPort.postMessage({ type: 'progress', percent: 75 });
parentPort.postMessage({ type: 'result', data: finalResult });
```

### 4. Bidirectional Communication

```javascript
// Main thread
worker.postMessage({ command: 'start' });

worker.on('message', (msg) => {
  if (msg.type === 'request') {
    // Worker requesting data
    worker.postMessage({ type: 'response', data: requestedData });
  }
});

// Worker thread
parentPort.postMessage({ type: 'request', for: 'moreData' });

parentPort.on('message', (msg) => {
  if (msg.type === 'response') {
    // Use the data
    processData(msg.data);
  }
});
```

---

## Data Transfer Mechanisms

### 1. Structured Clone (Default)

Data is copied - safe but can be slow for large data:

```javascript
// Main thread
const data = { array: new Array(1000000).fill(42) };
worker.postMessage(data); // Data is cloned (copied)

// Both main thread and worker have separate copies
// Modification in one doesn't affect the other
```

**When to use:**
- Small to medium data
- Need data in both threads
- Safety is priority

### 2. Transferable Objects (Zero-Copy)

Ownership transferred - fast but loses access:

```javascript
// Main thread
const buffer = new ArrayBuffer(1024 * 1024 * 100); // 100MB

console.log('Before:', buffer.byteLength); // 104857600

worker.postMessage({ buffer }, [buffer]); // Transfer ownership

console.log('After:', buffer.byteLength); // 0 (transferred!)
// Can't use buffer in main thread anymore

// Worker thread
parentPort.on('message', ({ buffer }) => {
  console.log('Worker received:', buffer.byteLength); // 104857600
  // Worker now owns the buffer
});
```

**When to use:**
- Large data (images, videos, buffers)
- Don't need data after sending
- Performance is critical

**Transferable types:**
- `ArrayBuffer`
- `MessagePort`
- `ReadableStream`
- `WritableStream`
- `TransformStream`

### 3. SharedArrayBuffer (Shared Memory)

Both threads access same memory - fast but requires synchronization:

```javascript
// Main thread
const sharedBuffer = new SharedArrayBuffer(1024);
const sharedArray = new Int32Array(sharedBuffer);

sharedArray[0] = 42;

worker.postMessage({ sharedBuffer });

// Worker thread
parentPort.on('message', ({ sharedBuffer }) => {
  const sharedArray = new Int32Array(sharedBuffer);

  console.log(sharedArray[0]); // 42 (same memory!)

  // Both threads see the change
  sharedArray[0] = 100;
});

// Main thread sees change
setTimeout(() => {
  console.log(sharedArray[0]); // 100 (modified by worker!)
}, 100);
```

**When to use:**
- Need bidirectional data sharing
- High-frequency updates
- Advanced scenarios (requires Atomics for safety)

---

## Performance Considerations

### 1. Worker Creation Overhead

Creating workers has cost:

```javascript
// ❌ Bad: Create worker for each task
tasks.forEach(task => {
  const worker = new Worker('./worker.js'); // Expensive!
  worker.postMessage(task);
});

// ✅ Good: Reuse workers (worker pool)
const pool = new WorkerPool('./worker.js', 4);
await Promise.all(tasks.map(task => pool.execute(task)));
```

### 2. When Workers Help

Workers improve performance for CPU-bound tasks:

```javascript
// CPU-bound: Workers help
- Image/video processing
- Data compression
- Cryptographic operations
- Complex calculations
- Large dataset transformations

// I/O-bound: Workers don't help (use event loop)
- File reading/writing
- Network requests
- Database queries
```

### 3. Optimal Worker Count

```javascript
const os = require('os');

// ❌ Bad: Too many workers (overhead > benefit)
const workerCount = 1000;

// ❌ Bad: Too few workers (underutilization)
const workerCount = 1;

// ✅ Good: Match CPU core count
const workerCount = os.cpus().length;

// ✅ Better: Leave cores for other work
const workerCount = os.cpus().length - 1;
```

### 4. Data Transfer Costs

```javascript
// Measure impact of data size
const data = new Array(1000000).fill(42);

console.time('transfer');
worker.postMessage(data); // Clone time increases with data size
console.timeEnd('transfer');

// Small data: ~0.1ms
// 1MB data: ~10ms
// 100MB data: ~1000ms (1 second!)

// Use transferable objects for large data
const buffer = new ArrayBuffer(100 * 1024 * 1024);
worker.postMessage({ buffer }, [buffer]); // ~0.1ms (transferred, not copied)
```

---

## Worker Threads vs Other Approaches

### Worker Threads vs Cluster

```javascript
// Cluster: Multiple processes
const cluster = require('cluster');
if (cluster.isMaster) {
  cluster.fork(); // Separate process, separate memory
}

// Worker Threads: Multiple threads
const { Worker } = require('worker_threads');
const worker = new Worker('./worker.js'); // Same process, can share memory
```

| Feature | Worker Threads | Cluster |
|---------|---------------|---------|
| **Isolation** | Threads share process | Separate processes |
| **Memory** | Shared (with SharedArrayBuffer) | Completely separate |
| **Startup** | Fast (~10-50ms) | Slow (~50-200ms) |
| **Communication** | Fast (shared memory) | Slower (IPC) |
| **Use case** | CPU-intensive tasks | HTTP server scaling |
| **Port sharing** | No | Yes (load balancing) |

### Worker Threads vs Child Process

```javascript
// Child Process: Separate process, can run any program
const { spawn } = require('child_process');
const child = spawn('python', ['script.py']); // Different program

// Worker Threads: Same process, JavaScript only
const { Worker } = require('worker_threads');
const worker = new Worker('./worker.js'); // JavaScript code
```

| Feature | Worker Threads | Child Process |
|---------|---------------|---------------|
| **Language** | JavaScript only | Any program/language |
| **Isolation** | Thread-level | Process-level (stronger) |
| **Startup** | Fast | Slower |
| **Memory** | Can share | Completely separate |
| **Overhead** | Low | Higher |
| **Use case** | CPU-intensive JS | Running external programs |

### Worker Threads vs Async/Await

```javascript
// Async/await: I/O concurrency (single thread)
async function processFiles() {
  await fs.readFile('file1.txt'); // Doesn't block
  await fs.readFile('file2.txt'); // Doesn't block
}

// Worker Threads: CPU parallelism (multiple threads)
const worker1 = new Worker('./process1.js'); // Runs in parallel
const worker2 = new Worker('./process2.js'); // Runs in parallel
```

| Feature | Async/Await | Worker Threads |
|---------|------------|----------------|
| **Concurrency** | I/O only | CPU + I/O |
| **Parallelism** | No (single thread) | Yes (multiple threads) |
| **CPU tasks** | Blocks event loop | Runs in parallel |
| **Complexity** | Simple | More complex |
| **Use case** | I/O operations | CPU-intensive tasks |

---

## Key Takeaways

### When to Use Worker Threads

✅ **Use worker threads for:**
- CPU-intensive computations
- Image/video processing
- Data compression/decompression
- Cryptographic operations
- Large dataset transformations
- Parallel processing tasks

❌ **Don't use worker threads for:**
- File I/O operations (use fs promises)
- Network requests (use http/https)
- Database queries (use async/await)
- Simple calculations (overhead > benefit)
- Already parallel operations

### Best Practices

1. **Use worker pools** - Reuse workers instead of creating new ones
2. **Transfer large data** - Use transferable objects for buffers
3. **Match core count** - Create workers based on CPU cores
4. **Handle errors** - Always listen for 'error' and 'exit' events
5. **Clean up** - Terminate workers when done
6. **Benchmark** - Verify workers actually improve performance

### Quick Reference

```javascript
// Create worker
const { Worker } = require('worker_threads');
const worker = new Worker('./worker.js', {
  workerData: { initial: 'data' }
});

// Send message
worker.postMessage({ command: 'process', data: [1, 2, 3] });

// Receive message
worker.on('message', (result) => {
  console.log(result);
});

// Handle errors
worker.on('error', (err) => console.error(err));
worker.on('exit', (code) => console.log('Exit code:', code));

// Terminate
worker.terminate();

// Worker script (worker.js)
const { parentPort, workerData } = require('worker_threads');

parentPort.on('message', (msg) => {
  const result = processData(msg.data);
  parentPort.postMessage(result);
});
```

---

## Conclusion

Worker threads enable Node.js to perform true parallel execution of CPU-intensive tasks, overcoming the single-threaded limitation of the event loop. They're essential for building high-performance applications that need to process data, perform computations, or handle CPU-bound work without blocking the main thread.

Understanding when and how to use worker threads—alongside other Node.js concurrency mechanisms—is key to building efficient, scalable applications.

**Next Steps:**
- Start with [Level 1: Basics](./level-1-basics/README.md)
- Review the [Module README](./README.md)
- Explore the [examples](./level-1-basics/examples/) to see worker threads in action
