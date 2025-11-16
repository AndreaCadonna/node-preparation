/**
 * Example 2: Reading a File with Promises (async/await)
 *
 * This example demonstrates the modern, recommended approach
 * to reading files using promises and async/await.
 *
 * Key Concepts:
 * - fs.promises API
 * - async/await syntax
 * - Try-catch error handling
 * - Cleaner, more readable code
 */

const fs = require('fs').promises;
const path = require('path');

// Create a sample file
const sampleFile = path.join(__dirname, 'sample-promises.txt');
const sampleContent = `Node.js File System with Promises
===================================
This is much cleaner than callbacks!
You can use async/await for readable code.
Error handling is done with try-catch.`;

async function demonstratePromises() {
  try {
    // Step 1: Create the sample file
    console.log('Creating sample file...');
    await fs.writeFile(sampleFile, sampleContent);
    console.log('✓ File created successfully\n');

    // Step 2: Read the file
    console.log('Reading file with promises...\n');
    const data = await fs.readFile(sampleFile, 'utf8');

    // Step 3: Display the contents
    console.log('File contents:');
    console.log('═'.repeat(50));
    console.log(data);
    console.log('═'.repeat(50));

    // Step 4: Get file statistics
    const stats = await fs.stat(sampleFile);
    console.log('\nFile Statistics:');
    console.log(`  Size: ${stats.size} bytes`);
    console.log(`  Created: ${stats.birthtime.toLocaleString()}`);
    console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
    console.log(`  Is File: ${stats.isFile()}`);
    console.log(`  Is Directory: ${stats.isDirectory()}`);

  } catch (err) {
    // Error handling with try-catch
    console.error('❌ Error:', err.message);

    // You can check error codes for specific handling
    if (err.code === 'ENOENT') {
      console.error('   The file does not exist.');
    } else if (err.code === 'EACCES') {
      console.error('   Permission denied.');
    }
  }
}

// Run the demonstration
demonstratePromises();

/**
 * Comparison: Callbacks vs Promises
 *
 * CALLBACKS (old way):
 * fs.readFile('file.txt', 'utf8', (err, data) => {
 *   if (err) throw err;
 *   fs.stat('file.txt', (err, stats) => {
 *     if (err) throw err;
 *     // More nested callbacks... (callback hell)
 *   });
 * });
 *
 * PROMISES (modern way):
 * try {
 *   const data = await fs.readFile('file.txt', 'utf8');
 *   const stats = await fs.stat('file.txt');
 *   // Sequential, readable code
 * } catch (err) {
 *   // Single error handler
 * }
 */

/**
 * Important Notes:
 *
 * 1. Async/Await:
 *    - Must use 'await' inside an 'async' function
 *    - 'await' pauses execution until promise resolves
 *    - Makes async code look synchronous
 *
 * 2. Error Handling:
 *    - Use try-catch instead of .catch()
 *    - Can handle all errors in one place
 *    - More intuitive than callback error handling
 *
 * 3. fs.promises vs fs:
 *    - fs.promises returns Promises
 *    - fs uses callbacks
 *    - Always prefer fs.promises for new code
 *
 * 4. Sequential vs Parallel:
 *    - await runs operations sequentially
 *    - Use Promise.all() for parallel operations
 */

/**
 * Try This:
 *
 * 1. Run this file: node 02-read-file-promises.js
 * 2. Compare with 01-read-file-callback.js
 * 3. Try reading a non-existent file (change filename)
 * 4. Add more file operations (rename, copy, etc.)
 * 5. Try parallel operations with Promise.all()
 */

/**
 * Bonus: Parallel Operations
 */
async function parallelOperations() {
  try {
    // Create multiple files in parallel
    const files = [
      fs.writeFile('file1.txt', 'Content 1'),
      fs.writeFile('file2.txt', 'Content 2'),
      fs.writeFile('file3.txt', 'Content 3')
    ];

    // Wait for all to complete
    await Promise.all(files);
    console.log('\n✓ All files created in parallel!');

    // Clean up
    await Promise.all([
      fs.unlink('file1.txt'),
      fs.unlink('file2.txt'),
      fs.unlink('file3.txt')
    ]);

  } catch (err) {
    console.error('Error in parallel operations:', err.message);
  }
}

// Uncomment to see parallel operations
// parallelOperations();
