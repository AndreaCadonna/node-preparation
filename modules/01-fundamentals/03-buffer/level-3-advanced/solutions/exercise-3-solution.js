/**
 * Exercise 3 Solution: Binary Protocol Fuzzer
 *
 * This solution demonstrates:
 * - Generating random and reproducible test data for fuzzing
 * - Various mutation strategies for creating test cases
 * - Edge case generation for different data types
 * - Building a complete fuzzing framework for protocols
 * - Detecting crashes, hangs, and errors in tested code
 * - Coverage-guided fuzzing techniques
 */

const crypto = require('crypto');

console.log('=== Exercise 3: Binary Protocol Fuzzer ===\n');

// Task 1: Generate random binary data
console.log('Task 1: Random Data Generator');
/**
 * Generate random binary data for fuzzing
 * @param {number} size - Size of data to generate
 * @param {Object} options - { allowNull, biasToEdges, seed }
 * @returns {Buffer} Random data
 *
 * Approach:
 * - Use crypto for cryptographically strong random data
 * - Support seeded randomness for reproducibility
 * - Optionally bias towards edge values (0x00, 0xFF)
 * - Allow controlling null bytes
 */
function generateRandomData(size, options = {}) {
  // Validate inputs
  if (typeof size !== 'number' || size < 0) {
    throw new TypeError('Size must be a non-negative number');
  }

  const { allowNull = true, biasToEdges = false, seed } = options;

  let buffer;

  if (seed !== undefined) {
    // Seeded random generation for reproducibility
    // Use seed to initialize a predictable random sequence
    const hash = crypto.createHash('sha256');
    hash.update(String(seed));
    const seedBuffer = hash.digest();

    // Generate data by repeatedly hashing
    const chunks = [];
    let remaining = size;
    let iteration = 0;

    while (remaining > 0) {
      const iterHash = crypto.createHash('sha256');
      iterHash.update(seedBuffer);
      iterHash.update(Buffer.from([iteration]));
      const chunk = iterHash.digest();

      const chunkSize = Math.min(remaining, chunk.length);
      chunks.push(chunk.slice(0, chunkSize));
      remaining -= chunkSize;
      iteration++;
    }

    buffer = Buffer.concat(chunks, size);
  } else {
    // Truly random data
    buffer = crypto.randomBytes(size);
  }

  // Apply options
  if (!allowNull) {
    // Replace null bytes with random non-zero values
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0) {
        buffer[i] = crypto.randomInt(1, 256);
      }
    }
  }

  if (biasToEdges) {
    // Replace some bytes with edge values (0x00, 0xFF)
    // About 20% of bytes become edge values
    const edgeCount = Math.floor(size * 0.2);
    for (let i = 0; i < edgeCount; i++) {
      const position = crypto.randomInt(0, size);
      const edgeValue = crypto.randomInt(0, 2) === 0 ? 0x00 : 0xFF;
      buffer[position] = edgeValue;
    }
  }

  return buffer;
}

// Test Task 1
try {
  const random1 = generateRandomData(20);
  console.log('Random data:', random1);

  const random2 = generateRandomData(20, { seed: 12345 });
  const random3 = generateRandomData(20, { seed: 12345 });
  console.log('Seeded data match:', random2.equals(random3));

  const randomEdge = generateRandomData(20, { biasToEdges: true });
  const edgeBytes = Array.from(randomEdge).filter(b => b === 0x00 || b === 0xFF).length;
  console.log('Edge bytes:', edgeBytes, '/ 20');

  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Mutate existing data
console.log('Task 2: Buffer Mutation');
/**
 * Mutate a buffer to create test cases
 * @param {Buffer} original - Original buffer
 * @param {string} mutationType - 'flip', 'insert', 'delete', 'replace'
 * @returns {Buffer} Mutated buffer
 *
 * Approach:
 * - flip: Randomly flip bits in the data
 * - insert: Add random bytes at random positions
 * - delete: Remove bytes from random positions
 * - replace: Replace random bytes with random values
 */
function mutateBuffer(original, mutationType) {
  // Validate inputs
  if (!Buffer.isBuffer(original)) {
    throw new TypeError('Original must be a Buffer');
  }

  if (!['flip', 'insert', 'delete', 'replace'].includes(mutationType)) {
    throw new TypeError('Invalid mutation type');
  }

  if (original.length === 0) {
    return Buffer.from(original);
  }

  // Create a copy to avoid modifying original
  let mutated = Buffer.from(original);

  switch (mutationType) {
    case 'flip': {
      // Flip random bits (1-3 bits)
      const numFlips = crypto.randomInt(1, 4);
      for (let i = 0; i < numFlips; i++) {
        const bytePos = crypto.randomInt(0, mutated.length);
        const bitPos = crypto.randomInt(0, 8);
        mutated[bytePos] ^= (1 << bitPos); // XOR to flip bit
      }
      break;
    }

    case 'insert': {
      // Insert 1-4 random bytes
      const numBytes = crypto.randomInt(1, 5);
      const insertPos = crypto.randomInt(0, mutated.length + 1);
      const insertData = crypto.randomBytes(numBytes);

      mutated = Buffer.concat([
        mutated.slice(0, insertPos),
        insertData,
        mutated.slice(insertPos)
      ]);
      break;
    }

    case 'delete': {
      // Delete 1-3 bytes
      if (mutated.length > 1) {
        const numBytes = crypto.randomInt(1, Math.min(4, mutated.length));
        const deletePos = crypto.randomInt(0, mutated.length - numBytes + 1);

        mutated = Buffer.concat([
          mutated.slice(0, deletePos),
          mutated.slice(deletePos + numBytes)
        ]);
      }
      break;
    }

    case 'replace': {
      // Replace 1-4 bytes with random values
      const numBytes = crypto.randomInt(1, Math.min(5, mutated.length + 1));
      for (let i = 0; i < numBytes; i++) {
        const pos = crypto.randomInt(0, mutated.length);
        mutated[pos] = crypto.randomInt(0, 256);
      }
      break;
    }
  }

  return mutated;
}

// Test Task 2
try {
  const original = Buffer.from('Hello, World!');

  const flipped = mutateBuffer(original, 'flip');
  const inserted = mutateBuffer(original, 'insert');
  const deleted = mutateBuffer(original, 'delete');
  const replaced = mutateBuffer(original, 'replace');

  console.log('Original:  ', original.toString(), `(${original.length} bytes)`);
  console.log('Flipped:   ', flipped.toString('hex'), `(${flipped.length} bytes)`);
  console.log('Inserted:  ', inserted.length, 'bytes');
  console.log('Deleted:   ', deleted.length, 'bytes');
  console.log('Replaced:  ', replaced.toString('hex'));

  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Generate edge case values
console.log('Task 3: Edge Case Generator');
/**
 * Generate edge case values for different data types
 * @param {string} type - 'uint8', 'uint16', 'uint32', 'int32', 'float', 'string'
 * @returns {Array} Array of edge case buffers
 *
 * Approach:
 * - For each type, create buffers with boundary values
 * - Include zero, min, max, overflow values
 * - Test one-off boundaries (max-1, min+1)
 * - Include special values (NaN, Infinity for floats)
 */
function generateEdgeCases(type) {
  // Validate input
  const validTypes = ['uint8', 'uint16', 'uint32', 'int32', 'float', 'string'];
  if (!validTypes.includes(type)) {
    throw new TypeError(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const edgeCases = [];

  switch (type) {
    case 'uint8': {
      // 8-bit unsigned integer (0 to 255)
      const cases = [
        0,      // Minimum
        1,      // Min + 1
        127,    // Half of max
        254,    // Max - 1
        255     // Maximum
      ];

      for (const value of cases) {
        const buf = Buffer.alloc(1);
        buf.writeUInt8(value, 0);
        edgeCases.push(buf);
      }
      break;
    }

    case 'uint16': {
      // 16-bit unsigned integer (0 to 65535)
      const cases = [
        0,      // Minimum
        1,      // Min + 1
        255,    // 8-bit max
        256,    // 8-bit max + 1
        32767,  // Half of max
        65534,  // Max - 1
        65535   // Maximum
      ];

      for (const value of cases) {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(value, 0);
        edgeCases.push(buf);
      }
      break;
    }

    case 'uint32': {
      // 32-bit unsigned integer (0 to 4294967295)
      const cases = [
        0,          // Minimum
        1,          // Min + 1
        255,        // 8-bit max
        65535,      // 16-bit max
        65536,      // 16-bit max + 1
        2147483647, // 31-bit max (int32 max)
        2147483648, // int32 max + 1
        4294967294, // Max - 1
        4294967295  // Maximum
      ];

      for (const value of cases) {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(value, 0);
        edgeCases.push(buf);
      }
      break;
    }

    case 'int32': {
      // 32-bit signed integer (-2147483648 to 2147483647)
      const cases = [
        -2147483648, // Minimum
        -2147483647, // Min + 1
        -1,          // Just below zero
        0,           // Zero
        1,           // Just above zero
        2147483646,  // Max - 1
        2147483647   // Maximum
      ];

      for (const value of cases) {
        const buf = Buffer.alloc(4);
        buf.writeInt32LE(value, 0);
        edgeCases.push(buf);
      }
      break;
    }

    case 'float': {
      // 32-bit floating point
      const cases = [
        0,                    // Zero
        -0,                   // Negative zero
        1.0,                  // One
        -1.0,                 // Negative one
        0.1,                  // Fraction
        Number.MIN_VALUE,     // Smallest positive
        Number.MAX_VALUE,     // Largest positive
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NaN
      ];

      for (const value of cases) {
        const buf = Buffer.alloc(4);
        buf.writeFloatLE(value, 0);
        edgeCases.push(buf);
      }
      break;
    }

    case 'string': {
      // Various string edge cases
      const cases = [
        '',                          // Empty string
        ' ',                         // Single space
        '\0',                        // Null byte
        '\n',                        // Newline
        'A',                         // Single ASCII char
        'ABC',                       // Short string
        'A'.repeat(100),             // Long string
        '世界',                      // Unicode
        '\uFFFD',                    // Replacement character
        ''.padEnd(1000, 'X')        // Very long string
      ];

      for (const str of cases) {
        edgeCases.push(Buffer.from(str, 'utf8'));
      }
      break;
    }
  }

  return edgeCases;
}

// Test Task 3
try {
  const uint8Cases = generateEdgeCases('uint8');
  console.log('uint8 edge cases:', uint8Cases.length);
  console.log('Values:', uint8Cases.map(b => b.readUInt8(0)));

  const int32Cases = generateEdgeCases('int32');
  console.log('int32 edge cases:', int32Cases.length);
  console.log('Values:', int32Cases.map(b => b.readInt32LE(0)));

  const stringCases = generateEdgeCases('string');
  console.log('string edge cases:', stringCases.length);

  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Protocol fuzzer
console.log('Task 4: Protocol Fuzzer Class');
/**
 * Fuzzer for binary protocols
 *
 * Approach:
 * - Generate test cases using various strategies
 * - Run tests and catch errors/crashes
 * - Track results for analysis
 * - Support both random and edge-case-based fuzzing
 */
class ProtocolFuzzer {
  constructor(protocol) {
    // Validate protocol
    if (!protocol || typeof protocol !== 'object') {
      throw new TypeError('Protocol must be an object');
    }

    if (typeof protocol.encode !== 'function') {
      throw new TypeError('Protocol must have encode function');
    }

    if (typeof protocol.decode !== 'function') {
      throw new TypeError('Protocol must have decode function');
    }

    if (typeof protocol.validate !== 'function') {
      throw new TypeError('Protocol must have validate function');
    }

    this.protocol = protocol;

    // Test results
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      crashed: 0,
      edgeCasesFound: []
    };

    // Store interesting test cases
    this.crashingInputs = [];
  }

  /**
   * Generate a fuzzed test case
   * @returns {Buffer} Test case
   */
  generateTestCase() {
    // Strategy: Mix of random and mutated data
    const strategy = crypto.randomInt(0, 3);

    switch (strategy) {
      case 0:
        // Completely random data
        return generateRandomData(crypto.randomInt(10, 100));

      case 1:
        // Random data with edge bias
        return generateRandomData(
          crypto.randomInt(10, 100),
          { biasToEdges: true }
        );

      case 2:
        // Try to create valid message then mutate it
        try {
          const validData = { type: 'test', value: 123 };
          const encoded = this.protocol.encode(validData);
          const mutationType = ['flip', 'insert', 'delete', 'replace'][crypto.randomInt(0, 4)];
          return mutateBuffer(encoded, mutationType);
        } catch (err) {
          // If can't create valid message, return random
          return generateRandomData(crypto.randomInt(10, 100));
        }

      default:
        return generateRandomData(50);
    }
  }

  /**
   * Run test case against protocol
   * @param {Buffer} testCase - Test input
   * @returns {Object} Test result
   */
  runTest(testCase) {
    const result = {
      passed: false,
      failed: false,
      crashed: false,
      error: null,
      input: testCase
    };

    try {
      // Try to decode
      const decoded = this.protocol.decode(testCase);

      // Try to validate
      const isValid = this.protocol.validate(decoded);

      if (isValid) {
        result.passed = true;
      } else {
        result.failed = true;
        result.error = 'Validation failed';
      }
    } catch (err) {
      // Caught an error/crash
      result.crashed = true;
      result.error = err.message;

      // Store crashing input for analysis
      this.crashingInputs.push({
        input: testCase,
        error: err.message,
        stack: err.stack
      });
    }

    return result;
  }

  /**
   * Run fuzzing campaign
   * @param {number} iterations - Number of test cases to run
   * @returns {Object} Summary
   */
  fuzz(iterations) {
    // Validate input
    if (typeof iterations !== 'number' || iterations < 1) {
      throw new TypeError('Iterations must be a positive number');
    }

    console.log(`Running ${iterations} fuzz iterations...`);

    for (let i = 0; i < iterations; i++) {
      // Generate test case
      const testCase = this.generateTestCase();

      // Run test
      const result = this.runTest(testCase);

      // Update statistics
      this.results.total++;
      if (result.passed) {
        this.results.passed++;
      } else if (result.failed) {
        this.results.failed++;
      } else if (result.crashed) {
        this.results.crashed++;

        // Store edge case
        this.results.edgeCasesFound.push({
          input: testCase.toString('hex'),
          error: result.error
        });
      }
    }

    return {
      total: this.results.total,
      passed: this.results.passed,
      failed: this.results.failed,
      crashed: this.results.crashed,
      successRate: ((this.results.passed / this.results.total) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Get fuzzing results
   * @returns {Object} Results
   */
  getResults() {
    return {
      ...this.results,
      crashingInputsCount: this.crashingInputs.length
    };
  }

  /**
   * Get crashing inputs for analysis
   * @returns {Array} Crashing inputs
   */
  getCrashingInputs() {
    return this.crashingInputs;
  }
}

// Test Task 4
try {
  const testProtocol = {
    encode: (data) => Buffer.from(JSON.stringify(data)),
    decode: (buf) => JSON.parse(buf.toString()),
    validate: (data) => typeof data === 'object'
  };

  const fuzzer = new ProtocolFuzzer(testProtocol);
  const summary = fuzzer.fuzz(10);

  console.log('Fuzzing summary:', summary);
  console.log('Full results:', fuzzer.getResults());
  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Crash detector
console.log('Task 5: Crash and Hang Detector');
/**
 * Detect if a test causes crash or hang
 * @param {Function} testFn - Function to test
 * @param {Buffer} input - Test input
 * @param {number} timeout - Timeout in ms
 * @returns {Object} { crashed, hung, error }
 *
 * Approach:
 * - Use Promise with timeout to detect hangs
 * - Catch exceptions to detect crashes
 * - Return detailed result for analysis
 */
function detectCrashOrHang(testFn, input, timeout = 1000) {
  // Validate inputs
  if (typeof testFn !== 'function') {
    throw new TypeError('Test function must be a function');
  }

  if (!Buffer.isBuffer(input)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (typeof timeout !== 'number' || timeout <= 0) {
    throw new TypeError('Timeout must be a positive number');
  }

  return new Promise((resolve) => {
    let completed = false;
    let timeoutId;

    // Set timeout to detect hangs
    timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        resolve({
          crashed: false,
          hung: true,
          error: `Test hung (exceeded ${timeout}ms timeout)`
        });
      }
    }, timeout);

    // Run test function
    try {
      // Execute in next tick to allow timeout to be registered
      setImmediate(() => {
        try {
          const result = testFn(input);

          // If we get here, test passed
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            resolve({
              crashed: false,
              hung: false,
              error: null,
              result
            });
          }
        } catch (err) {
          // Test crashed
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            resolve({
              crashed: true,
              hung: false,
              error: err.message,
              stack: err.stack
            });
          }
        }
      });
    } catch (err) {
      // Setup crashed
      if (!completed) {
        completed = true;
        clearTimeout(timeoutId);
        resolve({
          crashed: true,
          hung: false,
          error: err.message,
          stack: err.stack
        });
      }
    }
  });
}

// Test Task 5
(async () => {
  try {
    const safeFn = (buf) => buf.toString();
    const result1 = await detectCrashOrHang(safeFn, Buffer.from('test'));
    console.log('Safe function:', result1);

    const crashFn = (buf) => { throw new Error('Crash!'); };
    const result2 = await detectCrashOrHang(crashFn, Buffer.from('test'));
    console.log('Crash function:', result2);

    const hangFn = (buf) => {
      const start = Date.now();
      while (Date.now() - start < 2000) {} // Hang for 2 seconds
    };
    const result3 = await detectCrashOrHang(hangFn, Buffer.from('test'), 100);
    console.log('Hang function:', result3);

    console.log('✓ Task 5 complete\n');
  } catch (err) {
    console.log('✗ Error:', err.message, '\n');
  }

  // Continue with bonus
  runBonus();
})();

// Bonus: Coverage-guided fuzzing
function runBonus() {
  console.log('Bonus: Coverage-Guided Fuzzing');
  /**
   * Track which code paths are covered by test cases
   *
   * Approach:
   * - Map test cases to code paths they exercise
   * - Track which paths have been covered
   * - Identify uncovered paths for targeted testing
   * - Guide fuzzing towards unexplored paths
   */
  class CoverageTracker {
    constructor() {
      // Map of test case ID to paths covered
      this.testCasePaths = new Map();

      // Set of all known paths
      this.allPaths = new Set();

      // Set of covered paths
      this.coveredPaths = new Set();
    }

    /**
     * Record which paths a test case covers
     * @param {string} testCase - Test case identifier
     * @param {Array} codePaths - Array of path identifiers
     */
    trackExecution(testCase, codePaths) {
      // Validate inputs
      if (typeof testCase !== 'string') {
        throw new TypeError('Test case must be a string');
      }

      if (!Array.isArray(codePaths)) {
        throw new TypeError('Code paths must be an array');
      }

      // Store mapping
      this.testCasePaths.set(testCase, codePaths);

      // Update path sets
      for (const path of codePaths) {
        this.allPaths.add(path);
        this.coveredPaths.add(path);
      }
    }

    /**
     * Get coverage statistics
     * @returns {Object} { totalPaths, coveredPaths, percentage }
     */
    getCoverage() {
      const totalPaths = this.allPaths.size;
      const covered = this.coveredPaths.size;
      const percentage = totalPaths > 0
        ? ((covered / totalPaths) * 100).toFixed(2) + '%'
        : '0%';

      return {
        totalPaths,
        coveredPaths: covered,
        percentage
      };
    }

    /**
     * Get paths not yet covered
     * @returns {Array} Uncovered paths
     */
    getUncoveredPaths() {
      const uncovered = [];
      for (const path of this.allPaths) {
        if (!this.coveredPaths.has(path)) {
          uncovered.push(path);
        }
      }
      return uncovered;
    }

    /**
     * Find test cases that cover a specific path
     * @param {string} path - Path to find
     * @returns {Array} Test cases covering this path
     */
    getTestCasesForPath(path) {
      const testCases = [];
      for (const [testCase, paths] of this.testCasePaths.entries()) {
        if (paths.includes(path)) {
          testCases.push(testCase);
        }
      }
      return testCases;
    }

    /**
     * Get coverage report
     * @returns {Object} Detailed report
     */
    getReport() {
      return {
        coverage: this.getCoverage(),
        uncoveredPaths: this.getUncoveredPaths(),
        testCaseCount: this.testCasePaths.size,
        pathDistribution: this.getPathDistribution()
      };
    }

    /**
     * Get distribution of how many test cases cover each path
     * @returns {Object} Path coverage distribution
     */
    getPathDistribution() {
      const distribution = {};

      for (const path of this.allPaths) {
        const testCases = this.getTestCasesForPath(path);
        distribution[path] = testCases.length;
      }

      return distribution;
    }
  }

  // Test Bonus
  try {
    const tracker = new CoverageTracker();

    tracker.trackExecution('test1', ['pathA', 'pathB']);
    tracker.trackExecution('test2', ['pathB', 'pathC']);
    tracker.trackExecution('test3', ['pathA', 'pathC', 'pathD']);

    console.log('Coverage:', tracker.getCoverage());
    console.log('Uncovered paths:', tracker.getUncoveredPaths());
    console.log('Full report:', JSON.stringify(tracker.getReport(), null, 2));
    console.log('✓ Bonus complete\n');
  } catch (err) {
    console.log('✗ Error:', err.message, '\n');
  }

  console.log('=== Exercise 3 Complete ===');
  console.log('');
  console.log('💡 Tips:');
  console.log('  • Fuzzing finds edge cases and bugs automatically');
  console.log('  • Mutate valid inputs to create interesting test cases');
  console.log('  • Test with edge values (0, max, overflow)');
  console.log('  • Catch and log all crashes/errors for analysis');
  console.log('  • Use timeouts to detect hangs and infinite loops');
  console.log('  • Track coverage to guide fuzzing towards unexplored paths');
  console.log('');

  /**
   * KEY LEARNING POINTS:
   *
   * 1. Random Data Generation:
   *    - Use crypto.randomBytes() for strong randomness
   *    - Support seeded generation for reproducibility
   *    - Bias towards edge values increases bug discovery
   *    - Control null bytes based on protocol requirements
   *
   * 2. Mutation Strategies:
   *    - Bit flipping: Small changes, finds parsing bugs
   *    - Insertion: Tests buffer overflow handling
   *    - Deletion: Tests underflow and incomplete data
   *    - Replacement: Tests invalid value handling
   *
   * 3. Edge Cases:
   *    - Test boundaries (min, max, zero)
   *    - Test one-off values (min+1, max-1)
   *    - Test type boundaries (8-bit max in 16-bit field)
   *    - Test special values (NaN, Infinity, negative zero)
   *
   * 4. Fuzzing Framework:
   *    - Generate diverse test cases
   *    - Catch all errors and exceptions
   *    - Track results and statistics
   *    - Store crashing inputs for analysis
   *    - Support different fuzzing strategies
   *
   * 5. Production Best Practices:
   *    - Use timeouts to prevent hangs
   *    - Isolate test execution
   *    - Track coverage for completeness
   *    - Generate reproducible test cases
   *    - Provide detailed error information
   */
}
