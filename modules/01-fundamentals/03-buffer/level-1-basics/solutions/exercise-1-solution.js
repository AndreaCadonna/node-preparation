/**
 * Exercise 1 Solution: Buffer Creation and Conversion
 *
 * This solution demonstrates:
 * - Creating buffers from various sources (hex, strings, allocations)
 * - Converting between different encodings
 * - Safe buffer operations with validation
 * - Buffer copying and byte length calculations
 */

console.log('=== Exercise 1: Buffer Creation and Conversion ===\n');

// Task 1: Create a buffer from a hex string
console.log('Task 1: Convert hex string to buffer');
/**
 * Create a function that converts a hex string to a buffer
 * Example: '48656c6c6f' should become Buffer with 'Hello'
 *
 * Approach:
 * - Buffer.from() accepts 'hex' as a valid encoding
 * - Hex strings represent bytes as 2-character pairs (00-FF)
 */
function hexToBuffer(hexString) {
  // Validate input
  if (typeof hexString !== 'string') {
    throw new TypeError('Input must be a string');
  }

  // Remove any spaces or separators that might be present
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');

  // Validate hex string length (must be even)
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have an even number of characters');
  }

  // Convert hex string to buffer
  // Buffer.from() with 'hex' encoding handles the conversion
  return Buffer.from(cleanHex, 'hex');
}

// Test Task 1
try {
  const hex1 = '48656c6c6f';
  const result1 = hexToBuffer(hex1);
  console.log('Input:', hex1);
  console.log('Output:', result1);
  console.log('As string:', result1.toString());
  console.log('Expected: "Hello"');
  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Convert buffer to different encodings
console.log('Task 2: Multi-encoding converter');
/**
 * Create a function that takes a string and returns an object
 * with the string encoded in different formats
 *
 * Approach:
 * - Create buffers with different encodings
 * - For output formats like hex and base64, use toString()
 */
function encodeToAll(text) {
  // Validate input
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string');
  }

  // Create buffers with different encodings
  // utf8: Standard Unicode encoding (default)
  const utf8Buffer = Buffer.from(text, 'utf8');

  // ascii: 7-bit ASCII encoding (strips high bits)
  const asciiBuffer = Buffer.from(text, 'ascii');

  // hex: Hexadecimal string representation
  const hexString = utf8Buffer.toString('hex');

  // base64: Base64 encoded string
  const base64String = utf8Buffer.toString('base64');

  return {
    utf8: utf8Buffer,
    ascii: asciiBuffer,
    hex: hexString,
    base64: base64String
  };
}

// Test Task 2
try {
  const text2 = 'Node.js';
  const result2 = encodeToAll(text2);
  console.log('Input:', text2);
  console.log('Output:', result2);
  console.log('UTF-8 as string:', result2.utf8.toString());
  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Safe buffer allocation
console.log('Task 3: Create a safe buffer allocator');
/**
 * Create a function that safely allocates a buffer and fills it with a pattern
 * If size is <= 0 or > 1024, throw an error
 *
 * Approach:
 * - Validate size parameter is within acceptable range
 * - Use Buffer.alloc() which initializes memory (safer than Buffer.allocUnsafe)
 * - Fill the buffer with the specified value
 */
function safeAllocate(size, fillValue = 0) {
  // Validate size
  if (typeof size !== 'number' || !Number.isInteger(size)) {
    throw new TypeError('Size must be an integer');
  }

  if (size <= 0) {
    throw new RangeError('Size must be greater than 0');
  }

  if (size > 1024) {
    throw new RangeError('Size must not exceed 1024 bytes');
  }

  // Validate fillValue
  if (typeof fillValue !== 'number' || !Number.isInteger(fillValue)) {
    throw new TypeError('Fill value must be an integer');
  }

  if (fillValue < 0 || fillValue > 255) {
    throw new RangeError('Fill value must be between 0 and 255');
  }

  // Allocate and fill buffer
  // Buffer.alloc() creates a zero-filled buffer by default
  // We can pass the fill value directly as the second parameter
  return Buffer.alloc(size, fillValue);
}

// Test Task 3
try {
  const safe1 = safeAllocate(10, 0xFF);
  console.log('safeAllocate(10, 0xFF):', safe1);

  const safe2 = safeAllocate(5, 65); // 'A' in ASCII
  console.log('safeAllocate(5, 65):', safe2.toString());

  // This should throw an error
  try {
    const safe3 = safeAllocate(2000, 0);
    console.log('✗ Should have thrown error for size > 1024\n');
  } catch (validationErr) {
    console.log('Caught expected error:', validationErr.message);
    console.log('✓ Task 3 complete\n');
  }
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Buffer copy with validation
console.log('Task 4: Safe buffer copy');
/**
 * Create a function that safely copies one buffer to another
 * Should validate that the source fits in the target
 *
 * Approach:
 * - Validate all parameters
 * - Check that source will fit in target at the specified position
 * - Use Buffer.copy() method to perform the copy
 */
function safeCopy(source, target, targetStart = 0) {
  // Validate inputs
  if (!Buffer.isBuffer(source)) {
    throw new TypeError('Source must be a Buffer');
  }

  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Target must be a Buffer');
  }

  if (typeof targetStart !== 'number' || !Number.isInteger(targetStart)) {
    throw new TypeError('Target start must be an integer');
  }

  if (targetStart < 0) {
    throw new RangeError('Target start must be >= 0');
  }

  // Check if source fits in target
  if (source.length + targetStart > target.length) {
    throw new RangeError(
      `Source buffer (${source.length} bytes) does not fit in target ` +
      `at position ${targetStart} (target size: ${target.length})`
    );
  }

  // Perform the copy
  // source.copy(target, targetStart) copies the entire source to target
  source.copy(target, targetStart);

  return true;
}

// Test Task 4
try {
  const source = Buffer.from('Hello');
  const target = Buffer.alloc(10);

  const success = safeCopy(source, target, 0);
  console.log('Copy succeeded:', success);
  console.log('Target buffer:', target.toString());

  // Try copying at different position
  const target2 = Buffer.alloc(10);
  safeCopy(source, target2, 5);
  console.log('Target with offset:', target2.toString());

  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Byte length calculator
console.log('Task 5: Calculate byte lengths for different encodings');
/**
 * Create a function that calculates how many bytes a string will take
 * in different encodings
 *
 * Approach:
 * - Use Buffer.byteLength() to get accurate byte counts
 * - Different encodings use different numbers of bytes per character
 * - UTF-8: 1-4 bytes per character (variable)
 * - ASCII: 1 byte per character
 * - UTF-16LE: 2 bytes per character (mostly)
 */
function calculateByteLengths(text) {
  // Validate input
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string');
  }

  return {
    // UTF-8: Variable-width encoding (1-4 bytes per character)
    // Most efficient for ASCII text, handles all Unicode
    utf8: Buffer.byteLength(text, 'utf8'),

    // ASCII: 7-bit encoding (1 byte per character)
    // Only supports characters 0-127, strips high bits from others
    ascii: Buffer.byteLength(text, 'ascii'),

    // UTF-16LE: 2 bytes per character (mostly, 4 for rare characters)
    // Little-endian byte order, commonly used on Windows
    utf16le: Buffer.byteLength(text, 'utf16le')
  };
}

// Test Task 5
try {
  const text5 = 'Hello 世界';
  const lengths = calculateByteLengths(text5);
  console.log('Text:', text5);
  console.log('Character length:', text5.length);
  console.log('Byte lengths:', lengths);
  console.log('Note: UTF-8 uses more bytes for non-ASCII characters (世界)');
  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge
console.log('Bonus Challenge: Buffer validator');
/**
 * Create a function that validates if a buffer contains valid UTF-8
 *
 * Approach:
 * - Try to decode the buffer as UTF-8
 * - If it succeeds, the buffer contains valid UTF-8
 * - If it throws or produces replacement characters, it's invalid
 */
function isValidUTF8(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  try {
    // Try to decode as UTF-8
    const decoded = buffer.toString('utf8');

    // Check if any replacement characters were produced
    // The Unicode replacement character (U+FFFD) indicates invalid encoding
    // However, it could also be legitimately in the text, so this is a simple check

    // A more robust check: encode back to UTF-8 and compare
    const reencoded = Buffer.from(decoded, 'utf8');

    // If the re-encoded buffer matches the original, it's valid UTF-8
    return buffer.equals(reencoded);
  } catch (err) {
    // If any error occurs during decoding, it's not valid UTF-8
    return false;
  }
}

// Test Bonus
try {
  const valid = Buffer.from('Hello', 'utf8');
  const invalid = Buffer.from([0xFF, 0xFE, 0xFD]);
  const validEmoji = Buffer.from('Hello 😀', 'utf8');

  console.log('Valid UTF-8 "Hello":', isValidUTF8(valid));
  console.log('Invalid UTF-8 [0xFF, 0xFE, 0xFD]:', isValidUTF8(invalid));
  console.log('Valid UTF-8 with emoji:', isValidUTF8(validEmoji));
  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 1 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Buffer Creation:
 *    - Buffer.from(data, encoding) - creates from existing data
 *    - Buffer.alloc(size, fill) - creates initialized buffer (safe)
 *    - Buffer.allocUnsafe(size) - faster but contains random data
 *
 * 2. Encodings:
 *    - 'utf8' - variable-width Unicode (1-4 bytes per char)
 *    - 'ascii' - 7-bit ASCII (1 byte per char, 0-127 only)
 *    - 'utf16le' - 16-bit Unicode (2+ bytes per char)
 *    - 'hex' - hexadecimal string representation
 *    - 'base64' - Base64 encoded string
 *
 * 3. Buffer Methods:
 *    - .toString(encoding) - convert to string
 *    - .copy(target, targetStart) - copy to another buffer
 *    - .equals(other) - compare buffers for equality
 *    - Buffer.byteLength(str, encoding) - get byte length
 *
 * 4. Validation:
 *    - Always validate input parameters
 *    - Check ranges for numeric values
 *    - Use specific error types (TypeError, RangeError)
 *    - Provide descriptive error messages
 *
 * 5. Safety:
 *    - Prefer Buffer.alloc() over Buffer.allocUnsafe()
 *    - Validate buffer sizes to prevent memory issues
 *    - Check bounds before copying or accessing
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Using Buffer.allocUnsafe() without initialization:
 *    const buf = Buffer.allocUnsafe(10); // Contains random data!
 *    // Should use: Buffer.alloc(10) or .fill() after allocUnsafe
 *
 * ❌ Assuming string length equals byte length:
 *    '世界'.length === 2 // true (2 characters)
 *    Buffer.from('世界').length === 6 // true (6 bytes in UTF-8)
 *
 * ❌ Not validating before buffer operations:
 *    source.copy(target, 100); // May overflow target!
 *
 * ❌ Forgetting that hex strings are twice the byte length:
 *    'FF' represents 1 byte, not 2
 *
 * ❌ Mixing up encodings:
 *    Buffer.from('Hello', 'hex') // Wrong! 'Hello' is not hex
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Create a function that converts between any two encodings
 * 2. Implement a buffer pool for efficient reuse
 * 3. Create a stream-based hex encoder for large files
 * 4. Build a buffer comparison function that shows differences
 * 5. Implement a safe buffer builder that grows dynamically
 */
