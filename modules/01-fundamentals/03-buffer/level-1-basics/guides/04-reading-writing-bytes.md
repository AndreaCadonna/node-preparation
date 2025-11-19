# Reading and Writing Bytes

Understanding how to work with individual bytes in buffers.

## Table of Contents
- [Understanding Bytes](#understanding-bytes)
- [Reading Bytes](#reading-bytes)
- [Writing Bytes](#writing-bytes)
- [Hexadecimal Notation](#hexadecimal-notation)
- [Practical Examples](#practical-examples)

---

## Understanding Bytes

### What is a Byte?

A **byte** is 8 bits and can store values from **0 to 255** (unsigned) or **-128 to 127** (signed).

```
Bit:     0  1  1  0  1  0  0  0
Binary:  01101000
Decimal: 104
Hex:     0x68
ASCII:   'h'
```

### Why Bytes Matter

Everything in a buffer is bytes:
- Characters ('A' = 65)
- Numbers (42 = 0x2A)
- Binary data (image pixels, file headers)

```javascript
const buf = Buffer.from('Hi');
console.log(buf); // <Buffer 48 69>
//                          H   i
//                         72  105 (decimal)
//                         0x48 0x69 (hex)
```

---

## Reading Bytes

### Array-Style Access

Buffers can be accessed like arrays:

```javascript
const buf = Buffer.from('Hello');

console.log(buf[0]); // 72  ('H')
console.log(buf[1]); // 101 ('e')
console.log(buf[2]); // 108 ('l')
console.log(buf[3]); // 108 ('l')
console.log(buf[4]); // 111 ('o')
```

### Reading Methods

```javascript
const buf = Buffer.from([72, 101, 108, 108, 111]);

// Read single byte (0-255)
console.log(buf.readUInt8(0)); // 72

// Read at different positions
console.log(buf.readUInt8(0)); // 72  ('H')
console.log(buf.readUInt8(1)); // 101 ('e')
console.log(buf.readUInt8(4)); // 111 ('o')
```

### Reading Beyond Bounds

```javascript
const buf = Buffer.from('Hi');

console.log(buf[0]); // 72 ('H')
console.log(buf[1]); // 105 ('i')
console.log(buf[2]); // undefined (out of bounds)
console.log(buf[100]); // undefined
```

### Iterating Over Bytes

```javascript
const buf = Buffer.from('Hello');

// Method 1: for loop
for (let i = 0; i < buf.length; i++) {
  console.log(buf[i]);
}

// Method 2: for...of
for (const byte of buf) {
  console.log(byte);
}

// Method 3: forEach
buf.forEach((byte, index) => {
  console.log(`buf[${index}] = ${byte}`);
});

// Output for all methods:
// 72, 101, 108, 108, 111
```

---

## Writing Bytes

### Direct Assignment

```javascript
const buf = Buffer.alloc(5);

// Write individual bytes
buf[0] = 72;  // 'H'
buf[1] = 101; // 'e'
buf[2] = 108; // 'l'
buf[3] = 108; // 'l'
buf[4] = 111; // 'o'

console.log(buf.toString()); // 'Hello'
```

### Writing Methods

```javascript
const buf = Buffer.alloc(5);

// Write single byte
buf.writeUInt8(72, 0);  // Write 72 at position 0
buf.writeUInt8(101, 1); // Write 101 at position 1
buf.writeUInt8(108, 2); // Write 108 at position 2
buf.writeUInt8(108, 3); // Write 108 at position 3
buf.writeUInt8(111, 4); // Write 111 at position 4

console.log(buf.toString()); // 'Hello'
```

### write() Method

```javascript
const buf = Buffer.alloc(11);

// Write string starting at position 0
buf.write('Hello', 0, 'utf8');

// Write at different position
buf.write(' World', 5, 'utf8');

console.log(buf.toString()); // 'Hello World'
```

### fill() Method

```javascript
// Fill entire buffer with same value
const buf1 = Buffer.alloc(5);
buf1.fill(65); // Fill with 'A'
console.log(buf1.toString()); // 'AAAAA'

// Fill range
const buf2 = Buffer.alloc(5);
buf2.fill(65, 0, 2); // Fill positions 0-1 with 'A'
buf2.fill(66, 2, 5); // Fill positions 2-4 with 'B'
console.log(buf2.toString()); // 'AABBB'
```

---

## Hexadecimal Notation

### Why Hexadecimal?

Hex is more compact than decimal for bytes:
- Decimal: 0-255 (1-3 digits)
- Hex: 0x00-0xFF (always 2 digits)

### Hex Basics

```javascript
// Decimal to Hex
console.log((72).toString(16));   // '48'
console.log((255).toString(16));  // 'ff'

// Hex to Decimal
console.log(parseInt('48', 16));  // 72
console.log(parseInt('FF', 16));  // 255

// Hex literals in JavaScript
console.log(0x48);  // 72
console.log(0xFF);  // 255
```

### Using Hex with Buffers

```javascript
// Writing hex values
const buf = Buffer.alloc(3);
buf[0] = 0xFF; // 255
buf[1] = 0x00; // 0
buf[2] = 0x7F; // 127

console.log(buf); // <Buffer ff 00 7f>

// Creating from hex
const buf2 = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
console.log(buf2.toString()); // 'Hello'

// Reading as hex
const buf3 = Buffer.from('Hello');
console.log(buf3.toString('hex')); // '48656c6c6f'
```

### Hex String Conversion

```javascript
// String to hex
const buf = Buffer.from('Hello');
const hex = buf.toString('hex');
console.log(hex); // '48656c6c6f'

// Hex to string
const buf2 = Buffer.from('48656c6c6f', 'hex');
console.log(buf2.toString()); // 'Hello'

// Hex with formatting
const formatted = hex.match(/.{2}/g).join(' ');
console.log(formatted); // '48 65 6c 6c 6f'
```

---

## Practical Examples

### Example 1: Inspecting File Header

```javascript
const fs = require('fs');

// Read first 4 bytes of a file
const buf = Buffer.alloc(4);
const fd = fs.openSync('file.bin', 'r');
fs.readSync(fd, buf, 0, 4, 0);
fs.closeSync(fd);

// Check file signature
console.log('Header bytes:', buf);
console.log('As hex:', buf.toString('hex'));

// Check for PNG signature
const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
if (buf.subarray(0, 4).equals(pngSig)) {
  console.log('This is a PNG file!');
}
```

### Example 2: Creating Binary Data

```javascript
// Create a simple binary file header
const header = Buffer.alloc(8);

// Magic number: 'TEST' (4 bytes)
header.write('TEST', 0, 4, 'ascii');

// Version: 1 (1 byte)
header.writeUInt8(1, 4);

// Flags: 0b10000001 (1 byte)
header.writeUInt8(0b10000001, 5);

// Reserved: 0 (2 bytes)
header.writeUInt16LE(0, 6);

console.log('Header:', header);
console.log('As hex:', header.toString('hex'));
// Header: <Buffer 54 45 53 54 01 81 00 00>
```

### Example 3: Byte Manipulation

```javascript
const buf = Buffer.from('Hello');

// XOR each byte with 0x20 (toggles case)
for (let i = 0; i < buf.length; i++) {
  buf[i] ^= 0x20;
}

console.log(buf.toString()); // 'hELLO' (case flipped)

// Flip back
for (let i = 0; i < buf.length; i++) {
  buf[i] ^= 0x20;
}

console.log(buf.toString()); // 'Hello'
```

### Example 4: Checksum Calculation

```javascript
function calculateChecksum(buffer) {
  let sum = 0;

  for (const byte of buffer) {
    sum += byte;
  }

  // Return as single byte (0-255)
  return sum & 0xFF;
}

const data = Buffer.from('Hello World');
const checksum = calculateChecksum(data);

console.log('Checksum:', checksum);
console.log('As hex:', checksum.toString(16));
```

### Example 5: Hex Dump

```javascript
function hexDump(buffer) {
  const bytesPerLine = 16;

  for (let i = 0; i < buffer.length; i += bytesPerLine) {
    // Offset
    const offset = i.toString(16).padStart(8, '0');

    // Hex values
    const line = buffer.subarray(i, i + bytesPerLine);
    const hex = Array.from(line)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');

    // ASCII representation
    const ascii = Array.from(line)
      .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
      .join('');

    console.log(`${offset}  ${hex.padEnd(48)}  ${ascii}`);
  }
}

// Example usage
const buf = Buffer.from('Hello World! This is a test.');
hexDump(buf);

// Output:
// 00000000  48 65 6c 6c 6f 20 57 6f 72 6c 64 21 20 54 68 69  Hello World! Thi
// 00000010  73 20 69 73 20 61 20 74 65 73 74 2e              s is a test.
```

---

## Common Patterns

### Pattern 1: Reading Binary Structure

```javascript
function readHeader(buffer) {
  let offset = 0;

  // Read magic number (4 bytes)
  const magic = buffer.toString('ascii', offset, offset + 4);
  offset += 4;

  // Read version (1 byte)
  const version = buffer.readUInt8(offset);
  offset += 1;

  // Read flags (1 byte)
  const flags = buffer.readUInt8(offset);
  offset += 1;

  return { magic, version, flags };
}

const buf = Buffer.from('TEST\x01\x81', 'binary');
const header = readHeader(buf);
console.log(header);
// { magic: 'TEST', version: 1, flags: 129 }
```

### Pattern 2: Building Binary Data

```javascript
function buildPacket(type, data) {
  const buf = Buffer.alloc(1 + 2 + data.length);
  let offset = 0;

  // Type (1 byte)
  buf.writeUInt8(type, offset);
  offset += 1;

  // Length (2 bytes)
  buf.writeUInt16LE(data.length, offset);
  offset += 2;

  // Data
  data.copy(buf, offset);

  return buf;
}

const data = Buffer.from('Hello');
const packet = buildPacket(0x01, data);
console.log(packet);
// <Buffer 01 05 00 48 65 6c 6c 6f>
//         type len   data...
```

---

## Best Practices

### 1. Check Bounds

```javascript
// ❌ No bounds check
function readByte(buf, index) {
  return buf[index];
}

// ✅ With bounds check
function readByte(buf, index) {
  if (index < 0 || index >= buf.length) {
    throw new RangeError('Index out of bounds');
  }
  return buf[index];
}
```

### 2. Use Appropriate Methods

```javascript
// ✅ Clear intent with writeUInt8
buf.writeUInt8(255, 0);

// ❌ Less clear with direct assignment
buf[0] = 255;
```

### 3. Document Binary Formats

```javascript
// ✅ Well-documented structure
/**
 * File Header Format:
 * Offset | Size | Description
 * -------|------|-------------
 * 0      | 4    | Magic: 'TEST'
 * 4      | 1    | Version
 * 5      | 1    | Flags
 * 6      | 2    | Reserved
 */
function parseHeader(buf) {
  // Implementation...
}
```

---

## Summary

### Key Takeaways

1. **Bytes** are values from 0-255
2. Access bytes with **array notation** `buf[index]`
3. **Hex** is cleaner for representing byte values
4. Use `writeUInt8()` and `readUInt8()` for clarity
5. Always **check bounds** when accessing bytes
6. **iterate** with for...of or forEach

### Common Operations

```javascript
// Create
const buf = Buffer.alloc(10);

// Write
buf[0] = 0xFF;
buf.writeUInt8(0x42, 1);
buf.write('Hi', 2);

// Read
const byte1 = buf[0];
const byte2 = buf.readUInt8(1);

// Display as hex
console.log(buf.toString('hex'));
```

---

## Next Steps

- Read [Buffer Comparison](./05-buffer-comparison.md)
- Practice reading and writing bytes
- Experiment with hex notation
