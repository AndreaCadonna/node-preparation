# Performance Optimization

Techniques for optimizing buffer-intensive code.

## Profiling

```javascript
// Measure allocation
console.time('allocations');
for (let i = 0; i < 100000; i++) {
  const buf = Buffer.alloc(1024);
}
console.timeEnd('allocations');

// Measure operations
console.time('operations');
const buf = Buffer.alloc(1024);
for (let i = 0; i < 100000; i++) {
  buf.writeUInt32LE(i, 0);
  buf.readUInt32LE(0);
}
console.timeEnd('operations');
```

## Optimization Techniques

### 1. Reuse Buffers (Pooling)

```javascript
// ❌ Slow - allocates each time
function process1000Messages() {
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.alloc(1024);
    // ... use buf
  }
}

// ✅ Fast - reuse buffer
function process1000Messages() {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i < 1000; i++) {
    buf.fill(0); // Clear
    // ... use buf
  }
}
```

### 2. Use allocUnsafe() When Safe

```javascript
// If you immediately fill the buffer
const buf = Buffer.allocUnsafe(1024);
buf.fill(0); // Faster than alloc(1024)
```

### 3. Avoid Repeated Concatenation

```javascript
// ❌ Slow - O(n²)
let result = Buffer.alloc(0);
for (const chunk of chunks) {
  result = Buffer.concat([result, chunk]);
}

// ✅ Fast - O(n)
const result = Buffer.concat(chunks);
```

### 4. Use Appropriate Data Types

```javascript
// ✅ Use smallest type needed
buf.writeUInt8(value, 0);   // 1 byte
buf.writeUInt16LE(value, 0); // 2 bytes
```

## Benchmarking

```javascript
function benchmark(fn, iterations = 10000) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  const ns = Number(end - start);
  console.log(`${iterations} iterations: ${ns / 1e6}ms`);
}

benchmark(() => Buffer.alloc(1024));
```

## Summary

- Profile before optimizing
- Pool buffers for frequent operations
- Use allocUnsafe() with immediate fill
- Avoid repeated concatenation
- Choose appropriate data types
