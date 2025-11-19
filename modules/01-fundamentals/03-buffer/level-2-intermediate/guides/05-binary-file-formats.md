# Binary File Formats

Understanding and parsing common binary file formats.

## File Format Basics

Binary files typically have:
1. **Magic number** - File type identifier
2. **Header** - Metadata (size, version, etc.)
3. **Data** - Actual content
4. **Footer** - Optional end markers

## Example: BMP Image Format

```javascript
function parseBMPHeader(buffer) {
  let offset = 0;

  // Magic number (2 bytes): 'BM'
  const magic = buffer.toString('ascii', 0, 2);
  offset += 2;

  if (magic !== 'BM') {
    throw new Error('Not a BMP file');
  }

  // File size (4 bytes, LE)
  const fileSize = buffer.readUInt32LE(offset);
  offset += 4;

  // Reserved (4 bytes)
  offset += 4;

  // Pixel data offset (4 bytes, LE)
  const dataOffset = buffer.readUInt32LE(offset);
  offset += 4;

  // DIB header size (4 bytes, LE)
  const dibSize = buffer.readUInt32LE(offset);
  offset += 4;

  // Width (4 bytes, LE)
  const width = buffer.readInt32LE(offset);
  offset += 4;

  // Height (4 bytes, LE)
  const height = buffer.readInt32LE(offset);
  offset += 4;

  // Planes (2 bytes, LE)
  const planes = buffer.readUInt16LE(offset);
  offset += 2;

  // Bits per pixel (2 bytes, LE)
  const bitsPerPixel = buffer.readUInt16LE(offset);
  offset += 2;

  return {
    magic,
    fileSize,
    dataOffset,
    width,
    height,
    bitsPerPixel
  };
}

// Usage
const fs = require('fs');
const bmpData = fs.readFileSync('image.bmp');
const header = parseBMPHeader(bmpData);
console.log(header);
```

## Example: WAV Audio Format

```javascript
function parseWAVHeader(buffer) {
  let offset = 0;

  // RIFF header (12 bytes)
  const chunkID = buffer.toString('ascii', offset, offset + 4);
  offset += 4;

  const chunkSize = buffer.readUInt32LE(offset);
  offset += 4;

  const format = buffer.toString('ascii', offset, offset + 4);
  offset += 4;

  if (chunkID !== 'RIFF' || format !== 'WAVE') {
    throw new Error('Not a WAV file');
  }

  // Format chunk (24 bytes)
  const subchunk1ID = buffer.toString('ascii', offset, offset + 4);
  offset += 4;

  const subchunk1Size = buffer.readUInt32LE(offset);
  offset += 4;

  const audioFormat = buffer.readUInt16LE(offset);
  offset += 2;

  const numChannels = buffer.readUInt16LE(offset);
  offset += 2;

  const sampleRate = buffer.readUInt32LE(offset);
  offset += 4;

  const byteRate = buffer.readUInt32LE(offset);
  offset += 4;

  const blockAlign = buffer.readUInt16LE(offset);
  offset += 2;

  const bitsPerSample = buffer.readUInt16LE(offset);
  offset += 2;

  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    audioFormat
  };
}
```

## Common File Signatures

```javascript
const FILE_SIGNATURES = {
  PNG: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  JPEG: Buffer.from([0xFF, 0xD8, 0xFF]),
  PDF: Buffer.from('PDF'),
  ZIP: Buffer.from([0x50, 0x4B, 0x03, 0x04]),
  GIF: Buffer.from('GIF89a')
};

function detectFileType(buffer) {
  for (const [type, signature] of Object.entries(FILE_SIGNATURES)) {
    const header = buffer.subarray(0, signature.length);
    if (header.equals(signature)) {
      return type;
    }
  }
  return 'UNKNOWN';
}
```

## Summary

- Binary files have specific structures
- Always check magic numbers
- Document offset calculations
- Handle endianness correctly
- Validate file integrity
