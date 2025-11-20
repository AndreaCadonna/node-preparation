/**
 * Exercise 5 Solution: Network Protocol Implementation
 *
 * This solution demonstrates:
 * - Implementing a complete binary network protocol
 * - Using magic numbers for protocol validation
 * - Message framing for stream-based protocols
 * - Sequence numbers for ordering and deduplication
 * - Request-response matching with callbacks
 */

console.log('=== Exercise 5: Network Protocol Implementation ===\n');

// Protocol specification:
// All multi-byte integers are big-endian (network byte order)
//
// Message format:
// +--------+--------+--------+--------+--------+
// | Magic  | Version| Type   | Length | Data   |
// | 2 bytes| 1 byte | 1 byte | 2 bytes| N bytes|
// +--------+--------+--------+--------+--------+
//
// Magic: 0x4D50 ('MP' in ASCII)
// Version: 0x01
// Type: Message type (see MessageType enum)
// Length: Data length in bytes
// Data: Variable-length payload

const PROTOCOL_MAGIC = 0x4D50; // 'MP'
const PROTOCOL_VERSION = 0x01;

const MessageType = {
  CONNECT: 0x01,
  DISCONNECT: 0x02,
  DATA: 0x03,
  ACK: 0x04,
  PING: 0x05,
  PONG: 0x06,
  ERROR: 0xFF
};

// Task 1: Create protocol message
console.log('Task 1: Create Protocol Message');
/**
 * Create a protocol message
 *
 * Approach:
 * - Calculate total size (6 byte header + data length)
 * - Write header fields in big-endian (network byte order)
 * - Append data payload
 *
 * @param {number} type - Message type from MessageType enum
 * @param {Buffer} data - Message payload
 * @returns {Buffer} Complete protocol message
 */
function createMessage(type, data = Buffer.alloc(0)) {
  // Validate input
  if (typeof type !== 'number' || type < 0 || type > 255) {
    throw new TypeError('Type must be a number between 0-255');
  }

  if (!Buffer.isBuffer(data)) {
    throw new TypeError('Data must be a Buffer');
  }

  if (data.length > 65535) {
    throw new RangeError('Data too large (max 65535 bytes)');
  }

  // Header: magic (2) + version (1) + type (1) + length (2) = 6 bytes
  const totalSize = 6 + data.length;
  const message = Buffer.alloc(totalSize);
  let offset = 0;

  // Write Magic (2 bytes, BE)
  // Network protocols use big-endian byte order
  message.writeUInt16BE(PROTOCOL_MAGIC, offset);
  offset += 2;

  // Write Version (1 byte)
  message.writeUInt8(PROTOCOL_VERSION, offset);
  offset += 1;

  // Write Type (1 byte)
  message.writeUInt8(type, offset);
  offset += 1;

  // Write Length (2 bytes, BE)
  message.writeUInt16BE(data.length, offset);
  offset += 2;

  // Write Data (variable length)
  if (data.length > 0) {
    data.copy(message, offset);
  }

  return message;
}

// Test Task 1
try {
  const msg = createMessage(MessageType.PING);
  console.log('PING message:', msg);
  console.log('Length:', msg.length, 'bytes');
  console.log('Expected: 6 bytes (header only)');

  const dataMsg = createMessage(MessageType.DATA, Buffer.from('Hello'));
  console.log('DATA message:', dataMsg);
  console.log('Length:', dataMsg.length, 'bytes');

  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Parse protocol message
console.log('Task 2: Parse Protocol Message');
/**
 * Parse a protocol message
 *
 * Approach:
 * - Validate minimum buffer size (6 bytes)
 * - Read header fields using big-endian methods
 * - Extract data payload based on length field
 *
 * @param {Buffer} buffer - Complete message buffer
 * @returns {Object} { magic, version, type, length, data }
 */
function parseMessage(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < 6) {
    throw new RangeError('Buffer too small for message header (minimum 6 bytes)');
  }

  let offset = 0;

  // Read Magic (2 bytes, BE)
  const magic = buffer.readUInt16BE(offset);
  offset += 2;

  // Read Version (1 byte)
  const version = buffer.readUInt8(offset);
  offset += 1;

  // Read Type (1 byte)
  const type = buffer.readUInt8(offset);
  offset += 1;

  // Read Length (2 bytes, BE)
  const length = buffer.readUInt16BE(offset);
  offset += 2;

  // Validate buffer has enough data
  if (buffer.length < 6 + length) {
    throw new RangeError(`Buffer too small for message data (expected ${6 + length} bytes, got ${buffer.length})`);
  }

  // Extract Data (variable length)
  const data = buffer.slice(offset, offset + length);

  return { magic, version, type, length, data };
}

// Test Task 2
try {
  const testMsg = Buffer.alloc(11);
  let offset = 0;

  testMsg.writeUInt16BE(PROTOCOL_MAGIC, offset); offset += 2;
  testMsg.writeUInt8(PROTOCOL_VERSION, offset); offset += 1;
  testMsg.writeUInt8(MessageType.DATA, offset); offset += 1;
  testMsg.writeUInt16BE(5, offset); offset += 2;
  testMsg.write('Hello', offset, 'utf8');

  const parsed = parseMessage(testMsg);
  console.log('Parsed message:', parsed);
  console.log('Data as string:', parsed.data.toString());

  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Validate protocol message
console.log('Task 3: Validate Protocol Message');
/**
 * Validate a protocol message
 * Check:
 * - Correct magic number
 * - Supported version
 * - Valid message type
 * - Length matches actual data
 *
 * Approach:
 * - Parse message
 * - Check each field against valid values
 * - Return validation result with error details
 *
 * @param {Buffer} buffer - Message buffer
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateMessage(buffer) {
  // Check minimum size
  if (!Buffer.isBuffer(buffer)) {
    return { valid: false, error: 'Input must be a Buffer' };
  }

  if (buffer.length < 6) {
    return { valid: false, error: 'Message too small (minimum 6 bytes)' };
  }

  try {
    // Parse message
    const msg = parseMessage(buffer);

    // Validate magic number
    if (msg.magic !== PROTOCOL_MAGIC) {
      return {
        valid: false,
        error: `Invalid magic number: 0x${msg.magic.toString(16)} (expected 0x${PROTOCOL_MAGIC.toString(16)})`
      };
    }

    // Validate version
    if (msg.version !== PROTOCOL_VERSION) {
      return {
        valid: false,
        error: `Unsupported version: ${msg.version} (expected ${PROTOCOL_VERSION})`
      };
    }

    // Validate message type
    const validTypes = Object.values(MessageType);
    if (!validTypes.includes(msg.type)) {
      return {
        valid: false,
        error: `Invalid message type: 0x${msg.type.toString(16)}`
      };
    }

    // Validate length matches actual data
    const expectedLength = buffer.length - 6;
    if (msg.length !== expectedLength) {
      return {
        valid: false,
        error: `Length mismatch: header says ${msg.length} bytes, buffer has ${expectedLength} bytes`
      };
    }

    // All validations passed
    return { valid: true };

  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Test Task 3
try {
  const validMsg = createMessage(MessageType.PING);
  const result1 = validateMessage(validMsg);
  console.log('Valid message:', result1);

  const invalidMagic = Buffer.from([0x00, 0x00, 0x01, 0x01, 0x00, 0x00]);
  const result2 = validateMessage(invalidMagic);
  console.log('Invalid magic:', result2);

  const tooShort = Buffer.from([0x4D, 0x50, 0x01]);
  const result3 = validateMessage(tooShort);
  console.log('Too short:', result3);

  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Message encoder/decoder class
console.log('Task 4: Message Encoder/Decoder Class');
/**
 * Protocol encoder/decoder with helper methods
 *
 * Provides convenient methods for encoding different message types
 * and decoding messages with type-specific data extraction
 */
class ProtocolCodec {
  // Connection messages
  encodeConnect(clientId) {
    // Validate input
    if (typeof clientId !== 'string') {
      throw new TypeError('Client ID must be a string');
    }
    // CONNECT message: clientId as UTF-8 string
    const data = Buffer.from(clientId, 'utf8');
    return createMessage(MessageType.CONNECT, data);
  }

  encodeDisconnect() {
    // DISCONNECT message: no data payload
    return createMessage(MessageType.DISCONNECT);
  }

  // Data messages
  encodeData(payload) {
    // Validate input
    if (!Buffer.isBuffer(payload)) {
      throw new TypeError('Payload must be a Buffer');
    }
    // DATA message: raw payload buffer
    return createMessage(MessageType.DATA, payload);
  }

  encodeAck(messageId) {
    // Validate input
    if (typeof messageId !== 'number' || messageId < 0) {
      throw new TypeError('Message ID must be a non-negative number');
    }
    // ACK message: 4-byte message ID (big-endian)
    const data = Buffer.alloc(4);
    data.writeUInt32BE(messageId, 0);
    return createMessage(MessageType.ACK, data);
  }

  // Ping/Pong messages
  encodePing(timestamp) {
    // Validate input
    if (typeof timestamp !== 'bigint') {
      throw new TypeError('Timestamp must be a BigInt');
    }
    // PING message: 8-byte timestamp (big-endian, BigUInt64)
    const data = Buffer.alloc(8);
    data.writeBigUInt64BE(timestamp, 0);
    return createMessage(MessageType.PING, data);
  }

  encodePong(timestamp) {
    // Validate input
    if (typeof timestamp !== 'bigint') {
      throw new TypeError('Timestamp must be a BigInt');
    }
    // PONG message: 8-byte timestamp from PING
    const data = Buffer.alloc(8);
    data.writeBigUInt64BE(timestamp, 0);
    return createMessage(MessageType.PONG, data);
  }

  // Error messages
  encodeError(errorCode, errorMessage) {
    // Validate input
    if (typeof errorCode !== 'number' || errorCode < 0 || errorCode > 255) {
      throw new TypeError('Error code must be 0-255');
    }
    if (typeof errorMessage !== 'string') {
      throw new TypeError('Error message must be a string');
    }
    // ERROR message: 1-byte error code + UTF-8 error message
    const msgBuffer = Buffer.from(errorMessage, 'utf8');
    const data = Buffer.alloc(1 + msgBuffer.length);
    data.writeUInt8(errorCode, 0);
    msgBuffer.copy(data, 1);
    return createMessage(MessageType.ERROR, data);
  }

  // Decode message
  decode(buffer) {
    // Parse and validate message
    const validation = validateMessage(buffer);
    if (!validation.valid) {
      throw new Error(`Invalid message: ${validation.error}`);
    }

    // Parse message
    const msg = parseMessage(buffer);

    // Create base result
    const result = {
      type: msg.type,
      version: msg.version
    };

    // Add type-specific data
    switch (msg.type) {
      case MessageType.CONNECT:
        result.clientId = msg.data.toString('utf8');
        break;

      case MessageType.DISCONNECT:
        // No additional data
        break;

      case MessageType.DATA:
        result.payload = msg.data;
        break;

      case MessageType.ACK:
        if (msg.data.length >= 4) {
          result.messageId = msg.data.readUInt32BE(0);
        }
        break;

      case MessageType.PING:
      case MessageType.PONG:
        if (msg.data.length >= 8) {
          result.timestamp = msg.data.readBigUInt64BE(0);
        }
        break;

      case MessageType.ERROR:
        if (msg.data.length >= 1) {
          result.errorCode = msg.data.readUInt8(0);
          result.errorMessage = msg.data.slice(1).toString('utf8');
        }
        break;
    }

    return result;
  }
}

// Test Task 4
try {
  const codec = new ProtocolCodec();

  const connectMsg = codec.encodeConnect('client-123');
  console.log('CONNECT:', parseMessage(connectMsg));

  const dataMsg = codec.encodeData(Buffer.from('Hello, World!'));
  console.log('DATA:', parseMessage(dataMsg));

  const ackMsg = codec.encodeAck(12345);
  console.log('ACK:', parseMessage(ackMsg));

  const pingMsg = codec.encodePing(BigInt(Date.now()));
  console.log('PING:', parseMessage(pingMsg));

  const errorMsg = codec.encodeError(44, 'Not Found'); // Error code must be 0-255
  console.log('ERROR:', parseMessage(errorMsg));

  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Message framing for streams
console.log('Task 5: Message Framing for TCP Streams');
/**
 * Handle message framing over TCP streams
 * Messages may arrive in chunks or multiple messages per chunk
 *
 * Key concepts:
 * - Buffer incomplete messages until fully received
 * - Extract complete messages based on length field
 * - Handle multiple messages in single chunk
 */
class MessageFramer {
  constructor() {
    // Buffer for accumulating incoming data
    this.buffer = Buffer.alloc(0);
  }

  addData(chunk) {
    // Validate input
    if (!Buffer.isBuffer(chunk)) {
      throw new TypeError('Chunk must be a Buffer');
    }

    // Append chunk to buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);
  }

  getMessages() {
    const messages = [];

    // Extract complete messages
    while (this.hasCompleteMessage()) {
      // Check if we have enough for header
      if (this.buffer.length < 6) {
        break;
      }

      // Read message length from header
      const messageLength = this.buffer.readUInt16BE(4);
      const totalLength = 6 + messageLength;

      // Check if we have complete message
      if (this.buffer.length < totalLength) {
        break;
      }

      // Extract message
      const message = this.buffer.slice(0, totalLength);
      messages.push(message);

      // Remove message from buffer
      this.buffer = this.buffer.slice(totalLength);
    }

    return messages;
  }

  hasCompleteMessage() {
    // Check if buffer has at least header
    if (this.buffer.length < 6) {
      return false;
    }

    // Check magic number
    const magic = this.buffer.readUInt16BE(0);
    if (magic !== PROTOCOL_MAGIC) {
      // Invalid magic, clear buffer
      this.buffer = Buffer.alloc(0);
      return false;
    }

    // Read message length
    const messageLength = this.buffer.readUInt16BE(4);
    const totalLength = 6 + messageLength;

    // Check if we have complete message
    return this.buffer.length >= totalLength;
  }

  reset() {
    // Clear internal buffer
    this.buffer = Buffer.alloc(0);
  }
}

// Test Task 5
try {
  const framer = new MessageFramer();

  // Create multiple messages
  const msg1 = createMessage(MessageType.PING);
  const msg2 = createMessage(MessageType.DATA, Buffer.from('Test'));
  const msg3 = createMessage(MessageType.PONG);

  // Combine into one buffer
  const combined = Buffer.concat([msg1, msg2, msg3]);

  // Simulate partial arrivals
  framer.addData(combined.slice(0, 10));  // Partial
  console.log('After chunk 1, complete messages:', framer.getMessages().length);

  framer.addData(combined.slice(10, 20)); // Partial
  console.log('After chunk 2, complete messages:', framer.getMessages().length);

  framer.addData(combined.slice(20));     // Rest
  const messages = framer.getMessages();
  console.log('After chunk 3, complete messages:', messages.length);

  messages.forEach((msg, i) => {
    const parsed = parseMessage(msg);
    console.log(`  Message ${i + 1}:`, parsed.type, parsed.data.length, 'bytes');
  });

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 1: Protocol with sequence numbers
console.log('Bonus Challenge 1: Add Sequence Numbers');
/**
 * Extended protocol with sequence numbers for ordering and deduplication
 *
 * Adds 4-byte sequence number to beginning of data payload
 */
class SequencedProtocol extends ProtocolCodec {
  constructor() {
    super();
    this.nextSeqNum = 0;
    this.receivedSeqNums = new Set();
  }

  encodeWithSequence(type, data) {
    // Validate input
    if (!Buffer.isBuffer(data)) {
      data = Buffer.alloc(0);
    }

    // Create data with sequence number prefix
    const seqData = Buffer.alloc(4 + data.length);
    seqData.writeUInt32BE(this.nextSeqNum, 0);
    if (data.length > 0) {
      data.copy(seqData, 4);
    }

    // Increment sequence number
    this.nextSeqNum++;

    // Create message
    return createMessage(type, seqData);
  }

  decodeWithSequence(buffer) {
    // Parse message
    const msg = parseMessage(buffer);

    // Extract sequence number
    if (msg.data.length < 4) {
      throw new Error('Message too small for sequence number');
    }

    const seqNum = msg.data.readUInt32BE(0);
    const payload = msg.data.slice(4);

    // Check for duplicates
    const isDuplicate = this.receivedSeqNums.has(seqNum);
    this.receivedSeqNums.add(seqNum);

    return {
      seqNum,
      type: msg.type,
      payload,
      isDuplicate
    };
  }

  resetSequence() {
    // Reset sequence number and received set
    this.nextSeqNum = 0;
    this.receivedSeqNums.clear();
  }
}

// Test Bonus 1
try {
  const seqProto = new SequencedProtocol();

  const msg1 = seqProto.encodeWithSequence(MessageType.DATA, Buffer.from('First'));
  const msg2 = seqProto.encodeWithSequence(MessageType.DATA, Buffer.from('Second'));

  console.log('Sequenced message 1 length:', msg1.length, 'bytes');
  console.log('Sequenced message 2 length:', msg2.length, 'bytes');

  const decoded1 = seqProto.decodeWithSequence(msg1);
  console.log('Decoded 1:', { seqNum: decoded1.seqNum, isDuplicate: decoded1.isDuplicate });

  const decoded2 = seqProto.decodeWithSequence(msg1); // Duplicate
  console.log('Decoded 1 again (duplicate):', { seqNum: decoded2.seqNum, isDuplicate: decoded2.isDuplicate });

  console.log('✓ Bonus 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 2: Request-response matching
console.log('Bonus Challenge 2: Request-Response Matching');
/**
 * Match responses to requests using request IDs
 *
 * Adds request ID to data payload and tracks callbacks
 */
class RequestResponseProtocol {
  constructor() {
    this.nextRequestId = 1;
    this.pendingRequests = new Map();
  }

  createRequest(type, data, callback) {
    // Validate input
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!Buffer.isBuffer(data)) {
      data = Buffer.alloc(0);
    }

    // Create request ID
    const requestId = this.nextRequestId++;

    // Create data with request ID prefix
    const reqData = Buffer.alloc(4 + data.length);
    reqData.writeUInt32BE(requestId, 0);
    if (data.length > 0) {
      data.copy(reqData, 4);
    }

    // Store callback
    this.pendingRequests.set(requestId, callback);

    // Create message
    return createMessage(type, reqData);
  }

  handleResponse(buffer) {
    // Parse message
    const msg = parseMessage(buffer);

    // Extract request ID
    if (msg.data.length < 4) {
      throw new Error('Response too small for request ID');
    }

    const requestId = msg.data.readUInt32BE(0);
    const payload = msg.data.slice(4);

    // Get callback
    const callback = this.pendingRequests.get(requestId);
    if (!callback) {
      console.warn(`No pending request for ID ${requestId}`);
      return;
    }

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Call callback with response
    callback(null, { type: msg.type, payload });
  }

  getPendingCount() {
    // Return number of pending requests
    return this.pendingRequests.size;
  }

  timeout(requestId) {
    // Get callback
    const callback = this.pendingRequests.get(requestId);
    if (!callback) {
      return;
    }

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Call callback with timeout error
    callback(new Error('Request timeout'));
  }
}

// Test Bonus 2
try {
  const rrProto = new RequestResponseProtocol();

  const request = rrProto.createRequest(
    MessageType.DATA,
    Buffer.from('Query'),
    (err, response) => {
      if (err) {
        console.log('Request error:', err.message);
      } else {
        console.log('Request response:', response);
      }
    }
  );

  console.log('Created request length:', request.length, 'bytes');
  console.log('Pending requests:', rrProto.getPendingCount());

  // Simulate timeout
  rrProto.timeout(1);
  console.log('After timeout, pending requests:', rrProto.getPendingCount());

  console.log('✓ Bonus 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 5 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Protocol Design:
 *    - Magic numbers identify protocol (like file signatures)
 *    - Version field allows protocol evolution
 *    - Type field identifies message purpose
 *    - Length field enables variable-size payloads
 *
 * 2. Network Byte Order:
 *    - Always use big-endian for network protocols
 *    - Ensures compatibility across different architectures
 *    - Standard convention for all internet protocols
 *
 * 3. Message Framing:
 *    - TCP is stream-based, not message-based
 *    - Need to buffer and extract complete messages
 *    - Handle partial messages and multiple messages
 *
 * 4. Sequence Numbers:
 *    - Enable ordering of out-of-order messages
 *    - Detect duplicate messages
 *    - Track missing messages
 *
 * 5. Request-Response Pattern:
 *    - Match responses to requests using IDs
 *    - Enable asynchronous communication
 *    - Support timeouts and error handling
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Using little-endian for network protocols:
 *    buffer.writeUInt16LE(magic, 0) // Wrong!
 *    // Should use: buffer.writeUInt16BE(magic, 0)
 *
 * ❌ Not validating magic numbers:
 *    const msg = parseMessage(buffer) // May parse garbage!
 *    // Should validate first
 *
 * ❌ Assuming complete messages in TCP:
 *    const msg = parseMessage(chunk) // May be incomplete!
 *    // Must use framing
 *
 * ❌ Not handling buffer growth:
 *    this.buffer += chunk // Wrong! Buffers don't concatenate with +
 *    // Should use: Buffer.concat([this.buffer, chunk])
 *
 * ❌ Forgetting to remove processed messages:
 *    messages.push(this.buffer.slice(0, len))
 *    // But buffer still contains message!
 *    // Must: this.buffer = this.buffer.slice(len)
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Add message compression (zlib)
 * 2. Implement encryption (AES)
 * 3. Add heartbeat/keepalive mechanism
 * 4. Implement flow control (window size)
 * 5. Add message priorities
 * 6. Create a WebSocket-like protocol
 * 7. Implement protocol negotiation/upgrade
 * 8. Add authentication and authorization
 */
