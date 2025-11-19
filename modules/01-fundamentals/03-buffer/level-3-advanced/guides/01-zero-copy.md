# Zero-Copy Operations

Minimizing data copying for optimal performance.

## What is Zero-Copy?

Zero-copy means creating a view or reference to existing data instead of copying it.

```javascript
const original = Buffer.from('Hello World');

// Zero-copy (view) - no data copied
const view = original.subarray(0, 5);

// Copy - data is duplicated
const copy = Buffer.from(original.subarray(0, 5));
```

## Methods Comparison

| Method | Copies Data? | Shares Memory? | Use Case |
|--------|--------------|----------------|----------|
| `subarray()` | No | Yes | Fast, read-only views |
| `slice()` (deprecated) | No | Yes | Legacy, use subarray() |
| `Buffer.from(buf)` | Yes | No | Independent copy needed |
| `copy()` | Yes | No | Explicit copying |

## Examples

### Zero-Copy (Fast)

```javascript
const data = Buffer.from('HEADER:BODY:FOOTER');

// Extract parts without copying
const header = data.subarray(0, 6);   // 'HEADER'
const body = data.subarray(7, 11);    // 'BODY'
const footer = data.subarray(12);     // 'FOOTER'

console.log(header.toString()); // 'HEADER'
```

**⚠️ Warning**: Modifying view affects original!

```javascript
const original = Buffer.from('Hello');
const view = original.subarray(0, 5);

view[0] = 0x4A; // 'J'
console.log(original.toString()); // 'Jello' (changed!)
```

### When to Copy

```javascript
// Need independent buffer
const original = Buffer.from('Hello');

// Method 1: Buffer.from()
const copy1 = Buffer.from(original);

// Method 2: allocate + copy
const copy2 = Buffer.alloc(original.length);
original.copy(copy2);

// Now safe to modify
copy1[0] = 0x4A;
console.log(original.toString()); // Still 'Hello'
```

## Performance Impact

```javascript
// Benchmark
const large = Buffer.alloc(1024 * 1024); // 1MB

console.time('subarray (zero-copy)');
for (let i = 0; i < 10000; i++) {
  const view = large.subarray(0, 1024);
}
console.timeEnd('subarray (zero-copy)');
// ~1ms

console.time('copy');
for (let i = 0; i < 10000; i++) {
  const copy = Buffer.from(large.subarray(0, 1024));
}
console.timeEnd('copy');
// ~150ms (much slower!)
```

## Best Practices

### 1. Use subarray() for Read-Only Operations

```javascript
// ✅ Good - zero-copy for reading
function extractHeader(buffer) {
  return buffer.subarray(0, 16);
}
```

### 2. Copy When Modifications Needed

```javascript
// ✅ Good - copy before modifying
function processData(buffer) {
  const copy = Buffer.from(buffer);
  // Safe to modify copy
  copy[0] = 0xFF;
  return copy;
}
```

### 3. Document Memory Sharing

```javascript
/**
 * Returns a view into the original buffer (zero-copy).
 * WARNING: Modifying the view will modify the original!
 */
function getView(buffer) {
  return buffer.subarray(0, 10);
}
```

## Summary

- **subarray()**: Zero-copy, shares memory (fast)
- **Buffer.from()**: Copies data, independent (safe)
- Use zero-copy for reading, copy for modifying
- Always document memory sharing behavior
