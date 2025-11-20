/**
 * Exercise 3 Solution: TypedArray Converter
 *
 * This solution demonstrates:
 * - Working with different TypedArray types
 * - Converting between array types and handling data loss
 * - Processing audio and image data with TypedArrays
 * - Interleaving and deinterleaving multi-channel data
 * - Creating multiple views on the same ArrayBuffer
 */

console.log('=== Exercise 3: TypedArray Converter ===\n');

// Task 1: Convert between TypedArray types
console.log('Task 1: TypedArray Type Converter');
/**
 * Convert data from one TypedArray type to another
 * Handle potential data loss (e.g., float to int, larger to smaller)
 *
 * Approach:
 * - Create new target array from source array
 * - TypedArray constructors handle conversion automatically
 * - Be aware that data may be truncated or rounded
 *
 * @param {TypedArray} sourceArray - Source typed array
 * @param {Function} TargetType - Target TypedArray constructor
 * @returns {TypedArray} Converted array
 */
function convertArrayType(sourceArray, TargetType) {
  // Validate input
  if (!ArrayBuffer.isView(sourceArray)) {
    throw new TypeError('Source must be a TypedArray');
  }

  if (typeof TargetType !== 'function') {
    throw new TypeError('TargetType must be a TypedArray constructor');
  }

  // Create new array of target type from source
  // The constructor handles conversion:
  // - Floats are truncated to integers
  // - Values outside range wrap or clamp depending on type
  // - Different byte sizes are handled automatically
  const targetArray = new TargetType(sourceArray);

  return targetArray;
}

// Test Task 1
try {
  const float32 = new Float32Array([1.7, 2.3, 3.9, -4.2]);
  const int16 = convertArrayType(float32, Int16Array);

  console.log('Float32:', float32);
  console.log('→ Int16:', int16);

  const uint8 = new Uint8Array([100, 200, 255]);
  const int32 = convertArrayType(uint8, Int32Array);

  console.log('Uint8:', uint8);
  console.log('→ Int32:', int32);

  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Normalize audio samples
console.log('Task 2: Normalize Audio Samples');
/**
 * Normalize audio samples to a specific range
 * Convert between different bit depths (e.g., 16-bit to 32-bit float)
 *
 * Approach:
 * - Int16: range is -32768 to 32767, divide by 32768 for -1.0 to 1.0
 * - Int32: range is -2147483648 to 2147483647, divide by 2147483648
 * - Normalized range: -1.0 to 1.0 (standard for audio processing)
 *
 * @param {Int16Array|Int32Array} samples - Integer audio samples
 * @returns {Float32Array} Normalized samples (-1.0 to 1.0)
 */
function normalizeAudioSamples(samples) {
  // Validate input
  if (!ArrayBuffer.isView(samples)) {
    throw new TypeError('Samples must be a TypedArray');
  }

  // Determine divisor based on type
  let divisor;
  if (samples instanceof Int16Array) {
    // Int16: -32768 to 32767
    divisor = 32768;
  } else if (samples instanceof Int32Array) {
    // Int32: -2147483648 to 2147483647
    divisor = 2147483648;
  } else {
    throw new TypeError('Samples must be Int16Array or Int32Array');
  }

  // Create normalized float array
  const normalized = new Float32Array(samples.length);

  // Normalize each sample
  for (let i = 0; i < samples.length; i++) {
    normalized[i] = samples[i] / divisor;
  }

  return normalized;
}

/**
 * Denormalize audio samples from float to integer
 *
 * Approach:
 * - Multiply by max value for target type
 * - Clamp to valid range
 * - Round to nearest integer
 */
function denormalizeAudioSamples(samples, targetType) {
  // Validate input
  if (!(samples instanceof Float32Array)) {
    throw new TypeError('Samples must be Float32Array');
  }

  // Determine multiplier based on target type
  let multiplier;
  let TargetArray;

  if (targetType === Int16Array) {
    multiplier = 32767; // Max positive value for Int16
    TargetArray = Int16Array;
  } else if (targetType === Int32Array) {
    multiplier = 2147483647; // Max positive value for Int32
    TargetArray = Int32Array;
  } else {
    throw new TypeError('Target type must be Int16Array or Int32Array');
  }

  // Create denormalized array
  const denormalized = new TargetArray(samples.length);

  // Denormalize each sample
  for (let i = 0; i < samples.length; i++) {
    // Multiply by max value and round
    // Clamp to valid range (-1.0 to 1.0)
    const clamped = Math.max(-1.0, Math.min(1.0, samples[i]));
    denormalized[i] = Math.round(clamped * multiplier);
  }

  return denormalized;
}

// Test Task 2
try {
  const int16Samples = new Int16Array([0, 16384, 32767, -16384, -32768]);
  const normalized = normalizeAudioSamples(int16Samples);

  console.log('Int16 samples:', int16Samples);
  console.log('Normalized:', normalized);

  const denormalized = denormalizeAudioSamples(normalized, Int16Array);
  console.log('Denormalized:', denormalized);

  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Interleave/deinterleave audio channels
console.log('Task 3: Interleave Audio Channels');
/**
 * Interleave multiple audio channels into a single array
 * Example: [L1, L2, L3], [R1, R2, R3] → [L1, R1, L2, R2, L3, R3]
 *
 * Approach:
 * - Create output array with size = sum of all channel lengths
 * - Iterate through samples, writing each channel in turn
 * - Used for stereo/surround sound where channels need to be mixed
 *
 * @param {Float32Array[]} channels - Array of channel data
 * @returns {Float32Array} Interleaved data
 */
function interleaveChannels(channels) {
  // Validate input
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new TypeError('Channels must be a non-empty array');
  }

  // Validate all channels are Float32Array and same length
  const channelLength = channels[0].length;
  for (let i = 0; i < channels.length; i++) {
    if (!(channels[i] instanceof Float32Array)) {
      throw new TypeError('All channels must be Float32Array');
    }
    if (channels[i].length !== channelLength) {
      throw new Error('All channels must have the same length');
    }
  }

  const numChannels = channels.length;
  const numSamples = channelLength;

  // Create interleaved array
  const interleaved = new Float32Array(numChannels * numSamples);

  // Interleave samples
  // For each sample position, write all channels
  for (let sample = 0; sample < numSamples; sample++) {
    for (let channel = 0; channel < numChannels; channel++) {
      // Output index = sample * numChannels + channel
      interleaved[sample * numChannels + channel] = channels[channel][sample];
    }
  }

  return interleaved;
}

/**
 * Deinterleave audio data into separate channels
 *
 * Approach:
 * - Create array of separate channel buffers
 * - Iterate through interleaved data, distributing to channels
 */
function deinterleaveChannels(interleaved, numChannels) {
  // Validate input
  if (!(interleaved instanceof Float32Array)) {
    throw new TypeError('Interleaved must be Float32Array');
  }

  if (typeof numChannels !== 'number' || numChannels < 1) {
    throw new TypeError('Number of channels must be at least 1');
  }

  if (interleaved.length % numChannels !== 0) {
    throw new Error('Interleaved length must be divisible by number of channels');
  }

  const numSamples = interleaved.length / numChannels;

  // Create separate channel arrays
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(new Float32Array(numSamples));
  }

  // Deinterleave samples
  for (let i = 0; i < interleaved.length; i++) {
    const channel = i % numChannels;
    const sample = Math.floor(i / numChannels);
    channels[channel][sample] = interleaved[i];
  }

  return channels;
}

// Test Task 3
try {
  const leftChannel = new Float32Array([0.1, 0.2, 0.3]);
  const rightChannel = new Float32Array([0.4, 0.5, 0.6]);

  const interleaved = interleaveChannels([leftChannel, rightChannel]);
  console.log('Interleaved:', interleaved);
  console.log('Expected: [0.1, 0.4, 0.2, 0.5, 0.3, 0.6]');

  const separated = deinterleaveChannels(interleaved, 2);
  console.log('Deinterleaved:');
  console.log('  Left:', separated[0]);
  console.log('  Right:', separated[1]);

  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Image data manipulation
console.log('Task 4: Image Pixel Data Converter');
/**
 * Convert RGBA image data to grayscale
 * Use standard luminance formula: Y = 0.299*R + 0.587*G + 0.114*B
 *
 * Approach:
 * - RGBA data: 4 bytes per pixel (Red, Green, Blue, Alpha)
 * - Calculate luminance using weighted formula
 * - Set R=G=B to luminance value (creates grayscale)
 * - Keep alpha channel unchanged
 *
 * @param {Uint8ClampedArray} rgba - RGBA pixel data (4 bytes per pixel)
 * @returns {Uint8ClampedArray} Grayscale RGBA (R=G=B)
 */
function rgbaToGrayscale(rgba) {
  // Validate input
  if (!(rgba instanceof Uint8ClampedArray)) {
    throw new TypeError('Input must be Uint8ClampedArray');
  }

  if (rgba.length % 4 !== 0) {
    throw new Error('RGBA data length must be divisible by 4');
  }

  // Create output array
  const grayscale = new Uint8ClampedArray(rgba.length);

  // Process each pixel (4 bytes)
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const a = rgba[i + 3];

    // Calculate luminance using standard formula
    // These weights approximate human eye sensitivity to different colors
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Set R=G=B to luminance (creates grayscale)
    // Uint8ClampedArray automatically clamps to 0-255
    grayscale[i] = luminance;     // R
    grayscale[i + 1] = luminance; // G
    grayscale[i + 2] = luminance; // B
    grayscale[i + 3] = a;         // A (unchanged)
  }

  return grayscale;
}

/**
 * Extract a single color channel from RGBA data
 *
 * Approach:
 * - Each pixel is 4 bytes: R, G, B, A at indices i, i+1, i+2, i+3
 * - Extract every 4th byte starting from channel offset
 */
function extractChannel(rgba, channel) {
  // Validate input
  if (!(rgba instanceof Uint8ClampedArray)) {
    throw new TypeError('Input must be Uint8ClampedArray');
  }

  if (rgba.length % 4 !== 0) {
    throw new Error('RGBA data length must be divisible by 4');
  }

  // Determine channel offset
  let offset;
  switch (channel.toLowerCase()) {
    case 'r':
      offset = 0;
      break;
    case 'g':
      offset = 1;
      break;
    case 'b':
      offset = 2;
      break;
    case 'a':
      offset = 3;
      break;
    default:
      throw new Error('Channel must be "r", "g", "b", or "a"');
  }

  // Calculate number of pixels
  const numPixels = rgba.length / 4;

  // Create output array
  const channelData = new Uint8Array(numPixels);

  // Extract channel values
  for (let i = 0; i < numPixels; i++) {
    channelData[i] = rgba[i * 4 + offset];
  }

  return channelData;
}

// Test Task 4
try {
  // 2x2 image (16 bytes = 4 pixels × 4 bytes)
  const rgbaData = new Uint8ClampedArray([
    255, 0, 0, 255,    // Red pixel
    0, 255, 0, 255,    // Green pixel
    0, 0, 255, 255,    // Blue pixel
    128, 128, 128, 255 // Gray pixel
  ]);

  const grayscale = rgbaToGrayscale(rgbaData);
  console.log('Original RGBA (first pixel):', rgbaData.slice(0, 4));
  console.log('Grayscale (first pixel):', grayscale.slice(0, 4));

  const redChannel = extractChannel(rgbaData, 'r');
  console.log('Red channel:', redChannel);

  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Buffer and TypedArray views
console.log('Task 5: Create Multiple Views on Same Data');
/**
 * Create a class that provides multiple TypedArray views
 * on the same underlying ArrayBuffer
 *
 * Key concept: All TypedArrays sharing the same ArrayBuffer
 * see the same memory. Writing to one view affects all others.
 */
class MultiViewBuffer {
  constructor(sizeInBytes) {
    // Validate input
    if (typeof sizeInBytes !== 'number' || sizeInBytes <= 0) {
      throw new TypeError('Size must be a positive number');
    }

    // Create underlying ArrayBuffer
    this.buffer = new ArrayBuffer(sizeInBytes);

    // Create different views on the same buffer
    // All views see the same memory, just interpret it differently
    this.uint8 = new Uint8Array(this.buffer);
    this.uint16 = new Uint16Array(this.buffer);
    this.uint32 = new Uint32Array(this.buffer);
    this.int32 = new Int32Array(this.buffer);
    this.float32 = new Float32Array(this.buffer);
    this.float64 = new Float64Array(this.buffer);
  }

  writeUint8(index, value) {
    // Validate index
    if (index < 0 || index >= this.uint8.length) {
      throw new RangeError('Index out of bounds');
    }
    this.uint8[index] = value;
  }

  writeFloat32(index, value) {
    // Validate index
    if (index < 0 || index >= this.float32.length) {
      throw new RangeError('Index out of bounds');
    }
    this.float32[index] = value;
  }

  readAsUint32(byteOffset) {
    // Validate alignment (Uint32 requires 4-byte alignment)
    if (byteOffset % 4 !== 0) {
      console.warn('Warning: Unaligned access may be slower');
    }

    // Create DataView for unaligned access
    const view = new DataView(this.buffer);
    return view.getUint32(byteOffset, true); // true = little-endian
  }

  readAsFloat64(byteOffset) {
    // Validate alignment (Float64 requires 8-byte alignment)
    if (byteOffset % 8 !== 0) {
      console.warn('Warning: Unaligned access may be slower');
    }

    // Create DataView for unaligned access
    const view = new DataView(this.buffer);
    return view.getFloat64(byteOffset, true); // true = little-endian
  }

  getRawBytes() {
    // Return Uint8Array view showing all bytes
    return this.uint8;
  }
}

// Test Task 5
try {
  const multiView = new MultiViewBuffer(16);

  multiView.writeFloat32(0, 3.14159);
  console.log('After writing float32(0) = 3.14159:');
  console.log('  Raw bytes:', multiView.getRawBytes());

  multiView.writeUint8(0, 0xFF);
  console.log('After writing uint8(0) = 0xFF:');
  console.log('  Raw bytes:', multiView.getRawBytes());
  console.log('  As uint32:', multiView.readAsUint32(0));

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 1: Efficient array operations
console.log('Bonus Challenge 1: Efficient Array Operations');
/**
 * Implement efficient operations using TypedArrays
 * TypedArrays are much faster than regular arrays for numeric operations
 */

function vectorAdd(a, b) {
  // Validate inputs
  if (!(a instanceof Float32Array) || !(b instanceof Float32Array)) {
    throw new TypeError('Both arguments must be Float32Array');
  }

  if (a.length !== b.length) {
    throw new Error('Arrays must have the same length');
  }

  // Create result array
  const result = new Float32Array(a.length);

  // Add element-wise
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i];
  }

  return result;
}

function vectorMultiply(a, scalar) {
  // Validate inputs
  if (!(a instanceof Float32Array)) {
    throw new TypeError('First argument must be Float32Array');
  }

  if (typeof scalar !== 'number') {
    throw new TypeError('Scalar must be a number');
  }

  // Create result array
  const result = new Float32Array(a.length);

  // Multiply each element
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] * scalar;
  }

  return result;
}

function dotProduct(a, b) {
  // Validate inputs
  if (!(a instanceof Float32Array) || !(b instanceof Float32Array)) {
    throw new TypeError('Both arguments must be Float32Array');
  }

  if (a.length !== b.length) {
    throw new Error('Arrays must have the same length');
  }

  // Calculate dot product: sum of element-wise products
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

// Test Bonus 1
try {
  const vec1 = new Float32Array([1, 2, 3, 4]);
  const vec2 = new Float32Array([5, 6, 7, 8]);

  const sum = vectorAdd(vec1, vec2);
  console.log('Vector add:', sum);
  console.log('Expected: [6, 8, 10, 12]');

  const scaled = vectorMultiply(vec1, 2);
  console.log('Vector multiply:', scaled);
  console.log('Expected: [2, 4, 6, 8]');

  const dot = dotProduct(vec1, vec2);
  console.log('Dot product:', dot);
  console.log('Expected: 70 (1*5 + 2*6 + 3*7 + 4*8)');

  console.log('✓ Bonus 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 2: Endianness converter
console.log('Bonus Challenge 2: Endianness Converter');
/**
 * Convert endianness of typed array data
 * Big-endian: most significant byte first
 * Little-endian: least significant byte first
 */
class EndiannessConverter {
  static swap16(uint16Array) {
    // Validate input
    if (!(uint16Array instanceof Uint16Array)) {
      throw new TypeError('Input must be Uint16Array');
    }

    // Create result array
    const swapped = new Uint16Array(uint16Array.length);

    // Get underlying bytes
    const bytes = new Uint8Array(uint16Array.buffer, uint16Array.byteOffset, uint16Array.byteLength);

    // Swap bytes for each 16-bit value
    for (let i = 0; i < uint16Array.length; i++) {
      const byteOffset = i * 2;
      // Swap byte order: [0, 1] → [1, 0]
      swapped[i] = (bytes[byteOffset] << 8) | bytes[byteOffset + 1];
    }

    return swapped;
  }

  static swap32(uint32Array) {
    // Validate input
    if (!(uint32Array instanceof Uint32Array)) {
      throw new TypeError('Input must be Uint32Array');
    }

    // Create result array
    const swapped = new Uint32Array(uint32Array.length);

    // Get underlying bytes
    const bytes = new Uint8Array(uint32Array.buffer, uint32Array.byteOffset, uint32Array.byteLength);

    // Swap bytes for each 32-bit value
    for (let i = 0; i < uint32Array.length; i++) {
      const byteOffset = i * 4;
      // Swap byte order: [0, 1, 2, 3] → [3, 2, 1, 0]
      swapped[i] =
        (bytes[byteOffset] << 24) |
        (bytes[byteOffset + 1] << 16) |
        (bytes[byteOffset + 2] << 8) |
        bytes[byteOffset + 3];
    }

    return swapped;
  }

  static convertBuffer(buffer, bytesPerElement) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Input must be a Buffer');
    }

    if (![2, 4, 8].includes(bytesPerElement)) {
      throw new Error('Bytes per element must be 2, 4, or 8');
    }

    if (buffer.length % bytesPerElement !== 0) {
      throw new Error('Buffer length must be divisible by bytes per element');
    }

    // Create a copy to avoid modifying original
    const result = Buffer.from(buffer);

    // Swap bytes for each element
    const numElements = buffer.length / bytesPerElement;
    for (let i = 0; i < numElements; i++) {
      const offset = i * bytesPerElement;

      // Reverse bytes within this element
      for (let j = 0; j < bytesPerElement / 2; j++) {
        const temp = result[offset + j];
        result[offset + j] = result[offset + bytesPerElement - 1 - j];
        result[offset + bytesPerElement - 1 - j] = temp;
      }
    }

    return result;
  }
}

// Test Bonus 2
try {
  const test16 = new Uint16Array([0x1234, 0x5678]);
  const swapped16 = EndiannessConverter.swap16(test16);
  console.log('Original 16-bit:', test16.map(n => '0x' + n.toString(16)));
  console.log('Swapped 16-bit:', swapped16.map(n => '0x' + n.toString(16)));
  console.log('Expected: [0x3412, 0x7856]');

  console.log('✓ Bonus 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 3 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. TypedArray Types:
 *    - Int8Array, Uint8Array, Uint8ClampedArray (8-bit)
 *    - Int16Array, Uint16Array (16-bit)
 *    - Int32Array, Uint32Array (32-bit)
 *    - Float32Array, Float64Array (floating-point)
 *
 * 2. Shared ArrayBuffer:
 *    - Multiple TypedArrays can share same ArrayBuffer
 *    - Writing to one view affects all others
 *    - Different types interpret same bytes differently
 *
 * 3. Audio Processing:
 *    - Normalize: convert int samples to -1.0 to 1.0 range
 *    - Interleave: mix multiple channels [L,R,L,R,...]
 *    - Deinterleave: separate channels back out
 *
 * 4. Image Processing:
 *    - RGBA: 4 bytes per pixel (Red, Green, Blue, Alpha)
 *    - Uint8ClampedArray: automatically clamps to 0-255
 *    - Grayscale: use luminance formula for human perception
 *
 * 5. Performance:
 *    - TypedArrays are much faster than regular arrays
 *    - Direct memory access without type checking
 *    - Ideal for numeric and binary data processing
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Assuming all arrays are the same length:
 *    new Float32Array(buffer) // Length depends on buffer size!
 *
 * ❌ Forgetting Uint8ClampedArray clamps values:
 *    arr[0] = 300 // Becomes 255, not wrapped like other types
 *
 * ❌ Not handling alignment for DataView:
 *    dataView.getUint32(1) // May be slow if unaligned
 *
 * ❌ Modifying wrong bytes when interleaving:
 *    interleaved[i] = left[i] // Wrong! Need to account for channels
 *
 * ❌ Integer division when calculating indices:
 *    const idx = length / 2 // May not be integer!
 *    // Use: Math.floor(length / 2)
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Implement audio effects (reverb, echo, filters)
 * 2. Create image filters (blur, sharpen, edge detection)
 * 3. Implement FFT for frequency analysis
 * 4. Build a simple audio synthesizer
 * 5. Create a pixel art editor with TypedArrays
 * 6. Implement SIMD-like operations for better performance
 */
