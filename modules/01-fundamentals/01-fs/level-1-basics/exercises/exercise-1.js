/**
 * Exercise 1: Read and Display File Contents
 *
 * DIFFICULTY: ⭐ Easy
 * TIME: 10-15 minutes
 *
 * OBJECTIVE:
 * Create a program that reads a text file and displays its contents to the console.
 *
 * REQUIREMENTS:
 * 1. Use the fs.promises API (async/await)
 * 2. Read the file 'data.txt' from the same directory
 * 3. Display the contents to the console
 * 4. Handle errors properly (file not found, permission denied, etc.)
 * 5. Display a user-friendly error message if something goes wrong
 *
 * BONUS CHALLENGES:
 * - Display the number of characters in the file
 * - Display the number of words in the file
 * - Display the number of lines in the file
 *
 * HINTS:
 * - Use require('fs').promises for the promises API
 * - Use try-catch for error handling
 * - String methods like .split() can help count words and lines
 */

const fs = require('fs').promises;
const path = require('path');

// TODO: Implement the solution here

async function readAndDisplayFile() {
  // Your code here
  // 1. Define the file path using path.join()
  // 2. Read the file using fs.readFile()
  // 3. Display the contents
  // 4. Handle errors with try-catch
}

// Don't forget to call your function!
// readAndDisplayFile();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. First, create a test file:
 *    Create a file named 'data.txt' in this directory with some text
 *
 * 2. Run your solution:
 *    node exercise-1.js
 *
 * 3. Expected output:
 *    The contents of data.txt should be displayed
 *
 * 4. Test error handling:
 *    - Rename data.txt temporarily and run again
 *    - You should see a user-friendly error message
 *
 * EXAMPLE OUTPUT:
 * ─────────────────────────────────────
 * File contents:
 * Hello, this is a test file!
 * It has multiple lines.
 * Node.js is awesome!
 * ─────────────────────────────────────
 * Characters: 67
 * Words: 13
 * Lines: 3
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - What does async/await do?
 * - Why is try-catch important?
 * - What happens without 'utf8' encoding?
 */
