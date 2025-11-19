# Buffer Comparison

Understanding how to compare buffers for equality and order.

## Table of Contents
- [Why Compare Buffers?](#why-compare-buffers)
- [Equality Comparison](#equality-comparison)
- [Ordering Comparison](#ordering-comparison)
- [Partial Comparison](#partial-comparison)
- [Performance Considerations](#performance-considerations)

---

## Why Compare Buffers?

Comparing buffers is essential for:
- **File verification**: Check if files are identical
- **Protocol validation**: Verify message signatures
- **Caching**: Check if cached data matches
- **Testing**: Verify expected output
- **Deduplication**: Find duplicate data

```javascript
// Example: Verify file signature
const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const fileHeader = readFileHeader('image.png');

if (fileHeader.equals(pngSignature)) {
  console.log('Valid PNG file');
}
```

---

## Equality Comparison

### The Problem with ===

**Never** use `===` or `==` to compare buffers:

```javascript
const buf1 = Buffer.from('Hello');
const buf2 = Buffer.from('Hello');

console.log(buf1 === buf2); // false (different objects!)
console.log(buf1 == buf2);  // false

// Even identical buffers are different objects
const buf3 = buf1;
console.log(buf1 === buf3); // true (same reference)
```

### Using equals() Method

The **correct** way to compare buffer contents:

```javascript
const buf1 = Buffer.from('Hello');
const buf2 = Buffer.from('Hello');
const buf3 = Buffer.from('World');

console.log(buf1.equals(buf2)); // true  (same content)
console.log(buf1.equals(buf3)); // false (different content)
```

### How equals() Works

Compares **byte-by-byte**:

```javascript
const buf1 = Buffer.from([1, 2, 3]);
const buf2 = Buffer.from([1, 2, 3]);
const buf3 = Buffer.from([1, 2, 4]);

console.log(buf1.equals(buf2)); // true
console.log(buf1.equals(buf3)); // false (last byte differs)
```

### Length Matters

Buffers must have **same length** to be equal:

```javascript
const buf1 = Buffer.from('Hi');
const buf2 = Buffer.from('Hello');

console.log(buf1.equals(buf2)); // false (different lengths)
```

---

## Ordering Comparison

### compare() Method

For sorting or ordering buffers:

```javascript
const buf1 = Buffer.from('abc');
const buf2 = Buffer.from('def');
const buf3 = Buffer.from('abc');

console.log(buf1.compare(buf2)); // -1 (buf1 < buf2)
console.log(buf2.compare(buf1)); //  1 (buf2 > buf1)
console.log(buf1.compare(buf3)); //  0 (buf1 == buf3)
```

### Return Values

| Return | Meaning |
|--------|---------|
| `-1` (negative) | Buffer A < Buffer B |
| `0` | Buffer A === Buffer B |
| `1` (positive) | Buffer A > Buffer B |

### Lexicographic Comparison

Compares byte-by-byte, like dictionary order:

```javascript
const buf1 = Buffer.from([1, 2, 3]);
const buf2 = Buffer.from([1, 2, 4]);
const buf3 = Buffer.from([1, 3, 0]);

console.log(buf1.compare(buf2)); // -1 (3 < 4)
console.log(buf1.compare(buf3)); // -1 (2 < 3)
```

### Sorting Buffers

```javascript
const buffers = [
  Buffer.from('zebra'),
  Buffer.from('apple'),
  Buffer.from('mango')
];

buffers.sort((a, b) => a.compare(b));

buffers.forEach(buf => console.log(buf.toString()));
// Output:
// apple
// mango
// zebra
```

### Static Buffer.compare()

Alternative syntax:

```javascript
const buf1 = Buffer.from('abc');
const buf2 = Buffer.from('def');

// Instance method
console.log(buf1.compare(buf2)); // -1

// Static method (same result)
console.log(Buffer.compare(buf1, buf2)); // -1
```

---

## Partial Comparison

### Comparing Subranges

Compare only part of buffers:

```javascript
const buf1 = Buffer.from('Hello World');
const buf2 = Buffer.from('Hello Everyone');

// Compare first 5 bytes only
const result = buf1.compare(buf2, 0, 5, 0, 5);
console.log(result); // 0 (both start with 'Hello')
```

### Syntax

```javascript
buf1.compare(buf2, targetStart, targetEnd, sourceStart, sourceEnd)
```

**Parameters:**
- `targetStart`: Start position in buf2
- `targetEnd`: End position in buf2
- `sourceStart`: Start position in buf1
- `sourceEnd`: End position in buf1

### Examples

```javascript
const buf1 = Buffer.from('ABCDEF');
const buf2 = Buffer.from('XYZABC');

// Compare 'ABC' in buf1 with 'ABC' in buf2
// buf1[0:3] vs buf2[3:6]
const result = buf1.compare(buf2, 3, 6, 0, 3);
console.log(result); // 0 (both are 'ABC')
```

---

## Practical Examples

### Example 1: File Signature Verification

```javascript
function verifyPNGSignature(buffer) {
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, // PNG
    0x0D, 0x0A, 0x1A, 0x0A  // DOS/Unix line endings
  ]);

  // Compare first 8 bytes
  const header = buffer.subarray(0, 8);
  return header.equals(pngSignature);
}

const file = fs.readFileSync('image.png');
if (verifyPNGSignature(file)) {
  console.log('Valid PNG file');
}
```

### Example 2: Finding Duplicates

```javascript
function findDuplicates(bufferArray) {
  const seen = [];
  const duplicates = [];

  for (const buf of bufferArray) {
    // Check if we've seen this buffer
    const isDuplicate = seen.some(s => s.equals(buf));

    if (isDuplicate) {
      duplicates.push(buf);
    } else {
      seen.push(buf);
    }
  }

  return duplicates;
}

const buffers = [
  Buffer.from('abc'),
  Buffer.from('def'),
  Buffer.from('abc'), // duplicate
  Buffer.from('ghi')
];

const dupes = findDuplicates(buffers);
console.log('Found', dupes.length, 'duplicates');
```

### Example 3: Cache Validation

```javascript
class BufferCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value) {
    this.cache.set(key, value);
  }

  get(key) {
    return this.cache.get(key);
  }

  has(buffer) {
    for (const [key, cached] of this.cache) {
      if (cached.equals(buffer)) {
        return true;
      }
    }
    return false;
  }
}

const cache = new BufferCache();
cache.set('file1', Buffer.from('content'));

const newData = Buffer.from('content');
if (cache.has(newData)) {
  console.log('Data already cached!');
}
```

### Example 4: Sorting Binary Data

```javascript
function sortBuffers(buffers) {
  return buffers.sort((a, b) => {
    const cmp = a.compare(b);
    console.log(`Comparing ${a.toString('hex')} with ${b.toString('hex')}: ${cmp}`);
    return cmp;
  });
}

const data = [
  Buffer.from([3, 1, 4]),
  Buffer.from([1, 5, 9]),
  Buffer.from([2, 6, 5])
];

const sorted = sortBuffers(data);
sorted.forEach(buf => console.log(buf));
```

### Example 5: Password Verification (Timing-Safe)

```javascript
// ⚠️ Simple comparison (vulnerable to timing attacks)
function verifyPasswordUnsafe(input, stored) {
  return input.equals(stored);
}

// ✅ Timing-safe comparison
const crypto = require('crypto');

function verifyPasswordSafe(input, stored) {
  // Use crypto.timingSafeEqual() for security
  if (input.length !== stored.length) {
    return false;
  }
  return crypto.timingSafeEqual(input, stored);
}

const password = Buffer.from('secret123');
const userInput = Buffer.from('secret123');

console.log(verifyPasswordSafe(userInput, password)); // true
```

---

## Common Patterns

### Pattern 1: Prefix Matching

```javascript
function hasPrefix(buffer, prefix) {
  if (buffer.length < prefix.length) {
    return false;
  }

  return buffer.subarray(0, prefix.length).equals(prefix);
}

const data = Buffer.from('Hello World');
const prefix = Buffer.from('Hello');

console.log(hasPrefix(data, prefix)); // true
```

### Pattern 2: Suffix Matching

```javascript
function hasSuffix(buffer, suffix) {
  if (buffer.length < suffix.length) {
    return false;
  }

  const start = buffer.length - suffix.length;
  return buffer.subarray(start).equals(suffix);
}

const data = Buffer.from('image.png');
const suffix = Buffer.from('.png');

console.log(hasSuffix(data, suffix)); // true
```

### Pattern 3: Find Position

```javascript
function indexOf(buffer, search) {
  for (let i = 0; i <= buffer.length - search.length; i++) {
    const slice = buffer.subarray(i, i + search.length);
    if (slice.equals(search)) {
      return i;
    }
  }
  return -1;
}

const buf = Buffer.from('Hello World');
const search = Buffer.from('World');

console.log(indexOf(buf, search)); // 6
```

---

## Performance Considerations

### equals() is Fast

```javascript
// Fast - optimized comparison
buf1.equals(buf2);

// Slow - manual byte-by-byte
let equal = buf1.length === buf2.length;
for (let i = 0; i < buf1.length && equal; i++) {
  equal = buf1[i] === buf2[i];
}
```

### Short-Circuit on Length

```javascript
// ✅ Efficient - check length first
function areEqual(buf1, buf2) {
  if (buf1.length !== buf2.length) {
    return false; // Fast exit
  }
  return buf1.equals(buf2);
}
```

### Avoid Repeated Comparisons

```javascript
// ❌ Inefficient
for (let i = 0; i < 1000; i++) {
  if (data.equals(Buffer.from('test'))) {
    // ...
  }
}

// ✅ Efficient
const test = Buffer.from('test');
for (let i = 0; i < 1000; i++) {
  if (data.equals(test)) {
    // ...
  }
}
```

---

## Best Practices

### 1. Use equals() for Equality

```javascript
// ✅ Correct
buf1.equals(buf2);

// ❌ Wrong
buf1 === buf2;
buf1.toString() === buf2.toString(); // Wasteful
```

### 2. Use compare() for Ordering

```javascript
// ✅ Correct
buffers.sort((a, b) => a.compare(b));

// ❌ Wrong (doesn't work)
buffers.sort((a, b) => a - b);
```

### 3. Check Lengths First

```javascript
// ✅ Efficient
if (buf1.length !== buf2.length) {
  return false;
}
return buf1.equals(buf2);
```

### 4. Use Timing-Safe for Secrets

```javascript
const crypto = require('crypto');

// ✅ For passwords, tokens, etc.
crypto.timingSafeEqual(hash1, hash2);

// ❌ Vulnerable to timing attacks
hash1.equals(hash2);
```

---

## Summary

### Comparison Methods

| Method | Use For | Returns |
|--------|---------|---------|
| `equals()` | Equality check | `true` / `false` |
| `compare()` | Ordering/sorting | `-1` / `0` / `1` |
| `crypto.timingSafeEqual()` | Secure comparison | `true` / `false` |

### Key Takeaways

1. **Never** use `===` to compare buffers
2. Use `equals()` to check if buffers are identical
3. Use `compare()` for sorting or ordering
4. Use `crypto.timingSafeEqual()` for security-critical comparisons
5. Check lengths first for efficiency
6. Partial comparison is possible with ranges

### Quick Reference

```javascript
// Equality
buf1.equals(buf2); // true/false

// Ordering
buf1.compare(buf2); // -1/0/1

// Sorting
buffers.sort((a, b) => a.compare(b));

// Secure comparison
crypto.timingSafeEqual(buf1, buf2);
```

---

## Next Steps

- Read [Buffer Concatenation](./06-buffer-concatenation.md)
- Practice comparing buffers
- Understand when to use each comparison method
