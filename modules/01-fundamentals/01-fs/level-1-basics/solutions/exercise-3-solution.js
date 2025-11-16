/**
 * Exercise 3 Solution: Check if File Exists Before Reading
 *
 * This solution demonstrates:
 * - Command-line argument handling
 * - File existence checking
 * - File type validation
 * - User-friendly error messages
 * - File statistics display
 */

const fs = require('fs').promises;
const path = require('path');

async function safeFileReader() {
  try {
    console.log('═'.repeat(50));
    console.log('Safe File Reader');
    console.log('═'.repeat(50));
    console.log();

    // 1. Get filename from command-line arguments
    const filename = process.argv[2];

    // 2. Validate that a filename was provided
    if (!filename) {
      console.error('✗ Usage: node exercise-3-solution.js <filename>');
      console.error('   Example: node exercise-3-solution.js test.txt');
      process.exit(1);
    }

    // Make path absolute for better error messages
    const filePath = path.resolve(filename);

    console.log(`Checking: ${path.basename(filePath)}`);
    console.log();

    // 3. Check if file exists
    try {
      await fs.access(filePath);
      console.log('✓ File exists');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error('✗ File not found:', path.basename(filePath));
        console.error();
        console.error(`The file "${path.basename(filePath)}" does not exist.`);
        console.error(`Full path: ${filePath}`);
        process.exit(1);
      }
      throw err; // Re-throw if it's not a "not found" error
    }

    // 4. Check if it's a file (not a directory)
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      console.error('✗ Error: Path is a directory, not a file');
      console.error(`   "${path.basename(filePath)}" is a directory.`);
      console.error('   Please specify a file to read.');
      process.exit(1);
    }

    console.log('✓ File is readable');
    console.log('✓ Type: file');
    console.log();

    // 5. Display file information
    console.log('File Information:');
    console.log('─'.repeat(50));
    console.log(`Size: ${stats.size.toLocaleString()} bytes`);
    console.log(`Created: ${stats.birthtime.toLocaleString()}`);
    console.log(`Modified: ${stats.mtime.toLocaleString()}`);
    console.log();

    // 6. Read and display the file
    const content = await fs.readFile(filePath, 'utf8');

    console.log('File Contents:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));

    // 7. Display content statistics
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const characters = content.length;

    console.log();
    console.log('Content Statistics:');
    console.log(`Lines: ${lines}`);
    console.log(`Words: ${words}`);
    console.log(`Characters: ${characters}`);

  } catch (err) {
    // Handle unexpected errors
    if (err.code === 'EACCES') {
      console.error('✗ Permission denied');
      console.error('   You do not have permission to read this file.');
    } else {
      console.error('✗ Error:', err.message);
    }
    process.exit(1);
  }
}

// Run the function
safeFileReader();

/**
 * ALTERNATIVE SOLUTION: With Interactive File Creation
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function safeFileReaderInteractive() {
  try {
    const filename = process.argv[2];

    if (!filename) {
      console.error('Usage: node exercise-3-solution.js <filename>');
      process.exit(1);
    }

    const filePath = path.resolve(filename);

    // Check if file exists
    try {
      await fs.access(filePath);

      // File exists, read it
      const content = await fs.readFile(filePath, 'utf8');
      console.log('\n✓ File exists and was read successfully\n');
      console.log('─'.repeat(50));
      console.log(content);
      console.log('─'.repeat(50));

    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, offer to create it
        console.log(`\n✗ File not found: ${path.basename(filePath)}`);
        console.log();

        const create = await question('Would you like to create it with sample content? (y/n): ');

        if (create.toLowerCase() === 'y') {
          const sampleContent = `This is a sample file created at ${new Date().toLocaleString()}

This file was created automatically because it didn't exist.
You can now modify this content as needed.`;

          await fs.writeFile(filePath, sampleContent);
          console.log(`\n✓ File created: ${path.basename(filePath)}`);
          console.log('\nContent:');
          console.log('─'.repeat(50));
          console.log(sampleContent);
          console.log('─'.repeat(50));
        } else {
          console.log('\nOperation cancelled.');
        }
      } else {
        throw err;
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    rl.close();
  }
}

/**
 * BONUS SOLUTION: Enhanced with Permissions Check
 */

async function safeFileReaderEnhanced() {
  try {
    const filename = process.argv[2];

    if (!filename) {
      console.error('Usage: node script.js <filename>');
      process.exit(1);
    }

    const filePath = path.resolve(filename);

    // Comprehensive file checks
    console.log('Performing file checks...\n');

    const checks = {
      exists: false,
      isFile: false,
      readable: false,
      writable: false,
      executable: false
    };

    try {
      // Check existence
      await fs.access(filePath, fs.constants.F_OK);
      checks.exists = true;
      console.log('✓ File exists');

      // Check type
      const stats = await fs.stat(filePath);
      checks.isFile = stats.isFile();
      console.log(`✓ Type: ${stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other'}`);

      // Check permissions
      try {
        await fs.access(filePath, fs.constants.R_OK);
        checks.readable = true;
        console.log('✓ Readable');
      } catch {
        console.log('✗ Not readable');
      }

      try {
        await fs.access(filePath, fs.constants.W_OK);
        checks.writable = true;
        console.log('✓ Writable');
      } catch {
        console.log('✗ Not writable');
      }

      try {
        await fs.access(filePath, fs.constants.X_OK);
        checks.executable = true;
        console.log('✓ Executable');
      } catch {
        console.log('✗ Not executable');
      }

    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('✗ File does not exist');
        process.exit(1);
      }
      throw err;
    }

    // Only proceed if file is readable
    if (!checks.readable) {
      console.error('\n✗ Cannot read file: Permission denied');
      process.exit(1);
    }

    if (!checks.isFile) {
      console.error('\n✗ Path is not a regular file');
      process.exit(1);
    }

    // Read and display
    const content = await fs.readFile(filePath, 'utf8');
    console.log('\nFile Contents:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * KEY LEARNING POINTS:
 *
 * 1. Command-Line Arguments:
 *    - process.argv[0] = node executable
 *    - process.argv[1] = script file
 *    - process.argv[2] = first argument
 *    - process.argv[3] = second argument, etc.
 *
 * 2. fs.access() vs fs.stat():
 *    - access(): Check existence and permissions
 *    - stat(): Get file metadata (size, dates, type)
 *    - Both throw errors if file doesn't exist
 *
 * 3. File Type Checking:
 *    stats.isFile()      - Regular file
 *    stats.isDirectory() - Directory
 *    stats.isSymbolicLink() - Symbolic link
 *    stats.isSocket()    - Socket
 *
 * 4. Permission Constants:
 *    fs.constants.F_OK - File exists
 *    fs.constants.R_OK - Readable
 *    fs.constants.W_OK - Writable
 *    fs.constants.X_OK - Executable
 *
 * 5. Path Handling:
 *    path.resolve() - Convert to absolute path
 *    path.basename() - Get filename only
 *    path.dirname() - Get directory only
 *    path.isAbsolute() - Check if path is absolute
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Not checking file type:
 *    // Might try to read a directory as a file
 *
 * ❌ Using sync methods:
 *    if (fs.existsSync(file)) { // Bad for performance
 *
 * ❌ Not validating arguments:
 *    const filename = process.argv[2]; // Might be undefined!
 *
 * ✅ Always validate:
 *    if (!process.argv[2]) {
 *      console.error('Usage: ...');
 *      process.exit(1);
 *    }
 *
 * ❌ Swallowing errors:
 *    try { ... } catch {} // Silent failure
 *
 * ✅ Handle appropriately:
 *    catch (err) {
 *      console.error('Error:', err.message);
 *      process.exit(1);
 *    }
 */

/**
 * ENHANCEMENT IDEAS:
 *
 * 1. Color Output:
 *    const chalk = require('chalk');
 *    console.log(chalk.green('✓ File exists'));
 *    console.log(chalk.red('✗ File not found'));
 *
 * 2. File Format Detection:
 *    const ext = path.extname(filename);
 *    if (ext === '.json') {
 *      const data = JSON.parse(content);
 *      console.log(data);
 *    }
 *
 * 3. Binary File Detection:
 *    // Check if file contains null bytes
 *    if (content.includes('\0')) {
 *      console.log('Warning: Binary file');
 *    }
 *
 * 4. Large File Warning:
 *    if (stats.size > 10 * 1024 * 1024) {
 *      const read = await question('File is large (>10MB). Continue? (y/n): ');
 *    }
 */
