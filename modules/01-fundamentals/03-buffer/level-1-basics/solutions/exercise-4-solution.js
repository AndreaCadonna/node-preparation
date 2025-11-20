/**
 * Exercise 4 Solution: Buffer Concatenation and Manipulation
 *
 * This solution demonstrates:
 * - Manual buffer concatenation
 * - Joining buffers with separators
 * - Building efficient buffer builders
 * - Splitting buffers by delimiters
 * - Padding buffers to specific lengths
 * - Stream-like chunk collection
 */

console.log('=== Exercise 4: Buffer Concatenation ===\n');

// Task 1: Simple buffer joiner
console.log('Task 1: Join multiple buffers');
/**
 * Create a function that joins multiple buffers
 * Don't use Buffer.concat() - implement it manually
 *
 * Approach:
 * - Calculate total length of all buffers
 * - Allocate a single buffer of that size
 * - Copy each buffer into the correct position
 */
function joinBuffers(buffers) {
  // Validate input
  if (!Array.isArray(buffers)) {
    throw new TypeError('Input must be an array of Buffers');
  }

  // Validate each element is a buffer and calculate total length
  let totalLength = 0;
  for (const buf of buffers) {
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('All elements must be Buffers');
    }
    totalLength += buf.length;
  }

  // Handle empty case
  if (totalLength === 0) {
    return Buffer.alloc(0);
  }

  // Allocate result buffer
  const result = Buffer.allocUnsafe(totalLength);

  // Copy each buffer into position
  let offset = 0;
  for (const buf of buffers) {
    buf.copy(result, offset);
    offset += buf.length;
  }

  return result;
}

// Test Task 1
try {
  const parts = [
    Buffer.from('Hello'),
    Buffer.from(' '),
    Buffer.from('World')
  ];

  const joined = joinBuffers(parts);
  console.log('Parts:', parts.map(p => p.toString()));
  console.log('Joined:', joined.toString());
  console.log('Length:', joined.length, '(expected: 11)');

  // Verify with native Buffer.concat
  const native = Buffer.concat(parts);
  console.log('Matches native:', joined.equals(native) ? '✓' : '✗');

  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Join with separator
console.log('Task 2: Join buffers with separator');
/**
 * Create a function that joins buffers with a separator between them
 *
 * Approach:
 * - Calculate total length including separators
 * - Number of separators = number of buffers - 1
 * - Copy buffers and separators alternately
 */
function joinWithSeparator(buffers, separator) {
  // Validate inputs
  if (!Array.isArray(buffers)) {
    throw new TypeError('Buffers must be an array');
  }

  if (!Buffer.isBuffer(separator)) {
    throw new TypeError('Separator must be a Buffer');
  }

  // Handle empty or single-element array
  if (buffers.length === 0) {
    return Buffer.alloc(0);
  }

  if (buffers.length === 1) {
    // Return copy of the single buffer
    return Buffer.from(buffers[0]);
  }

  // Calculate total length
  let totalLength = 0;
  for (const buf of buffers) {
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('All elements must be Buffers');
    }
    totalLength += buf.length;
  }

  // Add length of separators (n-1 separators for n buffers)
  totalLength += separator.length * (buffers.length - 1);

  // Allocate result buffer
  const result = Buffer.allocUnsafe(totalLength);

  // Copy buffers and separators
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    // Copy buffer
    buffers[i].copy(result, offset);
    offset += buffers[i].length;

    // Copy separator (except after last buffer)
    if (i < buffers.length - 1) {
      separator.copy(result, offset);
      offset += separator.length;
    }
  }

  return result;
}

// Test Task 2
try {
  const words = [
    Buffer.from('apple'),
    Buffer.from('banana'),
    Buffer.from('cherry')
  ];
  const comma = Buffer.from(',');
  const space = Buffer.from(' ');

  const csv = joinWithSeparator(words, comma);
  console.log('Words:', words.map(w => w.toString()));
  console.log('CSV:', csv.toString());

  const spaced = joinWithSeparator(words, space);
  console.log('Spaced:', spaced.toString());

  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Buffer builder class
console.log('Task 3: Implement a BufferBuilder class');
/**
 * Create a class that builds buffers efficiently
 *
 * Approach:
 * - Store buffers in an array
 * - Calculate total length on demand
 * - Use Buffer.concat() for final build
 */
class BufferBuilder {
  constructor() {
    // Array to store buffer chunks
    this.buffers = [];
    // Cache total length
    this._length = 0;
  }

  append(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Argument must be a Buffer');
    }

    // Add to collection
    this.buffers.push(buffer);
    this._length += buffer.length;

    return this; // Allow chaining
  }

  appendString(str, encoding = 'utf8') {
    // Validate input
    if (typeof str !== 'string') {
      throw new TypeError('First argument must be a string');
    }

    // Convert to buffer and append
    const buffer = Buffer.from(str, encoding);
    return this.append(buffer);
  }

  build() {
    // Concatenate all buffers
    if (this.buffers.length === 0) {
      return Buffer.alloc(0);
    }

    return Buffer.concat(this.buffers, this._length);
  }

  reset() {
    // Clear all buffers
    this.buffers = [];
    this._length = 0;

    return this; // Allow chaining
  }

  get length() {
    // Return total length
    return this._length;
  }
}

// Test Task 3
try {
  const builder = new BufferBuilder();
  builder.appendString('Hello ');
  builder.appendString('World');
  builder.append(Buffer.from('!'));

  console.log('Total length:', builder.length, '(expected: 12)');

  const result = builder.build();
  console.log('Built:', result.toString());

  builder.reset();
  console.log('After reset:', builder.length, '(expected: 0)');

  // Test chaining
  const result2 = new BufferBuilder()
    .appendString('Chaining ')
    .appendString('works!')
    .build();
  console.log('Chained result:', result2.toString());

  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Split buffer
console.log('Task 4: Split buffer by delimiter');
/**
 * Create a function that splits a buffer by a delimiter byte
 *
 * Approach:
 * - Find all positions of delimiter
 * - Extract segments between delimiters
 * - Handle edge cases (no delimiter, empty segments)
 */
function splitBuffer(buffer, delimiter) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (typeof delimiter !== 'number' || !Number.isInteger(delimiter)) {
    throw new TypeError('Delimiter must be an integer');
  }

  if (delimiter < 0 || delimiter > 255) {
    throw new RangeError('Delimiter must be between 0 and 255');
  }

  const segments = [];
  let start = 0;

  // Find all delimiter positions
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === delimiter) {
      // Extract segment from start to current position
      segments.push(buffer.subarray(start, i));
      start = i + 1; // Next segment starts after delimiter
    }
  }

  // Add final segment (from last delimiter to end)
  segments.push(buffer.subarray(start));

  return segments;
}

// Test Task 4
try {
  const lines = Buffer.from('line1\nline2\nline3');
  const segments = splitBuffer(lines, 0x0A); // Split by newline

  console.log('Original:', lines.toString());
  console.log('Split into', segments.length, 'parts:');
  segments.forEach((seg, i) => console.log(`  [${i}]:`, seg.toString()));

  // Test with trailing delimiter
  const withTrailing = Buffer.from('a,b,c,');
  const segments2 = splitBuffer(withTrailing, 0x2C); // Split by comma
  console.log('\nWith trailing delimiter:', withTrailing.toString());
  console.log('Segments:', segments2.map(s => `"${s.toString()}"`));

  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Pad buffer
console.log('Task 5: Pad buffer to specified length');
/**
 * Create functions to pad a buffer with bytes
 *
 * Approach:
 * - If buffer is already long enough, return copy
 * - Calculate padding needed
 * - Concatenate original with padding
 */
function padRight(buffer, length, padByte = 0) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (typeof length !== 'number' || !Number.isInteger(length)) {
    throw new TypeError('Length must be an integer');
  }

  if (length < 0) {
    throw new RangeError('Length must be non-negative');
  }

  if (typeof padByte !== 'number' || !Number.isInteger(padByte)) {
    throw new TypeError('Pad byte must be an integer');
  }

  if (padByte < 0 || padByte > 255) {
    throw new RangeError('Pad byte must be between 0 and 255');
  }

  // If already long enough, return copy
  if (buffer.length >= length) {
    return Buffer.from(buffer);
  }

  // Calculate padding needed
  const paddingLength = length - buffer.length;
  const padding = Buffer.alloc(paddingLength, padByte);

  // Concatenate original + padding
  return Buffer.concat([buffer, padding], length);
}

function padLeft(buffer, length, padByte = 0) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (typeof length !== 'number' || !Number.isInteger(length)) {
    throw new TypeError('Length must be an integer');
  }

  if (length < 0) {
    throw new RangeError('Length must be non-negative');
  }

  if (typeof padByte !== 'number' || !Number.isInteger(padByte)) {
    throw new TypeError('Pad byte must be an integer');
  }

  if (padByte < 0 || padByte > 255) {
    throw new RangeError('Pad byte must be between 0 and 255');
  }

  // If already long enough, return copy
  if (buffer.length >= length) {
    return Buffer.from(buffer);
  }

  // Calculate padding needed
  const paddingLength = length - buffer.length;
  const padding = Buffer.alloc(paddingLength, padByte);

  // Concatenate padding + original
  return Buffer.concat([padding, buffer], length);
}

// Test Task 5
try {
  const short = Buffer.from('Hi');

  const rightPadded = padRight(short, 10, 0x20); // Pad with spaces
  console.log('Original:', `"${short.toString()}"`);
  console.log('Right padded:', `"${rightPadded.toString()}"`);
  console.log('Length:', rightPadded.length, '(expected: 10)');

  const leftPadded = padLeft(short, 10, 0x2E); // Pad with dots
  console.log('Left padded:', `"${leftPadded.toString()}"`);
  console.log('Length:', leftPadded.length, '(expected: 10)');

  // Test when already long enough
  const long = Buffer.from('Already long');
  const notPadded = padRight(long, 5);
  console.log('Not padded:', notPadded.toString(), '(length:', notPadded.length, ')');

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge: Efficient chunk collector
console.log('Bonus Challenge: Stream-like chunk collector');
/**
 * Create a class that collects chunks efficiently
 * and processes them when a complete message is received
 *
 * Approach:
 * - Store expected size
 * - Collect chunks in an array
 * - Track bytes collected
 * - Return complete when enough data received
 */
class ChunkCollector {
  constructor(expectedSize) {
    // Validate input
    if (typeof expectedSize !== 'number' || !Number.isInteger(expectedSize)) {
      throw new TypeError('Expected size must be an integer');
    }

    if (expectedSize <= 0) {
      throw new RangeError('Expected size must be positive');
    }

    this.expectedSize = expectedSize;
    this.chunks = [];
    this.collected = 0;
  }

  add(chunk) {
    // Validate input
    if (!Buffer.isBuffer(chunk)) {
      throw new TypeError('Chunk must be a Buffer');
    }

    // Add chunk to collection
    this.chunks.push(chunk);
    this.collected += chunk.length;

    // Return true if we have collected enough
    return this.collected >= this.expectedSize;
  }

  getData() {
    // Concatenate all chunks
    if (this.chunks.length === 0) {
      return Buffer.alloc(0);
    }

    const data = Buffer.concat(this.chunks, this.collected);

    // If we collected more than expected, trim to expected size
    if (data.length > this.expectedSize) {
      return data.subarray(0, this.expectedSize);
    }

    return data;
  }

  reset() {
    // Clear collected chunks
    this.chunks = [];
    this.collected = 0;
  }

  get bytesCollected() {
    // Return how many bytes collected so far
    return this.collected;
  }

  get bytesRemaining() {
    // Return how many bytes still needed
    const remaining = this.expectedSize - this.collected;
    return remaining > 0 ? remaining : 0;
  }
}

// Test Bonus
try {
  const collector = new ChunkCollector(20);

  console.log('Expecting 20 bytes');
  console.log('Bytes remaining:', collector.bytesRemaining);

  const chunk1 = Buffer.from('Hello ');
  const complete1 = collector.add(chunk1);
  console.log('Add chunk 1 (6 bytes):', complete1 ? 'Complete' : 'Not complete');
  console.log('  Collected:', collector.bytesCollected, 'Remaining:', collector.bytesRemaining);

  const chunk2 = Buffer.from('World!');
  const complete2 = collector.add(chunk2);
  console.log('Add chunk 2 (6 bytes):', complete2 ? 'Complete' : 'Not complete');
  console.log('  Collected:', collector.bytesCollected, 'Remaining:', collector.bytesRemaining);

  const chunk3 = Buffer.from(' Complete');
  const complete3 = collector.add(chunk3);
  console.log('Add chunk 3 (9 bytes):', complete3 ? 'Complete' : 'Not complete');
  console.log('  Collected:', collector.bytesCollected, 'Remaining:', collector.bytesRemaining);

  const data = collector.getData();
  console.log('Final data:', `"${data.toString()}"`);
  console.log('Final length:', data.length, '(expected: 20)');

  collector.reset();
  console.log('After reset - collected:', collector.bytesCollected);

  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 4 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Buffer Concatenation:
 *    - Calculate total length first
 *    - Allocate single buffer (more efficient than growing)
 *    - Use .copy() to copy data
 *    - Buffer.concat() is optimized for this
 *
 * 2. Memory Efficiency:
 *    - Avoid creating many small buffers
 *    - Collect in array, concatenate once
 *    - Use allocUnsafe when data will be overwritten
 *    - Consider buffer pools for frequent operations
 *
 * 3. Builder Pattern:
 *    - Accumulate data before allocating final buffer
 *    - Allow method chaining (return this)
 *    - Cache computed values (like length)
 *    - Provide reset for reuse
 *
 * 4. Splitting:
 *    - Use .subarray() for zero-copy slicing
 *    - Handle empty segments correctly
 *    - Consider edge cases (no delimiter, trailing delimiter)
 *
 * 5. Padding:
 *    - Left padding: prepend
 *    - Right padding: append
 *    - Use Buffer.alloc() with fill value
 *    - Return copy if already long enough
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Creating new buffers in a loop:
 *    let result = Buffer.alloc(0);
 *    for (const buf of buffers) {
 *      result = Buffer.concat([result, buf]); // Very inefficient!
 *    }
 *
 * ❌ Not validating array contents:
 *    joinBuffers([Buffer.from('a'), 'not a buffer']); // Will crash
 *
 * ❌ Forgetting edge cases:
 *    joinWithSeparator([]) // Empty array
 *    joinWithSeparator([buf]) // Single element
 *
 * ❌ Using .slice() instead of .subarray():
 *    // .slice() copies data (deprecated)
 *    // .subarray() creates a view (efficient)
 *
 * ❌ Modifying buffers after adding to builder:
 *    builder.append(buf);
 *    buf[0] = 0; // Modifies data in builder!
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Implement a circular buffer for streaming data
 * 2. Create a buffer pool manager for recycling buffers
 * 3. Build a delimiter-based message parser
 * 4. Implement a growable buffer (like ArrayList)
 * 5. Create a buffer writer with endianness support
 * 6. Build a serialization framework using buffers
 * 7. Implement length-prefixed message protocol
 */
