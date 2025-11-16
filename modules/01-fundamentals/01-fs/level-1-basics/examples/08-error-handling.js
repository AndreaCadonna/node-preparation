/**
 * Example 8: Error Handling
 *
 * This example demonstrates proper error handling patterns
 * for file system operations.
 *
 * Key Concepts:
 * - Try-catch with async/await
 * - Error codes and their meanings
 * - User-friendly error messages
 * - Error recovery strategies
 * - Logging errors appropriately
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateErrorHandling() {
  console.log('File System Error Handling\n');
  console.log('═'.repeat(50));

  // Example 1: Basic try-catch
  console.log('\n1. Basic Try-Catch Pattern');
  console.log('─'.repeat(50));

  async function readFileBasic(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      console.log('✓ File read successfully');
      return content;
    } catch (err) {
      console.error('✗ Error reading file:', err.message);
      return null;
    }
  }

  await readFileBasic('non-existent-file.txt');

  // Example 2: Specific error handling
  console.log('\n2. Handling Specific Error Codes');
  console.log('─'.repeat(50));

  async function readFileWithSpecificHandling(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content };
    } catch (err) {
      switch (err.code) {
        case 'ENOENT':
          return {
            success: false,
            error: 'File not found',
            code: 'NOT_FOUND',
            userMessage: `The file "${path.basename(filePath)}" does not exist.`
          };

        case 'EACCES':
        case 'EPERM':
          return {
            success: false,
            error: 'Permission denied',
            code: 'NO_PERMISSION',
            userMessage: 'You do not have permission to read this file.'
          };

        case 'EISDIR':
          return {
            success: false,
            error: 'Is a directory',
            code: 'IS_DIRECTORY',
            userMessage: 'This is a directory, not a file.'
          };

        case 'EMFILE':
          return {
            success: false,
            error: 'Too many open files',
            code: 'TOO_MANY_FILES',
            userMessage: 'System has too many open files. Try again later.'
          };

        default:
          return {
            success: false,
            error: err.message,
            code: 'UNKNOWN',
            userMessage: 'An unexpected error occurred.'
          };
      }
    }
  }

  const result1 = await readFileWithSpecificHandling('missing.txt');
  console.log(`Code: ${result1.code}`);
  console.log(`User message: ${result1.userMessage}`);

  const result2 = await readFileWithSpecificHandling(__dirname); // Is a directory
  console.log(`Code: ${result2.code}`);
  console.log(`User message: ${result2.userMessage}`);

  // Example 3: Error recovery
  console.log('\n3. Error Recovery Strategies');
  console.log('─'.repeat(50));

  async function readFileWithFallback(primaryFile, fallbackFile) {
    try {
      const content = await fs.readFile(primaryFile, 'utf8');
      console.log(`✓ Read from primary: ${path.basename(primaryFile)}`);
      return { content, source: 'primary' };
    } catch (primaryErr) {
      console.log(`⚠ Primary failed: ${primaryErr.message}`);
      console.log(`  Trying fallback...`);

      try {
        const content = await fs.readFile(fallbackFile, 'utf8');
        console.log(`✓ Read from fallback: ${path.basename(fallbackFile)}`);
        return { content, source: 'fallback' };
      } catch (fallbackErr) {
        console.error(`✗ Both failed`);
        throw new Error('Could not read from primary or fallback');
      }
    }
  }

  const fallback = path.join(__dirname, 'fallback.txt');
  await fs.writeFile(fallback, 'Fallback content');

  const result3 = await readFileWithFallback('missing.txt', fallback);
  console.log(`Content from ${result3.source}`);

  await fs.unlink(fallback);

  // Example 4: Retry logic
  console.log('\n4. Retry Logic for Transient Errors');
  console.log('─'.repeat(50));

  async function readFileWithRetry(filePath, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        if (attempt > 1) {
          console.log(`✓ Succeeded on attempt ${attempt}`);
        }
        return content;
      } catch (err) {
        // Only retry on transient errors
        const transientErrors = ['EBUSY', 'EMFILE', 'ENFILE'];

        if (transientErrors.includes(err.code) && attempt < maxRetries) {
          console.log(`⟲ Attempt ${attempt} failed (${err.code}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }
  }

  try {
    await readFileWithRetry('busy-file.txt');
  } catch (err) {
    console.log(`All retries failed: ${err.message}`);
  }

  // Example 5: Validation before operation
  console.log('\n5. Validation Before Operation');
  console.log('─'.repeat(50));

  async function validateAndRead(filePath) {
    const errors = [];

    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      errors.push('Invalid file path');
    }

    // Check if path is absolute (safer)
    if (filePath && !path.isAbsolute(filePath)) {
      errors.push('Path must be absolute');
    }

    // Check for path traversal
    if (filePath && filePath.includes('..')) {
      errors.push('Path traversal not allowed');
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        message: 'Validation failed'
      };
    }

    try {
      // Check if exists
      await fs.access(filePath);

      // Check if it's a file
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return {
          success: false,
          errors: ['Not a file'],
          message: 'Path is not a file'
        };
      }

      // Check size (example: max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (stats.size > maxSize) {
        return {
          success: false,
          errors: [`File too large (${stats.size} bytes)`],
          message: 'File exceeds maximum size'
        };
      }

      // All good, read the file
      const content = await fs.readFile(filePath, 'utf8');
      return {
        success: true,
        content,
        size: stats.size
      };

    } catch (err) {
      return {
        success: false,
        errors: [err.message],
        message: 'File operation failed'
      };
    }
  }

  const validateResult = await validateAndRead('/path/../etc/passwd');
  console.log(`Validation result: ${validateResult.success ? 'Success' : 'Failed'}`);
  if (!validateResult.success) {
    console.log(`Errors: ${validateResult.errors.join(', ')}`);
  }

  // Example 6: Error logging
  console.log('\n6. Proper Error Logging');
  console.log('─'.repeat(50));

  class FileOperationError extends Error {
    constructor(message, code, originalError) {
      super(message);
      this.name = 'FileOperationError';
      this.code = code;
      this.originalError = originalError;
      this.timestamp = new Date().toISOString();
    }
  }

  async function readFileWithLogging(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Log success
      console.log(`[${new Date().toISOString()}] INFO: Read file ${filePath}`);
      return content;
    } catch (err) {
      // Create detailed error
      const detailedError = new FileOperationError(
        `Failed to read ${filePath}`,
        err.code,
        err
      );

      // Log error
      console.error(`[${detailedError.timestamp}] ERROR:`, {
        message: detailedError.message,
        code: detailedError.code,
        file: filePath,
        stack: detailedError.originalError.stack
      });

      throw detailedError;
    }
  }

  try {
    await readFileWithLogging('missing.txt');
  } catch (err) {
    console.log(`\nCaught error: ${err.name}`);
  }

  // Example 7: Multiple operations with partial success
  console.log('\n7. Batch Operations with Error Tracking');
  console.log('─'.repeat(50));

  async function processMultipleFiles(files) {
    const results = {
      successful: [],
      failed: [],
      total: files.length
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        results.successful.push({
          file,
          size: content.length
        });
      } catch (err) {
        results.failed.push({
          file,
          error: err.message,
          code: err.code
        });
      }
    }

    return results;
  }

  // Create test files
  await fs.writeFile(path.join(__dirname, 'file1.txt'), 'content 1');
  await fs.writeFile(path.join(__dirname, 'file2.txt'), 'content 2');

  const filesToProcess = [
    path.join(__dirname, 'file1.txt'),
    'missing.txt',
    path.join(__dirname, 'file2.txt'),
    'also-missing.txt'
  ];

  const batchResults = await processMultipleFiles(filesToProcess);

  console.log(`Processed ${batchResults.total} files:`);
  console.log(`  ✓ Successful: ${batchResults.successful.length}`);
  console.log(`  ✗ Failed: ${batchResults.failed.length}`);

  if (batchResults.failed.length > 0) {
    console.log('\nFailures:');
    batchResults.failed.forEach(f => {
      console.log(`  - ${path.basename(f.file)}: ${f.error}`);
    });
  }

  // Cleanup
  await fs.unlink(path.join(__dirname, 'file1.txt'));
  await fs.unlink(path.join(__dirname, 'file2.txt'));

  // Example 8: Graceful degradation
  console.log('\n8. Graceful Degradation');
  console.log('─'.repeat(50));

  async function getConfig(configPath, defaults = {}) {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      console.log('✓ Loaded configuration from file');
      return config;
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('⚠ Config file not found, using defaults');
        return defaults;
      } else if (err instanceof SyntaxError) {
        console.error('✗ Config file has invalid JSON, using defaults');
        return defaults;
      } else {
        console.error('✗ Error loading config:', err.message);
        return defaults;
      }
    }
  }

  const config = await getConfig('missing-config.json', {
    port: 3000,
    host: 'localhost'
  });
  console.log('Configuration:', config);

  console.log('\n═'.repeat(50));
  console.log('Error handling examples completed!');
}

// Run the demonstration
demonstrateErrorHandling();

/**
 * Common File System Error Codes:
 *
 * ENOENT - No such file or directory
 * EACCES - Permission denied
 * EISDIR - Is a directory (expected file)
 * ENOTDIR - Not a directory (expected directory)
 * EEXIST - File already exists
 * EMFILE - Too many open files (process limit)
 * ENFILE - Too many open files (system limit)
 * ENOSPC - No space left on device
 * EROFS - Read-only file system
 * EBUSY - Resource busy or locked
 * EPERM - Operation not permitted
 * EINVAL - Invalid argument
 */

/**
 * Error Handling Best Practices:
 *
 * ✓ Always use try-catch with async/await
 * ✓ Handle specific error codes when needed
 * ✓ Provide user-friendly error messages
 * ✓ Log errors with context
 * ✓ Consider retry logic for transient errors
 * ✓ Validate input before operations
 * ✓ Fail gracefully with defaults when appropriate
 * ✓ Clean up resources even on error
 *
 * ✗ Don't swallow errors silently
 * ✗ Don't expose system paths in error messages
 * ✗ Don't retry on permanent errors
 * ✗ Don't trust user input without validation
 */

/**
 * Error Handling Patterns:
 *
 * 1. Simple Try-Catch:
 *    try { await fs.readFile(...); }
 *    catch (err) { console.error(err); }
 *
 * 2. Specific Error Handling:
 *    catch (err) {
 *      if (err.code === 'ENOENT') { /* handle */ }
 *    }
 *
 * 3. Fallback Pattern:
 *    try { return await fs.readFile(primary); }
 *    catch { return await fs.readFile(fallback); }
 *
 * 4. Retry Pattern:
 *    for (let i = 0; i < 3; i++) {
 *      try { return await operation(); }
 *      catch { if (i === 2) throw; }
 *    }
 *
 * 5. Graceful Degradation:
 *    try { return await loadConfig(); }
 *    catch { return defaults; }
 */

/**
 * Try This:
 *
 * 1. Run this file: node 08-error-handling.js
 * 2. Create a robust file reader with all error cases
 * 3. Build an error logger to a file
 * 4. Implement a safe file writer with validation
 * 5. Create custom error classes for your app
 */

/**
 * Challenge:
 *
 * Build a production-ready file handler that:
 * - Validates all inputs
 * - Handles all common error codes
 * - Implements retry logic
 * - Logs errors to file
 * - Provides user-friendly messages
 * - Has fallback strategies
 * - Cleans up resources
 * - Emits events for monitoring
 */
