# Understanding File Metadata and Stats

## Introduction

Every file and directory has metadata - information about the file itself rather than its contents. This includes size, modification dates, permissions, and more. Understanding file metadata is crucial for building smart file management tools, backup systems, and content management applications.

## Part 1: What is File Metadata?

### Understanding Stats

When you call `fs.stat()`, you get a `Stats` object containing detailed information about a file or directory.

```javascript
const fs = require('fs').promises;

const stats = await fs.stat('example.txt');
console.log(stats);
```

**Output**:
```javascript
Stats {
  dev: 2114,
  ino: 48064969,
  mode: 33188,
  nlink: 1,
  uid: 85,
  gid: 100,
  rdev: 0,
  size: 527,
  blksize: 4096,
  blocks: 8,
  atimeMs: 1318289051000.1,
  mtimeMs: 1318289051000.1,
  ctimeMs: 1318289051000.1,
  birthtimeMs: 1318289051000.1,
  atime: Mon, 10 Oct 2011 23:24:11 GMT,
  mtime: Mon, 10 Oct 2011 23:24:11 GMT,
  ctime: Mon, 10 Oct 2011 23:24:11 GMT,
  birthtime: Mon, 10 Oct 2011 23:24:11 GMT
}
```

### Key Properties Explained

| Property | Description | Example Use Case |
|----------|-------------|------------------|
| `size` | File size in bytes | Check if file is too large |
| `mtime` | Last modified time | Find recently changed files |
| `atime` | Last accessed time | Find unused files |
| `birthtime` | Creation time | Sort by age |
| `mode` | File permissions | Check if file is executable |
| `isFile()` | Is it a file? | Filter files vs directories |
| `isDirectory()` | Is it a directory? | Decide how to process |

## Part 2: Getting File Stats

### Three Ways to Get Stats

```javascript
// 1. fs.stat() - Get stats for path (follows symlinks)
const stats1 = await fs.stat('file.txt');

// 2. fs.lstat() - Get stats for path (doesn't follow symlinks)
const stats2 = await fs.lstat('link-to-file.txt');

// 3. With readdir() - Most efficient for directories
const entries = await fs.readdir('dir', { withFileTypes: true });
// entries already have type information!
```

### When to Use Each

```javascript
// Use stat() when you want to follow symlinks
const stats = await fs.stat('might-be-a-symlink');
console.log('Actual file size:', stats.size);

// Use lstat() when you want info about the symlink itself
const linkStats = await fs.lstat('symlink');
if (linkStats.isSymbolicLink()) {
  console.log('This is a symlink');
  const target = await fs.readlink('symlink');
  console.log('Points to:', target);
}

// Use withFileTypes for better performance
const entries = await fs.readdir('dir', { withFileTypes: true });
for (const entry of entries) {
  if (entry.isFile()) {
    // No need for separate stat() call!
    console.log('File:', entry.name);
  }
}
```

## Part 3: File Size

### Getting and Formatting File Size

```javascript
async function getFileSize(filepath) {
  const stats = await fs.stat(filepath);
  return stats.size; // Size in bytes
}

// Human-readable size
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Usage
const size = await getFileSize('large-file.zip');
console.log('Raw:', size);              // 1048576
console.log('Formatted:', formatBytes(size)); // 1 MB
```

### Finding Large Files

```javascript
async function findLargeFiles(dir, minSize = 1024 * 1024) { // 1MB default
  const largeFiles = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        if (stats.size >= minSize) {
          largeFiles.push({
            path: fullPath,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size)
          });
        }
      }
    }
  }

  await walk(dir);
  return largeFiles.sort((a, b) => b.size - a.size);
}

// Find files larger than 10MB
const large = await findLargeFiles('project', 10 * 1024 * 1024);
console.log(large);
```

## Part 4: Timestamps

### Understanding Different Times

```javascript
const stats = await fs.stat('file.txt');

// Access time - when file was last read
console.log('Last accessed:', stats.atime);

// Modified time - when file content was last changed
console.log('Last modified:', stats.mtime);

// Changed time - when file metadata was last changed
console.log('Last changed:', stats.ctime);

// Birth time - when file was created
console.log('Created:', stats.birthtime);
```

**Important Differences**:
- `mtime` changes when you edit the file
- `ctime` changes when you rename, chmod, or edit the file
- `atime` changes when you read the file (often disabled for performance)
- `birthtime` never changes (when the file was created)

### Finding Recently Modified Files

```javascript
async function findRecentlyModified(dir, hours = 24) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const recentFiles = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        if (stats.mtimeMs > cutoff) {
          recentFiles.push({
            path: fullPath,
            modified: stats.mtime,
            hoursAgo: ((Date.now() - stats.mtimeMs) / 1000 / 60 / 60).toFixed(1)
          });
        }
      }
    }
  }

  await walk(dir);
  return recentFiles.sort((a, b) => b.modified - a.modified);
}

// Files modified in last 24 hours
const recent = await findRecentlyModified('src', 24);
recent.forEach(file => {
  console.log(`${file.hoursAgo}h ago: ${file.path}`);
});
```

### Comparing File Ages

```javascript
async function isNewerThan(file1, file2) {
  const stats1 = await fs.stat(file1);
  const stats2 = await fs.stat(file2);

  return stats1.mtime > stats2.mtime;
}

// Check if source is newer than build output
if (await isNewerThan('src/index.js', 'dist/bundle.js')) {
  console.log('Source is newer - need to rebuild!');
}
```

## Part 5: File Types and Permissions

### Checking File Types

```javascript
const stats = await fs.stat('some-path');

// Check what type of file system entry it is
console.log('Is file:', stats.isFile());
console.log('Is directory:', stats.isDirectory());
console.log('Is symlink:', stats.isSymbolicLink());
console.log('Is block device:', stats.isBlockDevice());
console.log('Is character device:', stats.isCharacterDevice());
console.log('Is FIFO:', stats.isFIFO());
console.log('Is socket:', stats.isSocket());
```

### Understanding Permissions (Unix)

```javascript
const stats = await fs.stat('script.sh');

// Mode contains file type and permissions
console.log('Mode:', stats.mode);
console.log('Mode (octal):', stats.mode.toString(8));

// Check if file is executable
const isExecutable = (stats.mode & 0o111) !== 0;
console.log('Is executable:', isExecutable);

// Get permissions only (last 3 octal digits)
const permissions = stats.mode & 0o777;
console.log('Permissions:', permissions.toString(8)); // e.g., "755"
```

### Checking Read/Write Permissions

```javascript
async function checkPermissions(filepath) {
  const stats = await fs.stat(filepath);
  const mode = stats.mode;

  // Owner permissions (user)
  const ownerRead = (mode & 0o400) !== 0;
  const ownerWrite = (mode & 0o200) !== 0;
  const ownerExecute = (mode & 0o100) !== 0;

  // Group permissions
  const groupRead = (mode & 0o040) !== 0;
  const groupWrite = (mode & 0o020) !== 0;
  const groupExecute = (mode & 0o010) !== 0;

  // Others permissions
  const othersRead = (mode & 0o004) !== 0;
  const othersWrite = (mode & 0o002) !== 0;
  const othersExecute = (mode & 0o001) !== 0;

  return {
    owner: { read: ownerRead, write: ownerWrite, execute: ownerExecute },
    group: { read: groupRead, write: groupWrite, execute: groupExecute },
    others: { read: othersRead, write: othersWrite, execute: othersExecute }
  };
}

const perms = await checkPermissions('script.sh');
console.log(perms);
// { owner: { read: true, write: true, execute: true }, ... }
```

## Part 6: Practical Patterns

### Pattern 1: File Inventory System

```javascript
async function createInventory(dir) {
  const inventory = {
    totalFiles: 0,
    totalSize: 0,
    filesByType: {},
    largestFiles: [],
    oldestFiles: [],
    newestFiles: []
  };

  const allFiles = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        const ext = path.extname(entry.name) || 'no extension';

        inventory.totalFiles++;
        inventory.totalSize += stats.size;

        if (!inventory.filesByType[ext]) {
          inventory.filesByType[ext] = { count: 0, totalSize: 0 };
        }
        inventory.filesByType[ext].count++;
        inventory.filesByType[ext].totalSize += stats.size;

        allFiles.push({
          path: fullPath,
          size: stats.size,
          modified: stats.mtime
        });
      }
    }
  }

  await walk(dir);

  // Sort and get top files
  allFiles.sort((a, b) => b.size - a.size);
  inventory.largestFiles = allFiles.slice(0, 10);

  allFiles.sort((a, b) => a.modified - b.modified);
  inventory.oldestFiles = allFiles.slice(0, 10);

  allFiles.sort((a, b) => b.modified - a.modified);
  inventory.newestFiles = allFiles.slice(0, 10);

  return inventory;
}

const inventory = await createInventory('project');
console.log(JSON.stringify(inventory, null, 2));
```

### Pattern 2: Stale File Finder

```javascript
async function findStaleFiles(dir, daysOld = 365) {
  const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  const staleFiles = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stats = await fs.stat(fullPath);

        // Check both modified and accessed time
        if (stats.mtimeMs < cutoff && stats.atimeMs < cutoff) {
          staleFiles.push({
            path: fullPath,
            size: stats.size,
            lastModified: stats.mtime,
            lastAccessed: stats.atime,
            daysOld: Math.floor((Date.now() - stats.mtimeMs) / 1000 / 60 / 60 / 24)
          });
        }
      }
    }
  }

  await walk(dir);
  return staleFiles;
}

// Find files not touched in over a year
const stale = await findStaleFiles('archive', 365);
console.log(`Found ${stale.length} stale files`);
```

### Pattern 3: Duplicate Size Finder

```javascript
async function findPotentialDuplicates(dir) {
  const sizeMap = new Map();

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        const size = stats.size;

        if (!sizeMap.has(size)) {
          sizeMap.set(size, []);
        }
        sizeMap.set(size, [...sizeMap.get(size), fullPath]);
      }
    }
  }

  await walk(dir);

  // Filter to only sizes with multiple files
  const potentialDuplicates = [];
  for (const [size, files] of sizeMap) {
    if (files.length > 1) {
      potentialDuplicates.push({ size, files });
    }
  }

  return potentialDuplicates.sort((a, b) => b.size - a.size);
}

const dupes = await findPotentialDuplicates('downloads');
dupes.forEach(({ size, files }) => {
  console.log(`\nSize: ${formatBytes(size)}`);
  files.forEach(f => console.log(`  - ${f}`));
});
```

### Pattern 4: File Change Monitor

```javascript
class FileMonitor {
  constructor() {
    this.snapshots = new Map();
  }

  async takeSnapshot(filepath) {
    const stats = await fs.stat(filepath);
    this.snapshots.set(filepath, {
      size: stats.size,
      mtime: stats.mtimeMs
    });
  }

  async hasChanged(filepath) {
    const current = await fs.stat(filepath);
    const snapshot = this.snapshots.get(filepath);

    if (!snapshot) {
      return { changed: true, reason: 'No snapshot exists' };
    }

    if (current.size !== snapshot.size) {
      return { changed: true, reason: 'Size changed' };
    }

    if (current.mtimeMs !== snapshot.mtime) {
      return { changed: true, reason: 'Modified time changed' };
    }

    return { changed: false };
  }
}

// Usage
const monitor = new FileMonitor();
await monitor.takeSnapshot('config.json');

// Later...
const result = await monitor.hasChanged('config.json');
if (result.changed) {
  console.log('File changed:', result.reason);
}
```

## Part 7: Performance Considerations

### Avoid Unnecessary stat() Calls

```javascript
// ❌ SLOW: Separate stat for each file
const files = await fs.readdir('dir');
for (const file of files) {
  const stats = await fs.stat(path.join('dir', file));
  if (stats.isFile()) {
    // process file
  }
}

// ✅ FAST: Use withFileTypes
const entries = await fs.readdir('dir', { withFileTypes: true });
for (const entry of entries) {
  if (entry.isFile()) {
    // process file - no stat() needed!
  }
}
```

### Batch stat() Operations

```javascript
// Process stats in parallel
const files = ['file1.txt', 'file2.txt', 'file3.txt'];
const statsArray = await Promise.all(
  files.map(file => fs.stat(file))
);

statsArray.forEach((stats, i) => {
  console.log(`${files[i]}: ${formatBytes(stats.size)}`);
});
```

## Part 8: Testing Your Understanding

### Quick Quiz

1. **Q**: What's the difference between `mtime` and `ctime`?
   **A**: `mtime` is when content changed, `ctime` is when metadata (permissions, name, etc.) changed

2. **Q**: Why use `withFileTypes: true` instead of calling `stat()` for each entry?
   **A**: It's much faster - gets type information in one system call

3. **Q**: When should you use `lstat()` instead of `stat()`?
   **A**: When you want information about a symlink itself, not the file it points to

4. **Q**: How do you check if a file is executable on Unix?
   **A**: Check if any execute bit is set: `(stats.mode & 0o111) !== 0`

### Mini Exercise

Create a function that generates a report of directory contents:

```javascript
async function generateReport(dir) {
  // Return object with:
  // - Total number of files
  // - Total size
  // - Average file size
  // - Largest file
  // - Most recently modified file
}
```

## Summary

### Key Takeaways

1. **Use `withFileTypes: true`** to avoid unnecessary `stat()` calls
2. **Understand timestamps**: `atime`, `mtime`, `ctime`, `birthtime`
3. **Format file sizes** for human readability
4. **Check file types** with `isFile()`, `isDirectory()`, etc.
5. **Be careful with permissions** - platform-dependent
6. **Cache stats** when possible to improve performance

### Quick Reference

```javascript
// Get file stats
const stats = await fs.stat('file.txt');

// Common properties
console.log(stats.size);        // Size in bytes
console.log(stats.mtime);       // Last modified
console.log(stats.isFile());    // Is it a file?
console.log(stats.isDirectory()); // Is it a directory?

// Format size
function formatBytes(bytes) {
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}
```

## Further Reading

- [fs.Stats documentation](https://nodejs.org/api/fs.html#fs_class_fs_stats)
- [File permissions on Unix](https://en.wikipedia.org/wiki/File-system_permissions)
- [Inode metadata](https://en.wikipedia.org/wiki/Inode)

## Next Guide

Continue to [Path Manipulation](./05-path-manipulation.md) to learn how to work with file paths effectively across platforms.
