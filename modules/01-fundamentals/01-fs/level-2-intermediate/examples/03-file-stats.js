/**
 * Example 3: File Statistics and Metadata
 *
 * Demonstrates how to retrieve and work with file and directory metadata.
 *
 * Key Concepts:
 * - Using fs.stat() to get file information
 * - File size, timestamps, permissions
 * - File type detection
 * - Comparing file stats
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateFileStats() {
  console.log('File Statistics and Metadata\n');
  console.log('═'.repeat(50));

  try {
    // Setup: Create test files
    const testFile = path.join(__dirname, 'test-file.txt');
    const testDir = path.join(__dirname, 'test-dir');

    await fs.writeFile(testFile, 'Hello World!\n'.repeat(100));
    await fs.mkdir(testDir, { recursive: true });

    // Example 1: Basic file stats
    console.log('\n1. Basic File Statistics');
    console.log('─'.repeat(50));

    const stats = await fs.stat(testFile);

    console.log('File Information:');
    console.log(`  Size: ${stats.size} bytes`);
    console.log(`  Created: ${stats.birthtime.toLocaleString()}`);
    console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
    console.log(`  Accessed: ${stats.atime.toLocaleString()}`);
    console.log(`  Changed: ${stats.ctime.toLocaleString()}`);

    // Example 2: File type detection
    console.log('\n2. File Type Detection');
    console.log('─'.repeat(50));

    console.log(`${path.basename(testFile)}:`);
    console.log(`  Is file: ${stats.isFile()}`);
    console.log(`  Is directory: ${stats.isDirectory()}`);
    console.log(`  Is symbolic link: ${stats.isSymbolicLink()}`);
    console.log(`  Is FIFO: ${stats.isFIFO()}`);
    console.log(`  Is socket: ${stats.isSocket()}`);
    console.log(`  Is block device: ${stats.isBlockDevice()}`);
    console.log(`  Is character device: ${stats.isCharacterDevice()}`);

    const dirStats = await fs.stat(testDir);
    console.log(`\n${path.basename(testDir)}:`);
    console.log(`  Is directory: ${dirStats.isDirectory()}`);

    // Example 3: File permissions
    console.log('\n3. File Permissions');
    console.log('─'.repeat(50));

    const mode = stats.mode;
    const permissions = (mode & parseInt('777', 8)).toString(8);

    console.log(`File permissions (octal): ${permissions}`);
    console.log(`Full mode: ${mode.toString(8)}`);

    // Check specific permissions
    const ownerCanRead = (mode & fs.constants.S_IRUSR) !== 0;
    const ownerCanWrite = (mode & fs.constants.S_IWUSR) !== 0;
    const ownerCanExecute = (mode & fs.constants.S_IXUSR) !== 0;

    console.log('\nOwner permissions:');
    console.log(`  Read: ${ownerCanRead}`);
    console.log(`  Write: ${ownerCanWrite}`);
    console.log(`  Execute: ${ownerCanExecute}`);

    // Example 4: Human-readable file sizes
    console.log('\n4. Human-Readable File Sizes');
    console.log('─'.repeat(50));

    function formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';

      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    console.log(`File size: ${formatBytes(stats.size)}`);
    console.log(`Examples:`);
    console.log(`  1024 bytes = ${formatBytes(1024)}`);
    console.log(`  1048576 bytes = ${formatBytes(1048576)}`);
    console.log(`  1073741824 bytes = ${formatBytes(1073741824)}`);

    // Example 5: File age calculation
    console.log('\n5. File Age Calculation');
    console.log('─'.repeat(50));

    const now = Date.now();
    const created = stats.birthtime.getTime();
    const modified = stats.mtime.getTime();

    const ageMs = now - created;
    const modifiedAgoMs = now - modified;

    function formatDuration(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
      if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
      if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    console.log(`File created: ${formatDuration(ageMs)} ago`);
    console.log(`Last modified: ${formatDuration(modifiedAgoMs)} ago`);

    // Example 6: Comparing file stats
    console.log('\n6. Comparing Files');
    console.log('─'.repeat(50));

    const file2 = path.join(__dirname, 'test-file2.txt');
    await fs.writeFile(file2, 'Smaller content');

    const stats2 = await fs.stat(file2);

    console.log('Comparison:');
    console.log(`  ${path.basename(testFile)}: ${formatBytes(stats.size)}`);
    console.log(`  ${path.basename(file2)}: ${formatBytes(stats2.size)}`);
    console.log(`  Larger: ${stats.size > stats2.size ? path.basename(testFile) : path.basename(file2)}`);

    // Which is newer?
    const newer = stats.mtime > stats2.mtime ? testFile : file2;
    console.log(`  Newer: ${path.basename(newer)}`);

    // Example 7: Directory size calculation
    console.log('\n7. Directory Size Calculation');
    console.log('─'.repeat(50));

    // Add some files to directory
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'Content 1');
    await fs.writeFile(path.join(testDir, 'file2.txt'), 'Content 2');
    await fs.mkdir(path.join(testDir, 'subdir'));
    await fs.writeFile(path.join(testDir, 'subdir', 'file3.txt'), 'Content 3');

    async function getDirectorySize(dirPath) {
      let totalSize = 0;
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    }

    const dirSize = await getDirectorySize(testDir);
    console.log(`Directory size: ${formatBytes(dirSize)}`);
    console.log(`Total files: ${(await fs.readdir(testDir, { withFileTypes: true })).length}`);

    // Example 8: File stats for batch operations
    console.log('\n8. Batch File Statistics');
    console.log('─'.repeat(50));

    const files = [testFile, file2];
    const fileStats = await Promise.all(
      files.map(async (file) => ({
        name: path.basename(file),
        size: (await fs.stat(file)).size,
        modified: (await fs.stat(file)).mtime
      }))
    );

    console.log('File listing:');
    fileStats
      .sort((a, b) => b.size - a.size) // Sort by size descending
      .forEach(file => {
        console.log(`  ${file.name.padEnd(20)} ${formatBytes(file.size).padStart(10)}`);
      });

    // Cleanup
    console.log('\n9. Cleanup');
    console.log('─'.repeat(50));

    await fs.unlink(testFile);
    await fs.unlink(file2);
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

demonstrateFileStats();

/**
 * fs.Stats Object Properties:
 *
 * Size:
 * - size: File size in bytes
 *
 * Timestamps:
 * - birthtime: Creation time
 * - mtime: Last modification time
 * - atime: Last access time
 * - ctime: Last status change time
 *
 * Type checks:
 * - isFile()
 * - isDirectory()
 * - isSymbolicLink()
 * - isBlockDevice()
 * - isCharacterDevice()
 * - isFIFO()
 * - isSocket()
 *
 * Other:
 * - mode: File permissions
 * - uid: User ID
 * - gid: Group ID
 * - ino: Inode number
 * - nlink: Number of hard links
 */

/**
 * Common Use Cases:
 *
 * 1. Check if file is newer than another
 * 2. Calculate directory sizes
 * 3. Find files modified in last X days
 * 4. List files sorted by size
 * 5. Check file permissions before operations
 * 6. Implement file caching based on mtime
 * 7. Build file browser with metadata
 */
