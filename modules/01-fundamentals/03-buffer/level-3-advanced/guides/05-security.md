# Security Considerations

Protecting against buffer-related security vulnerabilities.

## Common Vulnerabilities

### 1. Uninitialized Memory Exposure

```javascript
// ❌ DANGEROUS - may contain sensitive data
const buf = Buffer.allocUnsafe(10);
console.log(buf); // Random old data!

// ✅ SAFE - always initialized
const buf = Buffer.alloc(10);

// ✅ SAFE - fill immediately
const buf = Buffer.allocUnsafe(10);
buf.fill(0);
```

### 2. Buffer Overflow

```javascript
// ❌ Vulnerable - no bounds checking
function writeData(buf, data, offset) {
  buf.write(data, offset);
}

// ✅ Safe - validate bounds
function writeData(buf, data, offset) {
  if (offset + Buffer.byteLength(data) > buf.length) {
    throw new RangeError('Write would overflow buffer');
  }
  buf.write(data, offset);
}
```

### 3. Integer Overflow

```javascript
// ❌ Vulnerable to overflow
const length = untrustedInput;
const buf = Buffer.alloc(length); // Could be huge!

// ✅ Safe - validate input
const MAX_SIZE = 1024 * 1024; // 1MB
if (length > MAX_SIZE || length < 0) {
  throw new Error('Invalid size');
}
const buf = Buffer.alloc(length);
```

## Best Practices

### 1. Always Validate Input Sizes

```javascript
function safeRead(buffer, offset, length) {
  if (offset < 0 || length < 0) {
    throw new RangeError('Invalid offset or length');
  }
  if (offset + length > buffer.length) {
    throw new RangeError('Read out of bounds');
  }
  return buffer.subarray(offset, offset + length);
}
```

### 2. Clear Sensitive Data

```javascript
function processPassword(password) {
  const buf = Buffer.from(password, 'utf8');
  try {
    // Use password
    return authenticate(buf);
  } finally {
    // Clear buffer
    buf.fill(0);
  }
}
```

### 3. Use Timing-Safe Comparison

```javascript
const crypto = require('crypto');

// ❌ Vulnerable to timing attacks
if (hash1.equals(hash2)) { }

// ✅ Safe - constant-time comparison
if (crypto.timingSafeEqual(hash1, hash2)) { }
```

## Summary

- Never use allocUnsafe() without immediate fill
- Always validate buffer sizes and offsets
- Clear sensitive data after use
- Use timing-safe comparison for secrets
- Set maximum buffer sizes
- Validate all untrusted input
