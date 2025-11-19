# Character Encodings

Understanding how text is represented as binary data.

## Table of Contents
- [What is Character Encoding?](#what-is-character-encoding)
- [Supported Encodings](#supported-encodings)
- [UTF-8 in Detail](#utf-8-in-detail)
- [Common Encodings Compared](#common-encodings-compared)
- [Choosing the Right Encoding](#choosing-the-right-encoding)
- [Common Pitfalls](#common-pitfalls)

---

## What is Character Encoding?

**Character encoding** is a system that maps characters to numbers (bytes).

```
Character → Number → Binary
   'A'    →   65   → 01000001
```

### Why Encodings Matter

Computers only understand numbers. To store or transmit text, we need to:
1. Convert characters to numbers (**encoding**)
2. Convert numbers back to characters (**decoding**)

```javascript
// Encoding: Text → Binary
const text = 'Hello';
const buffer = Buffer.from(text, 'utf8');
console.log(buffer); // <Buffer 48 65 6c 6c 6f>

// Decoding: Binary → Text
const decoded = buffer.toString('utf8');
console.log(decoded); // 'Hello'
```

---

## Supported Encodings

Node.js buffers support these encodings:

| Encoding | Description | Bytes per Char | Use Case |
|----------|-------------|----------------|----------|
| `utf8` | Universal encoding | 1-4 | **Default**, supports all languages |
| `utf16le` | UTF-16 Little-Endian | 2-4 | Windows, Java strings |
| `latin1` | ISO-8859-1 | 1 | Western European |
| `ascii` | ASCII | 1 | Basic English (0-127) |
| `base64` | Base64 encoding | N/A | Binary→Text conversion |
| `hex` | Hexadecimal | N/A | Binary→Hex string |
| `binary` | Alias for latin1 | 1 | **Deprecated** |

---

## UTF-8 in Detail

**UTF-8** (Universal Character Set Transformation Format - 8-bit) is the most common encoding.

### Why UTF-8?

✅ **Universal**: Supports all Unicode characters (140,000+)
✅ **Efficient**: 1 byte for ASCII, more for other characters
✅ **Backward compatible**: ASCII is valid UTF-8
✅ **Web standard**: Default for HTML, JSON, APIs

### Variable-Length Encoding

UTF-8 uses 1-4 bytes depending on the character:

| Character Type | Bytes | Example |
|----------------|-------|---------|
| ASCII (0-127) | 1 | 'A', '0', '$' |
| Latin Extended | 2 | 'é', 'ñ', 'ü' |
| Most languages | 3 | '中', '日', '한' |
| Emoji | 4 | '😀', '🚀', '❤️' |

```javascript
console.log(Buffer.byteLength('A', 'utf8'));    // 1 byte
console.log(Buffer.byteLength('é', 'utf8'));    // 2 bytes
console.log(Buffer.byteLength('中', 'utf8'));   // 3 bytes
console.log(Buffer.byteLength('😀', 'utf8'));   // 4 bytes
```

### UTF-8 Example

```javascript
const text = 'Hello 世界 🌍';

const buf = Buffer.from(text, 'utf8');
console.log(buf.length); // 15 bytes

// Breakdown:
// 'Hello' = 5 bytes (1 each)
// ' '     = 1 byte
// '世'    = 3 bytes
// '界'    = 3 bytes
// ' '     = 1 byte
// '🌍'    = 4 bytes
// Total   = 15 bytes
```

---

## Common Encodings Compared

### 1. UTF-8 (Default)

```javascript
const buf = Buffer.from('Hello 世界', 'utf8');
console.log(buf);
// <Buffer 48 65 6c 6c 6f 20 e4 b8 96 e7 95 8c>
//         H  e  l  l  o     世(3 bytes) 界(3 bytes)
console.log(buf.length); // 11 bytes
```

**Use for**: Everything (default choice)

### 2. ASCII

```javascript
const buf = Buffer.from('Hello', 'ascii');
console.log(buf);
// <Buffer 48 65 6c 6c 6f>
console.log(buf.length); // 5 bytes

// Non-ASCII characters are mangled
const buf2 = Buffer.from('Hello 世界', 'ascii');
console.log(buf2.toString('ascii')); // 'Hello ??' (loses data!)
```

**Use for**: Pure ASCII text (A-Z, 0-9, basic symbols)

### 3. Latin1 (ISO-8859-1)

```javascript
const buf = Buffer.from('Héllo', 'latin1');
console.log(buf);
// <Buffer 48 e9 6c 6c 6f>
//         H  é  l  l  o
console.log(buf.length); // 5 bytes

// Only supports western European characters
const buf2 = Buffer.from('Hello 世界', 'latin1');
console.log(buf2.toString('latin1')); // Garbage (loses data!)
```

**Use for**: Western European text, legacy systems

### 4. UTF-16LE

```javascript
const buf = Buffer.from('Hello', 'utf16le');
console.log(buf);
// <Buffer 48 00 65 00 6c 00 6c 00 6f 00>
//         H     e     l     l     o
console.log(buf.length); // 10 bytes (2 bytes per char)
```

**Use for**: Windows systems, Java interop

### 5. Base64

```javascript
// Encode binary as text
const binary = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
const base64 = binary.toString('base64');
console.log(base64); // '/9j/4A=='

// Decode back to binary
const decoded = Buffer.from(base64, 'base64');
console.log(decoded); // <Buffer ff d8 ff e0>
```

**Use for**: Embedding binary in text (JSON, XML, URLs)

### 6. Hexadecimal

```javascript
// Encode as hex
const buf = Buffer.from('Hello');
const hex = buf.toString('hex');
console.log(hex); // '48656c6c6f'

// Decode from hex
const decoded = Buffer.from('48656c6c6f', 'hex');
console.log(decoded.toString()); // 'Hello'
```

**Use for**: Debugging, color codes, binary data display

---

## Choosing the Right Encoding

### Decision Tree

```
What type of data?
│
├─ Text data?
│  │
│  ├─ Supports all languages?
│  │  └─ YES → utf8 (default)
│  │
│  ├─ Only ASCII (A-Z, 0-9)?
│  │  └─ YES → ascii
│  │
│  └─ Western European only?
│     └─ YES → latin1
│
├─ Binary data to transmit as text?
│  │
│  ├─ For URLs/JSON?
│  │  └─ YES → base64
│  │
│  └─ For debugging/display?
│     └─ YES → hex
│
└─ Windows/Java interop?
   └─ YES → utf16le
```

### Common Scenarios

#### Scenario 1: Web Application (API, Database)

```javascript
// ✅ Use UTF-8
const json = JSON.stringify({ message: 'Hello 世界' });
const buf = Buffer.from(json, 'utf8');
```

#### Scenario 2: Email Attachment

```javascript
// ✅ Use Base64
const fileBuffer = fs.readFileSync('document.pdf');
const base64 = fileBuffer.toString('base64');
const email = `
  Content-Type: application/pdf
  Content-Transfer-Encoding: base64

  ${base64}
`;
```

#### Scenario 3: Color Codes

```javascript
// ✅ Use Hex
const color = Buffer.from([0xFF, 0x00, 0x00]);
console.log('#' + color.toString('hex')); // '#ff0000' (red)
```

#### Scenario 4: Legacy System (Western European)

```javascript
// ✅ Use Latin1
const buf = Buffer.from('Café', 'latin1');
sendToLegacySystem(buf);
```

---

## Common Pitfalls

### Pitfall 1: Wrong Encoding Loses Data

```javascript
// ❌ Using ASCII for non-ASCII text
const buf = Buffer.from('Hello 世界', 'ascii');
console.log(buf.toString('ascii')); // 'Hello ??' (lost!)

// ✅ Use UTF-8
const buf = Buffer.from('Hello 世界', 'utf8');
console.log(buf.toString('utf8')); // 'Hello 世界' ✓
```

### Pitfall 2: Mismatched Encoding/Decoding

```javascript
// ❌ Encode with one, decode with another
const buf = Buffer.from('Hello', 'utf8');
console.log(buf.toString('utf16le')); // Garbage!

// ✅ Use same encoding
const buf = Buffer.from('Hello', 'utf8');
console.log(buf.toString('utf8')); // 'Hello' ✓
```

### Pitfall 3: String Length vs Byte Length

```javascript
const text = '😀';

// ❌ Using string length
console.log(text.length); // 2 (wrong!)
const buf = Buffer.alloc(text.length);
buf.write(text); // Doesn't fit!

// ✅ Using byte length
const byteLen = Buffer.byteLength(text, 'utf8'); // 4
const buf = Buffer.alloc(byteLen);
buf.write(text); // ✓
```

### Pitfall 4: Not Specifying Encoding

```javascript
// ❌ Relying on default
const buf = Buffer.from('Hello');
const str = buf.toString();

// ✅ Explicit encoding
const buf = Buffer.from('Hello', 'utf8');
const str = buf.toString('utf8');
```

---

## Encoding Examples

### Example 1: Multi-language Support

```javascript
const texts = {
  english: 'Hello',
  spanish: 'Hola',
  chinese: '你好',
  arabic: 'مرحبا',
  emoji: '👋'
};

// All work with UTF-8
Object.entries(texts).forEach(([lang, text]) => {
  const buf = Buffer.from(text, 'utf8');
  console.log(`${lang}: ${buf.length} bytes`);
  console.log(buf.toString('utf8'));
});
```

### Example 2: Binary to Text Conversion

```javascript
// Image bytes (PNG signature)
const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// As hexadecimal (for debugging)
console.log(pngSignature.toString('hex'));
// '89504e470d0a1a0a'

// As base64 (for transmission)
console.log(pngSignature.toString('base64'));
// 'iVBORw0KGgo='
```

### Example 3: Cross-Platform Text File

```javascript
const fs = require('fs');

// Always use UTF-8 for cross-platform compatibility
const text = 'Hello World\n你好世界';

// Write as UTF-8
fs.writeFileSync('file.txt', Buffer.from(text, 'utf8'));

// Read as UTF-8
const buffer = fs.readFileSync('file.txt');
const decoded = buffer.toString('utf8');
console.log(decoded);
```

---

## Best Practices

### 1. Default to UTF-8

```javascript
// ✅ Default choice for text
const buf = Buffer.from('Hello World', 'utf8');
```

### 2. Always Specify Encoding

```javascript
// ✅ Explicit
Buffer.from('text', 'utf8');
buffer.toString('utf8');

// ❌ Implicit (relying on defaults)
Buffer.from('text');
buffer.toString();
```

### 3. Use Base64 for Binary in Text Formats

```javascript
// ✅ Embedding image in JSON
const image = fs.readFileSync('photo.jpg');
const data = {
  filename: 'photo.jpg',
  data: image.toString('base64')
};
```

### 4. Validate Encoding Compatibility

```javascript
function safeEncode(text, encoding) {
  const buf = Buffer.from(text, encoding);
  const decoded = buf.toString(encoding);

  if (decoded !== text) {
    throw new Error(`Text cannot be safely encoded as ${encoding}`);
  }

  return buf;
}

// Test
safeEncode('Hello', 'ascii');    // ✓ OK
safeEncode('Hello 世界', 'ascii'); // ✗ Throws error
```

---

## Summary

### Quick Reference

| Encoding | Best For | Bytes/Char | Supports |
|----------|----------|------------|----------|
| **utf8** | Everything | 1-4 | All Unicode |
| **ascii** | Basic English | 1 | A-Z, 0-9 |
| **latin1** | Western European | 1 | 0-255 |
| **utf16le** | Windows/Java | 2-4 | All Unicode |
| **base64** | Binary→Text | ~133% | Binary data |
| **hex** | Debugging | 200% | Binary data |

### Key Takeaways

1. **UTF-8** is the default and best choice for most cases
2. Always **specify encoding** explicitly
3. Use **Buffer.byteLength()** not string.length for buffer allocation
4. **Base64** for embedding binary in text formats
5. **Hex** for debugging and displaying binary data
6. Match encoding and decoding methods

---

## Next Steps

- Read [Reading and Writing Bytes](./04-reading-writing-bytes.md)
- Practice with different encodings
- Understand encoding implications for your use cases
