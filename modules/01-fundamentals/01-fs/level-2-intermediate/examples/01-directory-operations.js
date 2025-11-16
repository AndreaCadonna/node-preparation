/**
 * Example 1: Directory Operations
 *
 * This example demonstrates how to create, manage, and delete directories.
 *
 * Key Concepts:
 * - Creating directories with mkdir()
 * - Recursive directory creation
 * - Checking if directory exists
 * - Removing directories
 * - Directory vs file detection
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateDirectoryOperations() {
  console.log('Directory Operations Examples\n');
  console.log('═'.repeat(50));

  try {
    // Example 1: Create a single directory
    console.log('\n1. Creating a Single Directory');
    console.log('─'.repeat(50));

    const singleDir = path.join(__dirname, 'test-dir');

    await fs.mkdir(singleDir);
    console.log(`✓ Created: ${path.basename(singleDir)}`);

    // Verify it exists
    const stats = await fs.stat(singleDir);
    console.log(`  Is directory: ${stats.isDirectory()}`);

    // Clean up
    await fs.rmdir(singleDir);
    console.log(`✓ Removed: ${path.basename(singleDir)}`);

    // Example 2: Create nested directories (recursive)
    console.log('\n2. Creating Nested Directories');
    console.log('─'.repeat(50));

    const nestedDir = path.join(__dirname, 'parent/child/grandchild');

    // Without recursive: true, this would fail
    await fs.mkdir(nestedDir, { recursive: true });
    console.log(`✓ Created nested structure: parent/child/grandchild`);

    // Example 3: Safe directory creation (idempotent)
    console.log('\n3. Safe Directory Creation (Idempotent)');
    console.log('─'.repeat(50));

    async function ensureDirectory(dirPath) {
      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`  ✓ Directory ready: ${path.basename(dirPath)}`);
        return true;
      } catch (err) {
        console.error(`  ✗ Failed: ${err.message}`);
        return false;
      }
    }

    const safeDir = path.join(__dirname, 'safe-dir');
    await ensureDirectory(safeDir); // First time
    await ensureDirectory(safeDir); // Second time (doesn't fail)

    // Example 4: Create multiple directories
    console.log('\n4. Creating Multiple Directories');
    console.log('─'.repeat(50));

    const directories = ['uploads', 'downloads', 'temp', 'cache'];

    for (const dir of directories) {
      await fs.mkdir(path.join(__dirname, dir), { recursive: true });
    }
    console.log(`✓ Created ${directories.length} directories`);
    console.log(`  ${directories.join(', ')}`);

    // Example 5: Create directory structure from template
    console.log('\n5. Creating Directory Structure from Template');
    console.log('─'.repeat(50));

    const projectStructure = {
      'my-project': {
        'src': {
          'components': {},
          'utils': {},
          'services': {}
        },
        'tests': {},
        'docs': {},
        'public': {
          'images': {},
          'styles': {}
        }
      }
    };

    async function createStructure(structure, basePath = __dirname) {
      for (const [name, children] of Object.entries(structure)) {
        const dirPath = path.join(basePath, name);
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`  Created: ${path.relative(__dirname, dirPath)}`);

        if (Object.keys(children).length > 0) {
          await createStructure(children, dirPath);
        }
      }
    }

    await createStructure(projectStructure);
    console.log('✓ Project structure created');

    // Example 6: Check if path is file or directory
    console.log('\n6. Distinguishing Files from Directories');
    console.log('─'.repeat(50));

    // Create a test file
    const testFile = path.join(__dirname, 'test.txt');
    await fs.writeFile(testFile, 'test');

    async function getPathType(pathName) {
      try {
        const stats = await fs.stat(pathName);
        if (stats.isDirectory()) return 'directory';
        if (stats.isFile()) return 'file';
        if (stats.isSymbolicLink()) return 'symlink';
        return 'other';
      } catch {
        return 'not found';
      }
    }

    console.log(`  ${path.basename(safeDir)} is: ${await getPathType(safeDir)}`);
    console.log(`  ${path.basename(testFile)} is: ${await getPathType(testFile)}`);
    console.log(`  non-existent is: ${await getPathType('non-existent')}`);

    // Example 7: Remove empty directory
    console.log('\n7. Removing Empty Directory');
    console.log('─'.repeat(50));

    const emptyDir = path.join(__dirname, 'empty');
    await fs.mkdir(emptyDir);

    // Remove with rmdir (only works for empty directories)
    await fs.rmdir(emptyDir);
    console.log(`✓ Removed empty directory: ${path.basename(emptyDir)}`);

    // Example 8: Remove directory with contents (recursive)
    console.log('\n8. Removing Directory with Contents');
    console.log('─'.repeat(50));

    const fullDir = path.join(__dirname, 'full-dir');
    await fs.mkdir(path.join(fullDir, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(fullDir, 'file.txt'), 'content');

    // Remove recursively (use with caution!)
    await fs.rm(fullDir, { recursive: true, force: true });
    console.log(`✓ Removed directory and all contents`);

    // Cleanup all test directories
    console.log('\n9. Cleanup');
    console.log('─'.repeat(50));

    const toDelete = [
      'parent', 'safe-dir', 'uploads', 'downloads', 'temp', 'cache',
      'my-project', testFile
    ];

    for (const item of toDelete) {
      const itemPath = path.join(__dirname, item);
      try {
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          await fs.rm(itemPath, { recursive: true, force: true });
        } else {
          await fs.unlink(itemPath);
        }
      } catch {
        // Already deleted or doesn't exist
      }
    }

    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

demonstrateDirectoryOperations();

/**
 * KEY METHODS:
 *
 * fs.mkdir(path, options)
 * - Creates a directory
 * - Options: { recursive: true, mode: 0o777 }
 * - Throws EEXIST if directory exists (without recursive)
 *
 * fs.rmdir(path)
 * - Removes an EMPTY directory only
 * - Throws ENOTEMPTY if directory has contents
 * - Deprecated for recursive deletion
 *
 * fs.rm(path, options)
 * - Modern way to remove files and directories
 * - Options: { recursive: true, force: true }
 * - Safer and more flexible than rmdir
 */

/**
 * BEST PRACTICES:
 *
 * ✓ Always use { recursive: true } with mkdir
 * ✓ Use fs.rm() instead of fs.rmdir()
 * ✓ Check if directory exists before operations
 * ✓ Use path.join() for cross-platform paths
 * ✓ Handle EEXIST and ENOENT errors gracefully
 *
 * ✗ Don't use mkdirSync in production
 * ✗ Don't remove directories without confirmation
 * ✗ Don't assume directory creation order
 * ✗ Don't hard-code path separators
 */

/**
 * COMMON ERROR CODES:
 *
 * EEXIST - Directory already exists
 * ENOENT - Parent directory doesn't exist (without recursive)
 * EACCES - Permission denied
 * ENOTDIR - Path exists but is not a directory
 * ENOTEMPTY - Directory not empty (with rmdir)
 */
