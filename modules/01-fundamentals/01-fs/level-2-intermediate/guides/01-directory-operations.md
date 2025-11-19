# Understanding Directory Operations

## Introduction

Directory operations are fundamental to file system management in Node.js. This guide explains how to create, read, delete, and manage directories programmatically, providing you with the knowledge to build robust file organization systems.

## Part 1: The Basics

### What is a Directory?

A directory (also called a folder) is a special type of file that contains references to other files and directories. Think of it as a container that organizes your files into a hierarchical structure.

**Key Insight**: In Unix-based systems (Linux, macOS), "everything is a file" - including directories. They're just special files that contain a list of entries.

### Directory vs File

```javascript
const fs = require('fs').promises;
const path = require('path');

// Check if something is a directory
const stats = await fs.stat('some-path');
console.log(stats.isDirectory()); // true or false
console.log(stats.isFile());      // true or false
```

## Part 2: Creating Directories

### Basic Directory Creation

```javascript
const fs = require('fs').promises;

// Create a single directory
await fs.mkdir('new-folder');

// This fails if the directory already exists!
```

**Important**: `mkdir()` throws an error if the directory already exists. You need to handle this error.

### Handling "Already Exists" Error

```javascript
async function createDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath);
    console.log(`Created directory: ${dirPath}`);
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log(`Directory already exists: ${dirPath}`);
    } else {
      throw error; // Re-throw other errors
    }
  }
}
```

### Recursive Directory Creation

One of the most useful features is creating nested directories:

```javascript
// Create parent/child/grandchild in one operation
await fs.mkdir('parent/child/grandchild', { recursive: true });
```

**How it works**:
1. Checks if 'parent' exists, creates it if not
2. Checks if 'parent/child' exists, creates it if not
3. Checks if 'parent/child/grandchild' exists, creates it if not

**Benefits**:
- No need to check if parent directories exist
- No "ENOENT: no such file or directory" errors
- Cleaner, more maintainable code

### Safe Directory Creation Pattern

The best practice for creating directories:

```javascript
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Even with recursive: true, other errors can occur
    // (permissions, disk full, etc.)
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Usage
await ensureDirectory('logs/2024/january');
// Creates logs/ then logs/2024/ then logs/2024/january/
```

## Part 3: Reading Directories

### Basic Directory Reading

```javascript
// Get list of files and directories
const entries = await fs.readdir('my-directory');
console.log(entries);
// Output: ['file1.txt', 'file2.js', 'subfolder']
```

**Important**: This returns only the names, not full paths.

### Getting Full Paths

```javascript
const path = require('path');

const entries = await fs.readdir('my-directory');
const fullPaths = entries.map(entry => path.join('my-directory', entry));

console.log(fullPaths);
// Output: ['my-directory/file1.txt', 'my-directory/file2.js', ...]
```

### Reading with File Types

The most efficient way to read directories:

```javascript
const entries = await fs.readdir('my-directory', { withFileTypes: true });

for (const entry of entries) {
  const fullPath = path.join('my-directory', entry.name);

  if (entry.isFile()) {
    console.log(`FILE: ${fullPath}`);
  } else if (entry.isDirectory()) {
    console.log(`DIR:  ${fullPath}`);
  } else if (entry.isSymbolicLink()) {
    console.log(`LINK: ${fullPath}`);
  }
}
```

**Why use `withFileTypes`?**
- More efficient than calling `fs.stat()` for each entry
- Gets file type information in one system call
- Much faster for directories with many entries

### Filtering Directory Contents

```javascript
// Get only JavaScript files
const entries = await fs.readdir('src', { withFileTypes: true });
const jsFiles = entries
  .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
  .map(entry => entry.name);

console.log('JavaScript files:', jsFiles);
```

```javascript
// Get only subdirectories
const entries = await fs.readdir('src', { withFileTypes: true });
const subdirs = entries
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

console.log('Subdirectories:', subdirs);
```

## Part 4: Deleting Directories

### Deleting Empty Directories

```javascript
// Only works if directory is empty
await fs.rmdir('empty-folder');
```

**This will fail if**:
- Directory contains files
- Directory contains subdirectories
- Directory doesn't exist

### Deleting Non-Empty Directories

```javascript
// Recursively delete directory and all contents
await fs.rm('my-folder', { recursive: true, force: true });
```

**Options explained**:
- `recursive: true` - Delete directory and all contents
- `force: true` - Don't throw error if directory doesn't exist

**⚠️ DANGER**: This permanently deletes everything. Use with caution!

### Safe Deletion Pattern

```javascript
async function safeDeleteDirectory(dirPath, options = {}) {
  const { confirm = true } = options;

  // Check if directory exists
  try {
    await fs.access(dirPath);
  } catch {
    console.log(`Directory doesn't exist: ${dirPath}`);
    return;
  }

  // Optional: require confirmation for safety
  if (confirm) {
    console.log(`⚠️  This will delete ${dirPath} and all contents!`);
    // In real app, prompt user for confirmation
  }

  // Perform deletion
  await fs.rm(dirPath, { recursive: true, force: true });
  console.log(`Deleted: ${dirPath}`);
}
```

## Part 5: Checking Directory Existence

### The Right Way (Modern)

```javascript
async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// Usage
if (await directoryExists('my-folder')) {
  console.log('Directory exists');
} else {
  console.log('Directory does not exist');
}
```

### The Wrong Way (Deprecated)

```javascript
// ❌ DON'T USE - fs.exists() is deprecated
fs.exists('my-folder', (exists) => {
  // This creates race conditions
});
```

**Why is `fs.exists()` bad?**
1. Creates race conditions (directory might be deleted between check and use)
2. Callback-based (doesn't work with promises/async-await)
3. Officially deprecated

### Better: Just Try the Operation

```javascript
// Instead of checking if directory exists, just try to create it
await fs.mkdir('my-folder', { recursive: true });
// If it exists, no error. If not, creates it.
```

## Part 6: Common Patterns

### Pattern 1: Create Directory Tree from Object

```javascript
async function createDirectoryTree(basePath, structure) {
  for (const [name, value] of Object.entries(structure)) {
    const fullPath = path.join(basePath, name);

    if (typeof value === 'object') {
      // It's a directory with subdirectories
      await fs.mkdir(fullPath, { recursive: true });
      await createDirectoryTree(fullPath, value);
    } else {
      // It's a file
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, value);
    }
  }
}

// Usage
await createDirectoryTree('.', {
  'src': {
    'components': {
      'Button.js': 'export default function Button() {}',
      'Input.js': 'export default function Input() {}'
    },
    'utils': {
      'helpers.js': 'export function helper() {}'
    }
  },
  'README.md': '# My Project'
});
```

### Pattern 2: List All Directories

```javascript
async function getAllDirectories(basePath) {
  const entries = await fs.readdir(basePath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(basePath, entry.name));
}

// Usage
const dirs = await getAllDirectories('src');
console.log('All directories:', dirs);
```

### Pattern 3: Create Timestamped Directory

```javascript
function createTimestampedDirectory(basePath, prefix = 'backup') {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const dirName = `${prefix}-${timestamp}`;
  const fullPath = path.join(basePath, dirName);

  await fs.mkdir(fullPath, { recursive: true });
  return fullPath;
}

// Usage
const backupDir = await createTimestampedDirectory('backups');
console.log('Created backup directory:', backupDir);
// backups/backup-2024-01-15T10-30-00.000Z
```

## Part 7: Cross-Platform Considerations

### Path Separators

```javascript
// ❌ BAD: Hardcoded separators don't work on Windows
const badPath = 'parent/child/file.txt';

// ✅ GOOD: Use path.join()
const goodPath = path.join('parent', 'child', 'file.txt');
// Works on Unix: parent/child/file.txt
// Works on Windows: parent\child\file.txt
```

### Home Directory

```javascript
const os = require('os');
const homeDir = os.homedir();

// Create directory in user's home
const myAppDir = path.join(homeDir, '.myapp');
await fs.mkdir(myAppDir, { recursive: true });
```

### Temporary Directories

```javascript
const os = require('os');
const tmpDir = os.tmpdir();

// Create temporary directory
const myTmpDir = path.join(tmpDir, 'my-app-temp');
await fs.mkdir(myTmpDir, { recursive: true });
```

## Part 8: Performance Optimization

### Batch Directory Creation

```javascript
// ❌ SLOW: Sequential creation
for (const dir of directories) {
  await fs.mkdir(dir, { recursive: true });
}

// ✅ FAST: Parallel creation
await Promise.all(
  directories.map(dir => fs.mkdir(dir, { recursive: true }))
);
```

### Caching Directory Checks

```javascript
class DirectoryManager {
  constructor() {
    this.ensuredDirs = new Set();
  }

  async ensureDirectory(dirPath) {
    if (this.ensuredDirs.has(dirPath)) {
      return; // Already ensured
    }

    await fs.mkdir(dirPath, { recursive: true });
    this.ensuredDirs.add(dirPath);
  }
}

// Usage
const manager = new DirectoryManager();
await manager.ensureDirectory('logs/2024/jan'); // Creates it
await manager.ensureDirectory('logs/2024/jan'); // Skips (cached)
```

## Part 9: Common Mistakes

### Mistake 1: Not Handling Errors

```javascript
// ❌ BAD
await fs.mkdir('new-folder');
// Crashes if directory exists or permissions denied

// ✅ GOOD
try {
  await fs.mkdir('new-folder', { recursive: true });
} catch (error) {
  console.error('Failed to create directory:', error.message);
}
```

### Mistake 2: Using Sync Methods

```javascript
// ❌ BAD: Blocks entire application
const entries = fs.readdirSync('large-directory');

// ✅ GOOD: Non-blocking
const entries = await fs.readdir('large-directory');
```

### Mistake 3: Not Using path.join()

```javascript
// ❌ BAD: Manual path construction
const fullPath = dirPath + '/' + fileName;

// ✅ GOOD: Cross-platform
const fullPath = path.join(dirPath, fileName);
```

## Part 10: Testing Your Understanding

### Quick Quiz

1. **Q**: What happens if you call `fs.mkdir()` on a directory that already exists?
   **A**: It throws an error (unless you use `{ recursive: true }`)

2. **Q**: Why should you use `withFileTypes: true` when reading directories?
   **A**: It's more efficient - gets file types without additional stat() calls

3. **Q**: What's the safest way to delete a directory and all its contents?
   **A**: `fs.rm(dir, { recursive: true, force: true })`

4. **Q**: Why shouldn't you use `fs.exists()`?
   **A**: It's deprecated and creates race conditions

### Mini Exercise

Create a function that:
1. Takes a base path and an array of directory names
2. Creates all directories under the base path
3. Returns an array of created directory paths
4. Handles errors gracefully

```javascript
async function createDirectories(basePath, dirNames) {
  // Your code here
}

// Test
const created = await createDirectories('projects', ['web', 'mobile', 'api']);
console.log(created);
// ['projects/web', 'projects/mobile', 'projects/api']
```

## Summary

### Key Takeaways

1. **Always use `{ recursive: true }`** for mkdir unless you specifically need to fail on existing directories
2. **Use `withFileTypes: true`** when reading directories for better performance
3. **Use `path.join()`** for cross-platform compatibility
4. **Handle errors properly** - don't let your app crash
5. **Be careful with `fs.rm()`** - it permanently deletes data
6. **Use async methods** - never block the event loop

### Common Operations Quick Reference

```javascript
// Create directory
await fs.mkdir('dir', { recursive: true });

// Read directory
const entries = await fs.readdir('dir', { withFileTypes: true });

// Delete directory
await fs.rm('dir', { recursive: true, force: true });

// Check if directory exists
try {
  const stats = await fs.stat('dir');
  const exists = stats.isDirectory();
} catch {
  const exists = false;
}
```

## Further Reading

- [Official Node.js fs Documentation](https://nodejs.org/api/fs.html)
- [POSIX directory operations](https://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html)
- [Path module documentation](https://nodejs.org/api/path.html)

## Next Guide

Ready to learn more? Continue to [File Watching](./02-file-watching.md) to learn how to monitor directories for changes in real-time.
