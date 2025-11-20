/**
 * Exercise 5 Solution: Secure File Processor
 *
 * This solution demonstrates:
 * - Path traversal attack prevention and sanitization
 * - File size validation to prevent DoS attacks
 * - File type validation using magic bytes (not extensions)
 * - Bounds-checked buffer operations to prevent overflows
 * - Complete secure file processing pipeline
 * - Malware signature scanning and detection
 */

const crypto = require('crypto');
const path = require('path');

console.log('=== Exercise 5: Secure File Processor ===\n');

// Task 1: Path sanitization
console.log('Task 1: Secure Path Validator');
/**
 * Validate and sanitize file paths
 * @param {string} userPath - User-provided path
 * @param {string} baseDir - Allowed base directory
 * @returns {string} Sanitized path or throws error
 *
 * Approach:
 * - Normalize path to resolve . and ..
 * - Check that resolved path is within baseDir
 * - Validate characters (no null bytes, control chars)
 * - Enforce length limits
 * - Use path.normalize and path.resolve for security
 */
function validatePath(userPath, baseDir) {
  // Validate inputs
  if (typeof userPath !== 'string') {
    throw new TypeError('User path must be a string');
  }

  if (typeof baseDir !== 'string') {
    throw new TypeError('Base directory must be a string');
  }

  // Check for null bytes (directory traversal attack vector)
  if (userPath.includes('\0')) {
    throw new Error('Path contains null bytes');
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(userPath)) {
    throw new Error('Path contains control characters');
  }

  // Enforce maximum path length (prevent DoS)
  const MAX_PATH_LENGTH = 4096;
  if (userPath.length > MAX_PATH_LENGTH) {
    throw new Error(`Path exceeds maximum length of ${MAX_PATH_LENGTH} characters`);
  }

  // Normalize and resolve paths
  // This handles ., .., and redundant separators
  const normalizedBase = path.resolve(baseDir);
  const normalizedPath = path.resolve(normalizedBase, userPath);

  // Check if resolved path is within base directory
  // This prevents directory traversal attacks like ../../../etc/passwd
  if (!normalizedPath.startsWith(normalizedBase + path.sep) &&
      normalizedPath !== normalizedBase) {
    throw new Error(
      `Path traversal detected: '${userPath}' resolves outside base directory '${baseDir}'`
    );
  }

  // Additional check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.[\/\\]/,  // Directory traversal
    /[<>:"|?*]/,   // Invalid filename characters (Windows)
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userPath)) {
      throw new Error(`Path contains suspicious pattern: ${pattern}`);
    }
  }

  return normalizedPath;
}

// Test Task 1
try {
  const safe = validatePath('data/file.txt', '/app/data');
  console.log('Safe path:', safe);

  try {
    validatePath('../../../etc/passwd', '/app/data');
    console.log('⚠️  Should have thrown error!');
  } catch (err) {
    console.log('✓ Blocked malicious path:', err.message);
  }

  try {
    validatePath('file\0.txt', '/app/data');
  } catch (err) {
    console.log('✓ Blocked null byte:', err.message);
  }

  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: File size validation
console.log('Task 2: Safe File Size Checker');
/**
 * Validate file size before processing
 * @param {Buffer} buffer - File buffer
 * @param {Object} limits - { min, max } in bytes
 * @returns {boolean} true if valid
 *
 * Approach:
 * - Check buffer size against configured limits
 * - Prevent empty files if min > 0
 * - Prevent DoS attacks with max size
 * - Provide clear error messages
 */
function validateFileSize(buffer, limits) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (!limits || typeof limits !== 'object') {
    throw new TypeError('Limits must be an object');
  }

  const { min = 0, max = Infinity } = limits;

  // Validate limit values
  if (typeof min !== 'number' || min < 0) {
    throw new TypeError('Minimum size must be a non-negative number');
  }

  if (typeof max !== 'number' || max < 0) {
    throw new TypeError('Maximum size must be a non-negative number');
  }

  if (min > max) {
    throw new RangeError('Minimum size cannot exceed maximum size');
  }

  const size = buffer.length;

  // Check minimum size
  if (size < min) {
    throw new Error(
      `File too small: ${size} bytes (minimum: ${min} bytes)`
    );
  }

  // Check maximum size
  if (size > max) {
    throw new Error(
      `File too large: ${size} bytes (maximum: ${max} bytes). ` +
      'This may be a DoS attack attempt.'
    );
  }

  return true;
}

// Test Task 2
try {
  const testFile = Buffer.alloc(1024);

  validateFileSize(testFile, { min: 100, max: 2048 });
  console.log('✓ Valid file size (1024 bytes)');

  try {
    validateFileSize(testFile, { min: 0, max: 512 });
  } catch (err) {
    console.log('✓ Caught size violation:', err.message);
  }

  try {
    validateFileSize(Buffer.alloc(50), { min: 100, max: 2048 });
  } catch (err) {
    console.log('✓ Caught file too small:', err.message);
  }

  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: File type validation
console.log('Task 3: File Type Validator');
/**
 * Validate file type by magic bytes (not extension!)
 * @param {Buffer} buffer - File buffer
 * @param {Array} allowedTypes - ['png', 'jpeg', 'pdf']
 * @returns {string} Detected type or throws error
 *
 * Approach:
 * - Check magic bytes at start of file
 * - Never trust file extension (can be spoofed)
 * - Compare against known signatures
 * - Validate minimum file size for header
 */
function validateFileType(buffer, allowedTypes) {
  // Validate inputs
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
    throw new TypeError('Allowed types must be a non-empty array');
  }

  // Define magic byte signatures
  // These are the first bytes that identify file types
  const signatures = {
    png: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    jpeg: Buffer.from([0xFF, 0xD8, 0xFF]),
    pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
    gif: Buffer.from([0x47, 0x49, 0x46, 0x38]), // GIF8
    zip: Buffer.from([0x50, 0x4B, 0x03, 0x04]), // PK..
    gzip: Buffer.from([0x1F, 0x8B]),
  };

  // Check minimum size
  if (buffer.length < 4) {
    throw new Error('File too small to determine type (need at least 4 bytes)');
  }

  // Check each signature
  let detectedType = null;

  for (const [type, signature] of Object.entries(signatures)) {
    if (buffer.length >= signature.length) {
      // Compare magic bytes
      const fileHeader = buffer.slice(0, signature.length);
      if (fileHeader.equals(signature)) {
        detectedType = type;
        break;
      }
    }
  }

  if (!detectedType) {
    throw new Error(
      'Unknown or unsupported file type. ' +
      `Magic bytes: ${buffer.slice(0, 8).toString('hex')}`
    );
  }

  // Check if detected type is allowed
  if (!allowedTypes.includes(detectedType)) {
    throw new Error(
      `File type '${detectedType}' is not allowed. ` +
      `Allowed types: ${allowedTypes.join(', ')}`
    );
  }

  return detectedType;
}

// Test Task 3
try {
  // PNG file
  const pngFile = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const type = validateFileType(pngFile, ['png', 'jpeg']);
  console.log('✓ Detected type:', type);

  // Unknown file
  const unknownFile = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  try {
    validateFileType(unknownFile, ['png']);
  } catch (err) {
    console.log('✓ Rejected unknown type:', err.message);
  }

  // JPEG not allowed
  const jpegFile = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  try {
    validateFileType(jpegFile, ['png', 'pdf']);
  } catch (err) {
    console.log('✓ Rejected disallowed type:', err.message);
  }

  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Secure buffer operations
console.log('Task 4: Bounds-Checked Buffer Operations');
/**
 * Safe buffer read with bounds checking
 *
 * Approach:
 * - Wrap native Buffer in a secure class
 * - Check bounds before every read operation
 * - Validate encoding parameters
 * - Prevent buffer overflow vulnerabilities
 */
class SecureBuffer {
  constructor(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    // Store buffer (consider Object.freeze for immutability)
    this.buffer = buffer;
    this.length = buffer.length;
  }

  /**
   * Read UInt8 with bounds check
   * @param {number} offset - Read offset
   * @returns {number} Value
   */
  readUInt8(offset) {
    // Validate offset
    if (typeof offset !== 'number' || !Number.isInteger(offset)) {
      throw new TypeError('Offset must be an integer');
    }

    if (offset < 0 || offset >= this.length) {
      throw new RangeError(
        `Offset out of bounds: ${offset} (buffer length: ${this.length})`
      );
    }

    return this.buffer.readUInt8(offset);
  }

  /**
   * Read UInt32LE with bounds check
   * @param {number} offset - Read offset
   * @returns {number} Value
   */
  readUInt32LE(offset) {
    // Validate offset
    if (typeof offset !== 'number' || !Number.isInteger(offset)) {
      throw new TypeError('Offset must be an integer');
    }

    // Need 4 bytes for UInt32
    if (offset < 0 || offset + 4 > this.length) {
      throw new RangeError(
        `Cannot read UInt32 at offset ${offset}: need 4 bytes, ` +
        `but only ${this.length - offset} bytes available`
      );
    }

    return this.buffer.readUInt32LE(offset);
  }

  /**
   * Read string with validation
   * @param {number} offset - Start offset
   * @param {number} length - Number of bytes to read
   * @param {string} encoding - Encoding (default: utf8)
   * @returns {string} Decoded string
   */
  readString(offset, length, encoding = 'utf8') {
    // Validate parameters
    if (typeof offset !== 'number' || !Number.isInteger(offset)) {
      throw new TypeError('Offset must be an integer');
    }

    if (typeof length !== 'number' || !Number.isInteger(length)) {
      throw new TypeError('Length must be an integer');
    }

    if (offset < 0 || length < 0) {
      throw new RangeError('Offset and length must be non-negative');
    }

    if (offset + length > this.length) {
      throw new RangeError(
        `Cannot read ${length} bytes at offset ${offset}: ` +
        `exceeds buffer length (${this.length})`
      );
    }

    // Validate encoding
    const validEncodings = ['utf8', 'ascii', 'utf16le', 'ucs2', 'base64', 'hex'];
    if (!validEncodings.includes(encoding)) {
      throw new TypeError(
        `Invalid encoding: ${encoding}. ` +
        `Valid encodings: ${validEncodings.join(', ')}`
      );
    }

    return this.buffer.toString(encoding, offset, offset + length);
  }

  /**
   * Create slice with validation
   * @param {number} start - Start offset
   * @param {number} end - End offset (exclusive)
   * @returns {SecureBuffer} New SecureBuffer
   */
  slice(start, end) {
    // Validate parameters
    if (typeof start !== 'number' || !Number.isInteger(start)) {
      throw new TypeError('Start must be an integer');
    }

    if (end !== undefined) {
      if (typeof end !== 'number' || !Number.isInteger(end)) {
        throw new TypeError('End must be an integer');
      }
    } else {
      end = this.length;
    }

    if (start < 0 || start > this.length) {
      throw new RangeError(`Start out of bounds: ${start}`);
    }

    if (end < start || end > this.length) {
      throw new RangeError(`End out of bounds: ${end}`);
    }

    // Create new SecureBuffer with sliced data
    const sliced = this.buffer.slice(start, end);
    return new SecureBuffer(sliced);
  }

  /**
   * Run comprehensive validation
   * @returns {Object} Validation result
   */
  validate() {
    const issues = [];

    // Check for null bytes (might indicate truncation)
    if (this.buffer.includes(0x00)) {
      issues.push('Buffer contains null bytes');
    }

    // Check for non-printable characters (if expecting text)
    let nonPrintable = 0;
    for (let i = 0; i < Math.min(100, this.length); i++) {
      const byte = this.buffer[i];
      if (byte < 0x20 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0D) {
        nonPrintable++;
      }
    }

    if (nonPrintable > 10) {
      issues.push('High number of non-printable characters (likely binary)');
    }

    return {
      valid: issues.length === 0,
      issues,
      size: this.length
    };
  }

  /**
   * Get underlying buffer (use with caution)
   * @returns {Buffer} Underlying buffer
   */
  getBuffer() {
    return this.buffer;
  }
}

// Test Task 4
try {
  const secBuf = new SecureBuffer(Buffer.alloc(100));

  try {
    secBuf.readUInt32LE(150); // Out of bounds
  } catch (err) {
    console.log('✓ Caught out of bounds:', err.message);
  }

  try {
    secBuf.readUInt32LE(98); // Need 4 bytes, but only 2 available
  } catch (err) {
    console.log('✓ Caught insufficient bytes:', err.message);
  }

  const slice = secBuf.slice(0, 10);
  console.log('✓ Safe slice:', slice.length, 'bytes');

  const validation = secBuf.validate();
  console.log('✓ Validation:', validation);

  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Secure file processor
console.log('Task 5: Complete Secure File Processor');
/**
 * Production-ready secure file processor
 *
 * Approach:
 * - Multi-layered validation (path, size, type)
 * - Sanitization to remove dangerous content
 * - Cryptographic checksums for integrity
 * - Comprehensive security logging
 * - Defense in depth strategy
 */
class SecureFileProcessor {
  constructor(config) {
    // Validate config
    if (!config || typeof config !== 'object') {
      throw new TypeError('Config must be an object');
    }

    this.config = {
      allowedTypes: config.allowedTypes || [],
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB default
      baseDir: config.baseDir || '/tmp',
      enableSanitization: config.enableSanitization !== false,
      requireChecksum: config.requireChecksum !== false
    };

    // Security event log
    this.securityLog = [];
  }

  /**
   * Log security event
   * @param {string} level - 'info', 'warning', 'error'
   * @param {string} message - Event message
   * @param {Object} metadata - Additional data
   */
  logSecurityEvent(level, message, metadata = {}) {
    const event = {
      timestamp: Date.now(),
      level,
      message,
      ...metadata
    };

    this.securityLog.push(event);

    // In production, send to security monitoring system
    if (level === 'error') {
      console.log(`🔒 SECURITY [${level}]:`, message);
    }
  }

  /**
   * Comprehensive validation
   * @param {Buffer} fileData - File data
   * @param {Object} metadata - { filename, uploadedBy }
   * @returns {Object} Validation result
   */
  validate(fileData, metadata) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      detectedType: null
    };

    try {
      // Validate file data
      if (!Buffer.isBuffer(fileData)) {
        throw new TypeError('File data must be a Buffer');
      }

      // Path validation
      if (metadata.filename) {
        try {
          validatePath(metadata.filename, this.config.baseDir);
        } catch (err) {
          results.errors.push(`Path validation failed: ${err.message}`);
          this.logSecurityEvent('error', 'Path validation failed', {
            filename: metadata.filename,
            error: err.message
          });
        }
      }

      // Size validation
      try {
        validateFileSize(fileData, {
          min: 1,
          max: this.config.maxFileSize
        });
      } catch (err) {
        results.errors.push(`Size validation failed: ${err.message}`);
        this.logSecurityEvent('warning', 'Size validation failed', {
          size: fileData.length,
          maxSize: this.config.maxFileSize
        });
      }

      // Type validation
      if (this.config.allowedTypes.length > 0) {
        try {
          results.detectedType = validateFileType(fileData, this.config.allowedTypes);
          this.logSecurityEvent('info', 'File type validated', {
            type: results.detectedType
          });
        } catch (err) {
          results.errors.push(`Type validation failed: ${err.message}`);
          this.logSecurityEvent('error', 'Type validation failed', {
            error: err.message,
            magicBytes: fileData.slice(0, 8).toString('hex')
          });
        }
      }

      // Mark as invalid if any errors
      if (results.errors.length > 0) {
        results.valid = false;
      }
    } catch (err) {
      results.valid = false;
      results.errors.push(err.message);
    }

    return results;
  }

  /**
   * Remove potentially dangerous data
   * @param {Buffer} buffer - Input buffer
   * @returns {Buffer} Sanitized buffer
   */
  sanitize(buffer) {
    if (!this.config.enableSanitization) {
      return buffer;
    }

    // Create a copy to avoid modifying original
    const sanitized = Buffer.from(buffer);

    // Remove null bytes (can cause issues in C-based parsers)
    for (let i = 0; i < sanitized.length; i++) {
      if (sanitized[i] === 0x00) {
        sanitized[i] = 0x20; // Replace with space
      }
    }

    // In a real implementation, this would:
    // - Strip EXIF metadata from images
    // - Remove embedded scripts from PDFs
    // - Normalize encoding
    // - Remove hidden data streams

    this.logSecurityEvent('info', 'File sanitized', {
      originalSize: buffer.length,
      sanitizedSize: sanitized.length
    });

    return sanitized;
  }

  /**
   * Calculate secure hash
   * @param {Buffer} buffer - Input buffer
   * @returns {string} SHA-256 hash (hex)
   */
  calculateChecksum(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Buffer must be a Buffer instance');
    }

    // Use SHA-256 for cryptographic strength
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  /**
   * Verify checksum in constant time
   * @param {Buffer} buffer - Buffer to verify
   * @param {string} expectedChecksum - Expected checksum (hex)
   * @returns {boolean} True if matches
   */
  verifyChecksum(buffer, expectedChecksum) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Buffer must be a Buffer instance');
    }

    if (typeof expectedChecksum !== 'string') {
      throw new TypeError('Expected checksum must be a string');
    }

    // Calculate actual checksum
    const actualChecksum = this.calculateChecksum(buffer);

    // Convert to buffers for timing-safe comparison
    const expected = Buffer.from(expectedChecksum, 'hex');
    const actual = Buffer.from(actualChecksum, 'hex');

    // Check lengths match
    if (expected.length !== actual.length) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(expected, actual);
  }

  /**
   * Complete processing pipeline
   * @param {Buffer} fileData - File data
   * @param {Object} metadata - Metadata
   * @returns {Object} Processing result
   */
  process(fileData, metadata) {
    this.logSecurityEvent('info', 'Processing started', {
      size: fileData.length,
      filename: metadata.filename
    });

    const result = {
      success: false,
      data: null,
      checksum: null,
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Validate
      const validation = this.validate(fileData, metadata);

      if (!validation.valid) {
        result.errors = validation.errors;
        result.warnings = validation.warnings;
        this.logSecurityEvent('error', 'Validation failed', validation);
        return result;
      }

      // Step 2: Sanitize
      const sanitized = this.sanitize(fileData);

      // Step 3: Calculate checksum
      if (this.config.requireChecksum) {
        result.checksum = this.calculateChecksum(sanitized);
      }

      // Step 4: Success
      result.success = true;
      result.data = sanitized;
      result.detectedType = validation.detectedType;

      this.logSecurityEvent('info', 'Processing completed successfully', {
        size: sanitized.length,
        checksum: result.checksum
      });
    } catch (err) {
      result.errors.push(err.message);
      this.logSecurityEvent('error', 'Processing failed', {
        error: err.message,
        stack: err.stack
      });
    }

    return result;
  }

  /**
   * Get security event log
   * @returns {Array} Security events
   */
  getSecurityLog() {
    return this.securityLog;
  }

  /**
   * Clear security log
   */
  clearSecurityLog() {
    this.securityLog = [];
  }
}

// Test Task 5
try {
  const processor = new SecureFileProcessor({
    allowedTypes: ['png', 'jpeg'],
    maxFileSize: 1024 * 1024, // 1MB
    baseDir: '/app/uploads',
    enableSanitization: true,
    requireChecksum: true
  });

  // Valid PNG file
  const testFile = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    ...Array(100).fill(0xFF) // Dummy data
  ]);

  const metadata = {
    filename: 'test.png',
    uploadedBy: 'user123'
  };

  const result = processor.process(testFile, metadata);
  console.log('Processing result:', {
    success: result.success,
    size: result.data ? result.data.length : 0,
    checksum: result.checksum ? result.checksum.slice(0, 16) + '...' : null,
    errors: result.errors
  });

  console.log('Security log entries:', processor.getSecurityLog().length);

  // Test checksum verification
  if (result.checksum) {
    const verified = processor.verifyChecksum(result.data, result.checksum);
    console.log('✓ Checksum verified:', verified);
  }

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus: Malware scanner
console.log('Bonus: Simple Malware Scanner');
/**
 * Scan for common malicious patterns
 *
 * Approach:
 * - Maintain database of malware signatures
 * - Search for known patterns in buffers
 * - Detect shellcode characteristics
 * - Support both exact and heuristic detection
 */
class MalwareScanner {
  constructor() {
    // Signature database
    this.signatures = new Map();

    // Statistics
    this.stats = {
      scanned: 0,
      threatsFound: 0,
      cleanFiles: 0
    };
  }

  /**
   * Add malware signature
   * @param {string} name - Signature name
   * @param {Buffer|RegExp} pattern - Pattern to match
   */
  addSignature(name, pattern) {
    // Validate inputs
    if (typeof name !== 'string') {
      throw new TypeError('Name must be a string');
    }

    if (!Buffer.isBuffer(pattern) && !(pattern instanceof RegExp)) {
      throw new TypeError('Pattern must be a Buffer or RegExp');
    }

    this.signatures.set(name, pattern);
  }

  /**
   * Scan buffer for signatures
   * @param {Buffer} buffer - Buffer to scan
   * @returns {Object} { clean: boolean, threats: [] }
   */
  scan(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    this.stats.scanned++;

    const threats = [];

    // Check each signature
    for (const [name, pattern] of this.signatures.entries()) {
      if (Buffer.isBuffer(pattern)) {
        // Exact byte match
        if (buffer.includes(pattern)) {
          threats.push({
            name,
            type: 'signature',
            description: `Matched known signature: ${name}`
          });
        }
      } else if (pattern instanceof RegExp) {
        // Regex match on hex string
        const hexString = buffer.toString('hex');
        if (pattern.test(hexString)) {
          threats.push({
            name,
            type: 'pattern',
            description: `Matched pattern: ${name}`
          });
        }
      }
    }

    // Heuristic detection
    const heuristicThreats = this.scanForShellcode(buffer);
    threats.push(...heuristicThreats);

    const clean = threats.length === 0;

    if (clean) {
      this.stats.cleanFiles++;
    } else {
      this.stats.threatsFound += threats.length;
    }

    return {
      clean,
      threats,
      scanned: true
    };
  }

  /**
   * Detect potential shellcode
   * @param {Buffer} buffer - Buffer to scan
   * @returns {Array} Detected threats
   */
  scanForShellcode(buffer) {
    const threats = [];

    // Look for NOP sleds (common in exploits)
    // NOPs are 0x90 in x86
    let nopCount = 0;
    let maxNopSequence = 0;

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0x90) {
        nopCount++;
        maxNopSequence = Math.max(maxNopSequence, nopCount);
      } else {
        nopCount = 0;
      }
    }

    // If we find a long NOP sled, flag it
    if (maxNopSequence > 20) {
      threats.push({
        name: 'nop-sled',
        type: 'heuristic',
        description: `Potential NOP sled detected (${maxNopSequence} consecutive NOPs)`
      });
    }

    // Look for suspicious instruction sequences
    // This is a simplified example; real scanners use complex heuristics
    const suspiciousPatterns = [
      // Common shellcode patterns (x86/x64)
      Buffer.from([0xEB, 0xFE]), // JMP $-2 (infinite loop)
      Buffer.from([0xFF, 0xE4]), // JMP ESP (stack execution)
    ];

    for (const pattern of suspiciousPatterns) {
      if (buffer.includes(pattern)) {
        threats.push({
          name: 'suspicious-opcodes',
          type: 'heuristic',
          description: 'Suspicious instruction sequence detected'
        });
        break;
      }
    }

    // Check for high entropy (encrypted/packed malware)
    const entropy = this.calculateEntropy(buffer);
    if (entropy > 7.5) { // High entropy threshold
      threats.push({
        name: 'high-entropy',
        type: 'heuristic',
        description: `High entropy detected (${entropy.toFixed(2)}), possible encryption/packing`
      });
    }

    return threats;
  }

  /**
   * Calculate Shannon entropy
   * @param {Buffer} buffer - Buffer to analyze
   * @returns {number} Entropy value (0-8)
   */
  calculateEntropy(buffer) {
    if (buffer.length === 0) {
      return 0;
    }

    // Count byte frequencies
    const frequencies = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      frequencies[buffer[i]]++;
    }

    // Calculate entropy
    let entropy = 0;
    for (const freq of frequencies) {
      if (freq > 0) {
        const probability = freq / buffer.length;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Get scanner statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

// Test Bonus
try {
  const scanner = new MalwareScanner();

  // Add test signatures
  scanner.addSignature('test-virus', Buffer.from('MALICIOUS'));
  scanner.addSignature('test-pattern', /deadbeef/i);

  // Scan clean file
  const cleanFile = Buffer.from('Clean content');
  const cleanResult = scanner.scan(cleanFile);
  console.log('Clean scan:', cleanResult);

  // Scan malicious file
  const maliciousFile = Buffer.from('Contains MALICIOUS code');
  const maliciousResult = scanner.scan(maliciousFile);
  console.log('Malicious scan:', maliciousResult);

  // Test shellcode detection
  const nopSled = Buffer.alloc(50, 0x90); // NOP sled
  const shellcodeResult = scanner.scan(nopSled);
  console.log('Shellcode scan:', shellcodeResult);

  console.log('Scanner stats:', scanner.getStats());

  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 5 Complete ===');
console.log('');
console.log('💡 Tips:');
console.log('  • Never trust user input - validate everything');
console.log('  • Check file type by magic bytes, not extension');
console.log('  • Sanitize paths to prevent directory traversal');
console.log('  • Enforce size limits to prevent DoS attacks');
console.log('  • Use constant-time comparison for secrets');
console.log('  • Log security events for audit trails');
console.log('  • Clear sensitive data when done');
console.log('');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Path Security:
 *    - Use path.resolve() to normalize paths
 *    - Check resolved path is within base directory
 *    - Reject null bytes and control characters
 *    - Enforce maximum path length
 *    - Never trust user-provided paths
 *
 * 2. File Validation:
 *    - Check file size before processing
 *    - Validate by magic bytes, not extension
 *    - Extensions can be spoofed easily
 *    - Magic bytes are harder to fake
 *    - Implement multiple validation layers
 *
 * 3. Secure Operations:
 *    - Bounds check all buffer reads
 *    - Validate all parameters
 *    - Use typed errors (TypeError, RangeError)
 *    - Provide detailed error messages
 *    - Fail securely (reject by default)
 *
 * 4. Cryptographic Security:
 *    - Use SHA-256 for checksums
 *    - Use crypto.timingSafeEqual() to prevent timing attacks
 *    - Never compare secrets with == or ===
 *    - Hash buffers, not strings
 *    - Store checksums in hex format
 *
 * 5. Defense in Depth:
 *    - Multiple validation layers
 *    - Sanitization after validation
 *    - Checksum verification
 *    - Security event logging
 *    - Assume all inputs are hostile
 *
 * 6. Production Best Practices:
 *    - Log all security events
 *    - Track validation failures
 *    - Support audit trails
 *    - Fail safely and securely
 *    - Clear sensitive data
 *    - Use established algorithms
 */
