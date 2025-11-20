/**
 * Exercise 2 Solution: TCP Packet Builder
 *
 * This solution demonstrates:
 * - Building binary network protocol packets
 * - Working with big-endian (network byte order)
 * - Calculating and verifying checksums
 * - Bitwise operations for flags
 * - Stream-based packet framing
 */

console.log('=== Exercise 2: TCP Packet Builder ===\n');

// Task 1: Create packet header
console.log('Task 1: Create Packet Header');
/**
 * Create a TCP-like packet header
 * Header structure (20 bytes):
 * - Source Port: 2 bytes (BE)
 * - Dest Port: 2 bytes (BE)
 * - Sequence Number: 4 bytes (BE)
 * - Acknowledgment: 4 bytes (BE)
 * - Flags: 1 byte (SYN=0x02, ACK=0x10, FIN=0x01, PSH=0x08)
 * - Window Size: 2 bytes (BE)
 * - Checksum: 2 bytes (BE) - set to 0 for now
 * - Urgent Pointer: 2 bytes (BE)
 * - Reserved: 1 byte
 *
 * Approach:
 * - Create 20-byte buffer
 * - Write each field using big-endian methods
 * - Network protocols use big-endian (network byte order)
 *
 * @param {Object} options - { srcPort, destPort, seqNum, ackNum, flags, windowSize }
 * @returns {Buffer} 20-byte header
 */
function createPacketHeader(options) {
  // Validate input
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('Options must be an object');
  }

  const { srcPort, destPort, seqNum, ackNum, flags, windowSize } = options;

  // Validate port numbers (16-bit unsigned)
  if (typeof srcPort !== 'number' || srcPort < 0 || srcPort > 65535) {
    throw new RangeError('Source port must be 0-65535');
  }
  if (typeof destPort !== 'number' || destPort < 0 || destPort > 65535) {
    throw new RangeError('Destination port must be 0-65535');
  }

  // Validate sequence and ack numbers (32-bit unsigned)
  if (typeof seqNum !== 'number' || seqNum < 0 || seqNum > 0xFFFFFFFF) {
    throw new RangeError('Sequence number must be 0-4294967295');
  }
  if (typeof ackNum !== 'number' || ackNum < 0 || ackNum > 0xFFFFFFFF) {
    throw new RangeError('Acknowledgment number must be 0-4294967295');
  }

  // Validate flags (8-bit)
  if (typeof flags !== 'number' || flags < 0 || flags > 255) {
    throw new RangeError('Flags must be 0-255');
  }

  // Validate window size (16-bit unsigned)
  if (typeof windowSize !== 'number' || windowSize < 0 || windowSize > 65535) {
    throw new RangeError('Window size must be 0-65535');
  }

  // Create 20-byte header
  const header = Buffer.alloc(20);
  let offset = 0;

  // Write Source Port (2 bytes, BE)
  // Network protocols use big-endian byte order
  header.writeUInt16BE(srcPort, offset);
  offset += 2;

  // Write Destination Port (2 bytes, BE)
  header.writeUInt16BE(destPort, offset);
  offset += 2;

  // Write Sequence Number (4 bytes, BE)
  header.writeUInt32BE(seqNum, offset);
  offset += 4;

  // Write Acknowledgment Number (4 bytes, BE)
  header.writeUInt32BE(ackNum, offset);
  offset += 4;

  // Write Flags (1 byte)
  header.writeUInt8(flags, offset);
  offset += 1;

  // Write Window Size (2 bytes, BE)
  header.writeUInt16BE(windowSize, offset);
  offset += 2;

  // Write Checksum (2 bytes, BE) - set to 0 for now
  header.writeUInt16BE(0, offset);
  offset += 2;

  // Write Urgent Pointer (2 bytes, BE)
  header.writeUInt16BE(0, offset);
  offset += 2;

  // Write Reserved (1 byte)
  header.writeUInt8(0, offset);
  offset += 1;

  return header;
}

// Test Task 1
try {
  const header = createPacketHeader({
    srcPort: 12345,
    destPort: 80,
    seqNum: 1000,
    ackNum: 2000,
    flags: 0x02, // SYN
    windowSize: 8192
  });

  console.log('Packet header:', header);
  console.log('Length:', header.length, 'bytes');
  console.log('Expected: 20 bytes');
  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Parse packet header
console.log('Task 2: Parse Packet Header');
/**
 * Parse a TCP-like packet header
 *
 * Approach:
 * - Validate buffer size
 * - Read each field using big-endian methods
 * - Return object with all header fields
 *
 * @param {Buffer} buffer - Packet buffer
 * @returns {Object} Parsed header fields
 */
function parsePacketHeader(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < 20) {
    throw new RangeError('Buffer too small for packet header (minimum 20 bytes)');
  }

  let offset = 0;

  // Read Source Port (2 bytes, BE)
  const srcPort = buffer.readUInt16BE(offset);
  offset += 2;

  // Read Destination Port (2 bytes, BE)
  const destPort = buffer.readUInt16BE(offset);
  offset += 2;

  // Read Sequence Number (4 bytes, BE)
  const seqNum = buffer.readUInt32BE(offset);
  offset += 4;

  // Read Acknowledgment Number (4 bytes, BE)
  const ackNum = buffer.readUInt32BE(offset);
  offset += 4;

  // Read Flags (1 byte)
  const flags = buffer.readUInt8(offset);
  offset += 1;

  // Read Window Size (2 bytes, BE)
  const windowSize = buffer.readUInt16BE(offset);
  offset += 2;

  // Read Checksum (2 bytes, BE)
  const checksum = buffer.readUInt16BE(offset);
  offset += 2;

  // Read Urgent Pointer (2 bytes, BE)
  const urgentPtr = buffer.readUInt16BE(offset);
  offset += 2;

  return {
    srcPort,
    destPort,
    seqNum,
    ackNum,
    flags,
    windowSize,
    checksum,
    urgentPtr
  };
}

// Test Task 2
try {
  const testHeader = Buffer.alloc(20);
  let offset = 0;

  testHeader.writeUInt16BE(8080, offset); offset += 2;
  testHeader.writeUInt16BE(443, offset); offset += 2;
  testHeader.writeUInt32BE(5000, offset); offset += 4;
  testHeader.writeUInt32BE(6000, offset); offset += 4;
  testHeader.writeUInt8(0x10, offset); offset += 1; // ACK
  testHeader.writeUInt16BE(16384, offset); offset += 2;
  testHeader.writeUInt16BE(0, offset); offset += 2; // Checksum
  testHeader.writeUInt16BE(0, offset); offset += 2; // Urgent
  testHeader.writeUInt8(0, offset); // Reserved

  const parsed = parsePacketHeader(testHeader);
  console.log('Parsed header:', parsed);
  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Calculate checksum
console.log('Task 3: Calculate Packet Checksum');
/**
 * Calculate a simple checksum for the packet
 * Algorithm: Sum all bytes, then take 16-bit ones' complement
 *
 * Approach:
 * - Sum all bytes in the buffer
 * - Handle carries by repeatedly adding high bits to low bits
 * - Return ones' complement of the result
 *
 * @param {Buffer} buffer - Packet data (header + payload)
 * @returns {number} 16-bit checksum
 */
function calculateChecksum(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  // Sum all bytes
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i];
  }

  // Handle carries: add high 16 bits to low 16 bits repeatedly
  // This is the internet checksum algorithm
  while (sum > 0xFFFF) {
    sum = (sum & 0xFFFF) + (sum >> 16);
  }

  // Return ones' complement
  // ~sum flips all bits, & 0xFFFF keeps only low 16 bits
  const checksum = ~sum & 0xFFFF;

  return checksum;
}

// Test Task 3
try {
  const testData = Buffer.from([0x45, 0x00, 0x00, 0x3C, 0x1C, 0x46]);
  const checksum = calculateChecksum(testData);

  console.log('Test data:', testData);
  console.log('Checksum:', '0x' + checksum.toString(16));
  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Create complete packet
console.log('Task 4: Create Complete Packet with Checksum');
/**
 * Create a complete packet with header, payload, and checksum
 *
 * Approach:
 * - Create header using createPacketHeader
 * - Concatenate header and payload
 * - Calculate checksum of combined packet
 * - Write checksum back to header
 *
 * @param {Object} options - Header options
 * @param {Buffer} payload - Packet payload data
 * @returns {Buffer} Complete packet with checksum
 */
function createPacket(options, payload) {
  // Validate input
  if (!Buffer.isBuffer(payload)) {
    throw new TypeError('Payload must be a Buffer');
  }

  // 1. Create header (checksum is 0)
  const header = createPacketHeader(options);

  // 2. Combine header + payload
  const packet = Buffer.concat([header, payload]);

  // 3. Calculate checksum over entire packet
  const checksum = calculateChecksum(packet);

  // 4. Write checksum to header at offset 16
  // This updates the packet in-place
  packet.writeUInt16BE(checksum, 16);

  return packet;
}

// Test Task 4
try {
  const payload = Buffer.from('Hello, TCP!');
  const packet = createPacket({
    srcPort: 5000,
    destPort: 8080,
    seqNum: 100,
    ackNum: 200,
    flags: 0x18, // PSH + ACK
    windowSize: 4096
  }, payload);

  console.log('Complete packet:', packet.length, 'bytes');
  console.log('Header (20 bytes):', packet.slice(0, 20));
  console.log('Payload:', packet.slice(20).toString());
  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Verify packet checksum
console.log('Task 5: Verify Packet Checksum');
/**
 * Verify that a packet's checksum is valid
 *
 * Approach:
 * - Extract checksum from header
 * - Zero out checksum field in a copy of the packet
 * - Calculate checksum of modified packet
 * - Compare with extracted checksum
 *
 * @param {Buffer} packet - Complete packet
 * @returns {boolean} True if checksum is valid
 */
function verifyChecksum(packet) {
  // Validate input
  if (!Buffer.isBuffer(packet)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (packet.length < 20) {
    throw new RangeError('Packet too small (minimum 20 bytes)');
  }

  // 1. Extract checksum from header (offset 16)
  const storedChecksum = packet.readUInt16BE(16);

  // 2. Create a copy and set checksum field to 0
  const packetCopy = Buffer.from(packet);
  packetCopy.writeUInt16BE(0, 16);

  // 3. Calculate checksum of the modified packet
  const calculatedChecksum = calculateChecksum(packetCopy);

  // 4. Compare checksums
  return storedChecksum === calculatedChecksum;
}

// Test Task 5
try {
  const testPayload = Buffer.from('Test data');
  const testPacket = createPacket({
    srcPort: 1234,
    destPort: 5678,
    seqNum: 1,
    ackNum: 1,
    flags: 0x02,
    windowSize: 8192
  }, testPayload);

  const isValid = verifyChecksum(testPacket);
  console.log('Checksum valid:', isValid);

  // Corrupt the packet
  testPacket[25] = 0xFF;
  const isValidCorrupted = verifyChecksum(testPacket);
  console.log('Corrupted packet valid:', isValidCorrupted);

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 1: Flag helper functions
console.log('Bonus Challenge 1: Flag Helper Functions');
/**
 * Create helper functions for TCP flags
 *
 * Flags use bitwise operations:
 * - Setting a flag: flags |= flag (OR)
 * - Clearing a flag: flags &= ~flag (AND with NOT)
 * - Checking a flag: (flags & flag) !== 0 (AND)
 */
const TCPFlags = {
  FIN: 0x01,
  SYN: 0x02,
  RST: 0x04,
  PSH: 0x08,
  ACK: 0x10,
  URG: 0x20
};

/**
 * Check if a specific flag is set
 * Uses bitwise AND to test the bit
 */
function hasFlag(flags, flag) {
  if (typeof flags !== 'number' || typeof flag !== 'number') {
    throw new TypeError('Flags and flag must be numbers');
  }
  // Bitwise AND: returns non-zero if flag bit is set
  return (flags & flag) !== 0;
}

/**
 * Set a specific flag
 * Uses bitwise OR to set the bit
 */
function setFlag(flags, flag) {
  if (typeof flags !== 'number' || typeof flag !== 'number') {
    throw new TypeError('Flags and flag must be numbers');
  }
  // Bitwise OR: sets the flag bit to 1
  return flags | flag;
}

/**
 * Clear a specific flag
 * Uses bitwise AND with NOT to clear the bit
 */
function clearFlag(flags, flag) {
  if (typeof flags !== 'number' || typeof flag !== 'number') {
    throw new TypeError('Flags and flag must be numbers');
  }
  // Bitwise AND with NOT: clears the flag bit to 0
  return flags & ~flag;
}

/**
 * Convert flags to human-readable string
 * Returns comma-separated list of set flags
 */
function flagsToString(flags) {
  if (typeof flags !== 'number') {
    throw new TypeError('Flags must be a number');
  }

  const flagNames = [];

  // Check each flag and add to array if set
  if (hasFlag(flags, TCPFlags.FIN)) flagNames.push('FIN');
  if (hasFlag(flags, TCPFlags.SYN)) flagNames.push('SYN');
  if (hasFlag(flags, TCPFlags.RST)) flagNames.push('RST');
  if (hasFlag(flags, TCPFlags.PSH)) flagNames.push('PSH');
  if (hasFlag(flags, TCPFlags.ACK)) flagNames.push('ACK');
  if (hasFlag(flags, TCPFlags.URG)) flagNames.push('URG');

  return flagNames.join(',') || 'NONE';
}

// Test Bonus 1
try {
  let flags = 0;
  flags = setFlag(flags, TCPFlags.SYN);
  flags = setFlag(flags, TCPFlags.ACK);

  console.log('Flags value:', '0x' + flags.toString(16));
  console.log('Has SYN:', hasFlag(flags, TCPFlags.SYN));
  console.log('Has FIN:', hasFlag(flags, TCPFlags.FIN));
  console.log('Flags string:', flagsToString(flags));

  flags = clearFlag(flags, TCPFlags.SYN);
  console.log('After clearing SYN:', flagsToString(flags));

  console.log('✓ Bonus 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 2: Packet stream processor
console.log('Bonus Challenge 2: Packet Stream Processor');
/**
 * Process a stream of packets and handle fragmentation
 *
 * In real TCP streams, packets may arrive:
 * - Out of order (different sequence numbers)
 * - Fragmented (partial packets)
 * - Combined (multiple packets in one chunk)
 */
class PacketStream {
  constructor() {
    // Store packets indexed by sequence number
    this.packets = new Map();
    // Track expected sequence number
    this.expectedSeq = null;
  }

  addPacket(packet) {
    // Validate input
    if (!Buffer.isBuffer(packet)) {
      throw new TypeError('Packet must be a Buffer');
    }

    // Parse header to get sequence number
    const header = parsePacketHeader(packet);

    // Initialize expected sequence if this is first packet
    if (this.expectedSeq === null) {
      this.expectedSeq = header.seqNum;
    }

    // Store packet by sequence number
    this.packets.set(header.seqNum, packet);
  }

  getPayload() {
    // Sort packets by sequence number
    const sorted = Array.from(this.packets.entries())
      .sort((a, b) => a[0] - b[0]);

    // Extract payloads (skip 20-byte header)
    const payloads = sorted.map(([seq, packet]) => packet.slice(20));

    // Combine into single buffer
    return Buffer.concat(payloads);
  }

  isMissingPackets() {
    if (this.packets.size === 0) {
      return false;
    }

    // Get sequence numbers
    const seqNums = Array.from(this.packets.keys()).sort((a, b) => a - b);

    // Check for gaps in sequence
    for (let i = 1; i < seqNums.length; i++) {
      // In simplified version, just check if sequences are consecutive
      // Real TCP would use payload size to calculate next expected seq
      if (seqNums[i] !== seqNums[i - 1] + 5) { // Assuming 5 bytes per payload
        return true;
      }
    }

    return false;
  }
}

// Test Bonus 2
try {
  const stream = new PacketStream();

  const pkt1 = createPacket({
    srcPort: 1000,
    destPort: 2000,
    seqNum: 100,
    ackNum: 0,
    flags: TCPFlags.SYN,
    windowSize: 8192
  }, Buffer.from('First'));

  const pkt2 = createPacket({
    srcPort: 1000,
    destPort: 2000,
    seqNum: 105,
    ackNum: 0,
    flags: TCPFlags.ACK,
    windowSize: 8192
  }, Buffer.from('Second'));

  stream.addPacket(pkt1);
  stream.addPacket(pkt2);

  console.log('Stream payload:', stream.getPayload().toString());
  console.log('Missing packets:', stream.isMissingPackets());

  console.log('✓ Bonus 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 2 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Network Byte Order:
 *    - Network protocols use big-endian (BE) byte order
 *    - Use writeUInt16BE, writeUInt32BE for writing
 *    - Use readUInt16BE, readUInt32BE for reading
 *
 * 2. Checksums:
 *    - Detect transmission errors
 *    - Internet checksum: sum bytes + ones' complement
 *    - Checksum field set to 0 during calculation
 *
 * 3. Bitwise Operations:
 *    - Flags use individual bits for different options
 *    - Set flag: flags |= FLAG (OR)
 *    - Clear flag: flags &= ~FLAG (AND with NOT)
 *    - Test flag: (flags & FLAG) !== 0 (AND)
 *
 * 4. Packet Structure:
 *    - Fixed-size header with metadata
 *    - Variable-size payload with data
 *    - Checksum covers entire packet
 *
 * 5. Stream Processing:
 *    - Packets may arrive fragmented or combined
 *    - Need to buffer and reassemble
 *    - Sequence numbers ensure correct ordering
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Using little-endian for network protocols:
 *    buffer.writeUInt16LE(port, 0) // Wrong!
 *    // Should use: buffer.writeUInt16BE(port, 0)
 *
 * ❌ Including checksum in checksum calculation:
 *    const sum = calculateChecksum(packet) // Includes checksum field!
 *    // Should zero out checksum first
 *
 * ❌ Not handling carries in checksum:
 *    let sum = buffer[0] + buffer[1] // May overflow!
 *    // Must handle carries: while (sum > 0xFFFF) sum = (sum & 0xFFFF) + (sum >> 16)
 *
 * ❌ Modifying original packet during verification:
 *    packet.writeUInt16BE(0, 16) // Corrupts original!
 *    // Should work on a copy
 *
 * ❌ Wrong bitwise operation for flag testing:
 *    if (flags & FLAG === FLAG) // Wrong operator precedence!
 *    // Should use: if ((flags & FLAG) !== 0)
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Implement full TCP state machine (SYN, SYN-ACK, ACK)
 * 2. Add congestion control (sliding window)
 * 3. Implement retransmission on timeout
 * 4. Support TCP options field
 * 5. Create a simple reliable UDP protocol
 * 6. Implement packet fragmentation and reassembly
 */
