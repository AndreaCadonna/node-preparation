# Production Patterns

Best practices for using buffers in production environments.

## Error Handling

```javascript
function parseMessage(buffer) {
  try {
    // Validate minimum size
    if (buffer.length < 8) {
      throw new Error('Buffer too small for header');
    }

    // Validate magic number
    const magic = buffer.readUInt16BE(0);
    if (magic !== 0xCAFE) {
      throw new Error(`Invalid magic: 0x${magic.toString(16)}`);
    }

    // Safe parsing
    const type = buffer.readUInt8(2);
    const length = buffer.readUInt32BE(4);

    // Validate length
    if (8 + length > buffer.length) {
      throw new Error('Incomplete message');
    }

    return {
      type,
      payload: buffer.subarray(8, 8 + length)
    };

  } catch (err) {
    // Log with context
    console.error('Parse error:', {
      error: err.message,
      bufferLength: buffer.length,
      bufferHex: buffer.toString('hex').substring(0, 32)
    });
    throw err;
  }
}
```

## Logging and Debugging

```javascript
function debugBuffer(buf, label = 'Buffer') {
  console.log(`${label}:`, {
    length: buf.length,
    hex: buf.toString('hex').substring(0, 64),
    ascii: buf.toString('ascii', 0, Math.min(32, buf.length))
      .replace(/[^\x20-\x7E]/g, '.')
  });
}
```

## Testing

```javascript
const assert = require('assert');

describe('Message Parser', () => {
  it('should parse valid message', () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt16BE(0xCAFE, 0);
    buf.writeUInt8(1, 2);
    buf.writeUInt32BE(4, 4);
    buf.write('TEST', 8);

    const msg = parseMessage(buf);
    assert.strictEqual(msg.type, 1);
    assert.strictEqual(msg.payload.toString(), 'TEST');
  });

  it('should reject invalid magic', () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt16BE(0xBAD, 0);

    assert.throws(
      () => parseMessage(buf),
      /Invalid magic/
    );
  });

  it('should reject buffer too small', () => {
    const buf = Buffer.alloc(4);
    assert.throws(
      () => parseMessage(buf),
      /too small/
    );
  });
});
```

## Monitoring

```javascript
class BufferMonitor {
  constructor() {
    this.stats = {
      allocations: 0,
      totalBytes: 0,
      peakBytes: 0
    };
  }

  trackAllocation(size) {
    this.stats.allocations++;
    this.stats.totalBytes += size;
    this.stats.peakBytes = Math.max(
      this.stats.peakBytes,
      this.stats.totalBytes
    );
  }

  getStats() {
    return {
      ...this.stats,
      averageSize: this.stats.totalBytes / this.stats.allocations
    };
  }
}
```

## Summary

- Comprehensive error handling
- Detailed logging for debugging
- Thorough unit testing
- Production monitoring
- Clear documentation
