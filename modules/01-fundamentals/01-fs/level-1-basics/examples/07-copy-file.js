/**
 * Example 7: Copying Files
 *
 * This example demonstrates different ways to copy files.
 *
 * Key Concepts:
 * - fs.copyFile() method
 * - Copy modes (overwrite, fail if exists)
 * - Copying with verification
 * - Copying directories
 * - Performance considerations
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateCopying() {
  try {
    console.log('File Copying Examples\n');
    console.log('═'.repeat(50));

    // Example 1: Simple file copy
    console.log('\n1. Simple File Copy');
    console.log('─'.repeat(50));

    const source = path.join(__dirname, 'source.txt');
    const destination = path.join(__dirname, 'destination.txt');

    // Create source file
    await fs.writeFile(source, 'This is the original file content.');
    console.log('✓ Created source.txt');

    // Copy the file
    await fs.copyFile(source, destination);
    console.log('✓ Copied to destination.txt');

    // Verify the copy
    const sourceContent = await fs.readFile(source, 'utf8');
    const destContent = await fs.readFile(destination, 'utf8');
    console.log(`  Contents match: ${sourceContent === destContent}`);

    // Example 2: Copy modes
    console.log('\n2. Copy Modes');
    console.log('─'.repeat(50));

    const source2 = path.join(__dirname, 'original.txt');
    const dest2 = path.join(__dirname, 'copy.txt');

    await fs.writeFile(source2, 'Original content');
    await fs.writeFile(dest2, 'Existing content');

    console.log('Before copy:');
    console.log(`  copy.txt: "${await fs.readFile(dest2, 'utf8')}"`);

    // Default: Overwrite
    await fs.copyFile(source2, dest2);
    console.log('\nAfter copy (default mode):');
    console.log(`  copy.txt: "${await fs.readFile(dest2, 'utf8')}"`);

    // COPYFILE_EXCL: Fail if destination exists
    console.log('\n3. Copy with EXCL Flag (Fail if Exists)');
    console.log('─'.repeat(50));

    const dest3 = path.join(__dirname, 'new-copy.txt');

    try {
      await fs.copyFile(source2, dest3, fs.constants.COPYFILE_EXCL);
      console.log('✓ Created new-copy.txt (did not exist)');

      // Try again (should fail)
      await fs.copyFile(source2, dest3, fs.constants.COPYFILE_EXCL);
      console.log('This should not print');
    } catch (err) {
      if (err.code === 'EEXIST') {
        console.log('✗ Copy failed: File already exists (as expected)');
      }
    }

    // Example 4: Safe copy function
    console.log('\n4. Safe Copy Function');
    console.log('─'.repeat(50));

    async function safeCopy(src, dest, overwrite = false) {
      try {
        // Check if source exists
        await fs.access(src);

        // Check if destination exists
        try {
          await fs.access(dest);
          if (!overwrite) {
            return {
              success: false,
              message: 'Destination exists (use overwrite=true)'
            };
          }
        } catch {
          // Destination doesn't exist, that's fine
        }

        // Perform the copy
        const flags = overwrite ? 0 : fs.constants.COPYFILE_EXCL;
        await fs.copyFile(src, dest, flags);

        return {
          success: true,
          message: `Copied ${path.basename(src)} → ${path.basename(dest)}`
        };

      } catch (err) {
        return {
          success: false,
          message: err.message
        };
      }
    }

    const result1 = await safeCopy(source, 'copy1.txt');
    console.log(result1.message);

    const result2 = await safeCopy(source, 'copy1.txt'); // Exists, no overwrite
    console.log(result2.message);

    const result3 = await safeCopy(source, 'copy1.txt', true); // Overwrite
    console.log(result3.message);

    // Example 5: Copy with backup
    console.log('\n5. Copy with Backup');
    console.log('─'.repeat(50));

    async function copyWithBackup(src, dest) {
      try {
        // Check if destination exists
        try {
          await fs.access(dest);
          // Destination exists, create backup
          const backupPath = dest + '.backup';
          await fs.copyFile(dest, backupPath);
          console.log(`  ✓ Created backup: ${path.basename(backupPath)}`);
        } catch {
          // Destination doesn't exist, no backup needed
        }

        // Perform the copy
        await fs.copyFile(src, dest);
        console.log(`  ✓ Copied: ${path.basename(src)} → ${path.basename(dest)}`);

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    const backupTest = path.join(__dirname, 'important.txt');
    await fs.writeFile(backupTest, 'Important data v1');

    await copyWithBackup(source, backupTest);
    await copyWithBackup(source, backupTest); // Second time creates backup

    // Example 6: Copy multiple files
    console.log('\n6. Copy Multiple Files');
    console.log('─'.repeat(50));

    // Create test files
    const testFiles = ['file1.txt', 'file2.txt', 'file3.txt'];
    for (const file of testFiles) {
      await fs.writeFile(path.join(__dirname, file), `Content of ${file}`);
    }

    // Copy to backup directory
    const backupDir = path.join(__dirname, 'backup');
    await fs.mkdir(backupDir, { recursive: true });

    let copiedCount = 0;
    for (const file of testFiles) {
      const srcPath = path.join(__dirname, file);
      const destPath = path.join(backupDir, file);

      try {
        await fs.copyFile(srcPath, destPath);
        copiedCount++;
      } catch (err) {
        console.error(`Failed to copy ${file}:`, err.message);
      }
    }

    console.log(`✓ Copied ${copiedCount}/${testFiles.length} files to backup/`);

    // Example 7: Copy directory recursively
    console.log('\n7. Copy Directory Recursively');
    console.log('─'.repeat(50));

    async function copyDirectory(src, dest) {
      try {
        // Create destination directory
        await fs.mkdir(dest, { recursive: true });

        // Read source directory
        const entries = await fs.readdir(src, { withFileTypes: true });

        let filesCopied = 0;
        let dirsCopied = 0;

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            // Recursively copy subdirectory
            const result = await copyDirectory(srcPath, destPath);
            filesCopied += result.files;
            dirsCopied += result.dirs + 1;
          } else {
            // Copy file
            await fs.copyFile(srcPath, destPath);
            filesCopied++;
          }
        }

        return { files: filesCopied, dirs: dirsCopied };

      } catch (err) {
        console.error('Error copying directory:', err.message);
        return { files: 0, dirs: 0 };
      }
    }

    // Create a test directory structure
    const srcDir = path.join(__dirname, 'source-dir');
    await fs.mkdir(path.join(srcDir, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(srcDir, 'file1.txt'), 'Root file');
    await fs.writeFile(path.join(srcDir, 'subdir', 'file2.txt'), 'Sub file');

    const destDir = path.join(__dirname, 'dest-dir');
    const stats = await copyDirectory(srcDir, destDir);

    console.log(`✓ Copied directory: ${stats.files} files, ${stats.dirs} directories`);

    // Example 8: Verify copy integrity
    console.log('\n8. Verify Copy Integrity');
    console.log('─'.repeat(50));

    async function copyAndVerify(src, dest) {
      try {
        // Copy the file
        await fs.copyFile(src, dest);

        // Read both files
        const srcContent = await fs.readFile(src);
        const destContent = await fs.readFile(dest);

        // Compare
        const match = srcContent.equals(destContent);

        if (match) {
          const stats = await fs.stat(dest);
          return {
            success: true,
            size: stats.size,
            message: 'Copy verified successfully'
          };
        } else {
          // Corrupt copy, delete it
          await fs.unlink(dest);
          return {
            success: false,
            message: 'Copy verification failed (deleted)'
          };
        }

      } catch (err) {
        return {
          success: false,
          message: err.message
        };
      }
    }

    const verifyResult = await copyAndVerify(source, 'verified-copy.txt');
    console.log(`${verifyResult.success ? '✓' : '✗'} ${verifyResult.message}`);
    if (verifyResult.success) {
      console.log(`  Size: ${verifyResult.size} bytes`);
    }

    // Cleanup
    console.log('\n9. Cleanup');
    console.log('─'.repeat(50));

    const filesToDelete = [
      source, destination, source2, dest2, dest3,
      'copy1.txt', backupTest, backupTest + '.backup',
      'verified-copy.txt', 'important.txt.backup'
    ];

    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
      } catch {
        // File might not exist
      }
    }

    // Delete test files
    for (const file of testFiles) {
      await fs.unlink(path.join(__dirname, file)).catch(() => {});
    }

    // Delete directories
    await fs.rm(backupDir, { recursive: true, force: true });
    await fs.rm(srcDir, { recursive: true, force: true });
    await fs.rm(destDir, { recursive: true, force: true });

    console.log('✓ Cleaned up all test files');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run the demonstration
demonstrateCopying();

/**
 * fs.copyFile() Flags:
 *
 * fs.constants.COPYFILE_EXCL
 * - Fail if destination exists
 * - Use for safe copying
 *
 * fs.constants.COPYFILE_FICLONE
 * - Copy-on-write clone (if supported)
 * - Very fast for large files
 * - Not supported on all filesystems
 *
 * fs.constants.COPYFILE_FICLONE_FORCE
 * - Require copy-on-write
 * - Fail if not supported
 */

/**
 * Copy Methods Comparison:
 *
 * 1. fs.copyFile(src, dest)
 *    - Fast, native copy
 *    - Preserves file mode
 *    - Best for most cases
 *
 * 2. Read + Write
 *    - await fs.writeFile(dest, await fs.readFile(src))
 *    - Loads entire file in memory
 *    - Slow for large files
 *    - Use streams instead
 *
 * 3. Streams
 *    - src.pipe(dest)
 *    - Memory efficient
 *    - Best for large files
 *    - Covered in streams module
 */

/**
 * Best Practices:
 *
 * ✓ Use fs.copyFile() for single files
 * ✓ Check if source exists before copying
 * ✓ Decide on overwrite behavior
 * ✓ Verify critical copies
 * ✓ Use streams for large files (>100MB)
 * ✓ Create backup before overwriting
 *
 * ✗ Don't copy system files without checking
 * ✗ Don't assume copy success without checking
 * ✗ Don't copy without checking disk space
 * ✗ Don't use read+write for large files
 */

/**
 * Common Patterns:
 *
 * 1. Simple Copy:
 *    await fs.copyFile(src, dest);
 *
 * 2. Safe Copy (fail if exists):
 *    await fs.copyFile(src, dest, fs.constants.COPYFILE_EXCL);
 *
 * 3. Backup Then Copy:
 *    if (exists(dest)) await fs.copyFile(dest, dest + '.bak');
 *    await fs.copyFile(src, dest);
 *
 * 4. Copy with Verification:
 *    await fs.copyFile(src, dest);
 *    if (!verifyEqual(src, dest)) throw new Error('Copy failed');
 */

/**
 * Try This:
 *
 * 1. Run this file: node 07-copy-file.js
 * 2. Create a file backup utility
 * 3. Build a photo organizer (copy by date)
 * 4. Implement a version control system (simple)
 * 5. Create a directory sync tool
 */

/**
 * Challenge:
 *
 * Build a smart backup tool that:
 * - Copies files to backup directory
 * - Maintains directory structure
 * - Only copies if source is newer
 * - Verifies copy integrity
 * - Creates incremental backups
 * - Provides restore functionality
 */
