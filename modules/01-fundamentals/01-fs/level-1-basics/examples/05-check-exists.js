/**
 * Example 5: Checking if Files/Directories Exist
 *
 * This example demonstrates different ways to check if files
 * and directories exist before performing operations.
 *
 * Key Concepts:
 * - fs.access() method
 * - File permissions checking
 * - Handling ENOENT errors
 * - Best practices for existence checks
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateExistenceChecks() {
  try {
    console.log('File Existence Checking Examples\n');
    console.log('═'.repeat(50));

    // Setup: Create test files and directories
    const testFile = path.join(__dirname, 'test-file.txt');
    const testDir = path.join(__dirname, 'test-dir');

    await fs.writeFile(testFile, 'Test content');
    await fs.mkdir(testDir, { recursive: true });

    // Example 1: Check if file exists using fs.access()
    console.log('\n1. Using fs.access() (Recommended)');
    console.log('─'.repeat(50));

    async function fileExists(filePath) {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }

    const exists = await fileExists(testFile);
    console.log(`test-file.txt exists: ${exists}`);

    const notExists = await fileExists('non-existent.txt');
    console.log(`non-existent.txt exists: ${notExists}`);

    // Example 2: Check with different permission levels
    console.log('\n2. Checking File Permissions');
    console.log('─'.repeat(50));

    async function checkPermissions(filePath) {
      const checks = {
        exists: false,
        readable: false,
        writable: false
      };

      try {
        // Check if file exists
        await fs.access(filePath, fs.constants.F_OK);
        checks.exists = true;

        // Check if readable
        await fs.access(filePath, fs.constants.R_OK);
        checks.readable = true;

        // Check if writable
        await fs.access(filePath, fs.constants.W_OK);
        checks.writable = true;

      } catch (err) {
        // File doesn't exist or no permissions
      }

      return checks;
    }

    const permissions = await checkPermissions(testFile);
    console.log('File permissions:');
    console.log(`  Exists: ${permissions.exists}`);
    console.log(`  Readable: ${permissions.readable}`);
    console.log(`  Writable: ${permissions.writable}`);

    // Example 3: Check if path is file or directory
    console.log('\n3. Distinguishing Files from Directories');
    console.log('─'.repeat(50));

    async function getPathType(pathName) {
      try {
        const stats = await fs.stat(pathName);

        if (stats.isFile()) {
          return 'file';
        } else if (stats.isDirectory()) {
          return 'directory';
        } else if (stats.isSymbolicLink()) {
          return 'symlink';
        } else {
          return 'other';
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          return 'not found';
        }
        throw err;
      }
    }

    console.log(`test-file.txt is: ${await getPathType(testFile)}`);
    console.log(`test-dir is: ${await getPathType(testDir)}`);
    console.log(`non-existent is: ${await getPathType('non-existent')}`);

    // Example 4: Safe file operations
    console.log('\n4. Safe File Operations');
    console.log('─'.repeat(50));

    async function safeReadFile(filePath) {
      try {
        await fs.access(filePath, fs.constants.R_OK);
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, content };
      } catch (err) {
        if (err.code === 'ENOENT') {
          return { success: false, error: 'File not found' };
        } else if (err.code === 'EACCES') {
          return { success: false, error: 'Permission denied' };
        } else {
          return { success: false, error: err.message };
        }
      }
    }

    const result1 = await safeReadFile(testFile);
    console.log('Reading existing file:');
    console.log(`  Success: ${result1.success}`);
    if (result1.success) {
      console.log(`  Content: "${result1.content}"`);
    }

    const result2 = await safeReadFile('missing.txt');
    console.log('\nReading missing file:');
    console.log(`  Success: ${result2.success}`);
    console.log(`  Error: ${result2.error}`);

    // Example 5: Ensure directory exists
    console.log('\n5. Ensure Directory Exists Pattern');
    console.log('─'.repeat(50));

    async function ensureDirectoryExists(dirPath) {
      try {
        await fs.access(dirPath);
        console.log(`  Directory already exists: ${path.basename(dirPath)}`);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`  Created directory: ${path.basename(dirPath)}`);
      }
    }

    await ensureDirectoryExists(path.join(__dirname, 'new-dir'));
    await ensureDirectoryExists(path.join(__dirname, 'new-dir')); // Second call

    // Example 6: Find files with specific extension
    console.log('\n6. Finding Files by Extension');
    console.log('─'.repeat(50));

    // Create some test files
    await fs.writeFile(path.join(__dirname, 'file1.txt'), 'test');
    await fs.writeFile(path.join(__dirname, 'file2.js'), 'test');
    await fs.writeFile(path.join(__dirname, 'file3.txt'), 'test');

    async function findFilesByExtension(directory, extension) {
      const files = await fs.readdir(directory);
      const matches = [];

      for (const file of files) {
        const fullPath = path.join(directory, file);

        try {
          const stats = await fs.stat(fullPath);
          if (stats.isFile() && file.endsWith(extension)) {
            matches.push(file);
          }
        } catch {
          // Skip files we can't access
        }
      }

      return matches;
    }

    const txtFiles = await findFilesByExtension(__dirname, '.txt');
    console.log('Text files found:');
    txtFiles.forEach(file => console.log(`  - ${file}`));

    // Example 7: Race condition warning
    console.log('\n7. Race Condition Warning');
    console.log('─'.repeat(50));

    // ❌ BAD: Check then use (race condition)
    async function badPattern(filePath) {
      if (await fileExists(filePath)) {
        // File could be deleted between check and read!
        return await fs.readFile(filePath, 'utf8');
      }
      return null;
    }

    // ✅ GOOD: Just try and handle error
    async function goodPattern(filePath) {
      try {
        return await fs.readFile(filePath, 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT') {
          return null;
        }
        throw err;
      }
    }

    console.log('Bad pattern: Check existence then read (race condition)');
    console.log('Good pattern: Try to read, handle error (atomic)');

    // Cleanup
    console.log('\n8. Cleanup');
    console.log('─'.repeat(50));

    await fs.unlink(testFile);
    await fs.unlink(path.join(__dirname, 'file1.txt'));
    await fs.unlink(path.join(__dirname, 'file2.js'));
    await fs.unlink(path.join(__dirname, 'file3.txt'));
    await fs.rm(testDir, { recursive: true });
    await fs.rm(path.join(__dirname, 'new-dir'), { recursive: true });

    console.log('✓ Cleaned up all test files');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run the demonstration
demonstrateExistenceChecks();

/**
 * fs.access() Constants:
 *
 * fs.constants.F_OK - File exists
 * fs.constants.R_OK - File is readable
 * fs.constants.W_OK - File is writable
 * fs.constants.X_OK - File is executable
 *
 * Combine with bitwise OR:
 * fs.access(file, fs.constants.R_OK | fs.constants.W_OK)
 */

/**
 * Deprecated Methods (Don't Use):
 *
 * ❌ fs.exists() - Deprecated!
 * ❌ fs.existsSync() - Deprecated for async code!
 *
 * Use fs.access() instead.
 */

/**
 * Best Practices:
 *
 * ✓ Use try-catch instead of checking existence
 * ✓ Handle specific error codes (ENOENT, EACCES)
 * ✓ Use fs.stat() to get file details
 * ✓ Use { recursive: true } for mkdir
 *
 * ✗ Don't use fs.exists() (deprecated)
 * ✗ Don't check then act (race condition)
 * ✗ Don't assume file stays after check
 */

/**
 * Common Error Codes:
 *
 * ENOENT - No such file or directory
 * EACCES - Permission denied
 * EISDIR - Is a directory (expected file)
 * ENOTDIR - Not a directory (expected directory)
 * EEXIST - File already exists
 */

/**
 * When to Check vs Try:
 *
 * CHECK (fs.access):
 * - Validating user input
 * - Checking permissions before operation
 * - Listing available files
 *
 * TRY (try-catch):
 * - Actually performing the operation
 * - Race-condition sensitive code
 * - Better performance (one syscall)
 */

/**
 * Try This:
 *
 * 1. Run this file: node 05-check-exists.js
 * 2. Create a function to find all .js files in a directory
 * 3. Build a file validator that checks size and permissions
 * 4. Create a safe copy function that checks both source and dest
 * 5. Implement a file search function
 */

/**
 * Challenge:
 *
 * Build a file info utility that:
 * - Checks if file/directory exists
 * - Shows type (file, directory, symlink)
 * - Displays permissions
 * - Shows size and timestamps
 * - Handles errors gracefully
 */
