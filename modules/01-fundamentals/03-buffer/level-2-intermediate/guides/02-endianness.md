# Endianness

Understanding byte order in multi-byte values.

## What is Endianness?

**Endianness** determines the order in which bytes are stored for multi-byte values.

```javascript
const value = 0x12345678; // 4-byte integer

// Little-Endian (LE): [78][56][34][12]  ← least significant byte first
// Big-Endian (BE):    [12][34][56][78]  ← most significant byte first
```

## Visual Example

```
Value: 305,419,896 (decimal) = 0x12345678 (hex)

Breaking into bytes:
  0x12 = 18
  0x34 = 52
  0x56 = 86
  0x78 = 120

Little-Endian (LE):  [78][56][34][12]  (reversed)
Big-Endian (BE):     [12][34][56][78]  (natural order)
```

## Code Examples

```javascript
const buf = Buffer.alloc(4);
const value = 0x12345678;

// Little-Endian
buf.writeUInt32LE(value, 0);
console.log(buf); // <Buffer 78 56 34 12>

// Big-Endian
buf.writeUInt32BE(value, 0);
console.log(buf); // <Buffer 12 34 56 78>
```

## When Endianness Matters

### Network Protocols (Always Big-Endian)

```javascript
// TCP/IP, UDP use big-endian (network byte order)
const port = 8080;

// Correct for network
buf.writeUInt16BE(port, 0);

// Wrong for network
buf.writeUInt16LE(port, 0); // Will be misinterpreted!
```

### File Formats (Varies)

```javascript
// BMP files: little-endian
const width = buffer.readUInt32LE(18);

// PNG chunks: big-endian
const chunkLength = buffer.readUInt32BE(0);

// Always check format specification!
```

### Platform Differences

```javascript
// Most modern systems are little-endian:
// - x86, x86-64 (Intel, AMD)
// - ARM (most modes)

// Some systems are big-endian:
// - Older SPARC, PowerPC, some embedded systems

// Check system endianness
const uint32 = new Uint32Array([0x12345678]);
const uint8 = new Uint8Array(uint32.buffer);
const isLittleEndian = uint8[0] === 0x78;
console.log('System is', isLittleEndian ? 'little-endian' : 'big-endian');
```

## Buffer Methods

All numeric methods have LE and BE variants:

```javascript
// 16-bit
buf.writeInt16LE(value, offset);
buf.writeInt16BE(value, offset);
buf.readInt16LE(offset);
buf.readInt16BE(offset);

// 32-bit
buf.writeInt32LE(value, offset);
buf.writeInt32BE(value, offset);
buf.readInt32LE(offset);
buf.readInt32BE(offset);

// 64-bit float
buf.writeDoubleLE(value, offset);
buf.writeDoubleBE(value, offset);
buf.readDoubleLE(offset);
buf.readDoubleBE(offset);
```

## Best Practices

### 1. Always Specify Endianness

```javascript
// ✅ Explicit
const value = buf.readUInt32LE(0);

// ❌ Ambiguous (no default methods)
// const value = buf.readUInt32(0); // Doesn't exist!
```

### 2. Match Protocol Specification

```javascript
// Network protocols → Big-Endian
const port = buf.readUInt16BE(0);

// File formats → Check specification
const bmpWidth = buf.readUInt32LE(18);  // BMP is LE
const pngLength = buf.readUInt32BE(0);  // PNG is BE
```

### 3. Document Your Choice

```javascript
/**
 * Read packet header
 * All multi-byte values are big-endian (network byte order)
 */
function readHeader(buf) {
  const id = buf.readUInt32BE(0);
  const length = buf.readUInt16BE(4);
  return { id, length };
}
```

## Summary

- **Little-Endian (LE)**: Least significant byte first
- **Big-Endian (BE)**: Most significant byte first
- **Network**: Always big-endian
- **Files**: Check specification
- **Always** specify LE or BE in method names
