# Buffer Concatenation

Understanding how to join multiple buffers efficiently.

## Table of Contents
- [Why Concatenate Buffers?](#why-concatenate-buffers)
- [Using Buffer.concat()](#using-bufferconcat)
- [Manual Concatenation](#manual-concatenation)
- [Performance Considerations](#performance-considerations)
- [Common Patterns](#common-patterns)

---

## Why Concatenate Buffers?

Combining multiple buffers is common when:
- **Assembling messages** from network packets
- **Building files** from chunks
- **Collecting stream data** over time
- **Creating composite data** from multiple sources

```javascript
// Example: Assembling a complete message
const header = Buffer.from('HEADER:');
const body = Buffer.from('Message content');
const footer = Buffer.from(':END');

const message = Buffer.concat([header, body, footer]);
console.log(message.toString());
// 'HEADER:Message content:END'
```

---

## Using Buffer.concat()

### Basic Usage

```javascript
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');

const combined = Buffer.concat([buf1, buf2]);
console.log(combined.toString()); // 'Hello World'
```

### Syntax

```javascript
Buffer.concat(list[, totalLength])
```

**Parameters:**
- `list`: Array of buffers to concatenate
- `totalLength` (optional): Total length of result

### Examples

```javascript
// Concatenate multiple buffers
const buffers = [
  Buffer.from('Node'),
  Buffer.from('.'),
  Buffer.from('js')
];

const result = Buffer.concat(buffers);
console.log(result.toString()); // 'Node.js'
```

### With Total Length

Specifying total length can improve performance:

```javascript
const buf1 = Buffer.from('Hello '); // 6 bytes
const buf2 = Buffer.from('World');  // 5 bytes

// Specify total length (11 bytes)
const combined = Buffer.concat([buf1, buf2], 11);
console.log(combined.toString()); // 'Hello World'
```

### Truncation

If total length is less than actual data, result is truncated:

```javascript
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');

// Only use first 8 bytes
const truncated = Buffer.concat([buf1, buf2], 8);
console.log(truncated.toString()); // 'Hello Wo' (truncated)
```

### Padding

If total length is more than data, result is padded with zeros:

```javascript
const buf1 = Buffer.from('Hi');

// Pad to 5 bytes
const padded = Buffer.concat([buf1], 5);
console.log(padded); // <Buffer 48 69 00 00 00>
console.log(padded.toString()); // 'Hi\x00\x00\x00'
```

---

## Manual Concatenation

### Using copy()

```javascript
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');

// Create target buffer
const result = Buffer.alloc(buf1.length + buf2.length);

// Copy each buffer
buf1.copy(result, 0);           // Copy buf1 to position 0
buf2.copy(result, buf1.length); // Copy buf2 after buf1

console.log(result.toString()); // 'Hello World'
```

### Step-by-Step copy()

```javascript
const source = Buffer.from('abc');
const target = Buffer.alloc(6);

// Copy syntax: source.copy(target, targetStart, sourceStart, sourceEnd)
source.copy(target, 0); // Copy to start of target
source.copy(target, 3); // Copy again to position 3

console.log(target.toString()); // 'abcabc'
```

### Array-Style Concatenation (Don't Do This!)

```javascript
// ❌ DOESN'T WORK - buffers aren't strings
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');
const wrong = buf1 + buf2; // Converts to strings!
console.log(wrong); // '[object Object][object Object]'

// ✅ USE Buffer.concat()
const right = Buffer.concat([buf1, buf2]);
console.log(right.toString()); // 'Hello World'
```

---

## Performance Considerations

### Pre-allocating vs Growing

```javascript
// ❌ Inefficient - multiple allocations
let result = Buffer.alloc(0);
for (const buf of buffers) {
  result = Buffer.concat([result, buf]);
}

// ✅ Efficient - single allocation
const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
const result = Buffer.concat(buffers, totalLength);
```

### Benchmark Comparison

```javascript
// Slow approach
console.time('without length');
let buf = Buffer.alloc(0);
for (let i = 0; i < 1000; i++) {
  buf = Buffer.concat([buf, Buffer.from('x')]);
}
console.timeEnd('without length');
// without length: ~15ms

// Fast approach
console.time('with length');
const chunks = [];
for (let i = 0; i < 1000; i++) {
  chunks.push(Buffer.from('x'));
}
const result = Buffer.concat(chunks, 1000);
console.timeEnd('with length');
// with length: ~2ms
```

### Best Practice: Collect Then Concatenate

```javascript
// ✅ Efficient pattern
const chunks = [];

// Collect chunks
chunks.push(Buffer.from('chunk1'));
chunks.push(Buffer.from('chunk2'));
chunks.push(Buffer.from('chunk3'));

// Concatenate once
const result = Buffer.concat(chunks);
```

---

## Practical Examples

### Example 1: Building Binary Protocol Message

```javascript
function buildMessage(type, payload) {
  // Header: 1 byte type + 2 bytes length
  const header = Buffer.alloc(3);
  header.writeUInt8(type, 0);
  header.writeUInt16LE(payload.length, 1);

  // Combine header and payload
  return Buffer.concat([header, payload]);
}

const payload = Buffer.from('Hello');
const message = buildMessage(0x01, payload);

console.log(message);
// <Buffer 01 05 00 48 65 6c 6c 6f>
//         ^  ^  ^  payload...
//         |  |  |
//      type  length (5 in little-endian)
```

### Example 2: Stream Assembly

```javascript
class BufferAssembler {
  constructor() {
    this.chunks = [];
    this.length = 0;
  }

  add(chunk) {
    this.chunks.push(chunk);
    this.length += chunk.length;
  }

  toBuffer() {
    return Buffer.concat(this.chunks, this.length);
  }

  reset() {
    this.chunks = [];
    this.length = 0;
  }
}

// Usage
const assembler = new BufferAssembler();
assembler.add(Buffer.from('Hello '));
assembler.add(Buffer.from('World'));
assembler.add(Buffer.from('!'));

const result = assembler.toBuffer();
console.log(result.toString()); // 'Hello World!'
```

### Example 3: File Assembly

```javascript
const fs = require('fs');

function assembleFile(parts, output) {
  // Read all parts
  const buffers = parts.map(file => fs.readFileSync(file));

  // Calculate total size
  const totalSize = buffers.reduce((sum, buf) => sum + buf.length, 0);

  // Concatenate
  const combined = Buffer.concat(buffers, totalSize);

  // Write result
  fs.writeFileSync(output, combined);

  return totalSize;
}

// Assemble file from parts
const size = assembleFile(
  ['part1.bin', 'part2.bin', 'part3.bin'],
  'complete.bin'
);

console.log(`Assembled ${size} bytes`);
```

### Example 4: Adding Separator

```javascript
function joinBuffers(buffers, separator) {
  if (buffers.length === 0) {
    return Buffer.alloc(0);
  }

  if (buffers.length === 1) {
    return buffers[0];
  }

  // Interleave buffers with separator
  const parts = [];
  for (let i = 0; i < buffers.length; i++) {
    parts.push(buffers[i]);
    if (i < buffers.length - 1) {
      parts.push(separator);
    }
  }

  return Buffer.concat(parts);
}

// Usage
const words = [
  Buffer.from('apple'),
  Buffer.from('banana'),
  Buffer.from('cherry')
];

const comma = Buffer.from(',');
const result = joinBuffers(words, comma);

console.log(result.toString()); // 'apple,banana,cherry'
```

### Example 5: Adding Header and Footer

```javascript
function wrapData(data, header, footer) {
  return Buffer.concat([
    header,
    data,
    footer
  ]);
}

// Example: HTTP-like response
const statusLine = Buffer.from('HTTP/1.1 200 OK\r\n');
const headers = Buffer.from('Content-Type: text/plain\r\n\r\n');
const body = Buffer.from('Hello World');

const header = Buffer.concat([statusLine, headers]);
const response = wrapData(body, header, Buffer.alloc(0));

console.log(response.toString());
```

---

## Common Patterns

### Pattern 1: Building from Pieces

```javascript
function buildPacket(parts) {
  // Calculate total length
  const total = parts.reduce((sum, p) => sum + p.length, 0);

  // Create header
  const header = Buffer.alloc(4);
  header.writeUInt32LE(total, 0);

  // Concatenate all
  return Buffer.concat([header, ...parts], 4 + total);
}
```

### Pattern 2: Chunked Collection

```javascript
function collectChunks(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

### Pattern 3: Padding

```javascript
function padBuffer(buffer, length, padByte = 0) {
  if (buffer.length >= length) {
    return buffer;
  }

  const padding = Buffer.alloc(length - buffer.length, padByte);
  return Buffer.concat([buffer, padding], length);
}

const buf = Buffer.from('Hi');
const padded = padBuffer(buf, 5, 0x20); // Pad with spaces
console.log(padded.toString()); // 'Hi   '
```

---

## Best Practices

### 1. Collect Before Concatenating

```javascript
// ✅ Good - collect then concatenate once
const chunks = [];
for (const item of items) {
  chunks.push(processItem(item));
}
const result = Buffer.concat(chunks);

// ❌ Bad - concatenate repeatedly
let result = Buffer.alloc(0);
for (const item of items) {
  result = Buffer.concat([result, processItem(item)]);
}
```

### 2. Specify Total Length

```javascript
// ✅ Good - pre-calculated length
const total = chunks.reduce((sum, c) => sum + c.length, 0);
const result = Buffer.concat(chunks, total);

// ❌ Less efficient - calculates internally
const result = Buffer.concat(chunks);
```

### 3. Use Helper Class for Repeated Concatenation

```javascript
// ✅ Good - efficient accumulation
class BufferBuilder {
  constructor() {
    this.parts = [];
  }

  append(buf) {
    this.parts.push(buf);
    return this;
  }

  build() {
    return Buffer.concat(this.parts);
  }
}

const builder = new BufferBuilder();
builder.append(buf1).append(buf2).append(buf3);
const result = builder.build();
```

### 4. Handle Empty Arrays

```javascript
function safeConcat(buffers) {
  if (!buffers || buffers.length === 0) {
    return Buffer.alloc(0);
  }
  return Buffer.concat(buffers);
}
```

---

## Summary

### Concatenation Methods

| Method | Use Case | Performance |
|--------|----------|-------------|
| `Buffer.concat()` | Standard concatenation | Good |
| `Buffer.concat(arr, length)` | With known length | Best |
| Manual `copy()` | Custom control | Moderate |

### Key Takeaways

1. Use `Buffer.concat()` for combining buffers
2. **Never** use `+` operator (doesn't work for buffers)
3. Collect chunks first, then concatenate once
4. Specify total length for better performance
5. Use helper classes for repeated concatenation
6. Handle empty arrays gracefully

### Quick Reference

```javascript
// Basic concatenation
const result = Buffer.concat([buf1, buf2, buf3]);

// With total length (faster)
const total = buf1.length + buf2.length + buf3.length;
const result = Buffer.concat([buf1, buf2, buf3], total);

// Collect then concatenate (best practice)
const chunks = [];
// ... collect chunks ...
const result = Buffer.concat(chunks);
```

---

## Next Steps

- Complete Level 1 exercises
- Practice buffer concatenation
- Build a buffer assembler class
- Move on to [Level 2: Intermediate](../../level-2-intermediate/README.md)
