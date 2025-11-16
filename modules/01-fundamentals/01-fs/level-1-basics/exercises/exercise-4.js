/**
 * Exercise 4: Copy a File
 *
 * DIFFICULTY: ⭐⭐ Easy-Medium
 * TIME: 15-20 minutes
 *
 * OBJECTIVE:
 * Create a file copy utility that safely copies files from one location to another.
 *
 * REQUIREMENTS:
 * 1. Accept source and destination filenames as command-line arguments
 * 2. Validate that both arguments are provided
 * 3. Check if source file exists
 * 4. Check if destination already exists (warn user)
 * 5. Copy the file
 * 6. Verify the copy was successful
 * 7. Display a success message with file size
 *
 * BONUS CHALLENGES:
 * - Ask for confirmation before overwriting
 * - Create destination directory if it doesn't exist
 * - Show a progress indicator (for large files)
 * - Verify the copy by comparing file hashes
 *
 * HINTS:
 * - Use process.argv[2] for source, process.argv[3] for destination
 * - Use fs.copyFile() for copying
 * - Use fs.stat() to get file size
 * - Use fs.access() to check if files exist
 */

const fs = require('fs').promises;
const path = require('path');

// TODO: Implement the solution here

async function copyFile() {
  try {
    // Your code here
    // 1. Get source and destination from command-line arguments
    // 2. Validate arguments
    // 3. Check if source exists
    // 4. Check if destination exists (warn if overwriting)
    // 5. Perform the copy
    // 6. Verify the copy
    // 7. Display success message

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Don't forget to call your function!
// copyFile();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Create a test file:
 *    echo "Test content for copying" > source.txt
 *
 * 2. Test successful copy:
 *    node exercise-4.js source.txt destination.txt
 *
 *    Expected output:
 *    ✓ Source file found: source.txt
 *    ✓ Copying...
 *    ✓ Copy successful!
 *    Copied 25 bytes from source.txt to destination.txt
 *
 * 3. Test with missing source:
 *    node exercise-4.js missing.txt destination.txt
 *
 *    Expected output:
 *    ✗ Error: Source file not found: missing.txt
 *
 * 4. Test with existing destination:
 *    node exercise-4.js source.txt destination.txt
 *
 *    Expected output:
 *    ⚠ Warning: destination.txt already exists
 *    Overwriting...
 *    ✓ Copy successful!
 *
 * 5. Test without arguments:
 *    node exercise-4.js
 *
 *    Expected output:
 *    ✗ Usage: node exercise-4.js <source> <destination>
 */

/**
 * EXAMPLE OUTPUT (successful copy):
 * ═══════════════════════════════════════
 * File Copy Utility
 * ═══════════════════════════════════════
 *
 * Source: source.txt
 * Destination: destination.txt
 *
 * [1/3] Validating source file...
 * ✓ Source file exists (25 bytes)
 *
 * [2/3] Checking destination...
 * ⚠ Destination file already exists
 * Overwriting...
 *
 * [3/3] Copying file...
 * ✓ Copy completed successfully!
 *
 * Summary:
 * ─────────────────────────────────────
 * Copied: 25 bytes
 * From: source.txt
 * To: destination.txt
 * Time: 0.05s
 * ─────────────────────────────────────
 */

/**
 * BONUS IMPLEMENTATION IDEAS:
 *
 * 1. Confirmation Prompt:
 *    const readline = require('readline');
 *    const rl = readline.createInterface({...});
 *    const answer = await question('Overwrite? (y/n): ');
 *    if (answer !== 'y') { process.exit(0); }
 *
 * 2. Create Directory:
 *    const destDir = path.dirname(destination);
 *    await fs.mkdir(destDir, { recursive: true });
 *
 * 3. Verify Copy:
 *    const srcContent = await fs.readFile(source);
 *    const destContent = await fs.readFile(destination);
 *    if (!srcContent.equals(destContent)) {
 *      throw new Error('Copy verification failed');
 *    }
 *
 * 4. File Hash Comparison:
 *    const crypto = require('crypto');
 *    const hash1 = crypto.createHash('md5').update(content1).digest('hex');
 *    const hash2 = crypto.createHash('md5').update(content2).digest('hex');
 */

/**
 * ADVANCED FEATURES:
 *
 * 1. Support wildcards (copy *.txt)
 * 2. Support directory copying
 * 3. Preserve timestamps
 * 4. Add progress bar for large files
 * 5. Support resume on interruption
 * 6. Compression during copy
 */

/**
 * ERROR HANDLING CHECKLIST:
 *
 * ✓ No arguments provided
 * ✓ Source file doesn't exist
 * ✓ Source is a directory
 * ✓ Permission denied on source
 * ✓ Permission denied on destination
 * ✓ Not enough disk space
 * ✓ Destination is read-only
 * ✓ Invalid file path
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - How does fs.copyFile() work?
 * - What are the different copy modes?
 * - How can you verify a copy was successful?
 * - What errors can occur during copying?
 */
