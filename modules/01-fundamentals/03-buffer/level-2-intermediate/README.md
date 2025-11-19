# Level 2: Intermediate Buffer Operations

Master advanced buffer manipulation techniques and binary data processing.

## Learning Objectives

By completing this level, you will:

- ✅ Read and write numeric values (integers, floats)
- ✅ Understand and handle endianness (little-endian vs big-endian)
- ✅ Work with TypedArrays and ArrayBuffers
- ✅ Parse binary file formats
- ✅ Implement binary protocol encoders/decoders
- ✅ Optimize buffer operations for performance

---

## Prerequisites

- Completed [Level 1: Basics](../level-1-basics/README.md)
- Understanding of binary numbers
- Familiarity with data types (int, float, etc.)

---

## Time Commitment

**Estimated time**: 2-3 hours
- Reading guides: 60-75 minutes
- Exercises: 60-75 minutes
- Experimentation: 30 minutes

---

## Conceptual Guides

### Essential Reading

1. **[Numeric Data Types](guides/01-numeric-data-types.md)** (12 min)
   - Understanding integers and floats
   - Signed vs unsigned values
   - Data type ranges and precision

2. **[Endianness](guides/02-endianness.md)** (15 min)
   - Little-endian vs big-endian
   - Platform differences
   - When endianness matters

3. **[Reading and Writing Numbers](guides/03-reading-writing-numbers.md)** (12 min)
   - Buffer methods for numeric values
   - Working with different data sizes
   - Offset management

4. **[TypedArrays and ArrayBuffer](guides/04-typedarrays.md)** (15 min)
   - Understanding TypedArray family
   - Buffer relationship with TypedArray
   - When to use each

5. **[Binary File Formats](guides/05-binary-file-formats.md)** (15 min)
   - Common binary file structures
   - Parsing binary headers
   - Building binary files

6. **[Binary Protocols](guides/06-binary-protocols.md)** (15 min)
   - Protocol design principles
   - Message framing
   - Encoding/decoding patterns

---

## What You'll Learn

### Numeric Data Types

Understanding how different number types are stored:

```javascript
const buf = Buffer.alloc(16);
let offset = 0;

// 8-bit integer (1 byte)
buf.writeInt8(127, offset); offset += 1;

// 16-bit integer (2 bytes)
buf.writeInt16LE(32767, offset); offset += 2;

// 32-bit integer (4 bytes)
buf.writeInt32LE(2147483647, offset); offset += 4;

// 64-bit float (8 bytes)
buf.writeDoubleLE(3.14159, offset); offset += 8;

console.log(buf);
```

### Endianness

Little-endian vs big-endian byte ordering:

```javascript
const buf = Buffer.alloc(4);
const value = 0x12345678;

// Little-endian (least significant byte first)
buf.writeUInt32LE(value, 0);
console.log(buf); // <Buffer 78 56 34 12>

// Big-endian (most significant byte first)
buf.writeUInt32BE(value, 0);
console.log(buf); // <Buffer 12 34 56 78>
```

### TypedArrays

Working with typed array views:

```javascript
// Create buffer
const buf = Buffer.alloc(16);

// Create TypedArray views
const uint8 = new Uint8Array(buf.buffer);
const uint16 = new Uint16Array(buf.buffer);
const float32 = new Float32Array(buf.buffer);

// Write using different views
uint8[0] = 255;
uint16[1] = 65535;
float32[2] = 3.14;

console.log(buf);
```

---

## Practical Examples

### Example 1: Parsing BMP Header

```javascript
function parseBMPHeader(buffer) {
  let offset = 0;

  // BMP signature (2 bytes)
  const signature = buffer.toString('ascii', offset, offset + 2);
  offset += 2;

  // File size (4 bytes, little-endian)
  const fileSize = buffer.readUInt32LE(offset);
  offset += 4;

  // Reserved (4 bytes)
  offset += 4;

  // Pixel data offset (4 bytes)
  const pixelDataOffset = buffer.readUInt32LE(offset);
  offset += 4;

  // Header size (4 bytes)
  const headerSize = buffer.readUInt32LE(offset);
  offset += 4;

  // Image width (4 bytes)
  const width = buffer.readInt32LE(offset);
  offset += 4;

  // Image height (4 bytes)
  const height = buffer.readInt32LE(offset);
  offset += 4;

  return {
    signature,
    fileSize,
    pixelDataOffset,
    headerSize,
    width,
    height
  };
}
```

### Example 2: Building Network Packet

```javascript
function createPacket(type, id, data) {
  // Calculate total size
  const headerSize = 8; // type(1) + flags(1) + id(4) + length(2)
  const totalSize = headerSize + data.length;

  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  // Type (1 byte)
  buf.writeUInt8(type, offset); offset += 1;

  // Flags (1 byte)
  buf.writeUInt8(0, offset); offset += 1;

  // Packet ID (4 bytes, big-endian for network)
  buf.writeUInt32BE(id, offset); offset += 4;

  // Data length (2 bytes)
  buf.writeUInt16BE(data.length, offset); offset += 2;

  // Data
  data.copy(buf, offset);

  return buf;
}
```

---

## Exercises

### Exercise 1: WAV File Parser
Parse WAV audio file headers to extract sample rate, channels, and bit depth.

**Skills practiced:**
- Reading multi-byte integers
- Understanding file format specifications
- Parsing binary headers

### Exercise 2: TCP Packet Builder
Implement a simple TCP-like packet format with checksum.

**Skills practiced:**
- Binary protocol design
- Endianness handling
- Checksum calculation

### Exercise 3: TypedArray Converter
Build utilities to convert between different TypedArray types.

**Skills practiced:**
- Working with TypedArrays
- Understanding data type conversions
- Buffer/TypedArray interop

### Exercise 4: Binary Serializer
Create a serializer for JavaScript objects to binary format.

**Skills practiced:**
- Binary encoding design
- Type encoding
- Variable-length data handling

### Exercise 5: Network Protocol Implementation
Implement a complete binary protocol with header, body, and checksum.

**Skills practiced:**
- Protocol specification
- Encoding/decoding
- Error handling

---

## Success Criteria

You've mastered Level 2 when you can:

- [ ] Read and write all numeric data types
- [ ] Explain the difference between little-endian and big-endian
- [ ] Choose the correct endianness for different scenarios
- [ ] Work with TypedArrays and understand their relationship to Buffer
- [ ] Parse real-world binary file formats
- [ ] Implement a binary protocol encoder/decoder
- [ ] Handle offset management in complex binary structures
- [ ] Convert between different numeric representations

---

## Common Pitfalls

### ❌ Pitfall 1: Wrong Endianness

```javascript
// Reading network data (big-endian) with wrong method
const port = buffer.readUInt16LE(0); // ❌ Wrong for network data

// Correct
const port = buffer.readUInt16BE(0); // ✅ Network byte order
```

### ❌ Pitfall 2: Overflow

```javascript
// Trying to store value too large for data type
buf.writeInt8(500, 0); // ❌ Max is 127, wraps around

// Correct - use appropriate size
buf.writeInt16LE(500, 0); // ✅ Can store up to 32767
```

### ❌ Pitfall 3: Offset Management

```javascript
// Not tracking offset
buf.writeInt32LE(value1, 0);
buf.writeInt32LE(value2, 0); // ❌ Overwrites value1!

// Correct
let offset = 0;
buf.writeInt32LE(value1, offset); offset += 4;
buf.writeInt32LE(value2, offset); offset += 4;
```

---

## Best Practices

### 1. Always Track Offset

```javascript
function writeData(buf) {
  let offset = 0;
  buf.writeUInt8(type, offset); offset += 1;
  buf.writeUInt32LE(id, offset); offset += 4;
  buf.writeUInt16LE(length, offset); offset += 2;
  return offset;
}
```

### 2. Use Appropriate Data Types

```javascript
// Choose smallest type that fits
const age = 25;
buf.writeUInt8(age, 0);     // ✅ 0-255 is enough

const population = 1000000;
buf.writeUInt32LE(population, 0); // ✅ Needs 32-bit
```

### 3. Document Binary Formats

```javascript
/**
 * Packet Format:
 * Offset | Size | Type   | Description
 * -------|------|--------|-------------
 * 0      | 1    | uint8  | Packet type
 * 1      | 1    | uint8  | Flags
 * 2      | 4    | uint32 | Packet ID (BE)
 * 6      | 2    | uint16 | Data length (BE)
 * 8      | N    | bytes  | Data
 */
```

---

## What's Next?

After completing Level 2, you'll be ready for:

### Level 3: Advanced Buffer Operations
- Zero-copy operations
- Buffer pooling strategies
- High-performance parsing
- Streaming binary data
- Security considerations
- Production optimization

---

## Additional Resources

### Reference Materials
- [Node.js Buffer API](https://nodejs.org/api/buffer.html)
- [Binary File Formats](https://en.wikipedia.org/wiki/List_of_file_formats)
- [Network Byte Order](https://en.wikipedia.org/wiki/Endianness#Networking)

### Practice Projects
1. **Image File Parser** - Parse PNG, BMP, or JPEG headers
2. **Network Protocol** - Implement a simple RPC protocol
3. **Binary Data Logger** - Create binary log file format
4. **Game Save File** - Design and implement save file format

---

## Let's Continue!

Start with **[Numeric Data Types](guides/01-numeric-data-types.md)** to understand how numbers are stored in binary format.
