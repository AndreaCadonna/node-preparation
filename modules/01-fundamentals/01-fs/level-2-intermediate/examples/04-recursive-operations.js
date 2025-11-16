/**
 * Example 4: Recursive Operations
 *
 * Demonstrates recursive directory traversal and file operations.
 *
 * Key Concepts:
 * - Recursive directory walking
 * - Tree traversal algorithms
 * - Collecting files recursively
 * - Preventing infinite loops
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateRecursiveOperations() {
  console.log('Recursive File Operations\n');
  console.log('═'.repeat(50));

  try {
    // Setup: Create test directory tree
    const baseDir = path.join(__dirname, 'test-tree');
    const structure = {
      'file1.txt': 'Root file 1',
      'file2.js': 'Root file 2',
      'dir1': {
        'file3.txt': 'Dir1 file',
        'file4.md': 'Dir1 markdown',
        'subdir1': {
          'file5.txt': 'Subdir1 file',
          'file6.json': '{"key": "value"}'
        }
      },
      'dir2': {
        'file7.txt': 'Dir2 file'
      },
      'empty-dir': {}
    };

    async function createStructure(base, struct) {
      await fs.mkdir(base, { recursive: true });

      for (const [name, content] of Object.entries(struct)) {
        const fullPath = path.join(base, name);

        if (typeof content === 'object') {
          await createStructure(fullPath, content);
        } else {
          await fs.writeFile(fullPath, content);
        }
      }
    }

    await createStructure(baseDir, structure);
    console.log('Created test directory structure\n');

    // Example 1: Simple recursive walk
    console.log('1. Simple Recursive Walk');
    console.log('─'.repeat(50));

    async function walkDirectory(dir, depth = 0) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const indent = '  '.repeat(depth);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const icon = entry.isDirectory() ? '📁' : '📄';

        console.log(`${indent}${icon} ${entry.name}`);

        if (entry.isDirectory()) {
          await walkDirectory(fullPath, depth + 1);
        }
      }
    }

    await walkDirectory(baseDir);

    // Example 2: Collect all files recursively
    console.log('\n2. Collecting All Files');
    console.log('─'.repeat(50));

    async function getAllFiles(dir, fileList = []) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await getAllFiles(fullPath, fileList);
        } else {
          fileList.push(fullPath);
        }
      }

      return fileList;
    }

    const allFiles = await getAllFiles(baseDir);
    console.log(`Found ${allFiles.length} files:`);
    allFiles.forEach(file => {
      console.log(`  ${path.relative(baseDir, file)}`);
    });

    // Example 3: Find files by extension
    console.log('\n3. Finding Files by Extension');
    console.log('─'.repeat(50));

    async function findFilesByExtension(dir, ext) {
      const allFiles = await getAllFiles(dir);
      return allFiles.filter(file => path.extname(file) === ext);
    }

    const txtFiles = await findFilesByExtension(baseDir, '.txt');
    console.log(`.txt files (${txtFiles.length}):`);
    txtFiles.forEach(file => {
      console.log(`  ${path.relative(baseDir, file)}`);
    });

    // Example 4: Search for files by name pattern
    console.log('\n4. Search by Name Pattern');
    console.log('─'.repeat(50));

    async function searchFiles(dir, pattern) {
      const allFiles = await getAllFiles(dir);
      const regex = new RegExp(pattern, 'i');
      return allFiles.filter(file => regex.test(path.basename(file)));
    }

    const matchingFiles = await searchFiles(baseDir, 'file[0-9]');
    console.log(`Files matching pattern 'file[0-9]' (${matchingFiles.length}):`);
    matchingFiles.forEach(file => {
      console.log(`  ${path.relative(baseDir, file)}`);
    });

    // Example 5: Build directory tree structure
    console.log('\n5. Building Tree Structure');
    console.log('─'.repeat(50));

    async function buildTree(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const tree = {};

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          tree[entry.name] = await buildTree(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          tree[entry.name] = {
            type: 'file',
            size: stats.size
          };
        }
      }

      return tree;
    }

    const tree = await buildTree(baseDir);
    console.log('Tree structure:');
    console.log(JSON.stringify(tree, null, 2));

    // Example 6: Recursive copy
    console.log('\n6. Recursive Directory Copy');
    console.log('─'.repeat(50));

    async function copyDirectory(src, dest) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      let filesCopied = 0;
      let dirsCopied = 0;

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          const result = await copyDirectory(srcPath, destPath);
          filesCopied += result.files;
          dirsCopied += result.dirs + 1;
        } else {
          await fs.copyFile(srcPath, destPath);
          filesCopied++;
        }
      }

      return { files: filesCopied, dirs: dirsCopied };
    }

    const copyDest = path.join(__dirname, 'test-tree-copy');
    const copyStats = await copyDirectory(baseDir, copyDest);
    console.log(`Copied: ${copyStats.files} files, ${copyStats.dirs} directories`);

    // Example 7: Count files and directories
    console.log('\n7. Counting Files and Directories');
    console.log('─'.repeat(50));

    async function countItems(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let files = 0;
      let dirs = 0;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs++;
          const subCounts = await countItems(path.join(dir, entry.name));
          files += subCounts.files;
          dirs += subCounts.dirs;
        } else {
          files++;
        }
      }

      return { files, dirs };
    }

    const counts = await countItems(baseDir);
    console.log(`Total files: ${counts.files}`);
    console.log(`Total directories: ${counts.dirs}`);

    // Example 8: Safe recursive delete with limit
    console.log('\n8. Safe Recursive Operations');
    console.log('─'.repeat(50));

    async function safeWalk(dir, callback, maxDepth = 10, currentDepth = 0) {
      if (currentDepth > maxDepth) {
        throw new Error(`Maximum depth ${maxDepth} exceeded`);
      }

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        await callback(fullPath, entry);

        if (entry.isDirectory()) {
          await safeWalk(fullPath, callback, maxDepth, currentDepth + 1);
        }
      }
    }

    let itemCount = 0;
    await safeWalk(baseDir, async (filePath, entry) => {
      itemCount++;
      // Process each item
    }, 5); // Max depth of 5

    console.log(`Processed ${itemCount} items (depth-limited)`);

    // Cleanup
    console.log('\n9. Cleanup');
    console.log('─'.repeat(50));

    await fs.rm(baseDir, { recursive: true, force: true });
    await fs.rm(copyDest, { recursive: true, force: true });
    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

demonstrateRecursiveOperations();

/**
 * Recursive Patterns:
 *
 * 1. Depth-First Search (DFS):
 *    Process directory, then recurse into subdirectories
 *
 * 2. Breadth-First Search (BFS):
 *    Process all items at current level, then go deeper
 *
 * 3. Pre-order Traversal:
 *    Process directory before its contents
 *
 * 4. Post-order Traversal:
 *    Process directory after its contents
 */

/**
 * Safety Considerations:
 *
 * ✓ Implement maximum depth limit
 * ✓ Track visited paths to avoid cycles (symlinks)
 * ✓ Handle permission errors gracefully
 * ✓ Use try-catch for each directory
 * ✓ Consider memory usage for large trees
 *
 * ✗ Don't follow symlinks without checking
 * ✗ Don't recurse without depth limit
 * ✗ Don't load all results in memory for huge trees
 */

/**
 * Performance Tips:
 *
 * 1. Use withFileTypes to avoid extra stat calls
 * 2. Use generators for large directory trees
 * 3. Process in parallel with Promise.all() when safe
 * 4. Stream results instead of collecting all
 * 5. Cache stat results when needed multiple times
 */
