/**
 * Exercise 5 Solution: Character Encoding Converter
 *
 * This solution demonstrates:
 * - Detecting text encoding from BOM or content analysis
 * - Converting between different character encodings
 * - Base64 and URL-safe Base64 encoding/decoding
 * - Hexadecimal encoding utilities
 * - File encoding conversion
 * - Multi-encoding analysis
 */

const fs = require('fs');
const path = require('path');

console.log('=== Exercise 5: Encoding Converter ===\n');

// Task 1: Encoding detector
console.log('Task 1: Detect text encoding');
/**
 * Create a function that attempts to detect the encoding of a buffer
 * Check for BOM (Byte Order Mark) or analyze content
 *
 * Approach:
 * - Check for UTF-8 BOM: EF BB BF
 * - Check for UTF-16LE BOM: FF FE
 * - Check if all bytes are valid ASCII (0-127)
 * - Otherwise return 'unknown'
 */
function detectEncoding(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length === 0) {
    return 'unknown';
  }

  // Check for UTF-8 BOM (EF BB BF)
  if (buffer.length >= 3 &&
      buffer[0] === 0xEF &&
      buffer[1] === 0xBB &&
      buffer[2] === 0xBF) {
    return 'utf8';
  }

  // Check for UTF-16LE BOM (FF FE)
  if (buffer.length >= 2 &&
      buffer[0] === 0xFF &&
      buffer[1] === 0xFE) {
    return 'utf16le';
  }

  // Check for UTF-16BE BOM (FE FF)
  if (buffer.length >= 2 &&
      buffer[0] === 0xFE &&
      buffer[1] === 0xFF) {
    return 'utf16be';
  }

  // Check if all bytes are valid ASCII (0-127)
  let isAscii = true;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] > 127) {
      isAscii = false;
      break;
    }
  }

  if (isAscii) {
    return 'ascii';
  }

  // Try to decode as UTF-8 and check if valid
  try {
    const decoded = buffer.toString('utf8');
    const reencoded = Buffer.from(decoded, 'utf8');
    if (buffer.equals(reencoded)) {
      return 'utf8';
    }
  } catch (err) {
    // Not valid UTF-8
  }

  // Could not determine encoding
  return 'unknown';
}

// Test Task 1
try {
  const utf8BOM = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const utf16BOM = Buffer.from([0xFF, 0xFE, 0x48, 0x00, 0x65, 0x00]);
  const ascii = Buffer.from('Hello');
  const binary = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]);

  console.log('UTF-8 with BOM:', detectEncoding(utf8BOM), '(expected: utf8)');
  console.log('UTF-16LE with BOM:', detectEncoding(utf16BOM), '(expected: utf16le)');
  console.log('ASCII:', detectEncoding(ascii), '(expected: ascii)');
  console.log('Binary:', detectEncoding(binary), '(expected: unknown)');

  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Encoding converter
console.log('Task 2: Convert between encodings');
/**
 * Create a function that converts text from one encoding to another
 *
 * Approach:
 * - Decode buffer using source encoding to get string
 * - Encode string using target encoding to get new buffer
 */
function convertEncoding(buffer, fromEncoding, toEncoding) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('First argument must be a Buffer');
  }

  if (typeof fromEncoding !== 'string') {
    throw new TypeError('From encoding must be a string');
  }

  if (typeof toEncoding !== 'string') {
    throw new TypeError('To encoding must be a string');
  }

  // Supported encodings
  const supportedEncodings = ['utf8', 'ascii', 'latin1', 'utf16le', 'base64', 'hex'];

  if (!supportedEncodings.includes(fromEncoding.toLowerCase())) {
    throw new Error(`Unsupported source encoding: ${fromEncoding}`);
  }

  if (!supportedEncodings.includes(toEncoding.toLowerCase())) {
    throw new Error(`Unsupported target encoding: ${toEncoding}`);
  }

  // Decode from source encoding
  const text = buffer.toString(fromEncoding);

  // Encode to target encoding
  return Buffer.from(text, toEncoding);
}

// Test Task 2
try {
  const utf8Text = Buffer.from('Hello World', 'utf8');
  console.log('UTF-8:', utf8Text);

  const latin1 = convertEncoding(utf8Text, 'utf8', 'latin1');
  console.log('Latin1:', latin1);

  const backToUtf8 = convertEncoding(latin1, 'latin1', 'utf8');
  console.log('Back to UTF-8:', backToUtf8.toString());

  const hex = convertEncoding(utf8Text, 'utf8', 'hex');
  console.log('As hex:', hex.toString());

  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Base64 encoder/decoder
console.log('Task 3: Custom Base64 utilities');
/**
 * Create utility functions for Base64 encoding
 *
 * Approach:
 * - Use Buffer's built-in base64 support
 * - URL-safe: replace +/= with -_~ and remove padding
 */
class Base64Util {
  static encode(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    // Convert buffer to base64 string
    return buffer.toString('base64');
  }

  static decode(base64String) {
    // Validate input
    if (typeof base64String !== 'string') {
      throw new TypeError('Input must be a string');
    }

    // Convert base64 string to buffer
    return Buffer.from(base64String, 'base64');
  }

  static encodeURL(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    // Get standard base64
    const base64 = buffer.toString('base64');

    // Make URL-safe:
    // Replace + with -
    // Replace / with _
    // Remove = padding
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  static decodeURL(base64url) {
    // Validate input
    if (typeof base64url !== 'string') {
      throw new TypeError('Input must be a string');
    }

    // Reverse URL-safe transformations:
    // Replace - with +
    // Replace _ with /
    let base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add back padding
    // Base64 strings should be multiples of 4
    const padding = base64.length % 4;
    if (padding > 0) {
      base64 += '='.repeat(4 - padding);
    }

    // Decode
    return Buffer.from(base64, 'base64');
  }
}

// Test Task 3
try {
  const data = Buffer.from('Hello, World!');

  const encoded = Base64Util.encode(data);
  console.log('Encoded:', encoded);

  const decoded = Base64Util.decode(encoded);
  console.log('Decoded:', decoded.toString());
  console.log('Match:', data.equals(decoded) ? '✓' : '✗');

  const urlEncoded = Base64Util.encodeURL(data);
  console.log('URL-safe:', urlEncoded);

  const urlDecoded = Base64Util.decodeURL(urlEncoded);
  console.log('URL decoded:', urlDecoded.toString());
  console.log('Match:', data.equals(urlDecoded) ? '✓' : '✗');

  // Test with data that produces +, /, and =
  const specialData = Buffer.from([0xFB, 0xFF, 0xBF]);
  console.log('\nSpecial data test:');
  console.log('Standard:', Base64Util.encode(specialData));
  console.log('URL-safe:', Base64Util.encodeURL(specialData));

  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Hex utilities
console.log('Task 4: Hexadecimal conversion utilities');
/**
 * Create utility functions for hex encoding
 *
 * Approach:
 * - Use Buffer's built-in hex support
 * - Add formatting options for readability
 */
class HexUtil {
  static encode(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    // Convert to hex string
    return buffer.toString('hex');
  }

  static decode(hexString) {
    // Validate input
    if (typeof hexString !== 'string') {
      throw new TypeError('Input must be a string');
    }

    // Remove any non-hex characters (spaces, 0x prefix, etc.)
    const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');

    // Validate hex string length
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Hex string must have an even number of characters');
    }

    // Convert to buffer
    return Buffer.from(cleanHex, 'hex');
  }

  static encodeWithSpaces(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    // Convert each byte to hex and join with spaces
    const hexBytes = [];
    for (let i = 0; i < buffer.length; i++) {
      hexBytes.push(buffer[i].toString(16).padStart(2, '0'));
    }

    return hexBytes.join(' ');
  }

  static encodeWithPrefix(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    // Convert each byte to hex with 0x prefix
    const hexBytes = [];
    for (let i = 0; i < buffer.length; i++) {
      hexBytes.push('0x' + buffer[i].toString(16).padStart(2, '0'));
    }

    return hexBytes.join(' ');
  }
}

// Test Task 4
try {
  const data = Buffer.from('Hello');

  console.log('Plain hex:', HexUtil.encode(data));
  console.log('With spaces:', HexUtil.encodeWithSpaces(data));
  console.log('With prefix:', HexUtil.encodeWithPrefix(data));

  const decoded = HexUtil.decode('48656c6c6f');
  console.log('Decoded:', decoded.toString());

  // Test decode with spaces and prefix
  const decoded2 = HexUtil.decode('48 65 6c 6c 6f');
  console.log('Decoded with spaces:', decoded2.toString());

  const decoded3 = HexUtil.decode('0x48 0x65 0x6c 0x6c 0x6f');
  console.log('Decoded with prefix:', decoded3.toString());

  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: File encoding converter
console.log('Task 5: Convert file encoding');
/**
 * Create a function that converts a file from one encoding to another
 *
 * Approach:
 * - Read file as buffer
 * - Decode using source encoding
 * - Encode using target encoding
 * - Write to output file
 */
function convertFileEncoding(inputPath, outputPath, fromEncoding, toEncoding) {
  // Validate inputs
  if (typeof inputPath !== 'string' || typeof outputPath !== 'string') {
    throw new TypeError('File paths must be strings');
  }

  if (typeof fromEncoding !== 'string' || typeof toEncoding !== 'string') {
    throw new TypeError('Encodings must be strings');
  }

  // Read input file
  const inputBuffer = fs.readFileSync(inputPath);

  // Decode from source encoding
  const text = inputBuffer.toString(fromEncoding);

  // Encode to target encoding
  const outputBuffer = Buffer.from(text, toEncoding);

  // Write to output file
  fs.writeFileSync(outputPath, outputBuffer);
}

// Test Task 5
try {
  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const inputFile = path.join(tmpDir, 'input.txt');
  const outputFile = path.join(tmpDir, 'output.txt');

  // Create test file
  fs.writeFileSync(inputFile, 'Hello, World! 你好世界', 'utf8');
  console.log('Created test file:', inputFile);

  // Convert
  convertFileEncoding(inputFile, outputFile, 'utf8', 'utf8');
  console.log('Converted to:', outputFile);

  // Read and verify
  const result = fs.readFileSync(outputFile, 'utf8');
  console.log('Result:', result);

  // Cleanup
  fs.unlinkSync(inputFile);
  fs.unlinkSync(outputFile);
  fs.rmdirSync(tmpDir);

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge: Multi-encoding analyzer
console.log('Bonus Challenge: Analyze string in multiple encodings');
/**
 * Create a function that shows how a string looks in different encodings
 *
 * Approach:
 * - Convert string to buffer with each encoding
 * - Return information about byte length and hex representation
 */
function analyzeEncodings(text) {
  // Validate input
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string');
  }

  const analysis = {};

  // List of encodings to analyze
  const encodings = ['utf8', 'ascii', 'latin1', 'utf16le', 'base64', 'hex'];

  for (const encoding of encodings) {
    try {
      let buffer;

      // Special handling for base64 and hex
      if (encoding === 'base64' || encoding === 'hex') {
        // First convert to utf8, then to base64/hex
        buffer = Buffer.from(text, 'utf8').toString(encoding);
        analysis[encoding] = {
          type: 'string',
          length: buffer.length,
          representation: buffer
        };
      } else {
        // Convert text to buffer with this encoding
        buffer = Buffer.from(text, encoding);

        analysis[encoding] = {
          byteLength: buffer.length,
          hex: buffer.toString('hex'),
          // Show first 32 bytes as hex for readability
          hexPreview: buffer.subarray(0, 32).toString('hex') +
                     (buffer.length > 32 ? '...' : '')
        };
      }
    } catch (err) {
      analysis[encoding] = {
        error: err.message
      };
    }
  }

  return analysis;
}

// Test Bonus
try {
  const text = 'Hello 😀';
  const analysis = analyzeEncodings(text);

  console.log('Text:', text);
  console.log('Character length:', text.length);
  console.log('\nAnalysis:');

  for (const [encoding, info] of Object.entries(analysis)) {
    console.log(`\n${encoding}:`);
    if (info.error) {
      console.log('  Error:', info.error);
    } else if (info.type === 'string') {
      console.log('  Length:', info.length);
      console.log('  Value:', info.representation);
    } else {
      console.log('  Byte length:', info.byteLength);
      console.log('  Hex:', info.hexPreview);
    }
  }

  // Show interesting insights
  console.log('\n📊 Insights:');
  console.log(`- UTF-8 uses ${analysis.utf8.byteLength} bytes (variable width)`);
  console.log(`- UTF-16LE uses ${analysis.utf16le.byteLength} bytes (mostly 2 bytes per char)`);
  console.log(`- ASCII only supports 7-bit characters (non-ASCII shown as ?)`);
  console.log(`- The emoji 😀 takes 4 bytes in UTF-8`);

  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 5 Complete ===');
console.log('\n🎉 Congratulations! You have completed all Level 1 Buffer exercises!');
console.log('Move on to Level 2 for intermediate buffer operations.');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Character Encodings:
 *    - UTF-8: Variable width (1-4 bytes), backward compatible with ASCII
 *    - UTF-16: Fixed 2 bytes (mostly), used by JavaScript strings internally
 *    - ASCII: 7-bit (0-127), only English characters
 *    - Latin1/ISO-8859-1: 8-bit (0-255), Western European characters
 *
 * 2. Byte Order Mark (BOM):
 *    - UTF-8: EF BB BF (optional, often omitted)
 *    - UTF-16LE: FF FE (little-endian)
 *    - UTF-16BE: FE FF (big-endian)
 *    - BOM helps detect encoding but adds extra bytes
 *
 * 3. Base64 Encoding:
 *    - Converts binary to text (6 bits per character)
 *    - 4/3 size increase (33% larger)
 *    - URL-safe variant: replaces +/= with -_~
 *    - Used for embedding binary in text formats
 *
 * 4. Hex Encoding:
 *    - 2 characters per byte (0-9, a-f)
 *    - 2x size increase (100% larger)
 *    - Human-readable, used for debugging
 *    - No ambiguity, easy to parse
 *
 * 5. Encoding Detection:
 *    - Check for BOM first (most reliable)
 *    - Validate UTF-8 sequences
 *    - Check ASCII range (0-127)
 *    - Heuristics are not 100% accurate
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Assuming string.length equals byte length:
 *    '😀'.length === 2 // JavaScript uses UTF-16
 *    Buffer.from('😀').length === 4 // UTF-8 uses 4 bytes
 *
 * ❌ Using wrong encoding for conversion:
 *    Buffer.from('Hello', 'base64') // 'Hello' is not base64!
 *
 * ❌ Not handling BOM in files:
 *    // Some editors add BOM, may cause issues
 *    // Strip BOM if present: buffer.slice(3)
 *
 * ❌ Forgetting Base64 padding:
 *    // Base64 needs padding (=) for correct decoding
 *    // URL-safe removes it, must add back for decoding
 *
 * ❌ Mixing character count and byte count:
 *    // '你好'.length === 2 characters
 *    // Buffer.from('你好').length === 6 bytes (UTF-8)
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Implement UTF-8 validator that checks byte sequences
 * 2. Create a BOM stripper for text files
 * 3. Build a charset detector (like chardet library)
 * 4. Implement base32 encoding/decoding
 * 5. Create a binary-to-text encoder (like uuencode)
 * 6. Build a multilingual text analyzer
 * 7. Implement quoted-printable encoding
 * 8. Create a Unicode normalizer (NFC, NFD, etc.)
 */
