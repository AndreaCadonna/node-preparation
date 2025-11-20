/**
 * Exercise 3 Solution: Buffer Comparison and Searching
 *
 * This solution demonstrates:
 * - Manual buffer equality checking
 * - Finding bytes and patterns in buffers
 * - Lexicographic comparison algorithms
 * - Finding all occurrences of patterns
 * - Case-insensitive comparisons
 */

console.log('=== Exercise 3: Buffer Comparison and Searching ===\n');

// Task 1: Buffer equality checker
console.log('Task 1: Check if two buffers are equal');
/**
 * Create a function that checks if two buffers are equal
 * Don't use .equals() - implement it manually
 *
 * Approach:
 * - First check lengths (fast path for inequality)
 * - Then compare byte by byte
 * - Return false on first mismatch (early exit)
 */
function buffersEqual(buf1, buf2) {
  // Validate inputs
  if (!Buffer.isBuffer(buf1) || !Buffer.isBuffer(buf2)) {
    throw new TypeError('Both arguments must be Buffers');
  }

  // Fast path: different lengths = not equal
  if (buf1.length !== buf2.length) {
    return false;
  }

  // Compare byte by byte
  for (let i = 0; i < buf1.length; i++) {
    if (buf1[i] !== buf2[i]) {
      return false;
    }
  }

  // All bytes match
  return true;
}

// Test Task 1
try {
  const a = Buffer.from('Hello');
  const b = Buffer.from('Hello');
  const c = Buffer.from('World');
  const d = Buffer.from('Hell'); // Shorter

  console.log('buffersEqual(a, b):', buffersEqual(a, b), '(expected: true)');
  console.log('buffersEqual(a, c):', buffersEqual(a, c), '(expected: false)');
  console.log('buffersEqual(a, d):', buffersEqual(a, d), '(expected: false)');
  console.log('Verify with native .equals():', a.equals(b));
  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Find byte in buffer
console.log('Task 2: Find first occurrence of a byte');
/**
 * Create a function that finds the first occurrence of a byte
 *
 * Approach:
 * - Start searching from 'start' position
 * - Return index of first match
 * - Return -1 if not found
 */
function indexOf(buffer, byte, start = 0) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (typeof byte !== 'number' || !Number.isInteger(byte)) {
    throw new TypeError('Byte must be an integer');
  }

  if (byte < 0 || byte > 255) {
    throw new RangeError('Byte must be between 0 and 255');
  }

  if (typeof start !== 'number' || !Number.isInteger(start)) {
    throw new TypeError('Start must be an integer');
  }

  // Normalize start (handle negative values)
  if (start < 0) {
    start = 0;
  }

  // Search for the byte
  for (let i = start; i < buffer.length; i++) {
    if (buffer[i] === byte) {
      return i;
    }
  }

  // Not found
  return -1;
}

// Test Task 2
try {
  const text = Buffer.from('Hello World');
  console.log('Text:', text.toString());

  const pos1 = indexOf(text, 0x6F); // 'o'
  console.log('First "o" at position:', pos1, '(expected: 4)');

  const pos2 = indexOf(text, 0x6F, pos1 + 1); // Next 'o'
  console.log('Second "o" at position:', pos2, '(expected: 7)');

  const pos3 = indexOf(text, 0x58); // 'X' - not found
  console.log('"X" position:', pos3, '(expected: -1)');

  // Verify with native indexOf
  console.log('Verify with native indexOf:', text.indexOf(0x6F));
  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Find sub-buffer (pattern matching)
console.log('Task 3: Find a sub-buffer within a buffer');
/**
 * Create a function that finds a pattern in a buffer
 *
 * Approach:
 * - Slide the pattern across the buffer
 * - At each position, check if pattern matches
 * - Use early exit for mismatches
 */
function indexOfBuffer(buffer, pattern) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (!Buffer.isBuffer(pattern)) {
    throw new TypeError('Pattern must be a Buffer');
  }

  // Empty pattern or pattern larger than buffer
  if (pattern.length === 0) {
    return 0; // Empty pattern matches at position 0
  }

  if (pattern.length > buffer.length) {
    return -1; // Pattern can't fit in buffer
  }

  // Slide pattern across buffer
  const lastPossiblePosition = buffer.length - pattern.length;

  for (let i = 0; i <= lastPossiblePosition; i++) {
    // Check if pattern matches at current position
    let matches = true;

    for (let j = 0; j < pattern.length; j++) {
      if (buffer[i + j] !== pattern[j]) {
        matches = false;
        break; // Early exit on mismatch
      }
    }

    if (matches) {
      return i; // Found at position i
    }
  }

  // Not found
  return -1;
}

// Test Task 3
try {
  const haystack = Buffer.from('The quick brown fox');
  const needle1 = Buffer.from('quick');
  const needle2 = Buffer.from('slow');
  const needle3 = Buffer.from('The');
  const needle4 = Buffer.from('fox');

  console.log('Text:', haystack.toString());
  console.log('"quick" found at:', indexOfBuffer(haystack, needle1), '(expected: 4)');
  console.log('"slow" found at:', indexOfBuffer(haystack, needle2), '(expected: -1)');
  console.log('"The" found at:', indexOfBuffer(haystack, needle3), '(expected: 0)');
  console.log('"fox" found at:', indexOfBuffer(haystack, needle4), '(expected: 16)');

  // Verify with native indexOf
  console.log('Verify with native indexOf:', haystack.indexOf(needle1));
  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Compare buffers lexicographically
console.log('Task 4: Lexicographic comparison');
/**
 * Create a function that compares two buffers
 * Don't use .compare() - implement it manually
 *
 * Approach:
 * - Compare byte by byte
 * - Return -1, 0, or 1 based on comparison
 * - If all bytes equal but different lengths, shorter is "less"
 */
function compareBuffers(buf1, buf2) {
  // Validate inputs
  if (!Buffer.isBuffer(buf1) || !Buffer.isBuffer(buf2)) {
    throw new TypeError('Both arguments must be Buffers');
  }

  // Compare byte by byte up to the shorter length
  const minLength = Math.min(buf1.length, buf2.length);

  for (let i = 0; i < minLength; i++) {
    if (buf1[i] < buf2[i]) {
      return -1; // buf1 is less
    }
    if (buf1[i] > buf2[i]) {
      return 1; // buf1 is greater
    }
  }

  // All compared bytes are equal
  // Compare lengths
  if (buf1.length < buf2.length) {
    return -1; // buf1 is shorter (less)
  }
  if (buf1.length > buf2.length) {
    return 1; // buf1 is longer (greater)
  }

  // Completely equal
  return 0;
}

// Test Task 4
try {
  const abc = Buffer.from('abc');
  const def = Buffer.from('def');
  const abc2 = Buffer.from('abc');
  const ab = Buffer.from('ab');

  console.log('compareBuffers(abc, def):', compareBuffers(abc, def), '(expected: -1)');
  console.log('compareBuffers(def, abc):', compareBuffers(def, abc), '(expected: 1)');
  console.log('compareBuffers(abc, abc2):', compareBuffers(abc, abc2), '(expected: 0)');
  console.log('compareBuffers(abc, ab):', compareBuffers(abc, ab), '(expected: 1)');

  // Verify with native compare
  console.log('Verify with native compare:', abc.compare(def));
  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Find all occurrences
console.log('Task 5: Find all occurrences of a byte');
/**
 * Create a function that finds all positions where a byte occurs
 *
 * Approach:
 * - Iterate through entire buffer
 * - Collect all matching positions in an array
 * - Return array of indices
 */
function findAll(buffer, byte) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (typeof byte !== 'number' || !Number.isInteger(byte)) {
    throw new TypeError('Byte must be an integer');
  }

  if (byte < 0 || byte > 255) {
    throw new RangeError('Byte must be between 0 and 255');
  }

  const positions = [];

  // Find all occurrences
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === byte) {
      positions.push(i);
    }
  }

  return positions;
}

// Test Task 5
try {
  const text = Buffer.from('Mississippi');
  console.log('Text:', text.toString());

  const iPositions = findAll(text, 0x69); // 'i'
  console.log('Positions of "i":', iPositions, '(expected: [1, 4, 7, 10])');

  const sPositions = findAll(text, 0x73); // 's'
  console.log('Positions of "s":', sPositions, '(expected: [2, 3, 5, 6])');

  const zPositions = findAll(text, 0x7A); // 'z' - not found
  console.log('Positions of "z":', zPositions, '(expected: [])');

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 1: Case-insensitive comparison
console.log('Bonus Challenge 1: Case-insensitive equals');
/**
 * Create a function that compares buffers ignoring case (for ASCII text)
 *
 * Approach:
 * - Compare lengths first
 * - Convert each byte to lowercase before comparing
 * - For ASCII: 'A'-'Z' (65-90) -> 'a'-'z' (97-122) by adding 32
 */
function equalsIgnoreCase(buf1, buf2) {
  // Validate inputs
  if (!Buffer.isBuffer(buf1) || !Buffer.isBuffer(buf2)) {
    throw new TypeError('Both arguments must be Buffers');
  }

  // Fast path: different lengths = not equal
  if (buf1.length !== buf2.length) {
    return false;
  }

  // Helper function to convert byte to lowercase
  const toLower = (byte) => {
    // If byte is uppercase letter (A-Z: 65-90)
    if (byte >= 65 && byte <= 90) {
      return byte + 32; // Convert to lowercase (a-z: 97-122)
    }
    return byte;
  };

  // Compare byte by byte with case conversion
  for (let i = 0; i < buf1.length; i++) {
    if (toLower(buf1[i]) !== toLower(buf2[i])) {
      return false;
    }
  }

  return true;
}

// Test Bonus 1
try {
  const upper = Buffer.from('HELLO');
  const lower = Buffer.from('hello');
  const mixed = Buffer.from('HeLLo');
  const different = Buffer.from('WORLD');

  console.log('equalsIgnoreCase(HELLO, hello):', equalsIgnoreCase(upper, lower), '(expected: true)');
  console.log('equalsIgnoreCase(HELLO, HeLLo):', equalsIgnoreCase(upper, mixed), '(expected: true)');
  console.log('equalsIgnoreCase(HELLO, WORLD):', equalsIgnoreCase(upper, different), '(expected: false)');

  console.log('✓ Bonus 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 2: Find and count pattern
console.log('Bonus Challenge 2: Count pattern occurrences');
/**
 * Create a function that counts how many times a pattern appears
 *
 * Approach:
 * - Find pattern repeatedly
 * - Continue searching after each match
 * - Count total occurrences
 */
function countOccurrences(buffer, pattern) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (!Buffer.isBuffer(pattern)) {
    throw new TypeError('Pattern must be a Buffer');
  }

  if (pattern.length === 0) {
    return 0; // Empty pattern
  }

  if (pattern.length > buffer.length) {
    return 0; // Pattern can't fit
  }

  let count = 0;
  let position = 0;

  // Keep searching from the last found position
  while (position <= buffer.length - pattern.length) {
    // Check if pattern matches at current position
    let matches = true;

    for (let i = 0; i < pattern.length; i++) {
      if (buffer[position + i] !== pattern[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      count++;
      // Move past this occurrence
      // Note: This counts non-overlapping occurrences
      // For overlapping, use: position++
      position += pattern.length;
    } else {
      position++;
    }
  }

  return count;
}

// Test Bonus 2
try {
  const text1 = Buffer.from('abababab');
  const pattern1 = Buffer.from('ab');
  const count1 = countOccurrences(text1, pattern1);
  console.log('Text:', text1.toString());
  console.log('Pattern:', pattern1.toString());
  console.log('Occurrences (non-overlapping):', count1, '(expected: 4)');

  const text2 = Buffer.from('aaaa');
  const pattern2 = Buffer.from('aa');
  const count2 = countOccurrences(text2, pattern2);
  console.log('\nText:', text2.toString());
  console.log('Pattern:', pattern2.toString());
  console.log('Occurrences (non-overlapping):', count2, '(expected: 2)');

  console.log('✓ Bonus 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 3 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Buffer Comparison:
 *    - Always check length first (fast path)
 *    - Compare byte by byte for equality
 *    - Use early exit on first mismatch
 *    - Lexicographic: compare bytes, then length
 *
 * 2. Search Algorithms:
 *    - Linear search: O(n) for single byte
 *    - Pattern matching: O(n*m) naive algorithm
 *    - Early exit optimization improves average case
 *    - Consider Boyer-Moore for large patterns
 *
 * 3. Index Handling:
 *    - Return -1 for "not found" (convention)
 *    - Return 0 for empty pattern at start
 *    - Validate start position is within bounds
 *
 * 4. Case Sensitivity:
 *    - ASCII uppercase: 65-90 (A-Z)
 *    - ASCII lowercase: 97-122 (a-z)
 *    - Difference of 32 between cases
 *    - Only works for ASCII, not Unicode
 *
 * 5. Overlapping vs Non-overlapping:
 *    - Non-overlapping: "aaaa" contains "aa" 2 times
 *    - Overlapping: "aaaa" contains "aa" 3 times
 *    - Choose based on use case
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Not checking bounds in pattern matching:
 *    for (let i = 0; i < buffer.length; i++) { // Wrong!
 *      if (buffer[i+pattern.length]) // May exceed bounds
 *    }
 *
 * ❌ Comparing references instead of contents:
 *    if (buf1 === buf2) // Always false for different objects
 *
 * ❌ Forgetting to handle empty buffers/patterns:
 *    const result = indexOf(Buffer.alloc(0), 65); // Handle gracefully
 *
 * ❌ Not validating byte ranges:
 *    indexOf(buffer, 256) // Invalid! Bytes are 0-255
 *
 * ❌ Case conversion for non-ASCII:
 *    // toLower(200) doesn't make sense
 *    // Only convert ASCII letters (65-90)
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Implement Boyer-Moore string search algorithm
 * 2. Create a fuzzy buffer matcher (allows N differences)
 * 3. Build a binary grep tool for searching files
 * 4. Implement Knuth-Morris-Pratt (KMP) algorithm
 * 5. Create a pattern compiler that optimizes searches
 * 6. Build a buffer diff tool showing all differences
 * 7. Implement case-insensitive pattern search
 */
