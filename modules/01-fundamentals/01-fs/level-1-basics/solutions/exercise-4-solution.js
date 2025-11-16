/**
 * Exercise 4 Solution: Copy a File
 *
 * This solution demonstrates:
 * - Command-line argument validation
 * - Source file existence checking
 * - Destination overwrite handling
 * - File copying with verification
 * - Proper error handling
 */

const fs = require('fs').promises;
const path = require('path');

async function copyFile() {
  try {
    console.log('═'.repeat(50));
    console.log('File Copy Utility');
    console.log('═'.repeat(50));
    console.log();

    // 1. Get source and destination from command-line arguments
    const source = process.argv[2];
    const destination = process.argv[3];

    // 2. Validate arguments
    if (!source || !destination) {
      console.error('✗ Usage: node exercise-4-solution.js <source> <destination>');
      console.error('   Example: node exercise-4-solution.js file.txt copy.txt');
      process.exit(1);
    }

    // Convert to absolute paths
    const srcPath = path.resolve(source);
    const destPath = path.resolve(destination);

    console.log(`Source: ${path.basename(srcPath)}`);
    console.log(`Destination: ${path.basename(destPath)}`);
    console.log();

    // 3. Check if source exists
    console.log('[1/3] Validating source file...');

    let srcStats;
    try {
      srcStats = await fs.stat(srcPath);
      console.log(`✓ Source file exists (${srcStats.size.toLocaleString()} bytes)`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`✗ Error: Source file not found: ${path.basename(srcPath)}`);
        console.error(`   Path: ${srcPath}`);
        process.exit(1);
      }
      throw err;
    }

    // Verify source is a file, not a directory
    if (srcStats.isDirectory()) {
      console.error('✗ Error: Source is a directory, not a file');
      console.error('   This utility only copies files, not directories.');
      process.exit(1);
    }

    console.log();

    // 4. Check if destination exists (warn if overwriting)
    console.log('[2/3] Checking destination...');

    try {
      await fs.access(destPath);
      console.log('⚠  Destination file already exists');
      console.log('   Overwriting...');
    } catch {
      console.log('✓ Destination is clear');
    }

    console.log();

    // 5. Perform the copy
    console.log('[3/3] Copying file...');

    const startTime = Date.now();
    await fs.copyFile(srcPath, destPath);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('✓ Copy completed successfully!');
    console.log();

    // 6. Verify the copy
    const destStats = await fs.stat(destPath);

    if (srcStats.size !== destStats.size) {
      console.error('⚠  Warning: File sizes do not match!');
      console.error(`   Source: ${srcStats.size} bytes`);
      console.error(`   Destination: ${destStats.size} bytes`);
      process.exit(1);
    }

    // 7. Display success message
    console.log('Summary:');
    console.log('─'.repeat(50));
    console.log(`Copied: ${srcStats.size.toLocaleString()} bytes`);
    console.log(`From: ${path.basename(srcPath)}`);
    console.log(`To: ${path.basename(destPath)}`);
    console.log(`Time: ${duration}s`);
    console.log('─'.repeat(50));

  } catch (err) {
    console.error('\n✗ Error:', err.message);

    if (err.code === 'ENOSPC') {
      console.error('   Reason: Not enough disk space');
    } else if (err.code === 'EACCES') {
      console.error('   Reason: Permission denied');
    } else if (err.code === 'EROFS') {
      console.error('   Reason: File system is read-only');
    }

    process.exit(1);
  }
}

// Run the function
copyFile();

/**
 * ALTERNATIVE SOLUTION: With Overwrite Confirmation
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function copyFileWithConfirmation() {
  try {
    const source = process.argv[2];
    const destination = process.argv[3];

    if (!source || !destination) {
      console.error('Usage: node script.js <source> <destination>');
      process.exit(1);
    }

    const srcPath = path.resolve(source);
    const destPath = path.resolve(destination);

    // Check source
    try {
      const stats = await fs.stat(srcPath);
      if (stats.isDirectory()) {
        console.error('Error: Source is a directory');
        process.exit(1);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`Error: Source file not found: ${source}`);
        process.exit(1);
      }
      throw err;
    }

    // Check if destination exists
    try {
      await fs.access(destPath);

      // Destination exists, ask for confirmation
      console.log(`⚠  Warning: ${path.basename(destPath)} already exists`);
      const answer = await question('Overwrite? (y/n): ');

      if (answer.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        rl.close();
        process.exit(0);
      }
    } catch {
      // Destination doesn't exist, that's fine
    }

    // Perform copy
    await fs.copyFile(srcPath, destPath);
    console.log(`✓ Successfully copied to ${path.basename(destPath)}`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * BONUS SOLUTION: Copy with Verification
 */

async function copyFileWithVerification() {
  try {
    const source = process.argv[2];
    const destination = process.argv[3];

    if (!source || !destination) {
      console.error('Usage: node script.js <source> <destination>');
      process.exit(1);
    }

    const srcPath = path.resolve(source);
    const destPath = path.resolve(destination);

    // Perform copy
    await fs.copyFile(srcPath, destPath);

    // Verify by comparing contents
    const srcContent = await fs.readFile(srcPath);
    const destContent = await fs.readFile(destPath);

    if (!srcContent.equals(destContent)) {
      console.error('✗ Copy verification failed!');
      console.error('   File contents do not match.');

      // Delete corrupted copy
      await fs.unlink(destPath);
      console.error('   Corrupted copy has been deleted.');
      process.exit(1);
    }

    // Get checksums for additional verification
    const crypto = require('crypto');

    const srcHash = crypto.createHash('md5').update(srcContent).digest('hex');
    const destHash = crypto.createHash('md5').update(destContent).digest('hex');

    console.log('✓ Copy successful and verified');
    console.log(`  Source MD5: ${srcHash}`);
    console.log(`  Dest MD5: ${destHash}`);
    console.log(`  Match: ${srcHash === destHash ? 'Yes' : 'No'}`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * ADVANCED SOLUTION: Create Destination Directory if Needed
 */

async function copyFileAdvanced() {
  try {
    const source = process.argv[2];
    const destination = process.argv[3];

    if (!source || !destination) {
      console.error('Usage: node script.js <source> <destination>');
      process.exit(1);
    }

    const srcPath = path.resolve(source);
    const destPath = path.resolve(destination);

    // Check source
    const srcStats = await fs.stat(srcPath);
    if (srcStats.isDirectory()) {
      console.error('Error: Source must be a file, not a directory');
      process.exit(1);
    }

    // Create destination directory if it doesn't exist
    const destDir = path.dirname(destPath);

    try {
      await fs.access(destDir);
    } catch {
      console.log(`Creating directory: ${destDir}`);
      await fs.mkdir(destDir, { recursive: true });
    }

    // Copy the file
    await fs.copyFile(srcPath, destPath);

    console.log('✓ File copied successfully');
    console.log(`  From: ${srcPath}`);
    console.log(`  To: ${destPath}`);
    console.log(`  Size: ${srcStats.size.toLocaleString()} bytes`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * KEY LEARNING POINTS:
 *
 * 1. fs.copyFile() vs Read+Write:
 *    - copyFile() is faster (native OS copy)
 *    - copyFile() handles large files efficiently
 *    - copyFile() preserves file permissions
 *
 * 2. Copy Flags:
 *    fs.copyFile(src, dest, flags)
 *    - fs.constants.COPYFILE_EXCL: Fail if dest exists
 *    - fs.constants.COPYFILE_FICLONE: Copy-on-write (faster)
 *
 * 3. Verification Methods:
 *    - Compare file sizes
 *    - Compare file contents (Buffer.equals())
 *    - Compare checksums (MD5, SHA256)
 *
 * 4. Error Handling:
 *    - ENOENT: File doesn't exist
 *    - ENOSPC: No disk space
 *    - EACCES: Permission denied
 *    - EROFS: Read-only filesystem
 *
 * 5. Path Operations:
 *    - path.resolve(): Make absolute
 *    - path.dirname(): Get directory
 *    - path.basename(): Get filename
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Not checking if source exists:
 *    await fs.copyFile(src, dest); // May fail silently
 *
 * ❌ Not handling existing destination:
 *    // Silently overwrites important files
 *
 * ❌ Not verifying the copy:
 *    // Corrupted copies go undetected
 *
 * ✅ Complete validation:
 *    - Check source exists
 *    - Warn about destination
 *    - Verify copy success
 *    - Handle all error cases
 *
 * ❌ Copying to same location:
 *    if (srcPath === destPath) {
 *      // This would destroy the file!
 *    }
 *
 * ✅ Check for same path:
 *    if (path.resolve(src) === path.resolve(dest)) {
 *      console.error('Source and destination are the same');
 *      process.exit(1);
 *    }
 */

/**
 * ENHANCEMENT IDEAS:
 *
 * 1. Progress Bar (for large files):
 *    // Use streams to show progress
 *    const readStream = fs.createReadStream(src);
 *    readStream.on('data', chunk => {
 *      progress += chunk.length;
 *      // Update progress bar
 *    });
 *
 * 2. Preserve Timestamps:
 *    const stats = await fs.stat(src);
 *    await fs.copyFile(src, dest);
 *    await fs.utimes(dest, stats.atime, stats.mtime);
 *
 * 3. Backup Original:
 *    if (destExists) {
 *      await fs.copyFile(dest, dest + '.backup');
 *    }
 *
 * 4. Transaction Pattern:
 *    const tempDest = dest + '.tmp';
 *    await fs.copyFile(src, tempDest);
 *    await fs.rename(tempDest, dest); // Atomic
 */
