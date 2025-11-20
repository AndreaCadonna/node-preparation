/**
 * Exercise 4 Solution: Binary Serializer
 *
 * This solution demonstrates:
 * - Serializing JavaScript values to binary format
 * - Using type tags to identify data types
 * - Handling variable-length data with length prefixes
 * - Recursive serialization of nested objects and arrays
 * - Comparing binary vs JSON serialization efficiency
 */

console.log('=== Exercise 4: Binary Serializer ===\n');

// Type tags for different data types
const TYPE_NULL = 0x00;
const TYPE_BOOLEAN = 0x01;
const TYPE_NUMBER = 0x02;
const TYPE_STRING = 0x03;
const TYPE_ARRAY = 0x04;
const TYPE_OBJECT = 0x05;

// Task 1: Serialize primitive values
console.log('Task 1: Serialize Primitive Values');
/**
 * Serialize a single value to binary format
 * Type tags:
 * - 0x00: null
 * - 0x01: boolean
 * - 0x02: number (float64)
 * - 0x03: string (length-prefixed, UTF-8)
 *
 * Approach:
 * - Write type tag first (1 byte)
 * - Write value in appropriate format
 * - For variable-length data (strings), include length prefix
 *
 * @param {any} value - Value to serialize
 * @returns {Buffer} Serialized binary data
 */
function serializeValue(value) {
  // Handle null
  if (value === null) {
    // null: just type tag
    return Buffer.from([TYPE_NULL]);
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    // boolean: type tag + 1 byte (0 or 1)
    return Buffer.from([TYPE_BOOLEAN, value ? 1 : 0]);
  }

  // Handle number
  if (typeof value === 'number') {
    // number: type tag + 8 bytes (double, little-endian)
    const buffer = Buffer.alloc(9);
    buffer.writeUInt8(TYPE_NUMBER, 0);
    buffer.writeDoubleLE(value, 1);
    return buffer;
  }

  // Handle string
  if (typeof value === 'string') {
    // string: type tag + 2 bytes length + UTF-8 bytes
    const stringBuffer = Buffer.from(value, 'utf8');
    const length = stringBuffer.length;

    if (length > 0xFFFF) {
      throw new Error('String too long (max 65535 bytes)');
    }

    const buffer = Buffer.alloc(3 + length);
    buffer.writeUInt8(TYPE_STRING, 0);
    buffer.writeUInt16LE(length, 1);
    stringBuffer.copy(buffer, 3);
    return buffer;
  }

  throw new TypeError(`Unsupported type: ${typeof value}`);
}

/**
 * Deserialize a single value from binary format
 *
 * Approach:
 * - Read type tag to determine data type
 * - Read value based on type
 * - Return both value and bytes consumed (for parsing arrays/objects)
 *
 * @param {Buffer} buffer - Binary data
 * @param {number} offset - Starting offset
 * @returns {Object} { value, bytesRead }
 */
function deserializeValue(buffer, offset = 0) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer');
  }

  if (offset >= buffer.length) {
    throw new RangeError('Offset out of bounds');
  }

  // Read type tag
  const type = buffer.readUInt8(offset);
  let bytesRead = 1;

  switch (type) {
    case TYPE_NULL:
      // null: no additional data
      return { value: null, bytesRead };

    case TYPE_BOOLEAN:
      // boolean: 1 byte (0 or 1)
      if (offset + 1 >= buffer.length) {
        throw new Error('Buffer too small for boolean');
      }
      const boolValue = buffer.readUInt8(offset + 1) !== 0;
      return { value: boolValue, bytesRead: 2 };

    case TYPE_NUMBER:
      // number: 8 bytes (double)
      if (offset + 8 >= buffer.length) {
        throw new Error('Buffer too small for number');
      }
      const numValue = buffer.readDoubleLE(offset + 1);
      return { value: numValue, bytesRead: 9 };

    case TYPE_STRING:
      // string: 2 bytes length + UTF-8 bytes
      if (offset + 2 >= buffer.length) {
        throw new Error('Buffer too small for string length');
      }
      const length = buffer.readUInt16LE(offset + 1);
      if (offset + 3 + length > buffer.length) {
        throw new Error('Buffer too small for string data');
      }
      const strValue = buffer.toString('utf8', offset + 3, offset + 3 + length);
      return { value: strValue, bytesRead: 3 + length };

    default:
      throw new Error(`Unknown type tag: 0x${type.toString(16)}`);
  }
}

// Test Task 1
try {
  const tests = [null, true, false, 42, 3.14159, 'Hello'];

  tests.forEach(val => {
    const serialized = serializeValue(val);
    const { value, bytesRead } = deserializeValue(serialized, 0);
    console.log(`${JSON.stringify(val)} → ${serialized.length} bytes → ${JSON.stringify(value)}`);
  });

  console.log('✓ Task 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 2: Serialize arrays
console.log('Task 2: Serialize Arrays');
/**
 * Serialize an array to binary format
 * Format:
 * - Type tag: 0x04
 * - Element count: 4 bytes (LE)
 * - Elements: serialized one after another
 *
 * Approach:
 * - Write type tag and count
 * - Serialize each element using serializeValue
 * - Concatenate all buffers
 *
 * @param {Array} array - Array to serialize
 * @returns {Buffer} Serialized binary data
 */
function serializeArray(array) {
  // Validate input
  if (!Array.isArray(array)) {
    throw new TypeError('Input must be an array');
  }

  // Serialize all elements
  const elementBuffers = array.map(element => serializeValue(element));

  // Calculate total size
  const totalSize = 5 + elementBuffers.reduce((sum, buf) => sum + buf.length, 0);

  // Create buffer
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;

  // Write type tag
  buffer.writeUInt8(TYPE_ARRAY, offset);
  offset += 1;

  // Write element count
  buffer.writeUInt32LE(array.length, offset);
  offset += 4;

  // Write elements
  for (const elementBuffer of elementBuffers) {
    elementBuffer.copy(buffer, offset);
    offset += elementBuffer.length;
  }

  return buffer;
}

/**
 * Deserialize an array from binary format
 *
 * Approach:
 * - Read type tag and count
 * - Deserialize each element
 * - Track offset as we read
 */
function deserializeArray(buffer, offset = 0) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer');
  }

  // Read type tag
  const type = buffer.readUInt8(offset);
  if (type !== TYPE_ARRAY) {
    throw new Error(`Expected array type tag, got 0x${type.toString(16)}`);
  }
  offset += 1;

  // Read element count
  const count = buffer.readUInt32LE(offset);
  offset += 4;

  // Deserialize elements
  const array = [];
  for (let i = 0; i < count; i++) {
    const { value, bytesRead } = deserializeValue(buffer, offset);
    array.push(value);
    offset += bytesRead;
  }

  const totalBytesRead = offset - (arguments[1] || 0);
  return { value: array, bytesRead: totalBytesRead };
}

// Test Task 2
try {
  const testArrays = [
    [1, 2, 3],
    ['a', 'b', 'c'],
    [true, false, null],
    [1, 'mixed', true, null]
  ];

  testArrays.forEach(arr => {
    const serialized = serializeArray(arr);
    const { value, bytesRead } = deserializeArray(serialized, 0);
    console.log(`${JSON.stringify(arr)} → ${serialized.length} bytes`);
    console.log(`  Restored: ${JSON.stringify(value)}`);
  });

  console.log('✓ Task 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 3: Serialize objects
console.log('Task 3: Serialize Objects');
/**
 * Serialize an object to binary format
 * Format:
 * - Type tag: 0x05
 * - Property count: 2 bytes (LE)
 * - For each property:
 *   - Key length: 1 byte
 *   - Key: UTF-8 string
 *   - Value: serialized value
 *
 * Approach:
 * - Write type tag and property count
 * - For each property, write key then value
 * - Use serializeValue for property values
 *
 * @param {Object} obj - Object to serialize
 * @returns {Buffer} Serialized binary data
 */
function serializeObject(obj) {
  // Validate input
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new TypeError('Input must be a plain object');
  }

  // Get own properties
  const keys = Object.keys(obj);

  // Serialize each property
  const propertyBuffers = [];
  for (const key of keys) {
    if (key.length > 255) {
      throw new Error('Property key too long (max 255 bytes)');
    }

    const keyBuffer = Buffer.from(key, 'utf8');
    const valueBuffer = serializeValue(obj[key]);

    // Property format: key length (1) + key bytes + value bytes
    const propBuffer = Buffer.alloc(1 + keyBuffer.length + valueBuffer.length);
    let offset = 0;

    propBuffer.writeUInt8(keyBuffer.length, offset);
    offset += 1;

    keyBuffer.copy(propBuffer, offset);
    offset += keyBuffer.length;

    valueBuffer.copy(propBuffer, offset);

    propertyBuffers.push(propBuffer);
  }

  // Calculate total size
  const totalSize = 3 + propertyBuffers.reduce((sum, buf) => sum + buf.length, 0);

  // Create buffer
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;

  // Write type tag
  buffer.writeUInt8(TYPE_OBJECT, offset);
  offset += 1;

  // Write property count
  buffer.writeUInt16LE(keys.length, offset);
  offset += 2;

  // Write properties
  for (const propBuffer of propertyBuffers) {
    propBuffer.copy(buffer, offset);
    offset += propBuffer.length;
  }

  return buffer;
}

/**
 * Deserialize an object from binary format
 *
 * Approach:
 * - Read type tag and property count
 * - For each property, read key and value
 * - Build object from key-value pairs
 */
function deserializeObject(buffer, offset = 0) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer');
  }

  const startOffset = offset;

  // Read type tag
  const type = buffer.readUInt8(offset);
  if (type !== TYPE_OBJECT) {
    throw new Error(`Expected object type tag, got 0x${type.toString(16)}`);
  }
  offset += 1;

  // Read property count
  const count = buffer.readUInt16LE(offset);
  offset += 2;

  // Deserialize properties
  const obj = {};
  for (let i = 0; i < count; i++) {
    // Read key length
    const keyLength = buffer.readUInt8(offset);
    offset += 1;

    // Read key
    const key = buffer.toString('utf8', offset, offset + keyLength);
    offset += keyLength;

    // Read value
    const { value, bytesRead } = deserializeValue(buffer, offset);
    obj[key] = value;
    offset += bytesRead;
  }

  const totalBytesRead = offset - startOffset;
  return { value: obj, bytesRead: totalBytesRead };
}

// Test Task 3
try {
  const testObjects = [
    { name: 'Alice', age: 30 },
    { active: true, score: 95.5, role: null },
    { nested: { a: 1, b: 2 } }
  ];

  testObjects.forEach(obj => {
    const serialized = serializeObject(obj);
    const { value, bytesRead } = deserializeObject(serialized, 0);
    console.log(`${JSON.stringify(obj)} → ${serialized.length} bytes`);
    console.log(`  Restored: ${JSON.stringify(value)}`);
  });

  console.log('✓ Task 3 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 4: Universal serializer
console.log('Task 4: Universal Serialize/Deserialize');
/**
 * Serialize any supported value type
 * Supports: null, boolean, number, string, array, object
 *
 * Approach:
 * - Determine type of input
 * - Call appropriate serializer
 * - Handle recursive structures (nested objects/arrays)
 *
 * @param {any} data - Data to serialize
 * @returns {Buffer} Serialized binary data
 */
function serialize(data) {
  // Handle null
  if (data === null) {
    return serializeValue(data);
  }

  // Handle primitives
  if (typeof data === 'boolean' || typeof data === 'number' || typeof data === 'string') {
    return serializeValue(data);
  }

  // Handle arrays (must check before object since arrays are objects)
  if (Array.isArray(data)) {
    return serializeArray(data);
  }

  // Handle objects
  if (typeof data === 'object') {
    return serializeObject(data);
  }

  throw new TypeError(`Unsupported type: ${typeof data}`);
}

/**
 * Deserialize any value
 *
 * Approach:
 * - Read type tag
 * - Call appropriate deserializer
 * - Return the value (not the bytesRead object)
 *
 * @param {Buffer} buffer - Binary data
 * @returns {any} Deserialized value
 */
function deserialize(buffer) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer');
  }

  if (buffer.length === 0) {
    throw new Error('Buffer is empty');
  }

  // Read type tag to determine how to deserialize
  const type = buffer.readUInt8(0);

  switch (type) {
    case TYPE_NULL:
    case TYPE_BOOLEAN:
    case TYPE_NUMBER:
    case TYPE_STRING:
      return deserializeValue(buffer, 0).value;

    case TYPE_ARRAY:
      return deserializeArray(buffer, 0).value;

    case TYPE_OBJECT:
      return deserializeObject(buffer, 0).value;

    default:
      throw new Error(`Unknown type tag: 0x${type.toString(16)}`);
  }
}

// Test Task 4
try {
  const complexData = {
    name: 'Test',
    values: [1, 2, 3],
    metadata: {
      created: 123456789,
      active: true
    },
    tags: ['a', 'b', 'c']
  };

  const serialized = serialize(complexData);
  const deserialized = deserialize(serialized);

  console.log('Original:', JSON.stringify(complexData));
  console.log('Serialized:', serialized.length, 'bytes');
  console.log('Deserialized:', JSON.stringify(deserialized));
  console.log('Match:', JSON.stringify(complexData) === JSON.stringify(deserialized));

  console.log('✓ Task 4 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Task 5: Size comparison
console.log('Task 5: Compare Binary vs JSON Size');
/**
 * Compare serialization sizes
 *
 * Approach:
 * - Serialize to JSON and measure size
 * - Serialize to binary and measure size
 * - Calculate savings percentage
 *
 * @param {any} data - Data to compare
 * @returns {Object} { jsonSize, binarySize, savings }
 */
function compareSerializationSize(data) {
  // Serialize to JSON
  const jsonString = JSON.stringify(data);
  const jsonSize = Buffer.byteLength(jsonString, 'utf8');

  // Serialize to binary
  const binaryBuffer = serialize(data);
  const binarySize = binaryBuffer.length;

  // Calculate savings
  const savings = ((jsonSize - binarySize) / jsonSize * 100).toFixed(1);

  return {
    jsonSize,
    binarySize,
    savings: parseFloat(savings)
  };
}

// Test Task 5
try {
  const testData = [
    { id: 1, name: 'Alice', score: 95.5 },
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    { active: true, count: 42, label: 'test' }
  ];

  testData.forEach(data => {
    const comparison = compareSerializationSize(data);
    console.log('Data:', JSON.stringify(data).substring(0, 40) + '...');
    console.log(`  JSON: ${comparison.jsonSize} bytes`);
    console.log(`  Binary: ${comparison.binarySize} bytes`);
    console.log(`  Savings: ${comparison.savings}%`);
  });

  console.log('✓ Task 5 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 1: Variable-length integer encoding
console.log('Bonus Challenge 1: Variable-Length Integer (Varint)');
/**
 * Encode integer using variable-length encoding
 * Uses fewer bytes for smaller numbers
 *
 * Approach:
 * - Use 7 bits per byte for value, 1 bit for continuation
 * - MSB (bit 7) = 1 means more bytes follow
 * - MSB (bit 7) = 0 means this is the last byte
 *
 * @param {number} value - Unsigned integer to encode
 * @returns {Buffer} Encoded bytes
 */
function encodeVarint(value) {
  // Validate input
  if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
    throw new TypeError('Value must be a non-negative integer');
  }

  const bytes = [];

  // Encode 7 bits at a time
  while (value > 0x7F) {
    // Write low 7 bits with continuation bit (0x80)
    bytes.push((value & 0x7F) | 0x80);
    value >>>= 7; // Unsigned right shift by 7 bits
  }

  // Write final byte (no continuation bit)
  bytes.push(value & 0x7F);

  return Buffer.from(bytes);
}

/**
 * Decode variable-length integer
 *
 * Approach:
 * - Read bytes until we find one without continuation bit
 * - Combine 7-bit chunks into final value
 */
function decodeVarint(buffer, offset = 0) {
  // Validate input
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Buffer must be a Buffer');
  }

  let value = 0;
  let shift = 0;
  let bytesRead = 0;

  while (offset + bytesRead < buffer.length) {
    const byte = buffer.readUInt8(offset + bytesRead);
    bytesRead++;

    // Add low 7 bits to value
    value |= (byte & 0x7F) << shift;
    shift += 7;

    // Check continuation bit
    if ((byte & 0x80) === 0) {
      // No continuation bit, we're done
      return { value, bytesRead };
    }
  }

  throw new Error('Buffer ended before varint was complete');
}

// Test Bonus 1
try {
  const testInts = [0, 127, 128, 255, 256, 16383, 16384, 1000000];

  testInts.forEach(num => {
    const encoded = encodeVarint(num);
    const { value, bytesRead } = decodeVarint(encoded, 0);
    console.log(`${num} → ${encoded.length} byte(s) → ${value}`);
  });

  console.log('✓ Bonus 1 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

// Bonus Challenge 2: Schema-based serializer
console.log('Bonus Challenge 2: Schema-Based Serializer');
/**
 * Serialize data according to a schema for smaller size
 * Schema defines field order and types
 *
 * Advantage: No need to store field names, just values
 */
class SchemaSerializer {
  constructor(schema) {
    // Schema format: { field1: 'type', field2: 'type', ... }
    // Types: 'uint8', 'uint16', 'uint32', 'int32', 'float', 'string'
    if (typeof schema !== 'object' || schema === null) {
      throw new TypeError('Schema must be an object');
    }
    this.schema = schema;
    this.fields = Object.keys(schema);
  }

  serialize(obj) {
    // Validate input
    if (typeof obj !== 'object' || obj === null) {
      throw new TypeError('Input must be an object');
    }

    const buffers = [];

    // Serialize each field according to schema
    for (const field of this.fields) {
      const type = this.schema[field];
      const value = obj[field];

      if (value === undefined) {
        throw new Error(`Missing field: ${field}`);
      }

      let buffer;

      switch (type) {
        case 'uint8':
          buffer = Buffer.alloc(1);
          buffer.writeUInt8(value, 0);
          break;

        case 'uint16':
          buffer = Buffer.alloc(2);
          buffer.writeUInt16LE(value, 0);
          break;

        case 'uint32':
          buffer = Buffer.alloc(4);
          buffer.writeUInt32LE(value, 0);
          break;

        case 'int32':
          buffer = Buffer.alloc(4);
          buffer.writeInt32LE(value, 0);
          break;

        case 'float':
          buffer = Buffer.alloc(4);
          buffer.writeFloatLE(value, 0);
          break;

        case 'string':
          const strBuf = Buffer.from(value, 'utf8');
          buffer = Buffer.alloc(2 + strBuf.length);
          buffer.writeUInt16LE(strBuf.length, 0);
          strBuf.copy(buffer, 2);
          break;

        default:
          throw new Error(`Unknown type: ${type}`);
      }

      buffers.push(buffer);
    }

    return Buffer.concat(buffers);
  }

  deserialize(buffer) {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Buffer must be a Buffer');
    }

    const obj = {};
    let offset = 0;

    // Deserialize each field according to schema
    for (const field of this.fields) {
      const type = this.schema[field];

      switch (type) {
        case 'uint8':
          obj[field] = buffer.readUInt8(offset);
          offset += 1;
          break;

        case 'uint16':
          obj[field] = buffer.readUInt16LE(offset);
          offset += 2;
          break;

        case 'uint32':
          obj[field] = buffer.readUInt32LE(offset);
          offset += 4;
          break;

        case 'int32':
          obj[field] = buffer.readInt32LE(offset);
          offset += 4;
          break;

        case 'float':
          obj[field] = buffer.readFloatLE(offset);
          offset += 4;
          break;

        case 'string':
          const length = buffer.readUInt16LE(offset);
          offset += 2;
          obj[field] = buffer.toString('utf8', offset, offset + length);
          offset += length;
          break;

        default:
          throw new Error(`Unknown type: ${type}`);
      }
    }

    return obj;
  }
}

// Test Bonus 2
try {
  const schema = {
    id: 'uint32',
    age: 'uint8',
    score: 'float',
    name: 'string'
  };

  const schemaSerializer = new SchemaSerializer(schema);

  const user = {
    id: 12345,
    age: 30,
    score: 95.5,
    name: 'Alice'
  };

  const schemaSerialized = schemaSerializer.serialize(user);
  const schemaDeserialized = schemaSerializer.deserialize(schemaSerialized);

  console.log('Schema serialized:', schemaSerialized.length, 'bytes');
  console.log('Regular serialized:', serialize(user).length, 'bytes');
  console.log('Savings:', serialize(user).length - schemaSerialized.length, 'bytes');
  console.log('Deserialized:', schemaDeserialized);

  console.log('✓ Bonus 2 complete\n');
} catch (err) {
  console.log('✗ Error:', err.message, '\n');
}

console.log('=== Exercise 4 Complete ===');

/**
 * KEY LEARNING POINTS:
 *
 * 1. Binary Serialization:
 *    - Type tags identify data types (1 byte overhead)
 *    - Length prefixes handle variable-size data
 *    - More compact than JSON for structured data
 *
 * 2. Type Tags:
 *    - Essential for deserializing unknown data
 *    - Trade-off: 1 byte overhead per value
 *    - Can be eliminated with schemas
 *
 * 3. Variable-Length Encoding:
 *    - Varint uses fewer bytes for small numbers
 *    - Protobuf and other protocols use this
 *    - Good for IDs, counters, indices
 *
 * 4. Schema-Based Encoding:
 *    - Most efficient: no field names, no type tags
 *    - Requires both sides know the schema
 *    - Used in Protobuf, Thrift, Avro
 *
 * 5. Trade-offs:
 *    - JSON: Human-readable, larger size
 *    - Binary: Compact, fast, not human-readable
 *    - Schema: Most compact, requires coordination
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Not validating buffer size before reading:
 *    buffer.readDoubleLE(offset) // May throw if too small!
 *
 * ❌ Forgetting to track offset when parsing:
 *    const val1 = buffer.readUInt32LE(0)
 *    const val2 = buffer.readUInt32LE(0) // Wrong offset!
 *
 * ❌ Using wrong byte order:
 *    buffer.writeUInt16BE(length, 0) // Inconsistent with LE elsewhere!
 *
 * ❌ Not handling nested structures:
 *    serialize(obj.nested) // Must recursively handle objects/arrays
 *
 * ❌ Buffer overflow with strings:
 *    const str = buffer.toString('utf8') // May read too much!
 *    // Should specify end: buffer.toString('utf8', start, end)
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Add support for Date, RegExp, Map, Set types
 * 2. Implement circular reference detection
 * 3. Add compression (zlib) for large payloads
 * 4. Create a Protocol Buffers-like system
 * 5. Implement versioned schemas for backwards compatibility
 * 6. Add optional fields and default values
 * 7. Benchmark against MessagePack, BSON, etc.
 */
