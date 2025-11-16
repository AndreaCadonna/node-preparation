/**
 * Exercise 3: Check if File Exists Before Reading
 *
 * DIFFICULTY: ⭐⭐ Easy-Medium
 * TIME: 15-20 minutes
 *
 * OBJECTIVE:
 * Create a safe file reader that checks if a file exists before attempting to read it.
 *
 * REQUIREMENTS:
 * 1. Accept a filename as a command-line argument
 * 2. Check if the file exists
 * 3. If it exists, read and display its contents
 * 4. If it doesn't exist, offer to create it with sample content
 * 5. Handle all errors gracefully with user-friendly messages
 *
 * BONUS CHALLENGES:
 * - Also check if the path is a file (not a directory)
 * - Display file statistics (size, creation date)
 * - Support multiple file extensions
 * - Add color to the output (use chalk or colors package)
 *
 * HINTS:
 * - Use process.argv to get command-line arguments
 * - Use fs.access() to check if file exists
 * - Use fs.stat() to get file information
 * - Remember try-catch for error handling
 */

const fs = require('fs').promises;
const path = require('path');

// TODO: Implement the solution here

async function safeFileReader() {
  try {
    // Your code here
    // 1. Get filename from command-line arguments (process.argv[2])
    // 2. Validate that a filename was provided
    // 3. Check if file exists using fs.access()
    // 4. If exists, read and display
    // 5. If not, offer to create it
    // 6. Handle errors appropriately

  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Don't forget to call your function!
// safeFileReader();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Create a test file:
 *    echo "Hello World" > test.txt
 *
 * 2. Run with existing file:
 *    node exercise-3.js test.txt
 *
 *    Expected output:
 *    ✓ File exists: test.txt
 *    ─────────────────────────────────────
 *    Hello World
 *    ─────────────────────────────────────
 *
 * 3. Run with non-existent file:
 *    node exercise-3.js missing.txt
 *
 *    Expected output:
 *    ✗ File not found: missing.txt
 *    Would you like to create it? (This is optional)
 *
 * 4. Run without filename:
 *    node exercise-3.js
 *
 *    Expected output:
 *    ✗ Usage: node exercise-3.js <filename>
 *
 * 5. Run with directory:
 *    node exercise-3.js /tmp
 *
 *    Expected output:
 *    ✗ Error: Path is a directory, not a file
 */

/**
 * EXAMPLE OUTPUT (existing file):
 * ═══════════════════════════════════════
 * Safe File Reader
 * ═══════════════════════════════════════
 *
 * Checking: test.txt
 * ✓ File exists
 * ✓ File is readable
 * ✓ Type: file
 *
 * File Information:
 * ─────────────────────────────────────
 * Size: 142 bytes
 * Created: 2024-01-15T10:30:00.000Z
 * Modified: 2024-01-15T10:35:00.000Z
 *
 * File Contents:
 * ─────────────────────────────────────
 * Hello World
 * This is a test file.
 * ─────────────────────────────────────
 */

/**
 * EXAMPLE OUTPUT (missing file):
 * ═══════════════════════════════════════
 * Safe File Reader
 * ═══════════════════════════════════════
 *
 * Checking: missing.txt
 * ✗ File not found
 *
 * The file "missing.txt" does not exist.
 * Would you like to create it with sample content? (y/n)
 */

/**
 * BONUS IMPLEMENTATION IDEAS:
 *
 * 1. File Statistics:
 *    const stats = await fs.stat(filename);
 *    console.log(`Size: ${stats.size} bytes`);
 *    console.log(`Created: ${stats.birthtime}`);
 *    console.log(`Modified: ${stats.mtime}`);
 *
 * 2. Type Checking:
 *    if (stats.isDirectory()) {
 *      console.error('Path is a directory');
 *    }
 *
 * 3. Permission Checking:
 *    await fs.access(filename, fs.constants.R_OK); // Readable
 *    await fs.access(filename, fs.constants.W_OK); // Writable
 *
 * 4. Interactive Creation:
 *    Use readline to ask if user wants to create the file
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - What does process.argv contain?
 * - What's the difference between fs.access() and fs.stat()?
 * - How do you check if a path is a file vs directory?
 * - What error codes should you handle?
 */
