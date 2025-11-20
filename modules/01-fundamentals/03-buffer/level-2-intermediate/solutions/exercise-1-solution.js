/**
 * Exercise 1 Solution: WAV File Parser
 *
 * This solution demonstrates:
 * - Parsing binary file formats with specific structures
 * - Reading different data types from buffers (strings, integers)
 * - Working with little-endian byte order (WAV file format)
 * - Validating binary file headers and chunks
 * - Calculating derived values (audio duration)
 */

console.log('=== Exercise 1: WAV File Parser ===\n');

// Task 1: Parse RIFF header
console.log('Task 1: Parse RIFF Header');
/**
 * Parse the RIFF header from a WAV file
 * RIFF header structure:
 * - ChunkID: 'RIFF' (4 bytes, ASCII)
 * - ChunkSize: file size - 8 (4 bytes, LE)
 * - Format: 'WAVE' (4 bytes, ASCII)
 *
 * Approach:
 * - Validate buffer has minimum size (12 bytes for RIFF header)
 * - Read ASCII strings for ChunkID and Format
 * - Read little-endian 32-bit integer for ChunkSize
 *
 * @param {Buffer} buffer - WAV file buffer
 * @returns {Object} { chunkId, chunkSize, format }
 */
function parseRIFFHeader(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < 12) {
    throw new RangeError('Buffer too small for RIFF header (minimum 12 bytes)');
  }

  // Read ChunkID (4 bytes, ASCII)
  // toString() with encoding and range extracts the string
  const chunkId = buffer.toString('ascii', 0, 4);

  // Read ChunkSize (4 bytes, little-endian)
  // WAV files use little-endian byte order
  const chunkSize = buffer.readUInt32LE(4);

  // Read Format (4 bytes, ASCII)
  const format = buffer.toString('ascii', 8, 12);

  return { chunkId, chunkSize, format };
}

// Test Task 1
try {
  const testWAV = Buffer.alloc(100);
  testWAV.write('RIFF', 0, 'ascii');
  testWAV.writeUInt32LE(92, 4); // file size - 8
  testWAV.write('WAVE', 8, 'ascii');

  const riffHeader = parseRIFFHeader(testWAV);
  console.log('RIFF Header:', riffHeader);
  console.log('Expected: { chunkId: "RIFF", chunkSize: 92, format: "WAVE" }');
  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Parse fmt chunk
console.log('Task 2: Parse fmt Chunk');
/**
 * Parse the fmt chunk from a WAV file
 * fmt chunk structure (starts at offset 12):
 * - SubchunkID: 'fmt ' (4 bytes, ASCII)
 * - SubchunkSize: 16 for PCM (4 bytes, LE)
 * - AudioFormat: 1 for PCM (2 bytes, LE)
 * - NumChannels: 1 = mono, 2 = stereo (2 bytes, LE)
 * - SampleRate: samples per second (4 bytes, LE)
 * - ByteRate: SampleRate × NumChannels × BitsPerSample/8 (4 bytes, LE)
 * - BlockAlign: NumChannels × BitsPerSample/8 (2 bytes, LE)
 * - BitsPerSample: 8, 16, 24, etc. (2 bytes, LE)
 *
 * Approach:
 * - Validate buffer has enough space from offset
 * - Read each field sequentially using appropriate methods
 * - Use readUInt16LE for 2-byte fields, readUInt32LE for 4-byte fields
 *
 * @param {Buffer} buffer - WAV file buffer
 * @param {number} offset - Offset where fmt chunk starts
 * @returns {Object} Format information
 */
function parseFmtChunk(buffer, offset = 12) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < offset + 24) {
    throw new RangeError('Buffer too small for fmt chunk');
  }

  // Track current position as we read
  let pos = offset;

  // Read SubchunkID (4 bytes, ASCII)
  const subchunkId = buffer.toString('ascii', pos, pos + 4);
  pos += 4;

  // Read SubchunkSize (4 bytes, LE)
  const subchunkSize = buffer.readUInt32LE(pos);
  pos += 4;

  // Read AudioFormat (2 bytes, LE)
  // 1 = PCM (uncompressed)
  const audioFormat = buffer.readUInt16LE(pos);
  pos += 2;

  // Read NumChannels (2 bytes, LE)
  const numChannels = buffer.readUInt16LE(pos);
  pos += 2;

  // Read SampleRate (4 bytes, LE)
  const sampleRate = buffer.readUInt32LE(pos);
  pos += 4;

  // Read ByteRate (4 bytes, LE)
  const byteRate = buffer.readUInt32LE(pos);
  pos += 4;

  // Read BlockAlign (2 bytes, LE)
  const blockAlign = buffer.readUInt16LE(pos);
  pos += 2;

  // Read BitsPerSample (2 bytes, LE)
  const bitsPerSample = buffer.readUInt16LE(pos);
  pos += 2;

  return {
    subchunkId,
    subchunkSize,
    audioFormat,
    numChannels,
    sampleRate,
    byteRate,
    blockAlign,
    bitsPerSample
  };
}

// Test Task 2
try {
  const testWAV2 = Buffer.alloc(100);
  let offset = 12;

  // fmt chunk
  testWAV2.write('fmt ', offset, 'ascii');
  offset += 4;
  testWAV2.writeUInt32LE(16, offset); // PCM
  offset += 4;
  testWAV2.writeUInt16LE(1, offset); // PCM format
  offset += 2;
  testWAV2.writeUInt16LE(2, offset); // Stereo
  offset += 2;
  testWAV2.writeUInt32LE(44100, offset); // 44.1kHz
  offset += 4;
  testWAV2.writeUInt32LE(176400, offset); // Byte rate
  offset += 4;
  testWAV2.writeUInt16LE(4, offset); // Block align
  offset += 2;
  testWAV2.writeUInt16LE(16, offset); // 16-bit
  offset += 2;

  const fmtChunk = parseFmtChunk(testWAV2, 12);
  console.log('fmt Chunk:', fmtChunk);
  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Parse data chunk header
console.log('Task 3: Parse data Chunk Header');
/**
 * Parse the data chunk header
 * data chunk structure:
 * - SubchunkID: 'data' (4 bytes, ASCII)
 * - SubchunkSize: number of bytes in data (4 bytes, LE)
 *
 * Approach:
 * - Simple 8-byte header
 * - Read chunk identifier and size
 *
 * @param {Buffer} buffer - WAV file buffer
 * @param {number} offset - Offset where data chunk starts (typically 36)
 * @returns {Object} { subchunkId, dataSize }
 */
function parseDataChunk(buffer, offset = 36) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < offset + 8) {
    throw new RangeError('Buffer too small for data chunk header');
  }

  // Read SubchunkID (4 bytes, ASCII)
  const subchunkId = buffer.toString('ascii', offset, offset + 4);

  // Read SubchunkSize (4 bytes, LE)
  // This is the size of the actual audio data
  const dataSize = buffer.readUInt32LE(offset + 4);

  return { subchunkId, dataSize };
}

// Test Task 3
try {
  const testWAV3 = Buffer.alloc(100);
  testWAV3.write('data', 36, 'ascii');
  testWAV3.writeUInt32LE(8000, 40);

  const dataChunk = parseDataChunk(testWAV3, 36);
  console.log('data Chunk:', dataChunk);
  console.log('Expected: { subchunkId: "data", dataSize: 8000 }');
  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Complete WAV parser
console.log('Task 4: Complete WAV Parser');
/**
 * Parse a complete WAV file and return all information
 *
 * Approach:
 * - Use the three parsing functions we created
 * - Combine all information into a single object
 * - Calculate duration from dataSize and byteRate
 *
 * @param {Buffer} buffer - WAV file buffer
 * @returns {Object} Complete WAV file information
 */
function parseWAV(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < 44) {
    throw new RangeError('Buffer too small for WAV file (minimum 44 bytes)');
  }

  // Parse all three chunks
  const riff = parseRIFFHeader(buffer);
  const fmt = parseFmtChunk(buffer, 12);
  const data = parseDataChunk(buffer, 36);

  // Calculate duration in seconds
  // Duration = dataSize / byteRate
  // byteRate is bytes per second, so this gives us seconds
  const duration = fmt.byteRate > 0 ? data.dataSize / fmt.byteRate : 0;

  // Return comprehensive information
  return {
    // RIFF header
    chunkId: riff.chunkId,
    chunkSize: riff.chunkSize,
    format: riff.format,

    // Format information
    audioFormat: fmt.audioFormat,
    numChannels: fmt.numChannels,
    sampleRate: fmt.sampleRate,
    byteRate: fmt.byteRate,
    blockAlign: fmt.blockAlign,
    bitsPerSample: fmt.bitsPerSample,

    // Data information
    dataSize: data.dataSize,

    // Calculated values
    duration: duration
  };
}

// Test Task 4
try {
  // Create a minimal valid WAV file
  const wavBuf = Buffer.alloc(44);
  let pos = 0;

  // RIFF header
  wavBuf.write('RIFF', pos, 'ascii'); pos += 4;
  wavBuf.writeUInt32LE(36, pos); pos += 4;
  wavBuf.write('WAVE', pos, 'ascii'); pos += 4;

  // fmt chunk
  wavBuf.write('fmt ', pos, 'ascii'); pos += 4;
  wavBuf.writeUInt32LE(16, pos); pos += 4;
  wavBuf.writeUInt16LE(1, pos); pos += 2;
  wavBuf.writeUInt16LE(1, pos); pos += 2; // Mono
  wavBuf.writeUInt32LE(44100, pos); pos += 4;
  wavBuf.writeUInt32LE(88200, pos); pos += 4;
  wavBuf.writeUInt16LE(2, pos); pos += 2;
  wavBuf.writeUInt16LE(16, pos); pos += 2;

  // data chunk
  wavBuf.write('data', pos, 'ascii'); pos += 4;
  wavBuf.writeUInt32LE(0, pos); pos += 4;

  const wavInfo = parseWAV(wavBuf);
  console.log('Complete WAV info:', wavInfo);
  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Validate WAV file
console.log('Task 5: WAV File Validator');
/**
 * Validate a WAV file buffer
 * Check:
 * - Valid RIFF signature
 * - Valid WAVE format
 * - Valid fmt chunk
 * - Valid audio format (PCM = 1)
 * - Reasonable sample rate (e.g., 8000-192000 Hz)
 * - Valid bits per sample (8, 16, 24, or 32)
 *
 * Approach:
 * - Perform each validation check
 * - Collect all errors in an array
 * - Return validation result with error list
 *
 * @param {Buffer} buffer - WAV file buffer
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateWAV(buffer) {
  const errors = [];

  // Check minimum size
  if (!Buffer.isBuffer(buffer)) {
    return { valid: false, errors: ['Input must be a Buffer'] };
  }

  if (buffer.length < 44) {
    return { valid: false, errors: ['File too small for WAV format (minimum 44 bytes)'] };
  }

  try {
    // Parse RIFF header
    const riff = parseRIFFHeader(buffer);

    // Validate RIFF signature
    if (riff.chunkId !== 'RIFF') {
      errors.push(`Invalid RIFF signature: expected "RIFF", got "${riff.chunkId}"`);
    }

    // Validate WAVE format
    if (riff.format !== 'WAVE') {
      errors.push(`Invalid format: expected "WAVE", got "${riff.format}"`);
    }

    // Parse fmt chunk
    const fmt = parseFmtChunk(buffer, 12);

    // Validate fmt chunk signature
    if (fmt.subchunkId !== 'fmt ') {
      errors.push(`Invalid fmt chunk ID: expected "fmt ", got "${fmt.subchunkId}"`);
    }

    // Validate audio format (PCM = 1)
    if (fmt.audioFormat !== 1) {
      errors.push(`Unsupported audio format: ${fmt.audioFormat} (only PCM=1 is supported)`);
    }

    // Validate sample rate (reasonable range)
    if (fmt.sampleRate < 8000 || fmt.sampleRate > 192000) {
      errors.push(`Invalid sample rate: ${fmt.sampleRate} Hz (must be 8000-192000)`);
    }

    // Validate bits per sample
    const validBits = [8, 16, 24, 32];
    if (!validBits.includes(fmt.bitsPerSample)) {
      errors.push(`Invalid bits per sample: ${fmt.bitsPerSample} (must be 8, 16, 24, or 32)`);
    }

    // Validate number of channels
    if (fmt.numChannels < 1 || fmt.numChannels > 8) {
      errors.push(`Invalid number of channels: ${fmt.numChannels} (must be 1-8)`);
    }

    // Validate byte rate calculation
    const expectedByteRate = fmt.sampleRate * fmt.numChannels * (fmt.bitsPerSample / 8);
    if (fmt.byteRate !== expectedByteRate) {
      errors.push(`Invalid byte rate: ${fmt.byteRate} (expected ${expectedByteRate})`);
    }

    // Validate block align calculation
    const expectedBlockAlign = fmt.numChannels * (fmt.bitsPerSample / 8);
    if (fmt.blockAlign !== expectedBlockAlign) {
      errors.push(`Invalid block align: ${fmt.blockAlign} (expected ${expectedBlockAlign})`);
    }

    // Parse data chunk
    const data = parseDataChunk(buffer, 36);

    // Validate data chunk signature
    if (data.subchunkId !== 'data') {
      errors.push(`Invalid data chunk ID: expected "data", got "${data.subchunkId}"`);
    }

  } catch (err) {
    errors.push(`Parse error: ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Test Task 5
try {
  const validWAV = Buffer.alloc(44);
  let p = 0;
  validWAV.write('RIFF', p, 'ascii'); p += 4;
  validWAV.writeUInt32LE(36, p); p += 4;
  validWAV.write('WAVE', p, 'ascii'); p += 4;
  validWAV.write('fmt ', p, 'ascii'); p += 4;
  validWAV.writeUInt32LE(16, p); p += 4;
  validWAV.writeUInt16LE(1, p); p += 2;
  validWAV.writeUInt16LE(2, p); p += 2;
  validWAV.writeUInt32LE(44100, p); p += 4;
  validWAV.writeUInt32LE(176400, p); p += 4;
  validWAV.writeUInt16LE(4, p); p += 2;
  validWAV.writeUInt16LE(16, p); p += 2;
  validWAV.write('data', p, 'ascii'); p += 4;
  validWAV.writeUInt32LE(0, p);

  const result = validateWAV(validWAV);
  console.log('Validation result:', result);

  // Test with invalid file
  const invalidWAV = Buffer.from('Not a WAV file');
  const invalidResult = validateWAV(invalidWAV);
  console.log('Invalid WAV result:', invalidResult);

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge: Calculate audio duration
console.log('Bonus Challenge: Audio Duration Calculator');
/**
 * Calculate the duration of audio in seconds
 *
 * Approach:
 * - Duration = dataSize / byteRate
 * - byteRate is the number of bytes per second
 * - This gives us the duration in seconds
 *
 * @param {Object} wavInfo - Parsed WAV information
 * @returns {number} Duration in seconds
 */
function calculateDuration(wavInfo) {
  // Validate input
  if (typeof wavInfo !== 'object' || wavInfo === null) {
    throw new TypeError('Input must be an object');
  }

  if (typeof wavInfo.dataSize !== 'number' || typeof wavInfo.byteRate !== 'number') {
    throw new TypeError('wavInfo must contain dataSize and byteRate');
  }

  if (wavInfo.byteRate === 0) {
    throw new Error('byteRate cannot be zero');
  }

  // Calculate duration
  // byteRate = bytes per second
  // dataSize = total bytes
  // duration = total bytes / bytes per second = seconds
  const duration = wavInfo.dataSize / wavInfo.byteRate;

  return duration;
}

// Test Bonus
try {
  const bonusInfo = {
    sampleRate: 44100,
    numChannels: 2,
    bitsPerSample: 16,
    byteRate: 176400,
    dataSize: 176400 // Should be 1 second
  };

  const duration = calculateDuration(bonusInfo);
  console.log('Duration:', duration, 'seconds');
  console.log('Expected: 1 second');
  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 1 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Binary File Formats:
 *    - WAV is a RIFF (Resource Interchange File Format) file
 *    - Consists of chunks with IDs and sizes
 *    - Header defines the structure, data follows
 *
 * 2. Little-Endian vs Big-Endian:
 *    - WAV files use little-endian byte order
 *    - Use readUInt32LE, readUInt16LE for reading
 *    - Network protocols typically use big-endian (BE)
 *
 * 3. Buffer Reading Methods:
 *    - toString(encoding, start, end) - read strings
 *    - readUInt16LE(offset) - read 2-byte unsigned int
 *    - readUInt32LE(offset) - read 4-byte unsigned int
 *
 * 4. WAV Structure:
 *    - RIFF header: file type and size
 *    - fmt chunk: audio format parameters
 *    - data chunk: actual audio samples
 *
 * 5. Validation:
 *    - Always check buffer sizes before reading
 *    - Validate magic numbers (RIFF, WAVE)
 *    - Verify calculated values (byteRate, blockAlign)
 *    - Check ranges for parameters
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Using wrong endianness:
 *    buffer.readUInt32BE(offset) // Wrong for WAV!
 *    // Should use: buffer.readUInt32LE(offset)
 *
 * ❌ Not validating buffer size:
 *    buffer.readUInt32LE(100) // May throw if buffer too small!
 *
 * ❌ Off-by-one errors in offsets:
 *    const id = buffer.toString('ascii', 0, 3) // Only 3 chars!
 *    // Should be: buffer.toString('ascii', 0, 4)
 *
 * ❌ Forgetting chunk IDs have trailing spaces:
 *    'fmt' !== 'fmt ' // Not equal!
 *
 * ❌ Not handling parse errors:
 *    const parsed = parseWAV(invalidBuffer) // May throw!
 *    // Should wrap in try-catch
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Parse the actual audio data samples
 * 2. Support other audio formats (MP3, FLAC)
 * 3. Implement WAV file writing (create valid WAV files)
 * 4. Handle extended WAV formats with extra chunks
 * 5. Create a WAV file editor (change sample rate, etc.)
 * 6. Implement audio effects (volume, fade in/out)
 */
