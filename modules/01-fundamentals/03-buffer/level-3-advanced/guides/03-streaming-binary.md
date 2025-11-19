# Streaming Binary Data

Efficiently processing binary data in chunks.

## The Challenge

Binary protocols often split messages across multiple chunks:

```
Chunk 1: [HEADER][PARTIAL_BODY]
Chunk 2: [REST_OF_BODY][NEXT_HEADER]
Chunk 3: [NEXT_BODY]
```

## Message Framing

```javascript
class MessageFramer {
  constructor() {
    this.buffer = Buffer.alloc(0);
    this.headerSize = 8;
  }

  push(chunk) {
    // Accumulate data
    this.buffer = Buffer.concat([this.buffer, chunk]);

    const messages = [];

    while (this.buffer.length >= this.headerSize) {
      // Read message length from header
      const messageLength = this.buffer.readUInt32LE(4);
      const totalLength = this.headerSize + messageLength;

      // Check if complete message available
      if (this.buffer.length < totalLength) {
        break; // Need more data
      }

      // Extract complete message
      const message = this.buffer.subarray(0, totalLength);
      messages.push(this.parseMessage(message));

      // Remove processed message
      this.buffer = this.buffer.subarray(totalLength);
    }

    return messages;
  }

  parseMessage(buffer) {
    return {
      type: buffer.readUInt32LE(0),
      length: buffer.readUInt32LE(4),
      body: buffer.subarray(8)
    };
  }
}

// Usage with streams
const framer = new MessageFramer();

stream.on('data', (chunk) => {
  const messages = framer.push(chunk);
  messages.forEach(msg => processMessage(msg));
});
```

## Line-Based Protocol

```javascript
class LineFramer {
  constructor(delimiter = '\n') {
    this.buffer = Buffer.alloc(0);
    this.delimiter = Buffer.from(delimiter);
  }

  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    const lines = [];
    let index;

    while ((index = this.buffer.indexOf(this.delimiter)) !== -1) {
      // Extract line
      const line = this.buffer.subarray(0, index);
      lines.push(line);

      // Remove line + delimiter
      this.buffer = this.buffer.subarray(index + this.delimiter.length);
    }

    return lines;
  }
}
```

## Best Practices

### 1. Set Buffer Size Limits

```javascript
class SafeFramer {
  constructor(maxSize = 1024 * 1024) {
    this.buffer = Buffer.alloc(0);
    this.maxSize = maxSize;
  }

  push(chunk) {
    if (this.buffer.length + chunk.length > this.maxSize) {
      throw new Error('Buffer overflow');
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // ... process
  }
}
```

### 2. Use Efficient Concatenation

```javascript
// ✅ Good - accumulate then concat once per message
const chunks = [];
stream.on('data', chunk => chunks.push(chunk));
stream.on('end', () => {
  const complete = Buffer.concat(chunks);
  process(complete);
});
```

## Summary

- Accumulate chunks until complete message
- Use length-prefixed or delimited framing
- Set buffer size limits
- Handle partial messages correctly
