/**
 * Exercise 2 Solution: Memory-Efficient Image Processor
 *
 * This solution demonstrates:
 * - Parsing binary image file formats (BMP headers)
 * - Processing images row-by-row to minimize memory usage
 * - In-place transformations for memory efficiency
 * - Buffer pooling for image processing operations
 * - Streaming transformations for large files
 */

console.log('=== Exercise 2: Memory-Efficient Image Processor ===\n');

// Task 1: Parse BMP header
console.log('Task 1: Parse BMP Header (54 bytes)');
/**
 * Parse a BMP file header
 * @param {Buffer} buffer - BMP file data (at least 54 bytes)
 * @returns {Object} { width, height, bitsPerPixel, pixelDataOffset, fileSize }
 *
 * Approach:
 * - BMP uses little-endian byte order
 * - Validate signature to ensure it's a valid BMP
 * - Extract key metadata from fixed positions
 * - Return structured header information
 */
function parseBMPHeader(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (buffer.length < 54) {
    throw new RangeError('Buffer too small: BMP header requires at least 54 bytes');
  }

  // Check BMP signature (first 2 bytes must be 'BM' = 0x42 0x4D)
  const signature = buffer.toString('ascii', 0, 2);
  if (signature !== 'BM') {
    throw new Error(`Invalid BMP signature: expected 'BM', got '${signature}'`);
  }

  // Parse header fields
  // BMP uses little-endian (LE) byte order
  const fileSize = buffer.readUInt32LE(2);        // Bytes 2-5: Total file size
  const pixelDataOffset = buffer.readUInt32LE(10); // Bytes 10-13: Offset to pixel data
  const width = buffer.readInt32LE(18);            // Bytes 18-21: Image width
  const height = buffer.readInt32LE(22);           // Bytes 22-25: Image height
  const bitsPerPixel = buffer.readUInt16LE(28);    // Bytes 28-29: Bits per pixel

  // Validate parsed values
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid dimensions: width and height must be positive');
  }

  if (![1, 4, 8, 16, 24, 32].includes(bitsPerPixel)) {
    throw new Error(`Unsupported bits per pixel: ${bitsPerPixel}`);
  }

  if (pixelDataOffset < 54) {
    throw new Error('Invalid pixel data offset: must be at least 54');
  }

  return {
    width,
    height,
    bitsPerPixel,
    pixelDataOffset,
    fileSize
  };
}

// Test Task 1
try {
  const testHeader = Buffer.alloc(54);
  testHeader.write('BM', 0);
  testHeader.writeUInt32LE(1024, 2); // File size
  testHeader.writeUInt32LE(54, 10); // Pixel offset
  testHeader.writeInt32LE(100, 18); // Width
  testHeader.writeInt32LE(100, 22); // Height
  testHeader.writeUInt16LE(24, 28); // 24-bit RGB

  const header = parseBMPHeader(testHeader);
  console.log('Parsed header:', header);
  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Process image rows in chunks
console.log('Task 2: Chunked Row Processor');
/**
 * Process image rows without loading entire image
 *
 * Approach:
 * - Calculate row size including padding (BMP rows are aligned to 4-byte boundaries)
 * - Process one row at a time to minimize memory usage
 * - Apply transformations in-place when possible
 * - Return transformed row for streaming output
 */
class ChunkedImageProcessor {
  constructor(width, height, bytesPerPixel) {
    // Validate inputs
    if (typeof width !== 'number' || width <= 0) {
      throw new TypeError('Width must be a positive number');
    }

    if (typeof height !== 'number' || height <= 0) {
      throw new TypeError('Height must be a positive number');
    }

    if (![1, 3, 4].includes(bytesPerPixel)) {
      throw new RangeError('Bytes per pixel must be 1, 3, or 4');
    }

    this.width = width;
    this.height = height;
    this.bytesPerPixel = bytesPerPixel;

    // Calculate row size with padding
    // BMP rows are padded to 4-byte boundaries
    const rawRowSize = width * bytesPerPixel;
    const padding = (4 - (rawRowSize % 4)) % 4;
    this.rowSize = rawRowSize + padding;
    this.padding = padding;
    this.rawRowSize = rawRowSize;

    // Track processed rows
    this.rowsProcessed = 0;
  }

  /**
   * Process a single row of pixels
   * @param {Buffer} rowData - Buffer containing one row
   * @param {number} rowNumber - Row index (0-based)
   * @returns {Buffer} Transformed row
   *
   * Approach:
   * - Apply grayscale transformation as example
   * - Process in-place to avoid allocations
   * - Handle padding correctly
   */
  processRow(rowData, rowNumber) {
    // Validate input
    if (!Buffer.isBuffer(rowData)) {
      throw new TypeError('Row data must be a Buffer');
    }

    if (rowData.length < this.rowSize) {
      throw new RangeError(
        `Row buffer too small: expected ${this.rowSize} bytes, got ${rowData.length}`
      );
    }

    if (typeof rowNumber !== 'number' || rowNumber < 0 || rowNumber >= this.height) {
      throw new RangeError(`Invalid row number: ${rowNumber} (must be 0-${this.height - 1})`);
    }

    // For 3-byte RGB, convert to grayscale
    if (this.bytesPerPixel === 3) {
      // Process each pixel (3 bytes: R, G, B)
      for (let x = 0; x < this.width; x++) {
        const offset = x * 3;
        const r = rowData[offset];
        const g = rowData[offset + 1];
        const b = rowData[offset + 2];

        // Grayscale formula (ITU-R BT.601)
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        // Set all channels to grayscale value (in-place)
        rowData[offset] = gray;
        rowData[offset + 1] = gray;
        rowData[offset + 2] = gray;
      }
    }

    this.rowsProcessed++;

    // Return reference to the same buffer (in-place modification)
    // Could also return a slice to exclude padding
    return rowData.slice(0, this.rowSize);
  }

  /**
   * Get size of one row in bytes (including padding)
   * @returns {number} Row size
   */
  getRowSize() {
    return this.rowSize;
  }

  /**
   * Get processing statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      width: this.width,
      height: this.height,
      bytesPerPixel: this.bytesPerPixel,
      rowSize: this.rowSize,
      padding: this.padding,
      rowsProcessed: this.rowsProcessed,
      progress: ((this.rowsProcessed / this.height) * 100).toFixed(2) + '%'
    };
  }
}

// Test Task 2
try {
  const processor = new ChunkedImageProcessor(10, 10, 3); // 10x10 RGB

  console.log('Processor stats:', processor.getStats());
  console.log('Row size:', processor.getRowSize(), 'bytes');

  const rowData = Buffer.alloc(processor.getRowSize());
  // Fill with test data (red pixels)
  for (let i = 0; i < 30; i += 3) {
    rowData[i] = 255;     // R
    rowData[i + 1] = 0;   // G
    rowData[i + 2] = 0;   // B
  }

  console.log('Before processing (first pixel):', [rowData[0], rowData[1], rowData[2]]);

  const processed = processor.processRow(rowData, 0);
  console.log('After processing (first pixel - grayscale):', [processed[0], processed[1], processed[2]]);
  console.log('Processed row:', processed.length, 'bytes');
  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: RGB to grayscale conversion
console.log('Task 3: RGB to Grayscale (In-Place)');
/**
 * Convert RGB pixels to grayscale in-place
 * Formula: Gray = 0.299*R + 0.587*G + 0.114*B
 * @param {Buffer} rgbData - RGB pixel data (3 bytes per pixel)
 * Modifies buffer in-place
 *
 * Approach:
 * - Iterate through pixels in steps of 3 bytes
 * - Calculate grayscale value using ITU-R BT.601 formula
 * - Set all three channels to same value (creates gray)
 * - Modify buffer in-place for memory efficiency
 */
function convertToGrayscale(rgbData) {
  // Validate input
  if (!Buffer.isBuffer(rgbData)) {
    throw new TypeError('Input must be a Buffer');
  }

  if (rgbData.length % 3 !== 0) {
    throw new RangeError('Buffer length must be a multiple of 3 (RGB format)');
  }

  // Process each pixel (3 bytes: R, G, B)
  for (let i = 0; i < rgbData.length; i += 3) {
    const r = rgbData[i];
    const g = rgbData[i + 1];
    const b = rgbData[i + 2];

    // Calculate grayscale value using ITU-R BT.601 standard
    // These coefficients account for human eye sensitivity to different colors
    // Green appears brightest, blue darkest
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // Clamp to valid byte range (0-255)
    const clampedGray = Math.max(0, Math.min(255, gray));

    // Set all channels to grayscale value (in-place)
    rgbData[i] = clampedGray;
    rgbData[i + 1] = clampedGray;
    rgbData[i + 2] = clampedGray;
  }

  // No return needed - modification is in-place
}

// Test Task 3
try {
  const rgbData = Buffer.from([
    255, 0, 0,      // Red pixel
    0, 255, 0,      // Green pixel
    0, 0, 255,      // Blue pixel
    128, 128, 128   // Gray pixel
  ]);

  console.log('Before:', Array.from(rgbData));
  convertToGrayscale(rgbData);
  console.log('After:', Array.from(rgbData));
  console.log('Red   -> Gray:', rgbData[0], '(expected ~76)');
  console.log('Green -> Gray:', rgbData[3], '(expected ~150)');
  console.log('Blue  -> Gray:', rgbData[6], '(expected ~29)');
  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Image buffer pool
console.log('Task 4: Image Buffer Pool');
/**
 * Specialized buffer pool for image processing
 *
 * Approach:
 * - Maintain a pool of fixed-size buffers for row processing
 * - Support acquiring multiple buffers for batch operations
 * - Track utilization for performance monitoring
 * - Reuse buffers to minimize garbage collection pressure
 */
class ImageBufferPool {
  constructor(rowSize, poolSize) {
    // Validate parameters
    if (typeof rowSize !== 'number' || rowSize <= 0) {
      throw new TypeError('Row size must be a positive number');
    }

    if (typeof poolSize !== 'number' || poolSize <= 0) {
      throw new TypeError('Pool size must be a positive number');
    }

    this.rowSize = rowSize;
    this.maxPoolSize = poolSize;

    // Initialize pool with pre-allocated buffers
    this.available = [];
    for (let i = 0; i < poolSize; i++) {
      this.available.push(Buffer.alloc(rowSize));
    }

    // Track in-use buffers to prevent duplicate releases
    this.inUse = new Set();

    // Statistics
    this.stats = {
      totalAcquisitions: 0,
      totalReleases: 0,
      currentInUse: 0,
      peakInUse: 0,
      hits: 0,
      misses: 0
    };
  }

  /**
   * Get a buffer for one image row
   * @returns {Buffer} Row buffer
   */
  acquireRow() {
    this.stats.totalAcquisitions++;

    let buffer;

    if (this.available.length > 0) {
      // Get from pool (hit)
      buffer = this.available.pop();
      this.stats.hits++;
    } else {
      // Allocate new (miss)
      buffer = Buffer.alloc(this.rowSize);
      this.stats.misses++;
    }

    // Track as in-use
    this.inUse.add(buffer);
    this.stats.currentInUse = this.inUse.size;
    this.stats.peakInUse = Math.max(this.stats.peakInUse, this.stats.currentInUse);

    return buffer;
  }

  /**
   * Return row buffer to pool
   * @param {Buffer} buffer - Buffer to return
   */
  releaseRow(buffer) {
    // Validate buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Must release a Buffer instance');
    }

    if (buffer.length !== this.rowSize) {
      throw new RangeError(
        `Buffer size mismatch: expected ${this.rowSize}, got ${buffer.length}`
      );
    }

    // Check if buffer was acquired from this pool
    if (!this.inUse.has(buffer)) {
      throw new Error('Buffer was not acquired from this pool');
    }

    // Remove from in-use tracking
    this.inUse.delete(buffer);
    this.stats.currentInUse = this.inUse.size;
    this.stats.totalReleases++;

    // Don't exceed max pool size
    if (this.available.length >= this.maxPoolSize) {
      return; // Let it be garbage collected
    }

    // Clear buffer before returning to pool
    buffer.fill(0);

    // Return to pool
    this.available.push(buffer);
  }

  /**
   * Acquire buffers for multiple rows
   * @param {number} rows - Number of row buffers needed
   * @returns {Buffer[]} Array of buffers
   */
  acquireImage(rows) {
    if (typeof rows !== 'number' || rows <= 0) {
      throw new TypeError('Rows must be a positive number');
    }

    const buffers = [];
    for (let i = 0; i < rows; i++) {
      buffers.push(this.acquireRow());
    }
    return buffers;
  }

  /**
   * Release all row buffers
   * @param {Buffer[]} buffers - Array of buffers to release
   */
  releaseImage(buffers) {
    if (!Array.isArray(buffers)) {
      throw new TypeError('Buffers must be an array');
    }

    for (const buffer of buffers) {
      this.releaseRow(buffer);
    }
  }

  /**
   * Get pool utilization percentage
   * @returns {string} Utilization percentage
   */
  getUtilization() {
    const totalCapacity = this.maxPoolSize;
    const inUse = this.stats.currentInUse;
    const utilization = (inUse / totalCapacity) * 100;
    return utilization.toFixed(2);
  }

  /**
   * Get detailed statistics
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      available: this.available.length,
      utilization: this.getUtilization() + '%',
      hitRate: this.stats.totalAcquisitions > 0
        ? ((this.stats.hits / this.stats.totalAcquisitions) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
}

// Test Task 4
try {
  const imgPool = new ImageBufferPool(100, 20);

  const row = imgPool.acquireRow();
  console.log('Acquired row buffer:', row.length, 'bytes');

  const imageBuffers = imgPool.acquireImage(5);
  console.log('Acquired image buffers:', imageBuffers.length);

  console.log('Pool stats (in use):', imgPool.getStats());

  imgPool.releaseRow(row);
  imgPool.releaseImage(imageBuffers);

  console.log('Pool utilization:', imgPool.getUtilization(), '%');
  console.log('Pool stats (after release):', imgPool.getStats());
  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Streaming image transformer
console.log('Task 5: Streaming Image Transformer');
/**
 * Transform image data in a streaming fashion
 *
 * Approach:
 * - Buffer incoming chunks and handle partial rows
 * - Apply transformation function to complete pixels
 * - Output transformed data as it becomes available
 * - Handle row boundaries correctly
 */
class StreamingImageTransformer {
  constructor(width, height, bytesPerPixel) {
    // Validate inputs
    if (typeof width !== 'number' || width <= 0) {
      throw new TypeError('Width must be a positive number');
    }

    if (typeof height !== 'number' || height <= 0) {
      throw new TypeError('Height must be a positive number');
    }

    if (![1, 3, 4].includes(bytesPerPixel)) {
      throw new RangeError('Bytes per pixel must be 1, 3, or 4');
    }

    this.width = width;
    this.height = height;
    this.bytesPerPixel = bytesPerPixel;
    this.pixelSize = bytesPerPixel;

    // Calculate row size
    const rawRowSize = width * bytesPerPixel;
    const padding = (4 - (rawRowSize % 4)) % 4;
    this.rowSize = rawRowSize + padding;

    // Buffer for incomplete data
    this.buffer = Buffer.alloc(0);

    // Statistics
    this.stats = {
      chunksProcessed: 0,
      bytesProcessed: 0,
      pixelsTransformed: 0
    };
  }

  /**
   * Apply transformation to chunk
   * @param {Buffer} inputChunk - Input data chunk
   * @param {Function} transformFn - Function to transform each pixel
   * @returns {Buffer} Transformed data
   *
   * transformFn receives [r, g, b] and returns [r, g, b]
   */
  transform(inputChunk, transformFn) {
    // Validate inputs
    if (!Buffer.isBuffer(inputChunk)) {
      throw new TypeError('Input chunk must be a Buffer');
    }

    if (typeof transformFn !== 'function') {
      throw new TypeError('Transform function must be a function');
    }

    // Combine with buffered data
    this.buffer = Buffer.concat([this.buffer, inputChunk]);

    // Process complete pixels
    const pixelSize = this.pixelSize;
    const completePixels = Math.floor(this.buffer.length / pixelSize);
    const completeBytes = completePixels * pixelSize;

    if (completeBytes === 0) {
      // Not enough data yet
      return Buffer.alloc(0);
    }

    // Extract complete pixel data
    const pixelData = this.buffer.slice(0, completeBytes);

    // Transform each pixel
    for (let i = 0; i < completeBytes; i += pixelSize) {
      // Extract pixel values
      const pixel = [];
      for (let j = 0; j < pixelSize; j++) {
        pixel.push(pixelData[i + j]);
      }

      // Apply transformation
      const transformed = transformFn(pixel);

      // Validate transformation output
      if (!Array.isArray(transformed) || transformed.length !== pixelSize) {
        throw new Error('Transform function must return array of same length');
      }

      // Write transformed values back
      for (let j = 0; j < pixelSize; j++) {
        const value = Math.max(0, Math.min(255, Math.round(transformed[j])));
        pixelData[i + j] = value;
      }

      this.stats.pixelsTransformed++;
    }

    // Keep incomplete pixel data
    this.buffer = this.buffer.slice(completeBytes);

    // Update statistics
    this.stats.chunksProcessed++;
    this.stats.bytesProcessed += inputChunk.length;

    return pixelData;
  }

  /**
   * Process any remaining partial pixel data
   * @returns {Buffer} Remaining transformed data
   */
  flush() {
    const remaining = this.buffer;
    this.buffer = Buffer.alloc(0);
    return remaining;
  }

  /**
   * Get transformer statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      bufferedBytes: this.buffer.length
    };
  }
}

// Test Task 5
try {
  const transformer = new StreamingImageTransformer(10, 10, 3);

  // Create test chunks
  const chunk1 = Buffer.alloc(50);
  const chunk2 = Buffer.alloc(50);

  // Fill with color data
  for (let i = 0; i < chunk1.length; i += 3) {
    chunk1[i] = 255;     // R
    chunk1[i + 1] = 128; // G
    chunk1[i + 2] = 64;  // B
  }

  // Transform: invert colors
  const out1 = transformer.transform(chunk1, (pixel) => {
    return [255 - pixel[0], 255 - pixel[1], 255 - pixel[2]];
  });

  console.log('Transformed chunk 1:', out1.length, 'bytes');
  console.log('First pixel inverted:', [out1[0], out1[1], out1[2]], '(expected [0, 127, 191])');

  // Identity transform
  const out2 = transformer.transform(chunk2, (pixel) => pixel);

  console.log('Transformed chunk 2:', out2.length, 'bytes');
  console.log('Total output:', out1.length + out2.length, 'bytes');
  console.log('Statistics:', transformer.getStats());
  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus: Image statistics calculator
console.log('Bonus: Image Statistics');
/**
 * Calculate statistics while streaming image data
 *
 * Approach:
 * - Track min, max, sum for each channel
 * - Calculate running averages incrementally
 * - Count pixels for final calculations
 * - Compute statistics in O(1) space
 */
class ImageStatistics {
  constructor() {
    // Initialize channel statistics
    this.channels = {
      r: { min: 255, max: 0, sum: 0 },
      g: { min: 255, max: 0, sum: 0 },
      b: { min: 255, max: 0, sum: 0 }
    };

    this.totalPixels = 0;
  }

  /**
   * Update statistics with a pixel
   * @param {number} r - Red value (0-255)
   * @param {number} g - Green value (0-255)
   * @param {number} b - Blue value (0-255)
   */
  addPixel(r, g, b) {
    // Validate inputs
    if (typeof r !== 'number' || r < 0 || r > 255) {
      throw new RangeError('Red value must be between 0 and 255');
    }

    if (typeof g !== 'number' || g < 0 || g > 255) {
      throw new RangeError('Green value must be between 0 and 255');
    }

    if (typeof b !== 'number' || b < 0 || b > 255) {
      throw new RangeError('Blue value must be between 0 and 255');
    }

    // Update red channel
    this.channels.r.min = Math.min(this.channels.r.min, r);
    this.channels.r.max = Math.max(this.channels.r.max, r);
    this.channels.r.sum += r;

    // Update green channel
    this.channels.g.min = Math.min(this.channels.g.min, g);
    this.channels.g.max = Math.max(this.channels.g.max, g);
    this.channels.g.sum += g;

    // Update blue channel
    this.channels.b.min = Math.min(this.channels.b.min, b);
    this.channels.b.max = Math.max(this.channels.b.max, b);
    this.channels.b.sum += b;

    this.totalPixels++;
  }

  /**
   * Get calculated statistics
   * @returns {Object} { r: {min, max, avg}, g: {}, b: {}, totalPixels }
   */
  getStats() {
    if (this.totalPixels === 0) {
      return {
        r: { min: 0, max: 0, avg: 0 },
        g: { min: 0, max: 0, avg: 0 },
        b: { min: 0, max: 0, avg: 0 },
        totalPixels: 0
      };
    }

    return {
      r: {
        min: this.channels.r.min,
        max: this.channels.r.max,
        avg: (this.channels.r.sum / this.totalPixels).toFixed(2)
      },
      g: {
        min: this.channels.g.min,
        max: this.channels.g.max,
        avg: (this.channels.g.sum / this.totalPixels).toFixed(2)
      },
      b: {
        min: this.channels.b.min,
        max: this.channels.b.max,
        avg: (this.channels.b.sum / this.totalPixels).toFixed(2)
      },
      totalPixels: this.totalPixels
    };
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.channels = {
      r: { min: 255, max: 0, sum: 0 },
      g: { min: 255, max: 0, sum: 0 },
      b: { min: 255, max: 0, sum: 0 }
    };
    this.totalPixels = 0;
  }
}

// Test Bonus
try {
  const stats = new ImageStatistics();

  stats.addPixel(255, 0, 0);    // Pure red
  stats.addPixel(0, 255, 0);    // Pure green
  stats.addPixel(0, 0, 255);    // Pure blue
  stats.addPixel(128, 128, 128); // Gray

  console.log('Image statistics:');
  console.log(JSON.stringify(stats.getStats(), null, 2));
  console.log('✓ Bonus complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 2 Complete ===');
console.log('');
console.log('💡 Tips:');
console.log('  • Process images row by row to save memory');
console.log('  • BMP rows are padded to 4-byte boundaries');
console.log('  • Use buffer pools for repeated allocations');
console.log('  • In-place transformations save memory');
console.log('  • Handle partial rows in streaming scenarios');
console.log('');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Binary File Formats:
 *    - BMP uses little-endian byte order
 *    - Headers contain metadata at fixed positions
 *    - Validate signatures to ensure correct format
 *    - Row padding aligns data to boundaries
 *
 * 2. Memory-Efficient Processing:
 *    - Process data in chunks (rows) not entire file
 *    - In-place transformations avoid allocations
 *    - Calculate sizes before allocating
 *    - Use buffer pools to reuse memory
 *
 * 3. Image Transformations:
 *    - Grayscale uses weighted formula (0.299 R + 0.587 G + 0.114 B)
 *    - In-place modification: same buffer for input/output
 *    - Handle padding correctly (don't transform padding bytes)
 *    - Clamp values to valid range (0-255)
 *
 * 4. Streaming Processing:
 *    - Buffer incomplete data between chunks
 *    - Process only complete units (pixels, rows)
 *    - Handle boundaries carefully
 *    - Flush remaining data at end
 *
 * 5. Production Best Practices:
 *    - Validate all inputs thoroughly
 *    - Track buffer ownership (in-use set)
 *    - Collect statistics for monitoring
 *    - Clear buffers before reuse
 *    - Provide detailed error messages
 */
