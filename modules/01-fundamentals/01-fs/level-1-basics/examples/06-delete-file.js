/**
 * Example 6: Deleting Files and Directories
 *
 * This example demonstrates how to safely delete files and directories.
 *
 * Key Concepts:
 * - fs.unlink() for files
 * - fs.rm() for files and directories
 * - fs.rmdir() for empty directories
 * - Recursive deletion
 * - Safe deletion patterns
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateDeletion() {
  try {
    console.log('File and Directory Deletion Examples\n');
    console.log('═'.repeat(50));

    // Example 1: Delete a single file
    console.log('\n1. Deleting a Single File');
    console.log('─'.repeat(50));

    const singleFile = path.join(__dirname, 'to-delete.txt');
    await fs.writeFile(singleFile, 'This file will be deleted');
    console.log('✓ Created to-delete.txt');

    await fs.unlink(singleFile);
    console.log('✓ Deleted to-delete.txt');

    // Example 2: Safe deletion (check if exists first)
    console.log('\n2. Safe Deletion Pattern');
    console.log('─'.repeat(50));

    async function safeDelete(filePath) {
      try {
        await fs.unlink(filePath);
        return { success: true, message: `Deleted: ${path.basename(filePath)}` };
      } catch (err) {
        if (err.code === 'ENOENT') {
          return { success: false, message: 'File not found' };
        } else if (err.code === 'EACCES') {
          return { success: false, message: 'Permission denied' };
        } else {
          return { success: false, message: err.message };
        }
      }
    }

    // Try deleting existing file
    const file1 = path.join(__dirname, 'temp1.txt');
    await fs.writeFile(file1, 'temp');
    const result1 = await safeDelete(file1);
    console.log(`Existing file: ${result1.message}`);

    // Try deleting non-existent file
    const result2 = await safeDelete('non-existent.txt');
    console.log(`Non-existent file: ${result2.message}`);

    // Example 3: Delete multiple files
    console.log('\n3. Deleting Multiple Files');
    console.log('─'.repeat(50));

    // Create test files
    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    for (const file of files) {
      await fs.writeFile(path.join(__dirname, file), 'test');
    }
    console.log(`✓ Created ${files.length} files`);

    // Delete all
    let deleted = 0;
    for (const file of files) {
      try {
        await fs.unlink(path.join(__dirname, file));
        deleted++;
      } catch (err) {
        console.error(`Failed to delete ${file}:`, err.message);
      }
    }
    console.log(`✓ Deleted ${deleted}/${files.length} files`);

    // Example 4: Delete empty directory
    console.log('\n4. Deleting Empty Directory');
    console.log('─'.repeat(50));

    const emptyDir = path.join(__dirname, 'empty-dir');
    await fs.mkdir(emptyDir);
    console.log('✓ Created empty directory');

    await fs.rmdir(emptyDir);
    console.log('✓ Deleted empty directory');

    // Example 5: Delete directory with contents (recursive)
    console.log('\n5. Deleting Directory with Contents');
    console.log('─'.repeat(50));

    const fullDir = path.join(__dirname, 'full-dir');
    await fs.mkdir(fullDir);
    await fs.writeFile(path.join(fullDir, 'file1.txt'), 'content');
    await fs.writeFile(path.join(fullDir, 'file2.txt'), 'content');

    const subDir = path.join(fullDir, 'sub-dir');
    await fs.mkdir(subDir);
    await fs.writeFile(path.join(subDir, 'file3.txt'), 'content');

    console.log('✓ Created directory with files and subdirectory');

    // Delete recursively
    await fs.rm(fullDir, { recursive: true, force: true });
    console.log('✓ Deleted directory and all contents');

    // Example 6: Conditional deletion
    console.log('\n6. Conditional Deletion');
    console.log('─'.repeat(50));

    async function deleteIfOlderThan(filePath, maxAgeMs) {
      try {
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtimeMs;

        if (age > maxAgeMs) {
          await fs.unlink(filePath);
          return { deleted: true, reason: 'too old' };
        } else {
          return { deleted: false, reason: 'still fresh' };
        }
      } catch (err) {
        return { deleted: false, reason: err.message };
      }
    }

    const oldFile = path.join(__dirname, 'old-file.txt');
    await fs.writeFile(oldFile, 'old content');

    // Simulate old file by changing mtime
    const pastTime = new Date(Date.now() - 2000); // 2 seconds ago
    await fs.utimes(oldFile, pastTime, pastTime);

    const deleteResult = await deleteIfOlderThan(oldFile, 1000); // 1 second threshold
    console.log(`Delete result: ${deleteResult.deleted ? 'Deleted' : 'Kept'} (${deleteResult.reason})`);

    // Example 7: Delete files matching pattern
    console.log('\n7. Deleting Files by Pattern');
    console.log('─'.repeat(50));

    // Create test files
    await fs.writeFile(path.join(__dirname, 'keep.txt'), 'keep');
    await fs.writeFile(path.join(__dirname, 'temp.txt'), 'delete');
    await fs.writeFile(path.join(__dirname, 'temp.log'), 'delete');
    await fs.writeFile(path.join(__dirname, 'temp.tmp'), 'delete');

    async function deleteByPattern(directory, pattern) {
      const allFiles = await fs.readdir(directory);
      let deleted = 0;

      for (const file of allFiles) {
        if (file.startsWith(pattern)) {
          try {
            await fs.unlink(path.join(directory, file));
            deleted++;
            console.log(`  ✓ Deleted: ${file}`);
          } catch (err) {
            console.error(`  ✗ Failed: ${file}`);
          }
        }
      }

      return deleted;
    }

    const deletedCount = await deleteByPattern(__dirname, 'temp');
    console.log(`\nDeleted ${deletedCount} files starting with 'temp'`);

    // Cleanup remaining test file
    await safeDelete(path.join(__dirname, 'keep.txt'));

    // Example 8: Trash/Recycle pattern
    console.log('\n8. Trash Pattern (Move Instead of Delete)');
    console.log('─'.repeat(50));

    const trashDir = path.join(__dirname, '.trash');
    await fs.mkdir(trashDir, { recursive: true });

    async function moveToTrash(filePath) {
      try {
        const fileName = path.basename(filePath);
        const timestamp = Date.now();
        const trashPath = path.join(trashDir, `${timestamp}-${fileName}`);

        await fs.rename(filePath, trashPath);
        return { success: true, trashedAs: path.basename(trashPath) };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    const fileToTrash = path.join(__dirname, 'important.txt');
    await fs.writeFile(fileToTrash, 'Important data');

    const trashResult = await moveToTrash(fileToTrash);
    if (trashResult.success) {
      console.log(`✓ Moved to trash as: ${trashResult.trashedAs}`);
      console.log('  (Can be recovered later!)');
    }

    // Cleanup trash directory
    await fs.rm(trashDir, { recursive: true, force: true });

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run the demonstration
demonstrateDeletion();

/**
 * Deletion Methods Comparison:
 *
 * fs.unlink(path)
 * - Deletes files only
 * - Fails on directories
 * - Most common for single files
 *
 * fs.rmdir(path)
 * - Deletes empty directories only
 * - Fails if directory has content
 * - Deprecated for recursive deletion
 *
 * fs.rm(path, options)
 * - Deletes files AND directories
 * - Supports recursive deletion
 * - Recommended for modern code
 *   Options: { recursive: true, force: true }
 */

/**
 * Important Options for fs.rm():
 *
 * {
 *   recursive: true,  // Delete subdirectories
 *   force: true,      // Ignore if doesn't exist
 *   maxRetries: 3,    // Retry on failure
 *   retryDelay: 100   // Delay between retries (ms)
 * }
 */

/**
 * Common Error Codes:
 *
 * ENOENT - File doesn't exist
 * EACCES - Permission denied
 * EISDIR - Path is a directory (used unlink)
 * ENOTEMPTY - Directory not empty (used rmdir)
 * EBUSY - File is in use
 */

/**
 * Best Practices:
 *
 * ✓ Always handle errors (try-catch)
 * ✓ Use { force: true } to ignore missing files
 * ✓ Consider a trash/recycle pattern for important data
 * ✓ Log deletions for audit trail
 * ✓ Ask for confirmation for bulk deletions
 * ✓ Use { recursive: true } carefully
 *
 * ✗ Don't delete without checking consequences
 * ✗ Don't ignore deletion errors
 * ✗ Don't delete user data without confirmation
 * ✗ Don't use rm -rf equivalent carelessly
 */

/**
 * Safe Deletion Checklist:
 *
 * 1. Validate the path
 * 2. Check if it's safe to delete
 * 3. Consider a backup/trash pattern
 * 4. Log the deletion
 * 5. Handle errors gracefully
 * 6. Provide user feedback
 */

/**
 * Deletion Patterns:
 *
 * 1. Direct Delete:
 *    await fs.unlink(file);
 *
 * 2. Safe Delete (ignore if missing):
 *    await fs.rm(file, { force: true });
 *
 * 3. Move to Trash:
 *    await fs.rename(file, trashPath);
 *
 * 4. Conditional Delete:
 *    if (condition) await fs.unlink(file);
 *
 * 5. Cleanup Pattern:
 *    try { await fs.rm(dir, { recursive: true, force: true }); }
 *    catch { /* ignore */ }
 */

/**
 * Try This:
 *
 * 1. Run this file: node 06-delete-file.js
 * 2. Create a cleanup script for old temp files
 * 3. Build a trash system with restore function
 * 4. Implement a safe delete with confirmation
 * 5. Create a file sweeper for specific extensions
 */

/**
 * Challenge:
 *
 * Build a file cleanup utility that:
 * - Finds files older than X days
 * - Allows filtering by extension
 * - Moves to trash instead of deleting
 * - Provides a restore function
 * - Empties trash after Y days
 * - Logs all operations
 */
