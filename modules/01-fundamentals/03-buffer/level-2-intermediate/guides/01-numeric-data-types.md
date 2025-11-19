# Numeric Data Types

Understanding how numbers are represented and stored in buffers.

## Overview

Buffers can store various numeric types with different sizes and ranges:

| Type | Bytes | Range (Unsigned) | Range (Signed) |
|------|-------|------------------|----------------|
| Int8 / UInt8 | 1 | 0 to 255 | -128 to 127 |
| Int16 / UInt16 | 2 | 0 to 65,535 | -32,768 to 32,767 |
| Int32 / UInt32 | 4 | 0 to 4,294,967,295 | -2,147,483,648 to 2,147,483,647 |
| BigInt64 / BigUInt64 | 8 | 0 to 2^64-1 | -2^63 to 2^63-1 |
| Float | 4 | ±1.18e-38 to ±3.40e38 | 7 digits precision |
| Double | 8 | ±2.23e-308 to ±1.80e308 | 15-16 digits precision |

## Integer Types

### 8-bit Integers (1 byte)

```javascript
const buf = Buffer.alloc(2);

// Unsigned (0-255)
buf.writeUInt8(255, 0);
console.log(buf.readUInt8(0)); // 255

// Signed (-128 to 127)
buf.writeInt8(-128, 1);
console.log(buf.readInt8(1)); // -128
```

### 16-bit Integers (2 bytes)

```javascript
const buf = Buffer.alloc(4);

// Unsigned
buf.writeUInt16LE(65535, 0);
console.log(buf.readUInt16LE(0)); // 65535

// Signed
buf.writeInt16LE(-32768, 2);
console.log(buf.readInt16LE(2)); // -32768
```

### 32-bit Integers (4 bytes)

```javascript
const buf = Buffer.alloc(8);

// Unsigned
buf.writeUInt32LE(4294967295, 0);
console.log(buf.readUInt32LE(0)); // 4294967295

// Signed
buf.writeInt32LE(-2147483648, 4);
console.log(buf.readInt32LE(4)); // -2147483648
```

## Floating Point Types

### Float (32-bit)

```javascript
const buf = Buffer.alloc(4);

buf.writeFloatLE(3.14159, 0);
console.log(buf.readFloatLE(0)); // 3.1415901184082031 (precision loss)
```

### Double (64-bit)

```javascript
const buf = Buffer.alloc(8);

buf.writeDoubleLE(3.141592653589793, 0);
console.log(buf.readDoubleLE(0)); // 3.141592653589793 (precise)
```

## Choosing the Right Type

### Decision Criteria

1. **Range**: Does the value fit in the type?
2. **Precision**: Integers for exact values, floats for decimals
3. **Size**: Smaller types use less memory
4. **Compatibility**: Match protocol/format specifications

### Examples

```javascript
// Age (0-255) → UInt8
const age = 25;
buf.writeUInt8(age, 0); // 1 byte

// Year (0-65535) → UInt16
const year = 2024;
buf.writeUInt16LE(year, 0); // 2 bytes

// Population → UInt32
const population = 8000000000;
buf.writeUInt32LE(population, 0); // 4 bytes

// Temperature → Float
const temp = 36.6;
buf.writeFloatLE(temp, 0); // 4 bytes

// Scientific value → Double
const constant = 3.141592653589793;
buf.writeDoubleLE(constant, 0); // 8 bytes
```

## Summary

- Choose smallest type that fits your data
- Use integers for exact values
- Use floats/doubles for decimal values
- Consider endianness (covered in next guide)
