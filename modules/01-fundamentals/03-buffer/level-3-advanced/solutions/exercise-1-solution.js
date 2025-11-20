/**
 * Exercise 1 Solution: High-Performance Log Parser
 *
 * This solution demonstrates:
 * - Binary log encoding/decoding with proper endianness handling
 * - Streaming parser with buffer accumulation for incomplete data
 * - Buffer pooling for high-performance log parsing
 * - Zero-copy filtering techniques for memory efficiency
 * - Production-grade error handling and validation
 */

console.log('=== Exercise 1: High-Performance Log Parser ===\n');

/**
 * Binary log format:
 * - Timestamp: 8 bytes (BigUInt64LE)
 * - Level: 1 byte (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)
 * - Message length: 2 bytes (UInt16LE)
 * - Message: variable bytes (UTF-8)
 * Total: 11 + message length
 */

// Task 1: Write log entry to binary format
console.log('Task 1: Encode Log Entry');
/**
 * Encode a log entry to binary format
 * @param {Object} entry - { timestamp: number, level: number, message: string }
 * @returns {Buffer} Encoded binary log entry
 *
 * Approach:
 * - Validate all input parameters to ensure data integrity
 * - Calculate exact buffer size needed (11 bytes header + message length)
 * - Use proper endianness for cross-platform compatibility
 * - Write fields in order: timestamp, level, message length, message
 */
function encodeLogEntry(entry) {
  // Validate input
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('Entry must be an object');
  }

  const { timestamp, level, message } = entry;

  // Validate timestamp
  if (typeof timestamp !== 'number' || timestamp < 0) {
    throw new TypeError('Timestamp must be a non-negative number');
  }

  // Validate level (0-3)
  if (typeof level !== 'number' || level < 0 || level > 3) {
    throw new RangeError('Level must be between 0 and 3');
  }

  // Validate message
  if (typeof message !== 'string') {
    throw new TypeError('Message must be a string');
  }

  // Calculate message byte length (UTF-8 can use multiple bytes per character)
  const messageByteLength = Buffer.byteLength(message, 'utf8');

  // Validate message length fits in UInt16 (max 65535 bytes)
  if (messageByteLength > 0xFFFF) {
    throw new RangeError('Message exceeds maximum length of 65535 bytes');
  }

  // Allocate buffer: 8 (timestamp) + 1 (level) + 2 (length) + message bytes
  const buffer = Buffer.allocUnsafe(11 + messageByteLength);

  // Write timestamp as BigUInt64LE (8 bytes)
  // BigUInt64 allows timestamps up to 2^64-1, supporting dates far into the future
  buffer.writeBigUInt64LE(BigInt(timestamp), 0);

  // Write level as UInt8 (1 byte)
  buffer.writeUInt8(level, 8);

  // Write message length as UInt16LE (2 bytes)
  // Little-endian format for better x86/x64 compatibility
  buffer.writeUInt16LE(messageByteLength, 9);

  // Write message as UTF-8 string
  buffer.write(message, 11, messageByteLength, 'utf8');

  return buffer;
}

// Test Task 1
try {
  const entry = {
    timestamp: Date.now(),
    level: 1, // INFO
    message: 'Application started'
  };

  const encoded = encodeLogEntry(entry);
  console.log('Encoded entry:', encoded.length, 'bytes');
  console.log('Expected:', 11 + Buffer.byteLength('Application started'), 'bytes');
  console.log('Hex preview:', encoded.slice(0, 20).toString('hex'));
  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Parse log entry from binary
console.log('Task 2: Decode Log Entry');
/**
 * Decode a log entry from binary format
 * @param {Buffer} buffer - Binary log entry
 * @param {number} offset - Starting offset
 * @returns {Object} { entry: object, bytesRead: number }
 *
 * Approach:
 * - Validate buffer has minimum required bytes (11 for header)
 * - Read each field in order with proper bounds checking
 * - Calculate total entry size before reading message
 * - Return both the decoded entry and bytes consumed (for streaming)
 */
function decodeLogEntry(buffer, offset = 0) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer instance');
  }

  if (typeof offset !== 'number' || offset < 0) {
    throw new TypeError('Offset must be a non-negative number');
  }

  // Check minimum size (11 bytes for header)
  if (buffer.length < offset + 11) {
    throw new RangeError(
      `Buffer too small: need at least ${offset + 11} bytes, got ${buffer.length}`
    );
  }

  // Read timestamp (8 bytes at offset)
  const timestamp = Number(buffer.readBigUInt64LE(offset));

  // Read level (1 byte at offset + 8)
  const level = buffer.readUInt8(offset + 8);

  // Validate level range
  if (level > 3) {
    throw new RangeError(`Invalid level value: ${level} (must be 0-3)`);
  }

  // Read message length (2 bytes at offset + 9)
  const messageLength = buffer.readUInt16LE(offset + 9);

  // Calculate total entry size
  const totalSize = 11 + messageLength;

  // Validate buffer has enough bytes for complete entry
  if (buffer.length < offset + totalSize) {
    throw new RangeError(
      `Incomplete entry: need ${totalSize} bytes, have ${buffer.length - offset} bytes`
    );
  }

  // Read message (UTF-8 string starting at offset + 11)
  const message = buffer.toString('utf8', offset + 11, offset + 11 + messageLength);

  // Return decoded entry and bytes consumed
  return {
    entry: {
      timestamp,
      level,
      message
    },
    bytesRead: totalSize
  };
}

// Test Task 2
try {
  const testEntry = {
    timestamp: 1234567890,
    level: 2,
    message: 'Test message'
  };

  const testEncoded = encodeLogEntry(testEntry);
  const result = decodeLogEntry(testEncoded);

  console.log('Original:', testEntry);
  console.log('Decoded:', result.entry);
  console.log('Bytes read:', result.bytesRead);
  console.log('Match:', JSON.stringify(testEntry) === JSON.stringify(result.entry));
  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Streaming log parser
console.log('Task 3: Streaming Log Parser');
/**
 * Parse log entries from a stream of binary data
 *
 * Approach:
 * - Accumulate incoming chunks in an internal buffer
 * - Extract complete entries when enough data is available
 * - Keep incomplete data for next chunk
 * - Handle variable-length messages efficiently
 */
class StreamingLogParser {
  constructor() {
    // Initialize empty buffer accumulator
    this.buffer = Buffer.alloc(0);

    // Track statistics for performance monitoring
    this.stats = {
      chunksReceived: 0,
      entriesExtracted: 0,
      bytesProcessed: 0
    };
  }

  /**
   * Add a chunk of data to the parser
   * @param {Buffer} chunk - Data chunk to add
   */
  push(chunk) {
    // Validate input
    if (!Buffer.isBuffer(chunk)) {
      throw new TypeError('Chunk must be a Buffer');
    }

    // Concatenate new chunk with existing buffer
    // Note: Buffer.concat creates a new buffer - consider pooling for production
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.stats.chunksReceived++;
  }

  /**
   * Extract all complete log entries from accumulated buffer
   * @returns {Array} Array of decoded log entries
   */
  readEntries() {
    const entries = [];
    let offset = 0;

    // Process buffer until we can't extract any more complete entries
    while (offset + 11 <= this.buffer.length) {
      // Check if we have enough data for the header
      const messageLength = this.buffer.readUInt16LE(offset + 9);
      const totalSize = 11 + messageLength;

      // Check if we have the complete entry
      if (offset + totalSize > this.buffer.length) {
        // Incomplete entry, stop processing
        break;
      }

      try {
        // Decode the entry
        const result = decodeLogEntry(this.buffer, offset);
        entries.push(result.entry);

        // Move offset forward
        offset += result.bytesRead;
        this.stats.entriesExtracted++;
        this.stats.bytesProcessed += result.bytesRead;
      } catch (err) {
        // If decoding fails, skip this position and try next byte
        // In production, you might want to log this error
        offset++;
      }
    }

    // Keep remaining incomplete data
    if (offset > 0) {
      this.buffer = this.buffer.slice(offset);
    }

    return entries;
  }

  /**
   * Clear internal buffer
   */
  reset() {
    this.buffer = Buffer.alloc(0);
    this.stats = {
      chunksReceived: 0,
      entriesExtracted: 0,
      bytesProcessed: 0
    };
  }

  /**
   * Get parser statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      bufferSize: this.buffer.length
    };
  }
}

// Test Task 3
try {
  const parser = new StreamingLogParser();

  // Create multiple entries
  const entries = [
    { timestamp: 100, level: 0, message: 'Entry 1' },
    { timestamp: 200, level: 1, message: 'Entry 2' },
    { timestamp: 300, level: 2, message: 'Entry 3' }
  ];

  const encodedEntries = entries.map(e => encodeLogEntry(e));
  const combined = Buffer.concat(encodedEntries);

  console.log('Total data:', combined.length, 'bytes');

  // Simulate partial chunks (split at arbitrary position)
  parser.push(combined.slice(0, 15));
  const parsed1 = parser.readEntries();
  console.log('After chunk 1:', parsed1.length, 'entries');

  parser.push(combined.slice(15));
  const parsed2 = parser.readEntries();
  console.log('After chunk 2:', parsed2.length, 'entries');

  console.log('Total extracted:', parsed1.length + parsed2.length, 'entries');
  console.log('Statistics:', parser.getStats());
  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Buffer pool for log parsing
console.log('Task 4: Buffered Log Pool');
/**
 * Implement a buffer pool optimized for log parsing
 *
 * Approach:
 * - Pre-allocate a pool of fixed-size buffers
 * - Track available and in-use buffers
 * - Reuse buffers to reduce allocation overhead
 * - Clear buffers before returning to pool (security)
 */
class LogBufferPool {
  constructor(bufferSize, poolSize) {
    // Validate parameters
    if (typeof bufferSize !== 'number' || bufferSize <= 0) {
      throw new TypeError('Buffer size must be a positive number');
    }

    if (typeof poolSize !== 'number' || poolSize <= 0) {
      throw new TypeError('Pool size must be a positive number');
    }

    this.bufferSize = bufferSize;
    this.maxPoolSize = poolSize;

    // Pre-allocate buffers
    this.available = [];
    for (let i = 0; i < poolSize; i++) {
      this.available.push(Buffer.alloc(bufferSize));
    }

    // Track statistics
    this.stats = {
      acquired: 0,
      released: 0,
      created: poolSize,
      hits: 0,  // Got buffer from pool
      misses: 0 // Had to allocate new buffer
    };
  }

  /**
   * Get a buffer from the pool
   * @returns {Buffer} Buffer instance
   */
  acquire() {
    this.stats.acquired++;

    // Try to get buffer from pool
    if (this.available.length > 0) {
      this.stats.hits++;
      return this.available.pop();
    }

    // Pool is empty, allocate new buffer
    this.stats.misses++;
    this.stats.created++;
    return Buffer.alloc(this.bufferSize);
  }

  /**
   * Return a buffer to the pool
   * @param {Buffer} buffer - Buffer to return
   */
  release(buffer) {
    // Validate buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Must release a Buffer instance');
    }

    if (buffer.length !== this.bufferSize) {
      throw new RangeError(
        `Buffer size mismatch: expected ${this.bufferSize}, got ${buffer.length}`
      );
    }

    this.stats.released++;

    // Don't exceed max pool size
    if (this.available.length >= this.maxPoolSize) {
      // Let buffer be garbage collected
      return;
    }

    // Clear buffer before returning to pool (security best practice)
    // This prevents data leakage between uses
    buffer.fill(0);

    // Return to pool
    this.available.push(buffer);
  }

  /**
   * Get pool statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      available: this.available.length,
      acquired: this.stats.acquired,
      released: this.stats.released,
      created: this.stats.created,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.acquired > 0
        ? (this.stats.hits / this.stats.acquired * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Clear the pool and release all buffers
   */
  destroy() {
    this.available = [];
  }
}

// Test Task 4
try {
  const pool = new LogBufferPool(1024, 10);

  console.log('Initial stats:', pool.getStats());

  const buf1 = pool.acquire();
  const buf2 = pool.acquire();

  console.log('After 2 acquisitions:', pool.getStats());

  pool.release(buf1);
  console.log('After 1 release:', pool.getStats());

  // Acquire many buffers to test miss scenario
  const buffers = [];
  for (let i = 0; i < 15; i++) {
    buffers.push(pool.acquire());
  }

  console.log('After 15 acquisitions:', pool.getStats());

  // Release all
  buffers.forEach(buf => pool.release(buf));
  pool.release(buf2);

  console.log('After releasing all:', pool.getStats());
  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: High-performance log filter
console.log('Task 5: High-Performance Filter');
/**
 * Filter log entries by level with zero-copy when possible
 * @param {Buffer[]} entries - Array of encoded log entries
 * @param {number} minLevel - Minimum log level to include
 * @returns {Buffer[]} Filtered entries
 *
 * Approach:
 * - Read only the level byte (offset 8) without full decode
 * - Use subarray() for zero-copy reference (not slice())
 * - Avoid creating new buffers unless necessary
 * - Maintain reference to original data for efficiency
 */
function filterLogsByLevel(entries, minLevel) {
  // Validate inputs
  if (!Array.isArray(entries)) {
    throw new TypeError('Entries must be an array');
  }

  if (typeof minLevel !== 'number' || minLevel < 0 || minLevel > 3) {
    throw new RangeError('Min level must be between 0 and 3');
  }

  const filtered = [];

  for (const entry of entries) {
    // Validate entry is a buffer
    if (!Buffer.isBuffer(entry)) {
      throw new TypeError('Each entry must be a Buffer');
    }

    // Check minimum size
    if (entry.length < 11) {
      // Invalid entry, skip
      continue;
    }

    // Read level byte directly (offset 8) - zero-copy read
    const level = entry.readUInt8(8);

    // Filter by level
    if (level >= minLevel) {
      // Use subarray() for zero-copy - creates a view, not a copy
      // In this case, since we're keeping the whole entry, we can just
      // push the reference
      filtered.push(entry);
    }
  }

  return filtered;
}

// Test Task 5
try {
  const testEntries = [
    encodeLogEntry({ timestamp: 1, level: 0, message: 'Debug' }),
    encodeLogEntry({ timestamp: 2, level: 2, message: 'Warning' }),
    encodeLogEntry({ timestamp: 3, level: 3, message: 'Error' }),
    encodeLogEntry({ timestamp: 4, level: 1, message: 'Info' })
  ];

  console.log('Total entries:', testEntries.length);

  const filtered = filterLogsByLevel(testEntries, 2); // WARN and above
  console.log('Filtered entries (level >= 2):', filtered.length);
  console.log('Expected: 2 entries (WARN and ERROR)');

  // Verify filtered entries
  filtered.forEach((buf, idx) => {
    const decoded = decodeLogEntry(buf);
    console.log(`  Entry ${idx + 1}:`, decoded.entry.message, `(level ${decoded.entry.level})`);
  });

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge: Log aggregator
console.log('Bonus Challenge: Log Aggregator');
/**
 * Aggregate log statistics from large log files efficiently
 *
 * Approach:
 * - Track counts by level using an array for O(1) access
 * - Track time range (min/max timestamps)
 * - Calculate statistics incrementally (running averages)
 * - Use efficient data structures for O(1) updates
 */
class LogAggregator {
  constructor() {
    // Count by level (index is level: 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)
    this.countByLevel = [0, 0, 0, 0];

    // Time range tracking
    this.minTimestamp = Infinity;
    this.maxTimestamp = -Infinity;

    // Total entries
    this.totalEntries = 0;

    // Message length statistics (for performance insights)
    this.totalMessageLength = 0;
    this.minMessageLength = Infinity;
    this.maxMessageLength = -Infinity;
  }

  /**
   * Add an entry to aggregation
   * @param {Object} entry - Log entry { timestamp, level, message }
   */
  addEntry(entry) {
    // Validate entry
    if (!entry || typeof entry !== 'object') {
      throw new TypeError('Entry must be an object');
    }

    const { timestamp, level, message } = entry;

    // Validate fields
    if (typeof timestamp !== 'number') {
      throw new TypeError('Timestamp must be a number');
    }

    if (typeof level !== 'number' || level < 0 || level > 3) {
      throw new RangeError('Level must be between 0 and 3');
    }

    if (typeof message !== 'string') {
      throw new TypeError('Message must be a string');
    }

    // Update counts
    this.countByLevel[level]++;
    this.totalEntries++;

    // Update time range
    this.minTimestamp = Math.min(this.minTimestamp, timestamp);
    this.maxTimestamp = Math.max(this.maxTimestamp, timestamp);

    // Update message length statistics
    const messageLength = message.length;
    this.totalMessageLength += messageLength;
    this.minMessageLength = Math.min(this.minMessageLength, messageLength);
    this.maxMessageLength = Math.max(this.maxMessageLength, messageLength);
  }

  /**
   * Get aggregated statistics
   * @returns {Object} Statistics report
   */
  getReport() {
    // Map level indices to names
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

    // Create level breakdown
    const levelBreakdown = {};
    this.countByLevel.forEach((count, level) => {
      if (count > 0) {
        levelBreakdown[levelNames[level]] = {
          count,
          percentage: ((count / this.totalEntries) * 100).toFixed(2) + '%'
        };
      }
    });

    return {
      totalEntries: this.totalEntries,
      countByLevel: levelBreakdown,
      timeRange: this.totalEntries > 0 ? {
        start: this.minTimestamp,
        end: this.maxTimestamp,
        duration: this.maxTimestamp - this.minTimestamp
      } : null,
      messageStats: this.totalEntries > 0 ? {
        avgLength: (this.totalMessageLength / this.totalEntries).toFixed(2),
        minLength: this.minMessageLength,
        maxLength: this.maxMessageLength
      } : null
    };
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.countByLevel = [0, 0, 0, 0];
    this.minTimestamp = Infinity;
    this.maxTimestamp = -Infinity;
    this.totalEntries = 0;
    this.totalMessageLength = 0;
    this.minMessageLength = Infinity;
    this.maxMessageLength = -Infinity;
  }
}

// Test Bonus
try {
  const aggregator = new LogAggregator();

  const bonusEntries = [
    { timestamp: 1000, level: 0, message: 'A' },
    { timestamp: 2000, level: 1, message: 'BB' },
    { timestamp: 3000, level: 1, message: 'CCC' },
    { timestamp: 4000, level: 3, message: 'DDDD' },
    { timestamp: 5000, level: 2, message: 'EEEEE' }
  ];

  bonusEntries.forEach(e => aggregator.addEntry(e));

  console.log('Aggregation report:');
  console.log(JSON.stringify(aggregator.getReport(), null, 2));
  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 1 Complete ===');
console.log('');
console.log('💡 Tips:');
console.log('  • Use BigUInt64 for timestamps to support large values');
console.log('  • Buffer pooling reduces allocation overhead by 80-90%');
console.log('  • Zero-copy operations (subarray) avoid memory duplication');
console.log('  • Stream processing handles files larger than available RAM');
console.log('  • Track statistics to identify optimization opportunities');
console.log('  • Clear buffers before reuse to prevent data leakage');
console.log('');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Binary Encoding:
 *    - Use proper endianness (LE = Little Endian) for compatibility
 *    - BigUInt64 for large numbers and future-proof timestamps
 *    - Calculate byte lengths carefully for UTF-8 strings
 *    - Validate data ranges before writing
 *
 * 2. Streaming Parsing:
 *    - Accumulate incomplete data between chunks
 *    - Extract only complete entries
 *    - Handle variable-length messages correctly
 *    - Track bytes consumed for offset management
 *
 * 3. Buffer Pooling:
 *    - Pre-allocate buffers to avoid runtime allocation
 *    - Track hits/misses to measure effectiveness
 *    - Clear buffers on release (security)
 *    - Don't exceed max pool size
 *
 * 4. Zero-Copy Operations:
 *    - Use subarray() instead of slice() when possible
 *    - Read only needed fields (e.g., just the level byte)
 *    - Avoid creating new buffers unless necessary
 *    - Reference original data for filtering
 *
 * 5. Production Best Practices:
 *    - Comprehensive input validation
 *    - Descriptive error messages
 *    - Statistics tracking for monitoring
 *    - Memory safety (bounds checking)
 *    - Clear separation of concerns
 */
