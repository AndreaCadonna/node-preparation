/**
 * Example 1: Reading a File with Callbacks
 *
 * This example demonstrates the traditional callback-based approach
 * to reading files in Node.js.
 *
 * Key Concepts:
 * - Error-first callback pattern
 * - Asynchronous file reading
 * - UTF-8 encoding
 */

const fs = require('fs');
const path = require('path');

// Create a sample file to read
const sampleFile = path.join(__dirname, 'sample.txt');
const sampleContent = 'Hello from Node.js!\nThis is a sample file for learning purposes.';

// First, let's create the sample file
fs.writeFile(sampleFile, sampleContent, (err) => {
  if (err) {
    console.error('Error creating sample file:', err);
    return;
  }

  console.log('Sample file created successfully!\n');

  // Now read the file using callback
  console.log('Reading file with callback...\n');

  fs.readFile(sampleFile, 'utf8', (err, data) => {
    // Error-first callback: first parameter is always the error
    if (err) {
      console.error('Error reading file:', err.message);
      return;
    }

    // If no error, data contains the file contents
    console.log('File contents:');
    console.log('─'.repeat(50));
    console.log(data);
    console.log('─'.repeat(50));

    // Display file size
    fs.stat(sampleFile, (err, stats) => {
      if (err) {
        console.error('Error getting file stats:', err);
        return;
      }
      console.log(`\nFile size: ${stats.size} bytes`);
    });
  });
});

/**
 * Important Notes:
 *
 * 1. Callback Pattern:
 *    - First parameter is always error (null if no error)
 *    - Second parameter is the result
 *    - This is called "error-first callback pattern"
 *
 * 2. Encoding:
 *    - 'utf8' tells Node.js to return a string
 *    - Without encoding, returns a Buffer (binary data)
 *
 * 3. Callback Hell:
 *    - Notice the nested callbacks (writeFile -> readFile -> stat)
 *    - This is why promises/async-await are preferred
 *
 * 4. Error Handling:
 *    - Always check for errors first
 *    - Return early if error occurs
 *    - Provide meaningful error messages
 */

/**
 * Try This:
 *
 * 1. Run this file: node 01-read-file-callback.js
 * 2. Modify the sample content
 * 3. Try reading a non-existent file (change sampleFile path)
 * 4. Remove the 'utf8' encoding and see what happens
 * 5. Add more nested callbacks to see "callback hell"
 */
