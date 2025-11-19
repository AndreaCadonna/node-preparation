# Reading and Writing Numbers

Practical guide to working with numeric values in buffers.

## Buffer Methods Overview

```javascript
// Writing: buf.write[Type][Endianness](value, offset)
// Reading: buf.read[Type][Endianness](offset)

// Examples:
buf.writeUInt32LE(value, offset);
const value = buf.readUInt32LE(offset);
```

## Common Patterns

### Pattern 1: Sequential Writing with Offset Tracking

```javascript
const buf = Buffer.alloc(20);
let offset = 0;

// Write header
buf.writeUInt8(0x01, offset); offset += 1;      // Type (1 byte)
buf.writeUInt16LE(100, offset); offset += 2;    // Length (2 bytes)
buf.writeUInt32LE(12345, offset); offset += 4;  // ID (4 bytes)
buf.writeDoubleLE(3.14, offset); offset += 8;   // Value (8 bytes)

console.log(`Total bytes written: ${offset}`); // 15
```

### Pattern 2: Sequential Reading

```javascript
function parseMessage(buf) {
  let offset = 0;

  const type = buf.readUInt8(offset); offset += 1;
  const length = buf.readUInt16LE(offset); offset += 2;
  const id = buf.readUInt32LE(offset); offset += 4;
  const value = buf.readDoubleLE(offset); offset += 8;

  return { type, length, id, value };
}
```

### Pattern 3: Helper Functions

```javascript
class BufferWriter {
  constructor(size) {
    this.buffer = Buffer.alloc(size);
    this.offset = 0;
  }

  writeUInt8(value) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
    return this;
  }

  writeUInt32LE(value) {
    this.buffer.writeUInt32LE(value, this.offset);
    this.offset += 4;
    return this;
  }

  toBuffer() {
    return this.buffer.subarray(0, this.offset);
  }
}

// Usage
const writer = new BufferWriter(100);
writer.writeUInt8(1).writeUInt32LE(12345).writeUInt32LE(67890);
const result = writer.toBuffer();
```

## Real-World Example: Network Packet

```javascript
/**
 * Packet Format:
 * - Magic (2 bytes): 0x1234
 * - Version (1 byte): 1
 * - Type (1 byte): Message type
 * - Sequence (4 bytes, BE): Packet sequence number
 * - Timestamp (8 bytes, BE): Unix timestamp in ms
 * - Payload length (2 bytes, BE): Length of payload
 * - Payload (variable): Actual data
 */

function createPacket(type, sequence, payload) {
  const headerSize = 18;
  const totalSize = headerSize + payload.length;
  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  // Magic number
  buf.writeUInt16BE(0x1234, offset); offset += 2;

  // Version
  buf.writeUInt8(1, offset); offset += 1;

  // Type
  buf.writeUInt8(type, offset); offset += 1;

  // Sequence (network byte order = big-endian)
  buf.writeUInt32BE(sequence, offset); offset += 4;

  // Timestamp
  const timestamp = BigInt(Date.now());
  buf.writeBigUInt64BE(timestamp, offset); offset += 8;

  // Payload length
  buf.writeUInt16BE(payload.length, offset); offset += 2;

  // Payload
  payload.copy(buf, offset);

  return buf;
}

function parsePacket(buf) {
  let offset = 0;

  // Verify magic
  const magic = buf.readUInt16BE(offset); offset += 2;
  if (magic !== 0x1234) {
    throw new Error('Invalid magic number');
  }

  // Read header
  const version = buf.readUInt8(offset); offset += 1;
  const type = buf.readUInt8(offset); offset += 1;
  const sequence = buf.readUInt32BE(offset); offset += 4;
  const timestamp = buf.readBigUInt64BE(offset); offset += 8;
  const payloadLength = buf.readUInt16BE(offset); offset += 2;

  // Extract payload
  const payload = buf.subarray(offset, offset + payloadLength);

  return {
    version,
    type,
    sequence,
    timestamp: Number(timestamp),
    payload
  };
}
```

## Summary

**Key practices:**
1. Always track offset when reading/writing
2. Use helper classes for complex structures
3. Match endianness to specification
4. Validate data ranges before writing
5. Document binary format clearly
