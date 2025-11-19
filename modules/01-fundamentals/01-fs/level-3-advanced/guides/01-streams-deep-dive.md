# Streams Deep Dive

## Introduction

Streams are one of the most powerful features in Node.js for handling large amounts of data efficiently. Instead of loading entire files into memory, streams process data in chunks, enabling you to work with files larger than available RAM. This guide provides a comprehensive understanding of streams in the context of file operations.

## Part 1: Why Streams Matter

### The Memory Problem

```javascript
// ❌ BAD: Loading 10GB file into memory
const fs = require('fs').promises;
const data = await fs.readFile('10gb-file.log'); // Out of memory!
console.log(data.length);
```

**Problem**: Your application crashes because it tries to load 10GB into RAM.

```javascript
// ✅ GOOD: Streaming 10GB file
const fs = require('fs');
let totalBytes = 0;

const stream = fs.createReadStream('10gb-file.log');
stream.on('data', (chunk) => {
  totalBytes += chunk.length; // Process one chunk at a time
});
stream.on('end', () => {
  console.log(`Processed ${totalBytes} bytes`);
});
```

**Solution**: Process the file in small chunks (default 64KB), using minimal memory.

### Real-World Benefits

1. **Memory Efficiency**: Process files larger than RAM
2. **Time to First Byte**: Start processing immediately, don't wait for entire file
3. **Composition**: Chain operations together (read → transform → write)
4. **Backpressure**: Automatic flow control prevents overwhelming slower consumers

## Part 2: Types of Streams

### 1. Readable Streams (Reading Data)

```javascript
const fs = require('fs');

const readable = fs.createReadStream('input.txt', {
  encoding: 'utf8',
  highWaterMark: 64 * 1024 // 64KB chunks (default)
});

readable.on('data', (chunk) => {
  console.log(`Received ${chunk.length} bytes`);
});

readable.on('end', () => {
  console.log('Finished reading');
});

readable.on('error', (err) => {
  console.error('Error:', err);
});
```

**Key Events**:
- `data`: Emitted when chunk is available
- `end`: All data has been read
- `error`: Something went wrong
- `close`: Stream has been closed

### 2. Writable Streams (Writing Data)

```javascript
const writable = fs.createWriteStream('output.txt', {
  encoding: 'utf8'
});

writable.write('First line\n');
writable.write('Second line\n');
writable.end('Final line\n'); // Signals we're done writing

writable.on('finish', () => {
  console.log('All data written');
});

writable.on('error', (err) => {
  console.error('Error:', err);
});
```

**Key Methods**:
- `write(chunk)`: Write data (returns false if buffer is full)
- `end([chunk])`: Signal end of writing
- `destroy()`: Destroy the stream

**Key Events**:
- `drain`: Buffer has space again (important for backpressure)
- `finish`: All data has been written
- `error`: Something went wrong

### 3. Duplex Streams (Both Read and Write)

Not commonly used with file operations, but important to know:
- Network sockets are duplex streams
- Can read from and write to the same stream

### 4. Transform Streams (Modify Data)

```javascript
const { Transform } = require('stream');

// Custom transform: convert to uppercase
const uppercase = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

// Usage: read → transform → write
fs.createReadStream('input.txt')
  .pipe(uppercase)
  .pipe(fs.createWriteStream('output.txt'));
```

## Part 3: Reading Files with Streams

### Basic Read Stream

```javascript
const fs = require('fs');

function readFileStream(filepath) {
  return new Promise((resolve, reject) => {
    let data = '';

    const stream = fs.createReadStream(filepath, {
      encoding: 'utf8',
      highWaterMark: 16 * 1024 // 16KB chunks
    });

    stream.on('data', (chunk) => {
      data += chunk;
    });

    stream.on('end', () => {
      resolve(data);
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

// Usage
const content = await readFileStream('file.txt');
```

### Reading Line by Line

```javascript
const fs = require('fs');
const readline = require('readline');

async function processLineByLine(filepath, processLine) {
  const fileStream = fs.createReadStream(filepath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity // Recognize all CR LF instances as line breaks
  });

  for await (const line of rl) {
    await processLine(line);
  }
}

// Usage: count lines
let lineCount = 0;
await processLineByLine('large-file.txt', async (line) => {
  lineCount++;
  if (lineCount % 10000 === 0) {
    console.log(`Processed ${lineCount} lines...`);
  }
});
console.log(`Total lines: ${lineCount}`);
```

### Read with Custom Chunk Size

```javascript
const stream = fs.createReadStream('file.txt', {
  highWaterMark: 1 * 1024 * 1024 // 1MB chunks for large files
});
```

**When to use larger chunks**:
- Very large files (multi-GB)
- Fast disks (SSD)
- Simple processing (no transformation)

**When to use smaller chunks**:
- Memory-constrained environments
- Complex processing per chunk
- Need quick responsiveness

## Part 4: Writing Files with Streams

### Basic Write Stream

```javascript
async function writeFileStream(filepath, data) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filepath);

    stream.write(data, (err) => {
      if (err) reject(err);
    });

    stream.end();

    stream.on('finish', () => {
      resolve();
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

await writeFileStream('output.txt', 'Hello, streams!');
```

### Writing in Chunks

```javascript
async function writeDataInChunks(filepath, dataArray) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filepath);

    let index = 0;

    function writeNext() {
      let canContinue = true;

      while (index < dataArray.length && canContinue) {
        const data = dataArray[index];
        index++;

        if (index === dataArray.length) {
          // Last chunk
          stream.write(data, () => {
            stream.end();
          });
        } else {
          // More chunks to write
          canContinue = stream.write(data);
        }
      }

      if (index < dataArray.length) {
        // Buffer is full, wait for drain
        stream.once('drain', writeNext);
      }
    }

    writeNext();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
```

## Part 5: Backpressure - The Critical Concept

### What is Backpressure?

Backpressure occurs when data is produced faster than it can be consumed. Without handling backpressure, your application's memory usage will grow unbounded.

**The Problem**:
```javascript
// ❌ DANGEROUS: No backpressure handling
const reader = fs.createReadStream('huge-file.txt');
const writer = fs.createWriteStream('copy.txt');

reader.on('data', (chunk) => {
  writer.write(chunk); // What if writer can't keep up?
});
```

**Memory usage grows** because chunks pile up in the writable stream's internal buffer.

### Solution 1: Use pipe() (Easiest)

```javascript
// ✅ BEST: pipe() handles backpressure automatically
fs.createReadStream('huge-file.txt')
  .pipe(fs.createWriteStream('copy.txt'));
```

**Why pipe() is great**:
- Automatically pauses reading when writing is slow
- Automatically resumes when writing catches up
- Handles errors properly
- Clean, simple code

### Solution 2: Manual Backpressure Handling

```javascript
// ✅ GOOD: Manual backpressure (educational purposes)
const reader = fs.createReadStream('huge-file.txt');
const writer = fs.createWriteStream('copy.txt');

reader.on('data', (chunk) => {
  const canContinue = writer.write(chunk);

  if (!canContinue) {
    // Writer's buffer is full, pause reading
    console.log('Backpressure! Pausing reader...');
    reader.pause();
  }
});

writer.on('drain', () => {
  // Writer's buffer has space again, resume reading
  console.log('Drained! Resuming reader...');
  reader.resume();
});

reader.on('end', () => {
  writer.end();
});
```

### Visualizing Backpressure

```
Without Backpressure:
Reader: ████████████████ (fast)
Writer: ██ (slow)
Memory: ████████████████ (growing!)

With Backpressure:
Reader: ██⏸️ (paused)
Writer: ██ (catching up)
Memory: ██ (stable!)

After Drain:
Reader: ████▶️ (resumed)
Writer: ██ (ready)
Memory: ██ (stable!)
```

## Part 6: Piping and Composition

### Basic Piping

```javascript
// Copy file
fs.createReadStream('source.txt')
  .pipe(fs.createWriteStream('destination.txt'));

// With error handling
const source = fs.createReadStream('source.txt');
const dest = fs.createWriteStream('destination.txt');

source.pipe(dest);

source.on('error', (err) => console.error('Read error:', err));
dest.on('error', (err) => console.error('Write error:', err));
dest.on('finish', () => console.log('Copy complete!'));
```

### Chaining Multiple Streams

```javascript
const { Transform } = require('stream');
const zlib = require('zlib');

// Create a custom transform
const lineCounter = new Transform({
  transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n').length - 1;
    console.log(`Chunk has ${lines} lines`);
    this.push(chunk);
    callback();
  }
});

// Chain: read → count lines → compress → write
fs.createReadStream('large-log.txt')
  .pipe(lineCounter)
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('large-log.txt.gz'));
```

### Pipeline (Modern Approach)

```javascript
const { pipeline } = require('stream').promises;
const zlib = require('zlib');

async function compressFile(input, output) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGzip(),
    fs.createWriteStream(output)
  );
}

try {
  await compressFile('input.txt', 'input.txt.gz');
  console.log('Compression complete!');
} catch (err) {
  console.error('Pipeline failed:', err);
}
```

**Benefits of pipeline()**:
- Automatic error handling
- Proper cleanup on errors
- Returns a promise
- Cleaner than manual piping

## Part 7: Custom Transform Streams

### Simple Transform: Uppercase

```javascript
const { Transform } = require('stream');

class UppercaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
}

// Usage
fs.createReadStream('input.txt')
  .pipe(new UppercaseTransform())
  .pipe(fs.createWriteStream('output.txt'));
```

### CSV to JSON Transform

```javascript
class CSVToJSON extends Transform {
  constructor(options) {
    super(options);
    this.headers = null;
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');

    // Keep last incomplete line in buffer
    this.buffer = lines.pop();

    for (const line of lines) {
      if (!this.headers) {
        this.headers = line.split(',');
      } else {
        const values = line.split(',');
        const obj = {};

        this.headers.forEach((header, i) => {
          obj[header] = values[i];
        });

        this.push(JSON.stringify(obj) + '\n');
      }
    }

    callback();
  }

  _flush(callback) {
    // Process any remaining data
    if (this.buffer && this.headers) {
      const values = this.buffer.split(',');
      const obj = {};

      this.headers.forEach((header, i) => {
        obj[header] = values[i];
      });

      this.push(JSON.stringify(obj) + '\n');
    }

    callback();
  }
}

// Usage
fs.createReadStream('data.csv')
  .pipe(new CSVToJSON())
  .pipe(fs.createWriteStream('data.jsonl'));
```

## Part 8: Practical Patterns

### Pattern 1: Process Large Log File

```javascript
async function analyzeLogs(filepath) {
  const stats = {
    totalLines: 0,
    errors: 0,
    warnings: 0
  };

  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    stats.totalLines++;

    if (line.includes('ERROR')) stats.errors++;
    if (line.includes('WARN')) stats.warnings++;

    if (stats.totalLines % 100000 === 0) {
      console.log(`Processed ${stats.totalLines} lines...`);
    }
  }

  return stats;
}

const stats = await analyzeLogs('app.log');
console.log('Log analysis:', stats);
```

### Pattern 2: Split Large File

```javascript
async function splitFile(inputPath, linesPerFile = 10000) {
  const fileStream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentFile = 1;
  let currentLines = 0;
  let currentWriter = fs.createWriteStream(`output-${currentFile}.txt`);

  for await (const line of rl) {
    currentWriter.write(line + '\n');
    currentLines++;

    if (currentLines >= linesPerFile) {
      currentWriter.end();
      currentFile++;
      currentLines = 0;
      currentWriter = fs.createWriteStream(`output-${currentFile}.txt`);
    }
  }

  currentWriter.end();
  console.log(`Split into ${currentFile} files`);
}

await splitFile('huge-log.txt', 10000);
```

### Pattern 3: Merge Multiple Files

```javascript
async function mergeFiles(inputPaths, outputPath) {
  const output = fs.createWriteStream(outputPath);

  for (const inputPath of inputPaths) {
    await new Promise((resolve, reject) => {
      const input = fs.createReadStream(inputPath);

      input.pipe(output, { end: false }); // Don't end output stream

      input.on('end', resolve);
      input.on('error', reject);
    });
  }

  output.end();
}

await mergeFiles(
  ['file1.txt', 'file2.txt', 'file3.txt'],
  'merged.txt'
);
```

## Part 9: Performance Considerations

### Stream Options

```javascript
const stream = fs.createReadStream('file.txt', {
  // Encoding
  encoding: 'utf8', // or null for Buffer

  // Buffer size
  highWaterMark: 64 * 1024, // 64KB default

  // Start/end positions
  start: 0,
  end: 1000, // Read only first 1000 bytes

  // File descriptor (advanced)
  fd: null,
  autoClose: true
});
```

### Choosing the Right Chunk Size

```javascript
// Small files (<1MB): Use readFile
if (fileSize < 1024 * 1024) {
  return fs.promises.readFile(filepath);
}

// Medium files (1-100MB): Default chunks
const stream = fs.createReadStream(filepath);

// Large files (>100MB): Larger chunks
const stream = fs.createReadStream(filepath, {
  highWaterMark: 1024 * 1024 // 1MB chunks
});
```

## Summary

### Key Takeaways

1. **Use streams for files > 1MB** to avoid memory issues
2. **Always handle backpressure** - use `pipe()` or manual handling
3. **Use `pipeline()` for better error handling** than manual piping
4. **Process line-by-line** for text files with `readline`
5. **Transform streams** enable data processing in flight
6. **Monitor memory usage** when working with streams

### Quick Reference

```javascript
// Read stream
fs.createReadStream('file.txt')
  .on('data', chunk => process(chunk))
  .on('end', () => console.log('Done'))
  .on('error', err => console.error(err));

// Write stream
const writer = fs.createWriteStream('file.txt');
writer.write('data');
writer.end();

// Pipe (handles backpressure automatically)
fs.createReadStream('in.txt')
  .pipe(fs.createWriteStream('out.txt'));

// Pipeline (modern, with promises)
await pipeline(
  fs.createReadStream('in.txt'),
  transformStream,
  fs.createWriteStream('out.txt')
);
```

## Next Guide

Continue to [File Descriptors](./02-file-descriptors.md) to learn low-level file operations.
