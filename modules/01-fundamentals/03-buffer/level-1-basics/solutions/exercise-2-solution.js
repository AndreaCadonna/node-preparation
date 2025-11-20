/**
 * Exercise 2 Solution: Working with Binary Data
 *
 * This solution demonstrates:
 * - Inspecting and analyzing binary data
 * - Byte-level manipulation and frequency analysis
 * - Simple encryption with XOR cipher
 * - Checksum calculation and verification
 * - Creating formatted hex dumps
 */

console.log('=== Exercise 2: Working with Binary Data ===\n');

// Task 1: Binary data inspector
console.log('Task 1: Create a binary inspector');
/**
 * Create a function that analyzes a buffer and returns information about it
 *
 * Approach:
 * - Extract first and last bytes using array indexing
 * - Iterate through buffer to check for null bytes and printable characters
 * - Printable ASCII range is 32-126 (space to tilde)
 */
function inspectBuffer(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length === 0) {
    return {
      length: 0,
      firstByte: null,
      lastByte: null,
      hasNullBytes: false,
      allPrintable: false
    };
  }

  // Get first and last bytes
  const firstByte = buffer[0];
  const lastByte = buffer[buffer.length - 1];

  // Check for null bytes and printable characters
  let hasNullBytes = false;
  let allPrintable = true;

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    // Check for null byte (0x00)
    if (byte === 0x00) {
      hasNullBytes = true;
    }

    // Printable ASCII range: 32 (space) to 126 (tilde)
    // This excludes control characters and extended ASCII
    if (byte < 32 || byte > 126) {
      allPrintable = false;
    }
  }

  return {
    length: buffer.length,
    firstByte,
    lastByte,
    hasNullBytes,
    allPrintable
  };
}

// Test Task 1
try {
  const test1 = Buffer.from('Hello');
  const test2 = Buffer.from([0x00, 0x01, 0x02]);
  const test3 = Buffer.from([0xFF, 0xFE, 0xFD]);

  console.log('Buffer 1 "Hello":', inspectBuffer(test1));
  console.log('Buffer 2 [0x00, 0x01, 0x02]:', inspectBuffer(test2));
  console.log('Buffer 3 [0xFF, 0xFE, 0xFD]:', inspectBuffer(test3));
  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Byte frequency counter
console.log('Task 2: Count byte frequencies');
/**
 * Create a function that counts how many times each byte value appears
 *
 * Approach:
 * - Use a Map to store byte values and their counts
 * - Iterate through the buffer and increment counters
 * - Map is better than Object for numeric keys
 */
function countByteFrequency(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  // Create a Map to store frequencies
  const frequencies = new Map();

  // Count each byte
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    // Get current count (or 0 if not present) and increment
    const count = frequencies.get(byte) || 0;
    frequencies.set(byte, count + 1);
  }

  return frequencies;
}

// Test Task 2
try {
  const data = Buffer.from('HELLO WORLD');
  const freq = countByteFrequency(data);
  console.log('Text:', data.toString());
  console.log('Frequencies:');
  // Sort by byte value for consistent output
  const sortedEntries = Array.from(freq.entries()).sort((a, b) => a[0] - b[0]);
  for (const [byte, count] of sortedEntries) {
    const char = String.fromCharCode(byte);
    console.log(`  '${char}' (0x${byte.toString(16).padStart(2, '0')}): ${count}`);
  }
  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Find and replace bytes
console.log('Task 3: Find and replace byte values');
/**
 * Create a function that replaces all occurrences of one byte with another
 *
 * Approach:
 * - Iterate through buffer and replace matching bytes
 * - Modify buffer in place (buffers are mutable)
 * - Return count of replacements made
 */
function replaceBytes(buffer, findByte, replaceByte) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer');
  }

  if (typeof findByte !== 'number' || !Number.isInteger(findByte)) {
    throw new TypeError('Find byte must be an integer');
  }

  if (typeof replaceByte !== 'number' || !Number.isInteger(replaceByte)) {
    throw new TypeError('Replace byte must be an integer');
  }

  if (findByte < 0 || findByte > 255) {
    throw new RangeError('Find byte must be between 0 and 255');
  }

  if (replaceByte < 0 || replaceByte > 255) {
    throw new RangeError('Replace byte must be between 0 and 255');
  }

  let count = 0;

  // Iterate and replace
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === findByte) {
      buffer[i] = replaceByte;
      count++;
    }
  }

  return count;
}

// Test Task 3
try {
  const text = Buffer.from('Hello World');
  console.log('Before:', text.toString());

  const count = replaceBytes(text, 0x6F, 0x30); // Replace 'o' with '0'
  console.log('After:', text.toString());
  console.log('Replacements:', count);
  console.log('Expected: "Hell0 W0rld" with 2 replacements');
  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: XOR cipher
console.log('Task 4: Simple XOR encryption/decryption');
/**
 * Create a function that XORs each byte with a key
 * XOR is its own inverse, so same function encrypts and decrypts
 *
 * Approach:
 * - Create a new buffer (don't modify original)
 * - XOR each byte with the key
 * - XOR properties: A ^ B ^ B = A (self-inverse)
 */
function xorCipher(buffer, key) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer');
  }

  if (typeof key !== 'number' || !Number.isInteger(key)) {
    throw new TypeError('Key must be an integer');
  }

  if (key < 0 || key > 255) {
    throw new RangeError('Key must be between 0 and 255');
  }

  // Create new buffer for result
  const result = Buffer.allocUnsafe(buffer.length);

  // XOR each byte with the key
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] ^ key;
  }

  return result;
}

// Test Task 4
try {
  const plaintext = Buffer.from('SECRET MESSAGE');
  const key = 0x42;

  console.log('Plaintext:', plaintext.toString());

  const encrypted = xorCipher(plaintext, key);
  console.log('Encrypted (hex):', encrypted.toString('hex'));

  const decrypted = xorCipher(encrypted, key);
  console.log('Decrypted:', decrypted.toString());

  console.log('Match:', plaintext.equals(decrypted) ? '✓' : '✗');
  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Checksum calculator
console.log('Task 5: Calculate simple checksum');
/**
 * Create a function that calculates a simple checksum
 * Sum all bytes and return the last byte (sum & 0xFF)
 *
 * Approach:
 * - Sum all bytes in the buffer
 * - Use modulo 256 or bitwise AND to get last byte
 * - This creates a simple error detection mechanism
 */
function calculateChecksum(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  let sum = 0;

  // Sum all bytes
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i];
  }

  // Return last byte of sum (sum modulo 256)
  // Equivalent to: sum % 256
  return sum & 0xFF;
}

/**
 * Create a function that verifies a message with checksum
 *
 * Approach:
 * - Calculate checksum of all bytes except the last one
 * - Compare calculated checksum with the last byte
 * - Return true if they match
 */
function verifyChecksum(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < 2) {
    throw new Error('Buffer must contain at least a message and checksum');
  }

  // Extract message (all bytes except last)
  const message = buffer.subarray(0, buffer.length - 1);

  // Extract checksum (last byte)
  const storedChecksum = buffer[buffer.length - 1];

  // Calculate checksum of message
  const calculatedChecksum = calculateChecksum(message);

  // Compare
  return calculatedChecksum === storedChecksum;
}

// Test Task 5
try {
  const message = Buffer.from('Hello World');
  const checksum = calculateChecksum(message);
  console.log('Message:', message.toString());
  console.log('Checksum:', checksum, `(0x${checksum.toString(16)})`);

  // Create message with checksum appended
  const withChecksum = Buffer.concat([message, Buffer.from([checksum])]);
  const valid = verifyChecksum(withChecksum);
  console.log('Verification:', valid ? '✓ Valid' : '✗ Invalid');

  // Corrupt the message
  withChecksum[0] ^= 0xFF;
  const corrupted = verifyChecksum(withChecksum);
  console.log('Corrupted check:', corrupted ? '✗ Should be invalid' : '✓ Correctly detected corruption');

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge: Hex dumper
console.log('Bonus Challenge: Create a hex dump function');
/**
 * Create a function that displays buffer in hex dump format
 * Format: OFFSET  HEX_BYTES  ASCII
 *
 * Approach:
 * - Process buffer in chunks of bytesPerLine
 * - Format offset, hex values, and ASCII representation
 * - Replace non-printable characters with '.'
 */
function hexDump(buffer, bytesPerLine = 16) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length === 0) {
    console.log('(empty buffer)');
    return;
  }

  // Process buffer in chunks
  for (let i = 0; i < buffer.length; i += bytesPerLine) {
    // Calculate end of current line
    const end = Math.min(i + bytesPerLine, buffer.length);
    const chunk = buffer.subarray(i, end);

    // Format offset (8 hex digits, zero-padded)
    const offset = i.toString(16).padStart(8, '0');

    // Format hex bytes (space-separated, 2 chars each)
    const hexBytes = [];
    for (let j = 0; j < chunk.length; j++) {
      hexBytes.push(chunk[j].toString(16).padStart(2, '0'));
    }

    // Pad hex section if line is not full
    const hexStr = hexBytes.join(' ').padEnd(bytesPerLine * 3 - 1, ' ');

    // Format ASCII representation
    let ascii = '';
    for (let j = 0; j < chunk.length; j++) {
      const byte = chunk[j];
      // Printable ASCII: 32-126
      if (byte >= 32 && byte <= 126) {
        ascii += String.fromCharCode(byte);
      } else {
        ascii += '.';
      }
    }

    // Print formatted line
    console.log(`${offset}  ${hexStr}  ${ascii}`);
  }
}

// Test Bonus
try {
  const data = Buffer.from('Hello, World! This is a test of hex dump.');
  console.log('Hex dump:');
  hexDump(data);

  console.log('\nHex dump with 8 bytes per line:');
  hexDump(data, 8);

  console.log('\nHex dump with binary data:');
  const binaryData = Buffer.from([
    0x00, 0x01, 0x02, 0x48, 0x65, 0x6c, 0x6c, 0x6f,
    0xFF, 0xFE, 0xFD, 0x7F, 0x80, 0x81, 0x82, 0x83
  ]);
  hexDump(binaryData);

  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 2 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Buffer Inspection:
 *    - Access bytes with array notation: buffer[index]
 *    - Check for specific byte values or patterns
 *    - Analyze data characteristics (printable, null bytes, etc.)
 *
 * 2. Binary Manipulation:
 *    - Buffers are mutable - can modify bytes in place
 *    - Use bitwise operations for efficient byte manipulation
 *    - XOR (^) is self-inverse: A ^ B ^ B = A
 *
 * 3. Data Structures:
 *    - Map is ideal for counting/frequency analysis
 *    - Better than Object for numeric keys
 *    - Maintains insertion order
 *
 * 4. Checksums:
 *    - Simple error detection mechanism
 *    - Sum modulo 256 creates a basic checksum
 *    - Not cryptographically secure, but useful for data validation
 *    - For production: use CRC32, MD5, SHA, etc.
 *
 * 5. Hex Dumps:
 *    - Standard format: offset, hex bytes, ASCII
 *    - Useful for debugging binary protocols
 *    - Replace non-printable chars with '.'
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Forgetting that buffers are mutable:
 *    const buf = Buffer.from('Hello');
 *    buf[0] = 0x58; // Now it's "Xello"
 *
 * ❌ Not validating byte ranges:
 *    buffer[0] = 256; // Wraps to 0! Use validation
 *
 * ❌ Using Object instead of Map for frequency counting:
 *    const freq = {}; // Keys become strings!
 *    freq[65] = 1; // Same as freq['65']
 *
 * ❌ Thinking XOR encryption is secure:
 *    // XOR with single byte is NOT secure!
 *    // Use crypto module for real encryption
 *
 * ❌ Not handling empty buffers:
 *    const buf = Buffer.alloc(0);
 *    buf[0] = 1; // No error, but doesn't work!
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Implement CRC32 checksum algorithm
 * 2. Create a binary diff tool that shows byte-level differences
 * 3. Build a pattern finder that searches for byte sequences
 * 4. Implement run-length encoding (RLE) compression
 * 5. Create a binary file analyzer that detects file types
 * 6. Build a more sophisticated XOR cipher with key stream
 */
