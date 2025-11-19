# Understanding Recursive Operations

## Introduction

Recursive operations allow you to traverse directory trees, processing files and folders at any depth. This is essential for tasks like searching files, copying directory structures, calculating sizes, and more. This guide teaches you how to safely and efficiently implement recursive file system operations.

## Part 1: Understanding Recursion

### What is Recursion?

Recursion is when a function calls itself to solve a problem by breaking it down into smaller instances of the same problem.

**Simple Example**:
```javascript
function countdown(n) {
  if (n <= 0) {
    console.log('Done!');
    return;
  }
  console.log(n);
  countdown(n - 1); // Function calls itself
}

countdown(3);
// Output: 3, 2, 1, Done!
```

### Recursion in File Systems

File systems are naturally hierarchical (tree-like), making them perfect for recursive operations:

```
project/
├── src/
│   ├── index.js
│   └── utils/
│       └── helper.js
├── tests/
│   └── test.js
└── README.md
```

To process all files, you need to:
1. Process files in current directory
2. For each subdirectory, repeat step 1 (recursion)

## Part 2: Basic Directory Traversal

### Simple Recursive Directory Walk

```javascript
const fs = require('fs').promises;
const path = require('path');

async function walkDirectory(dir, indent = 0) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const prefix = '  '.repeat(indent);

    if (entry.isDirectory()) {
      console.log(`${prefix}📁 ${entry.name}/`);
      await walkDirectory(fullPath, indent + 1); // Recursive call
    } else {
      console.log(`${prefix}📄 ${entry.name}`);
    }
  }
}

// Usage
await walkDirectory('project');
// Output:
// 📁 src/
//   📄 index.js
//   📁 utils/
//     📄 helper.js
// 📁 tests/
//   📄 test.js
// 📄 README.md
```

**How it works**:
1. Read directory entries
2. For each entry, check if it's a file or directory
3. If directory, recursively call the function with that directory
4. If file, process it

### Collecting All Files

```javascript
async function getAllFiles(dir, fileList = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectory
      await getAllFiles(fullPath, fileList);
    } else {
      // Add file to list
      fileList.push(fullPath);
    }
  }

  return fileList;
}

// Usage
const files = await getAllFiles('src');
console.log(files);
// ['src/index.js', 'src/utils/helper.js', ...]
```

## Part 3: Safe Recursion Patterns

### Pattern 1: Maximum Depth Limit

Prevent infinite recursion by limiting depth:

```javascript
async function walkDirectorySafe(dir, maxDepth = 10, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    console.log(`Max depth reached at ${dir}`);
    return;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      console.log('DIR:', fullPath);
      await walkDirectorySafe(fullPath, maxDepth, currentDepth + 1);
    } else {
      console.log('FILE:', fullPath);
    }
  }
}

// Won't recurse deeper than 5 levels
await walkDirectorySafe('project', 5);
```

### Pattern 2: Avoiding Circular References (Symlinks)

Symbolic links can create infinite loops. Track visited directories:

```javascript
async function walkDirectoryNoLoops(dir, visited = new Set()) {
  // Get real path (resolves symlinks)
  const realPath = await fs.realpath(dir);

  // Check if we've already visited this directory
  if (visited.has(realPath)) {
    console.log(`Skipping already visited: ${realPath}`);
    return;
  }

  // Mark as visited
  visited.add(realPath);

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkDirectoryNoLoops(fullPath, visited);
    } else {
      console.log('FILE:', fullPath);
    }
  }
}

await walkDirectoryNoLoops('project');
```

### Pattern 3: Error Handling

Don't let one bad directory stop the entire traversal:

```javascript
async function walkDirectoryRobust(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      try {
        if (entry.isDirectory()) {
          await walkDirectoryRobust(fullPath);
        } else {
          console.log('FILE:', fullPath);
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error.message);
        // Continue with next entry instead of stopping
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
}
```

## Part 4: Common Recursive Operations

### Operation 1: Find Files by Extension

```javascript
async function findFilesByExtension(dir, extension) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subResults = await findFilesByExtension(fullPath, extension);
      results.push(...subResults);
    } else if (entry.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }

  return results;
}

// Find all JavaScript files
const jsFiles = await findFilesByExtension('src', '.js');
console.log(jsFiles);
```

### Operation 2: Calculate Directory Size

```javascript
async function getDirectorySize(dir) {
  let totalSize = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively get size of subdirectory
      totalSize += await getDirectorySize(fullPath);
    } else {
      // Get file size
      const stats = await fs.stat(fullPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

// Usage
const size = await getDirectorySize('node_modules');
console.log(`Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
```

### Operation 3: Copy Directory Recursively

```javascript
async function copyDirectory(source, destination) {
  // Create destination directory
  await fs.mkdir(destination, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      await copyDirectory(sourcePath, destPath);
    } else {
      // Copy file
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

// Usage
await copyDirectory('src', 'backup/src');
```

### Operation 4: Delete Directory Recursively

```javascript
async function deleteDirectoryRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively delete subdirectory
      await deleteDirectoryRecursive(fullPath);
    } else {
      // Delete file
      await fs.unlink(fullPath);
    }
  }

  // Delete the now-empty directory
  await fs.rmdir(dir);
}

// Modern alternative (Node.js 14.14+):
await fs.rm(dir, { recursive: true, force: true });
```

### Operation 5: Build Directory Tree Structure

```javascript
async function buildDirectoryTree(dir) {
  const tree = {};
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively build subtree
      tree[entry.name] = await buildDirectoryTree(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      tree[entry.name] = {
        size: stats.size,
        modified: stats.mtime
      };
    }
  }

  return tree;
}

// Usage
const tree = await buildDirectoryTree('src');
console.log(JSON.stringify(tree, null, 2));
// {
//   "index.js": { "size": 1234, "modified": "2024-01-15..." },
//   "utils": {
//     "helper.js": { "size": 567, "modified": "2024-01-14..." }
//   }
// }
```

## Part 5: Performance Optimization

### Parallel Processing with Promise.all()

```javascript
// ❌ SLOW: Sequential processing
async function processFilesSlow(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      await processFile(entry.name); // Waits for each file
    }
  }
}

// ✅ FAST: Parallel processing
async function processFilesFast(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const fileEntries = entries.filter(e => e.isFile());

  await Promise.all(
    fileEntries.map(entry => processFile(entry.name))
  );
}
```

### Using Generators for Large Trees

```javascript
async function* walkDirectoryGenerator(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively yield from subdirectory
      yield* walkDirectoryGenerator(fullPath);
    } else {
      yield fullPath;
    }
  }
}

// Usage: Process one file at a time (memory efficient)
for await (const file of walkDirectoryGenerator('large-directory')) {
  console.log('Processing:', file);
  await processFile(file);
}
```

### Limiting Concurrency

```javascript
async function walkWithConcurrencyLimit(dir, processFile, limit = 5) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  // Process files in batches
  const files = entries.filter(e => e.isFile());

  for (let i = 0; i < files.length; i += limit) {
    const batch = files.slice(i, i + limit);
    await Promise.all(
      batch.map(entry => processFile(path.join(dir, entry.name)))
    );
  }

  // Recurse into subdirectories
  const dirs = entries.filter(e => e.isDirectory());
  for (const dir of dirs) {
    await walkWithConcurrencyLimit(
      path.join(dir, dir.name),
      processFile,
      limit
    );
  }
}
```

## Part 6: Advanced Patterns

### Pattern: Filter During Traversal

```javascript
async function walkWithFilter(dir, options = {}) {
  const {
    includeFiles = () => true,
    includeDirs = () => true,
    maxDepth = Infinity,
    currentDepth = 0
  } = options;

  if (currentDepth >= maxDepth) return [];

  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (includeDirs(entry.name, fullPath)) {
        const subResults = await walkWithFilter(fullPath, {
          ...options,
          currentDepth: currentDepth + 1
        });
        results.push(...subResults);
      }
    } else {
      if (includeFiles(entry.name, fullPath)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// Usage: Find large JavaScript files, skip node_modules
const largeJsFiles = await walkWithFilter('project', {
  includeFiles: async (name, path) => {
    if (!name.endsWith('.js')) return false;
    const stats = await fs.stat(path);
    return stats.size > 10000; // Larger than 10KB
  },
  includeDirs: (name) => name !== 'node_modules'
});
```

### Pattern: Collect Statistics

```javascript
async function analyzeDirectory(dir) {
  const stats = {
    totalFiles: 0,
    totalDirs: 0,
    totalSize: 0,
    fileTypes: {},
    largestFile: { name: '', size: 0 }
  };

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stats.totalDirs++;
        await walk(fullPath);
      } else {
        stats.totalFiles++;
        const fileStat = await fs.stat(fullPath);
        stats.totalSize += fileStat.size;

        // Track file types
        const ext = path.extname(entry.name) || 'no extension';
        stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;

        // Track largest file
        if (fileStat.size > stats.largestFile.size) {
          stats.largestFile = {
            name: fullPath,
            size: fileStat.size
          };
        }
      }
    }
  }

  await walk(dir);
  return stats;
}

// Usage
const stats = await analyzeDirectory('src');
console.log(stats);
// {
//   totalFiles: 42,
//   totalDirs: 8,
//   totalSize: 123456,
//   fileTypes: { '.js': 30, '.json': 5, '.md': 7 },
//   largestFile: { name: 'src/bundle.js', size: 45000 }
// }
```

## Part 7: Common Mistakes

### Mistake 1: Stack Overflow

```javascript
// ❌ BAD: No depth limit
async function dangerousWalk(dir) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    await dangerousWalk(path.join(dir, entry)); // Infinite depth!
  }
}

// ✅ GOOD: With depth limit
async function safeWalk(dir, depth = 0, maxDepth = 100) {
  if (depth >= maxDepth) return;
  // ... rest of code
}
```

### Mistake 2: Not Checking File Type

```javascript
// ❌ BAD: Assumes all entries are files
async function badWalk(dir) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    await fs.readFile(path.join(dir, entry)); // Fails on directories!
  }
}

// ✅ GOOD: Check file type
async function goodWalk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      await fs.readFile(path.join(dir, entry.name));
    }
  }
}
```

### Mistake 3: Modifying While Iterating

```javascript
// ❌ DANGEROUS: Deleting while iterating
async function dangerousDelete(dir) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    await fs.unlink(fullPath); // Can cause issues
  }
  await fs.rmdir(dir); // May fail if directory not empty
}

// ✅ SAFE: Use built-in recursive delete
await fs.rm(dir, { recursive: true, force: true });
```

## Part 8: Testing Your Understanding

### Quick Quiz

1. **Q**: What is the base case in recursive directory traversal?
   **A**: When you encounter a file (not a directory) or reach max depth

2. **Q**: Why should you track visited directories?
   **A**: To avoid infinite loops caused by symbolic links

3. **Q**: What's more memory efficient for large directories: collecting all results or using generators?
   **A**: Generators - they yield one result at a time

4. **Q**: When should you use `Promise.all()` in recursive operations?
   **A**: When processing files in parallel (not for recursion itself, as it can cause stack overflow)

### Mini Exercise

Create a function that finds all files modified in the last 7 days:

```javascript
async function findRecentFiles(dir, days = 7) {
  // Your code here
}

const recentFiles = await findRecentFiles('project', 7);
console.log(recentFiles);
```

## Summary

### Key Takeaways

1. **Always set a maximum depth** to prevent stack overflow
2. **Track visited directories** to avoid infinite loops from symlinks
3. **Use `withFileTypes: true`** for better performance
4. **Handle errors gracefully** - don't let one bad file stop traversal
5. **Consider using generators** for memory efficiency with large trees
6. **Use `Promise.all()` carefully** - good for parallel file processing, not recursion
7. **Filter early** to avoid processing unnecessary files/directories

### Quick Reference

```javascript
// Basic recursive walk
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else {
      // Process file
    }
  }
}
```

## Further Reading

- [Recursion in Computer Science](https://en.wikipedia.org/wiki/Recursion_(computer_science))
- [Tree Traversal Algorithms](https://en.wikipedia.org/wiki/Tree_traversal)
- [Node.js fs.readdir documentation](https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback)

## Next Guide

Continue to [Metadata and Stats](./04-metadata-and-stats.md) to learn how to extract detailed information about files and directories.
