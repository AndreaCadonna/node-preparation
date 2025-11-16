/**
 * Exercise 1 Solution: Read and Display File Contents
 *
 * This solution demonstrates:
 * - Using fs.promises with async/await
 * - Proper error handling with try-catch
 * - User-friendly error messages
 * - Bonus features (counting characters, words, lines)
 */

const fs = require('fs').promises;
const path = require('path');

async function readAndDisplayFile() {
  try {
    // 1. Define the file path
    // Using path.join ensures cross-platform compatibility
    const filePath = path.join(__dirname, '..', 'exercises', 'data.txt');

    // 2. Read the file
    // 'utf8' encoding returns a string instead of a Buffer
    const content = await fs.readFile(filePath, 'utf8');

    // 3. Display the contents
    console.log('─'.repeat(50));
    console.log('File contents:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));

    // BONUS: Calculate statistics
    const characters = content.length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const lines = content.split('\n').length;

    console.log('\nFile Statistics:');
    console.log(`Characters: ${characters}`);
    console.log(`Words: ${words}`);
    console.log(`Lines: ${lines}`);

  } catch (err) {
    // 4. Handle errors with user-friendly messages
    if (err.code === 'ENOENT') {
      console.error('❌ Error: File not found!');
      console.error('   Make sure "data.txt" exists in the exercises directory.');
    } else if (err.code === 'EACCES') {
      console.error('❌ Error: Permission denied!');
      console.error('   You don\'t have permission to read this file.');
    } else {
      console.error('❌ Error reading file:', err.message);
    }

    // In a real application, you might want to exit with error code
    // process.exit(1);
  }
}

// Call the function
readAndDisplayFile();

/**
 * ALTERNATIVE SOLUTION: More compact version
 */

async function readAndDisplayFileCompact() {
  try {
    const content = await fs.readFile(
      path.join(__dirname, '..', 'exercises', 'data.txt'),
      'utf8'
    );

    console.log(content);
    console.log(`\nStats: ${content.length} chars, ${content.split(/\s+/).filter(Boolean).length} words`);

  } catch (err) {
    console.error(err.code === 'ENOENT'
      ? '❌ File not found'
      : `❌ Error: ${err.message}`
    );
  }
}

/**
 * KEY LEARNING POINTS:
 *
 * 1. Async/Await:
 *    - Makes asynchronous code look synchronous
 *    - Easier to read than callbacks
 *    - Must be used inside an async function
 *
 * 2. Error Handling:
 *    - Always use try-catch with async/await
 *    - Check err.code for specific error types
 *    - Provide helpful error messages to users
 *
 * 3. Path Handling:
 *    - Use path.join() for cross-platform paths
 *    - __dirname gives current directory
 *    - '..' goes up one directory
 *
 * 4. Encoding:
 *    - 'utf8' returns a string
 *    - Without encoding, returns a Buffer
 *    - Use Buffer for binary files (images, videos)
 *
 * 5. String Methods:
 *    - .split() divides string into array
 *    - /\s+/ is a regex for whitespace
 *    - .filter(Boolean) removes empty strings
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Forgetting async keyword:
 *    function readFile() {
 *      await fs.readFile(...) // Error! Can't use await
 *    }
 *
 * ❌ Not handling errors:
 *    async function readFile() {
 *      const data = await fs.readFile(...) // Will crash if error
 *    }
 *
 * ❌ Using hard-coded paths:
 *    const data = await fs.readFile('C:\\Users\\...') // Won't work on Mac/Linux
 *
 * ❌ Using sync methods in production:
 *    const data = fs.readFileSync(...) // Blocks the event loop!
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Accept filename as command-line argument
 * 2. Read multiple files and display all contents
 * 3. Add option to display only first N lines
 * 4. Add option to search for specific text in file
 * 5. Create a simple 'cat' command clone
 */
