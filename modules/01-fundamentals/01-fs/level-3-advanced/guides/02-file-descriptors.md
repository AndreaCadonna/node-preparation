# File Descriptors Deep Dive

## Introduction

File descriptors provide low-level access to files, giving you precise control over file operations. This guide explains what file descriptors are, when to use them, and how to work with them safely.

## What Are File Descriptors?

A file descriptor (FD) is a numeric identifier that the operating system assigns to an open file. Think of it as a "handle" or "pointer" to a file.

```javascript
const fs = require('fs').promises;

// Open file and get descriptor
const fd = await fs.open('file.txt', 'r');
console.log(fd); // FileHandle object

// Use the descriptor
const buffer = Buffer.alloc(100);
await fd.read(buffer, 0, 100, 0);

// Always close!
await fd.close();
```

## Why Use File Descriptors?

**Use file descriptors when you need**:
1. Precise positioning (read/write at specific byte offsets)
2. Multiple operations on the same file
3. Low-level control (file locking, specific modes)
4. Performance optimization (reduce open/close overhead)

**Don't use file descriptors when**:
- Simple read/write operations suffice
- Working with entire file contents
- Streaming is more appropriate

## Opening Files

### Basic Open

```javascript
// Modes: 'r', 'r+', 'w', 'w+', 'a', 'a+'
const fd = await fs.open('file.txt', 'r');  // Read only
const fd2 = await fs.open('file.txt', 'w'); // Write (truncates)
const fd3 = await fs.open('file.txt', 'a'); // Append
```

### File Modes Explained

| Mode | Description | Creates if Missing | Truncates |
|------|-------------|-------------------|-----------|
| `r` | Read only | No | No |
| `r+` | Read/write | No | No |
| `w` | Write only | Yes | Yes |
| `w+` | Read/write | Yes | Yes |
| `a` | Append | Yes | No |
| `a+` | Read/append | Yes | No |

### Advanced Flags

```javascript
const fs = require('fs');

// Exclusive create (fails if exists)
const fd = await fs.promises.open('file.txt', 'wx');

// Synchronous writes (slower but safer)
const fd2 = await fs.promises.open('file.txt', 'w', fs.constants.O_SYNC);
```

## Reading with File Descriptors

### Read at Specific Position

```javascript
async function readAtPosition(filepath, position, length) {
  const fd = await fs.open(filepath, 'r');

  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await fd.read(buffer, 0, length, position);

    return buffer.slice(0, bytesRead);
  } finally {
    await fd.close();
  }
}

// Read 100 bytes starting at position 50
const data = await readAtPosition('file.txt', 50, 100);
console.log(data.toString());
```

### Read in Chunks

```javascript
async function readInChunks(filepath, chunkSize = 1024) {
  const fd = await fs.open(filepath, 'r');
  const chunks = [];

  try {
    let position = 0;
    let bytesRead = 0;

    do {
      const buffer = Buffer.alloc(chunkSize);
      const result = await fd.read(buffer, 0, chunkSize, position);
      bytesRead = result.bytesRead;

      if (bytesRead > 0) {
        chunks.push(buffer.slice(0, bytesRead));
        position += bytesRead;
      }
    } while (bytesRead > 0);

    return Buffer.concat(chunks);
  } finally {
    await fd.close();
  }
}
```

## Writing with File Descriptors

### Write at Specific Position

```javascript
async function writeAtPosition(filepath, data, position) {
  const fd = await fs.open(filepath, 'r+'); // Read/write, don't truncate

  try {
    const buffer = Buffer.from(data);
    await fd.write(buffer, 0, buffer.length, position);
  } finally {
    await fd.close();
  }
}

// Overwrite 5 bytes starting at position 10
await writeAtPosition('file.txt', 'HELLO', 10);
```

### Append Data

```javascript
async function appendData(filepath, data) {
  const fd = await fs.open(filepath, 'a');

  try {
    const buffer = Buffer.from(data);
    await fd.write(buffer);
  } finally {
    await fd.close();
  }
}

await appendData('log.txt', 'New log entry\n');
```

## Practical Patterns

### Pattern 1: Read File Header

```javascript
async function readFileHeader(filepath, headerSize = 512) {
  const fd = await fs.open(filepath, 'r');

  try {
    const buffer = Buffer.alloc(headerSize);
    await fd.read(buffer, 0, headerSize, 0);
    return buffer;
  } finally {
    await fd.close();
  }
}

// Read first 512 bytes (common for file format detection)
const header = await readFileHeader('unknown.bin', 512);
```

### Pattern 2: Random Access File

```javascript
class RandomAccessFile {
  constructor(filepath) {
    this.filepath = filepath;
    this.fd = null;
  }

  async open(mode = 'r+') {
    this.fd = await fs.open(this.filepath, mode);
  }

  async read(position, length) {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await this.fd.read(buffer, 0, length, position);
    return buffer.slice(0, bytesRead);
  }

  async write(position, data) {
    const buffer = Buffer.from(data);
    await this.fd.write(buffer, 0, buffer.length, position);
  }

  async close() {
    if (this.fd) {
      await this.fd.close();
      this.fd = null;
    }
  }
}

// Usage
const file = new RandomAccessFile('data.bin');
await file.open('r+');
await file.write(100, 'DATA');
const data = await file.read(100, 4);
await file.close();
```

### Pattern 3: Simple Key-Value Store

```javascript
class FileKVStore {
  constructor(filepath) {
    this.filepath = filepath;
    this.recordSize = 1024; // Fixed record size
  }

  async set(key, value) {
    const fd = await fs.open(this.filepath, 'r+');

    try {
      const position = this.recordSize * key;
      const buffer = Buffer.alloc(this.recordSize);
      buffer.write(value);

      await fd.write(buffer, 0, this.recordSize, position);
    } finally {
      await fd.close();
    }
  }

  async get(key) {
    const fd = await fs.open(this.filepath, 'r');

    try {
      const position = this.recordSize * key;
      const buffer = Buffer.alloc(this.recordSize);
      await fd.read(buffer, 0, this.recordSize, position);

      // Find null terminator
      const nullIndex = buffer.indexOf(0);
      return buffer.slice(0, nullIndex).toString();
    } finally {
      await fd.close();
    }
  }
}

// Usage
const kv = new FileKVStore('data.kv');
await kv.set(0, 'First value');
await kv.set(1, 'Second value');
const value = await kv.get(0); // 'First value'
```

## File Stats via Descriptor

```javascript
const fd = await fs.open('file.txt', 'r');
try {
  const stats = await fd.stat();
  console.log('Size:', stats.size);
  console.log('Modified:', stats.mtime);
} finally {
  await fd.close();
}
```

## Common Mistakes

### Mistake 1: Forgetting to Close

```javascript
// ❌ BAD: File descriptor leak
async function readFileBad(filepath) {
  const fd = await fs.open(filepath, 'r');
  return fd.readFile(); // If this throws, fd never closes!
}

// ✅ GOOD: Always use try/finally
async function readFileGood(filepath) {
  const fd = await fs.open(filepath, 'r');
  try {
    return await fd.readFile();
  } finally {
    await fd.close();
  }
}
```

### Mistake 2: Wrong Position Parameter

```javascript
// ❌ BAD: Null position means append
await fd.write(buffer, 0, buffer.length, null); // Appends!

// ✅ GOOD: Explicit position
await fd.write(buffer, 0, buffer.length, 0); // Writes at start
```

## Summary

### Key Takeaways

1. File descriptors provide **low-level file access**
2. Always close descriptors in **finally blocks**
3. Use descriptors for **precise positioning** and **multiple operations**
4. Prefer higher-level APIs for simple operations
5. File descriptor leaks cause **resource exhaustion**

### When to Use

- ✅ Random access to file contents
- ✅ Multiple operations on same file
- ✅ Precise read/write positioning
- ✅ Building file-based databases

### When NOT to Use

- ❌ Simple read/write entire file
- ❌ Streaming large files (use streams)
- ❌ One-time operations

## Next Guide

Continue to [Performance Optimization](./03-performance.md).
