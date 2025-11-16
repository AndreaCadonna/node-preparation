/**
 * Example 2: Reading Directories
 *
 * Demonstrates how to read and list directory contents with various options.
 *
 * Key Concepts:
 * - Reading directory contents with readdir()
 * - Using withFileTypes for better performance
 * - Filtering and sorting directory listings
 * - Recursive directory reading
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateReadDirectory() {
  console.log('Reading Directories\n');
  console.log('═'.repeat(50));

  try {
    // Setup: Create test directory structure
    const testDir = path.join(__dirname, 'test-read');
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'content');
    await fs.writeFile(path.join(testDir, 'file2.js'), 'code');
    await fs.writeFile(path.join(testDir, 'file3.md'), 'docs');
    await fs.mkdir(path.join(testDir, 'subdir'));
    await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'nested');

    // Example 1: Basic directory reading
    console.log('\n1. Basic Directory Reading');
    console.log('─'.repeat(50));

    const files = await fs.readdir(testDir);
    console.log('Files and directories:');
    files.forEach(file => console.log(`  - ${file}`));

    // Example 2: Reading with file types (recommended)
    console.log('\n2. Reading with File Types');
    console.log('─'.repeat(50));

    const entries = await fs.readdir(testDir, { withFileTypes: true });
    entries.forEach(entry => {
      const type = entry.isFile() ? 'FILE' : entry.isDirectory() ? 'DIR' : 'OTHER';
      console.log(`  ${type.padEnd(5)} ${entry.name}`);
    });

    // Example 3: Filter files by extension
    console.log('\n3. Filtering by Extension');
    console.log('─'.repeat(50));

    const txtFiles = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.txt'))
      .map(entry => entry.name);

    console.log('.txt files:', txtFiles);

    // Example 4: Separate files and directories
    console.log('\n4. Separating Files and Directories');
    console.log('─'.repeat(50));

    const onlyFiles = entries.filter(e => e.isFile()).map(e => e.name);
    const onlyDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    console.log('Files:', onlyFiles);
    console.log('Directories:', onlyDirs);

    // Example 5: Read with full paths
    console.log('\n5. Getting Full Paths');
    console.log('─'.repeat(50));

    const fullPaths = files.map(file => path.join(testDir, file));
    console.log('Full paths:');
    fullPaths.forEach(p => console.log(`  ${p}`));

    // Example 6: Read directory recursively
    console.log('\n6. Recursive Directory Reading');
    console.log('─'.repeat(50));

    async function readDirRecursive(dir, fileList = []) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await readDirRecursive(fullPath, fileList);
        } else {
          fileList.push(fullPath);
        }
      }

      return fileList;
    }

    const allFiles = await readDirRecursive(testDir);
    console.log('All files recursively:');
    allFiles.forEach(file => {
      const relativePath = path.relative(testDir, file);
      console.log(`  ${relativePath}`);
    });

    // Example 7: Count files by extension
    console.log('\n7. Counting Files by Extension');
    console.log('─'.repeat(50));

    const filesByExt = {};
    entries.filter(e => e.isFile()).forEach(entry => {
      const ext = path.extname(entry.name) || 'no extension';
      filesByExt[ext] = (filesByExt[ext] || 0) + 1;
    });

    console.log('File counts by extension:');
    Object.entries(filesByExt).forEach(([ext, count]) => {
      console.log(`  ${ext}: ${count}`);
    });

    // Example 8: Sort directory contents
    console.log('\n8. Sorting Directory Contents');
    console.log('─'.repeat(50));

    const sorted = {
      byName: [...entries].sort((a, b) => a.name.localeCompare(b.name)),
      dirsFirst: [...entries].sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
    };

    console.log('Directories first:');
    sorted.dirsFirst.forEach(entry => {
      const icon = entry.isDirectory() ? '📁' : '📄';
      console.log(`  ${icon} ${entry.name}`);
    });

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

demonstrateReadDirectory();

/**
 * KEY METHODS:
 *
 * fs.readdir(path, options)
 * - Returns array of filenames
 * - Options: { withFileTypes: true, encoding: 'utf8' }
 * - withFileTypes returns Dirent objects (faster)
 *
 * Dirent object methods:
 * - isFile() - Is a regular file
 * - isDirectory() - Is a directory
 * - isSymbolicLink() - Is a symbolic link
 * - name - The filename
 */

/**
 * PERFORMANCE TIP:
 *
 * Use withFileTypes: true instead of calling stat() on each file
 *
 * ❌ SLOW:
 * const files = await fs.readdir(dir);
 * for (const file of files) {
 *   const stats = await fs.stat(path.join(dir, file));
 *   if (stats.isFile()) { ... }
 * }
 *
 * ✓ FAST:
 * const entries = await fs.readdir(dir, { withFileTypes: true });
 * for (const entry of entries) {
 *   if (entry.isFile()) { ... }
 * }
 */
