# TypedArrays and ArrayBuffer

Understanding the relationship between Buffers, TypedArrays, and ArrayBuffers.

## The Hierarchy

```
ArrayBuffer          ← Raw binary data container
    ↓
TypedArray          ← Typed view into ArrayBuffer
    ↓
Uint8Array          ← Specific TypedArray (8-bit unsigned)
    ↓
Buffer              ← Node.js extension of Uint8Array
```

## ArrayBuffer

Raw binary data storage:

```javascript
// Create ArrayBuffer
const arrayBuffer = new ArrayBuffer(16); // 16 bytes

// Cannot read/write directly
// arrayBuffer[0] = 255; // ❌ Doesn't work

// Need a view (TypedArray)
const view = new Uint8Array(arrayBuffer);
view[0] = 255; // ✅ Works
```

## TypedArray Family

| TypedArray | Bytes per Element | Value Range |
|------------|-------------------|-------------|
| Int8Array | 1 | -128 to 127 |
| Uint8Array | 1 | 0 to 255 |
| Int16Array | 2 | -32768 to 32767 |
| Uint16Array | 2 | 0 to 65535 |
| Int32Array | 4 | -2^31 to 2^31-1 |
| Uint32Array | 4 | 0 to 2^32-1 |
| Float32Array | 4 | Floating point |
| Float64Array | 8 | Floating point |
| BigInt64Array | 8 | BigInt |
| BigUint64Array | 8 | BigInt |

## Buffer and TypedArray

Buffer is a Uint8Array with extra methods:

```javascript
const buf = Buffer.from([1, 2, 3, 4]);

console.log(buf instanceof Buffer);    // true
console.log(buf instanceof Uint8Array); // true
```

## Using Multiple Views

```javascript
const buf = Buffer.alloc(8);

// Different views of same data
const uint8 = new Uint8Array(buf.buffer);
const uint16 = new Uint16Array(buf.buffer);
const uint32 = new Uint32Array(buf.buffer);
const float64 = new Float64Array(buf.buffer);

// Write as float64
float64[0] = 3.14159;

// Read as bytes
console.log(Array.from(uint8));
// [110, 134, 27, 240, 249, 33, 9, 64]

// Read as uint32
console.log(Array.from(uint32));
// [4036241518, 1074340345]
```

## Practical Example: Pixel Manipulation

```javascript
// RGBA pixel data
const width = 2, height = 2;
const pixels = new Uint8ClampedArray(width * height * 4);

// Set first pixel to red
pixels[0] = 255; // R
pixels[1] = 0;   // G
pixels[2] = 0;   // B
pixels[3] = 255; // A

// Convert to Buffer
const buf = Buffer.from(pixels.buffer);
```

## When to Use Each

**Use Buffer when:**
- Working with file I/O
- Network operations
- Need Buffer-specific methods (toString, etc.)

**Use TypedArray when:**
- Doing numeric computations
- Working with Web APIs
- Need specific numeric types

**Use ArrayBuffer when:**
- Sharing data between different views
- Need raw binary storage

## Summary

- Buffer extends Uint8Array
- TypedArrays provide typed views of binary data
- ArrayBuffer is the underlying storage
- Multiple views can access same data
- Choose based on your use case
