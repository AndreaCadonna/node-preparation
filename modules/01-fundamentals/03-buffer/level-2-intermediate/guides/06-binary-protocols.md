# Binary Protocols

Designing and implementing binary communication protocols.

## Protocol Design Principles

1. **Framing**: Clear message boundaries
2. **Versioning**: Support protocol evolution
3. **Endianness**: Consistent byte order (usually big-endian for network)
4. **Type safety**: Clear data types
5. **Error detection**: Checksums/CRC

## Simple Protocol Example

```javascript
/**
 * Protocol Format:
 * ┌──────────┬─────────┬───────────┬─────────┬─────────┐
 * │ Magic    │ Version │ Type      │ Length  │ Payload │
 * │ (2 bytes)│(1 byte) │ (1 byte)  │(4 bytes)│(N bytes)│
 * └──────────┴─────────┴───────────┴─────────┴─────────┘
 * All multi-byte values are big-endian
 */

const MAGIC = 0xCAFE;
const VERSION = 1;

const MessageType = {
  PING: 0x01,
  PONG: 0x02,
  DATA: 0x03,
  ACK: 0x04
};

class Protocol {
  static encode(type, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(8);
    let offset = 0;

    // Magic
    header.writeUInt16BE(MAGIC, offset);
    offset += 2;

    // Version
    header.writeUInt8(VERSION, offset);
    offset += 1;

    // Type
    header.writeUInt8(type, offset);
    offset += 1;

    // Length
    header.writeUInt32BE(payload.length, offset);
    offset += 4;

    return Buffer.concat([header, payload]);
  }

  static decode(buffer) {
    let offset = 0;

    // Verify magic
    const magic = buffer.readUInt16BE(offset);
    offset += 2;

    if (magic !== MAGIC) {
      throw new Error('Invalid magic number');
    }

    // Read header
    const version = buffer.readUInt8(offset);
    offset += 1;

    const type = buffer.readUInt8(offset);
    offset += 1;

    const length = buffer.readUInt32BE(offset);
    offset += 4;

    // Extract payload
    const payload = buffer.subarray(offset, offset + length);

    return { version, type, length, payload };
  }
}

// Usage
const message = Protocol.encode(MessageType.DATA, Buffer.from('Hello'));
console.log('Encoded:', message);

const decoded = Protocol.decode(message);
console.log('Decoded:', decoded);
```

## Advanced: Protocol with Checksum

```javascript
const crypto = require('crypto');

class SecureProtocol {
  static encode(type, payload) {
    // Build message
    const header = Buffer.alloc(12);
    let offset = 0;

    // Magic
    header.writeUInt16BE(0xCAFE, offset); offset += 2;

    // Version
    header.writeUInt8(1, offset); offset += 1;

    // Type
    header.writeUInt8(type, offset); offset += 1;

    // Length
    header.writeUInt32BE(payload.length, offset); offset += 4;

    // Combine header and payload
    const body = Buffer.concat([header.subarray(0, 8), payload]);

    // Calculate checksum (CRC32)
    const checksum = this.calculateChecksum(body);

    // Add checksum to header
    header.writeUInt32BE(checksum, 8);

    return Buffer.concat([header, payload]);
  }

  static decode(buffer) {
    let offset = 0;

    // Read header
    const magic = buffer.readUInt16BE(offset); offset += 2;
    const version = buffer.readUInt8(offset); offset += 1;
    const type = buffer.readUInt8(offset); offset += 1;
    const length = buffer.readUInt32BE(offset); offset += 4;
    const checksum = buffer.readUInt32BE(offset); offset += 4;

    // Verify magic
    if (magic !== 0xCAFE) {
      throw new Error('Invalid magic');
    }

    // Extract payload
    const payload = buffer.subarray(offset, offset + length);

    // Verify checksum
    const body = Buffer.concat([buffer.subarray(0, 8), payload]);
    const calculatedChecksum = this.calculateChecksum(body);

    if (checksum !== calculatedChecksum) {
      throw new Error('Checksum mismatch');
    }

    return { version, type, payload };
  }

  static calculateChecksum(data) {
    // Simple CRC32 using crypto
    const hash = crypto.createHash('md5').update(data).digest();
    return hash.readUInt32BE(0);
  }
}
```

## Request-Response Protocol

```javascript
class RPC {
  static encodeRequest(id, method, params) {
    const methodBuf = Buffer.from(method, 'utf8');
    const paramsBuf = Buffer.from(JSON.stringify(params), 'utf8');

    const header = Buffer.alloc(10);
    let offset = 0;

    // Request marker
    header.writeUInt8(0x01, offset); offset += 1;

    // Request ID
    header.writeUInt32BE(id, offset); offset += 4;

    // Method length
    header.writeUInt8(methodBuf.length, offset); offset += 1;

    // Params length
    header.writeUInt32BE(paramsBuf.length, offset); offset += 4;

    return Buffer.concat([header, methodBuf, paramsBuf]);
  }

  static encodeResponse(id, result) {
    const resultBuf = Buffer.from(JSON.stringify(result), 'utf8');

    const header = Buffer.alloc(9);
    let offset = 0;

    // Response marker
    header.writeUInt8(0x02, offset); offset += 1;

    // Request ID
    header.writeUInt32BE(id, offset); offset += 4;

    // Result length
    header.writeUInt32BE(resultBuf.length, offset); offset += 4;

    return Buffer.concat([header, resultBuf]);
  }

  static decode(buffer) {
    const type = buffer.readUInt8(0);

    if (type === 0x01) {
      return this.decodeRequest(buffer);
    } else if (type === 0x02) {
      return this.decodeResponse(buffer);
    } else {
      throw new Error('Unknown message type');
    }
  }

  static decodeRequest(buffer) {
    let offset = 1;

    const id = buffer.readUInt32BE(offset); offset += 4;
    const methodLen = buffer.readUInt8(offset); offset += 1;
    const paramsLen = buffer.readUInt32BE(offset); offset += 4;

    const method = buffer.toString('utf8', offset, offset + methodLen);
    offset += methodLen;

    const params = JSON.parse(buffer.toString('utf8', offset, offset + paramsLen));

    return { type: 'request', id, method, params };
  }

  static decodeResponse(buffer) {
    let offset = 1;

    const id = buffer.readUInt32BE(offset); offset += 4;
    const resultLen = buffer.readUInt32BE(offset); offset += 4;

    const result = JSON.parse(buffer.toString('utf8', offset, offset + resultLen));

    return { type: 'response', id, result };
  }
}
```

## Summary

**Good protocol design:**
- Clear message framing
- Version field for evolution
- Big-endian for network protocols
- Checksums for integrity
- Type markers for message types
- Length prefixes for variable data
- Error handling
