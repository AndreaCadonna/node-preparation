# Buffer Creation Methods

Understanding the different ways to create buffers and when to use each method.

## Table of Contents
- [Overview](#overview)
- [Buffer.alloc() - Safe Allocation](#bufferalloc---safe-allocation)
- [Buffer.from() - From Existing Data](#bufferfrom---from-existing-data)
- [Buffer.allocUnsafe() - Fast Allocation](#bufferallocunsafe---fast-allocation)
- [Deprecated Methods](#deprecated-methods)
- [When to Use Each Method](#when-to-use-each-method)

---

## Overview

Node.js provides three modern methods for creating buffers:

| Method | Safety | Speed | Use Case |
|--------|--------|-------|----------|
| `Buffer.alloc()` | Safe | Slower | Default choice |
| `Buffer.from()` | Safe | Fast | From existing data |
| `Buffer.allocUnsafe()` | Unsafe | Fastest | Performance-critical |

---

## Buffer.alloc() - Safe Allocation

### What It Does

Creates a new buffer filled with zeros:

```javascript
const buf = Buffer.alloc(10);
console.log(buf);
// <Buffer 00 00 00 00 00 00 00 00 00 00>
```

### Syntax

```javascript
Buffer.alloc(size[, fill[, encoding]])
```

**Parameters:**
- `size`: Number of bytes to allocate
- `fill` (optional): Value to fill buffer with (default: 0)
- `encoding` (optional): Encoding for string fill value

### Examples

```javascript
// Simple allocation (filled with zeros)
const buf1 = Buffer.alloc(5);
console.log(buf1); // <Buffer 00 00 00 00 00>

// Fill with specific value
const buf2 = Buffer.alloc(5, 0xFF);
console.log(buf2); // <Buffer ff ff ff ff ff>

// Fill with string
const buf3 = Buffer.alloc(5, 'ab');
console.log(buf3); // <Buffer 61 62 61 62 61>
// Repeats 'ab' to fill: a b a b a

// Fill with encoding
const buf4 = Buffer.alloc(11, 'aGVsbG8gd29ybGQ=', 'base64');
console.log(buf4.toString()); // 'hello world'
```

### When to Use

✅ **Use `Buffer.alloc()` when:**
- You need a clean, initialized buffer
- Security is important (no data leakage)
- You're creating a buffer to fill later
- Performance is not critical

❌ **Don't use when:**
- You immediately fill the entire buffer (use `allocUnsafe` + fill)
- You're creating from existing data (use `from()`)

---

## Buffer.from() - From Existing Data

### What It Does

Creates a new buffer from existing data:

```javascript
const buf = Buffer.from('Hello');
console.log(buf); // <Buffer 48 65 6c 6c 6f>
```

### Variants

#### 1. From String

```javascript
Buffer.from(string[, encoding])
```

```javascript
// Default UTF-8 encoding
const buf1 = Buffer.from('Hello');

// Explicit encoding
const buf2 = Buffer.from('Hello', 'utf8');
const buf3 = Buffer.from('48656c6c6f', 'hex');
const buf4 = Buffer.from('SGVsbG8=', 'base64');

console.log(buf1.toString()); // 'Hello'
console.log(buf2.toString()); // 'Hello'
console.log(buf3.toString()); // 'Hello'
console.log(buf4.toString()); // 'Hello'
```

#### 2. From Array

```javascript
Buffer.from(array)
```

```javascript
// Array of bytes (0-255)
const buf = Buffer.from([72, 101, 108, 108, 111]);
console.log(buf.toString()); // 'Hello'

// With hexadecimal notation
const buf2 = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
console.log(buf2.toString()); // 'Hello'
```

#### 3. From Buffer

```javascript
Buffer.from(buffer)
```

```javascript
const original = Buffer.from('Hello');
const copy = Buffer.from(original);

// Modifying copy doesn't affect original
copy[0] = 0x4A; // 'J'
console.log(original.toString()); // 'Hello'
console.log(copy.toString());     // 'Jello'
```

#### 4. From ArrayBuffer

```javascript
Buffer.from(arrayBuffer[, byteOffset[, length]])
```

```javascript
const arr = new Uint8Array([72, 101, 108, 108, 111]);
const buf = Buffer.from(arr.buffer);
console.log(buf.toString()); // 'Hello'

// With offset and length
const buf2 = Buffer.from(arr.buffer, 1, 3);
console.log(buf2.toString()); // 'ell'
```

### When to Use

✅ **Use `Buffer.from()` when:**
- Converting strings to buffers
- Creating from existing data
- Copying buffers
- Converting from arrays or TypedArrays

---

## Buffer.allocUnsafe() - Fast Allocation

### What It Does

Creates a new buffer WITHOUT initializing the memory:

```javascript
const buf = Buffer.allocUnsafe(10);
console.log(buf);
// <Buffer ?? ?? ?? ?? ?? ?? ?? ?? ?? ??>
// Contains random old data from memory!
```

### ⚠️ Security Warning

**DANGER**: The buffer may contain sensitive data from previous operations:

```javascript
// Previous operation stored a password
const password = Buffer.from('secret123');
// ... use password ...

// Later, allocUnsafe might get that same memory
const buf = Buffer.allocUnsafe(10);
console.log(buf.toString());
// Might print 'secret123' or parts of it!
```

### Safe Usage

Always fill the buffer immediately:

```javascript
// Allocate
const buf = Buffer.allocUnsafe(10);

// Fill BEFORE reading
buf.fill(0);

// Now safe to use
console.log(buf); // <Buffer 00 00 00 00 00 00 00 00 00 00>
```

### Performance Comparison

```javascript
console.time('alloc');
for (let i = 0; i < 100000; i++) {
  Buffer.alloc(1024);
}
console.timeEnd('alloc');
// alloc: ~50ms

console.time('allocUnsafe');
for (let i = 0; i < 100000; i++) {
  const buf = Buffer.allocUnsafe(1024);
  buf.fill(0);
}
console.timeEnd('allocUnsafe');
// allocUnsafe: ~30ms (faster even with fill!)
```

### When to Use

✅ **Use `Buffer.allocUnsafe()` when:**
- Performance is critical
- You immediately fill the entire buffer
- The buffer is temporary and internal

❌ **Never use when:**
- The buffer might be read before being filled
- Security is a concern
- You're unsure if you'll fill all bytes

---

## Deprecated Methods

### ❌ new Buffer()

**NEVER USE**: Deprecated since Node.js v6

```javascript
// ❌ DEPRECATED - Don't use!
const buf1 = new Buffer(10);
const buf2 = new Buffer('Hello');
const buf3 = new Buffer([1, 2, 3]);

// ✅ Use instead:
const buf1 = Buffer.alloc(10);
const buf2 = Buffer.from('Hello');
const buf3 = Buffer.from([1, 2, 3]);
```

**Why deprecated?**
- Ambiguous behavior (number vs string)
- Security issues with `new Buffer(size)`
- Confusing for developers

---

## When to Use Each Method

### Decision Tree

```
Need to create a buffer?
│
├─ Have existing data?
│  └─ YES → Buffer.from()
│
└─ Need empty buffer?
   │
   ├─ Performance critical?
   │  └─ YES → Buffer.allocUnsafe() + fill()
   │
   └─ NO → Buffer.alloc()
```

### Common Scenarios

#### Reading from String

```javascript
// ✅ Correct
const buf = Buffer.from('Hello World', 'utf8');
```

#### Creating Empty Buffer

```javascript
// ✅ Default choice
const buf = Buffer.alloc(100);

// ✅ Performance critical
const buf = Buffer.allocUnsafe(100);
buf.fill(0);
```

#### Copying a Buffer

```javascript
// ✅ Creates independent copy
const copy = Buffer.from(original);

// ❌ Wrong - creates reference
const copy = original; // Not a copy!
```

#### Pre-filling with Value

```javascript
// ✅ Efficient
const buf = Buffer.alloc(100, 0xFF);

// ❌ Less efficient
const buf = Buffer.alloc(100);
buf.fill(0xFF);
```

---

## Examples

### Example 1: Creating from Different Sources

```javascript
// From string
const buf1 = Buffer.from('Hello', 'utf8');

// From hex string
const buf2 = Buffer.from('48656c6c6f', 'hex');

// From base64
const buf3 = Buffer.from('SGVsbG8=', 'base64');

// From array
const buf4 = Buffer.from([72, 101, 108, 108, 111]);

// All produce the same result
console.log(buf1.toString()); // 'Hello'
console.log(buf2.toString()); // 'Hello'
console.log(buf3.toString()); // 'Hello'
console.log(buf4.toString()); // 'Hello'
```

### Example 2: Safe vs Unsafe Allocation

```javascript
// Safe - always use in production
function safeAllocate(size) {
  return Buffer.alloc(size);
}

// Fast - use when performance matters
function fastAllocate(size) {
  const buf = Buffer.allocUnsafe(size);
  buf.fill(0); // Must fill!
  return buf;
}

// Test
const safe = safeAllocate(10);
const fast = fastAllocate(10);

console.log(safe); // <Buffer 00 00 00 00 00 00 00 00 00 00>
console.log(fast); // <Buffer 00 00 00 00 00 00 00 00 00 00>
```

### Example 3: Copying Buffers

```javascript
const original = Buffer.from('Hello');

// Method 1: Buffer.from()
const copy1 = Buffer.from(original);

// Method 2: Manual copy
const copy2 = Buffer.alloc(original.length);
original.copy(copy2);

// Method 3: Slice and copy
const copy3 = Buffer.from(original.subarray());

// All create independent copies
copy1[0] = 0x4A;
console.log(original.toString()); // 'Hello' (unchanged)
console.log(copy1.toString());    // 'Jello' (changed)
```

---

## Best Practices

### 1. Default to Buffer.alloc()

```javascript
// ✅ Safe default
const buf = Buffer.alloc(100);
```

### 2. Use Buffer.from() for Existing Data

```javascript
// ✅ Correct
const buf = Buffer.from('text data');
const buf2 = Buffer.from([1, 2, 3, 4]);
```

### 3. Only Use allocUnsafe() with Immediate Fill

```javascript
// ✅ Safe usage
const buf = Buffer.allocUnsafe(100);
buf.fill(0); // Immediate fill

// ❌ Unsafe - might read uninitialized memory
const buf = Buffer.allocUnsafe(100);
console.log(buf[0]); // Dangerous!
```

### 4. Always Specify Encoding

```javascript
// ✅ Explicit
const buf = Buffer.from('Hello', 'utf8');

// ❌ Relies on default
const buf = Buffer.from('Hello');
```

---

## Summary

| Method | Use For | Safety | Speed |
|--------|---------|--------|-------|
| `Buffer.alloc(size)` | Empty buffer | ✅ Safe | Moderate |
| `Buffer.from(data)` | Existing data | ✅ Safe | Fast |
| `Buffer.allocUnsafe(size)` | Performance | ⚠️ Unsafe | Fastest |
| `new Buffer()` | ❌ Never use | ❌ | ❌ |

**Key Takeaways:**
1. Use `Buffer.alloc()` as your default choice
2. Use `Buffer.from()` when you have existing data
3. Only use `Buffer.allocUnsafe()` in performance-critical code
4. Always fill `allocUnsafe()` buffers immediately
5. Never use `new Buffer()` - it's deprecated

---

## Next Steps

- Read [Buffer vs String](./02-buffer-vs-string.md)
- Practice creating buffers in different ways
- Understand when to use each method
