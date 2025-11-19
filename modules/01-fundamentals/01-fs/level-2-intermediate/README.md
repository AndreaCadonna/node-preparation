# File System - Level 2: Intermediate

## Learning Objectives

By the end of this level, you will be able to:

- ✅ Create and manage directories programmatically
- ✅ Read directory contents and traverse directory trees
- ✅ Work with file and directory metadata (stats)
- ✅ Implement file watching for real-time updates
- ✅ Perform recursive file and directory operations
- ✅ Combine fs operations with path module effectively
- ✅ Handle complex file organization tasks

## 🧠 Conceptual Understanding First

Before diving into the code examples, build your conceptual foundation by reading these guides:

### Essential Reading

1. **[Directory Operations](guides/01-directory-operations.md)** (20 min)
   - Creating and deleting directories
   - Reading directory contents
   - Safe directory manipulation patterns
   - Cross-platform considerations

2. **[File Watching](guides/02-file-watching.md)** (25 min)
   - Real-time file monitoring
   - Debouncing and event handling
   - Platform differences and limitations
   - Building development tools

3. **[Recursive Operations](guides/03-recursive-operations.md)** (25 min)
   - Understanding recursion in file systems
   - Safe directory tree traversal
   - Avoiding infinite loops and stack overflow
   - Common recursive patterns

4. **[Metadata and Stats](guides/04-metadata-and-stats.md)** (20 min)
   - Understanding file metadata
   - Working with timestamps
   - File size and permissions
   - Performance optimization

5. **[Path Manipulation](guides/05-path-manipulation.md)** (20 min)
   - Cross-platform path handling
   - Essential path module operations
   - Security considerations
   - Common path patterns

### Quick Start (If You're in a Hurry)

Read the "Summary" and "Key Takeaways" sections of each guide above (~15 minutes total).

## 📚 Learning Flow

### Recommended Approach

```
1. Read Guide → 2. Study Example → 3. Do Exercise → 4. Check Solution
   (Understand)    (See it work)      (Practice)       (Verify)
```

### Suggested Learning Path

**Week 1, Day 1-2: Directory Operations**
1. Read [Directory Operations guide](guides/01-directory-operations.md)
2. Study examples 01-02
3. Complete exercise 1
4. Review solution 1

**Week 1, Day 3: File Watching**
1. Read [File Watching guide](guides/02-file-watching.md)
2. Study example 05
3. Complete exercise 3
4. Review solution 3

**Week 1, Day 4-5: Recursive Operations & Metadata**
1. Read [Recursive Operations guide](guides/03-recursive-operations.md)
2. Read [Metadata and Stats guide](guides/04-metadata-and-stats.md)
3. Study examples 03-04
4. Complete exercises 2, 5
5. Review solutions 2, 5

**Week 1, Day 6: Path Manipulation**
1. Read [Path Manipulation guide](guides/05-path-manipulation.md)
2. Study examples 06-08
3. Complete exercise 4
4. Review solution 4

## Topics Covered

### 1. Directory Operations
- Creating directories with mkdir()
- Recursive directory creation
- Reading directory contents with readdir()
- Deleting directories (empty and recursive)
- Directory existence checking

### 2. File Metadata and Stats
- Using fs.stat() to get file information
- File types (file, directory, symlink, etc.)
- File permissions and modes
- Timestamps (created, modified, accessed)
- File size and disk usage

### 3. File Watching
- Watching files with fs.watch()
- Watching directories for changes
- Handling watch events
- Building auto-reload functionality
- Watch performance considerations

### 4. Recursive Operations
- Traversing directory trees
- Recursive file search
- Recursive copying
- Recursive deletion
- Building file tree structures

### 5. Advanced Path Integration
- Combining fs with path module
- Building dynamic file paths
- Cross-platform path handling
- Path validation and sanitization
- Directory tree navigation

### 6. File Organization Patterns
- File sorting and filtering
- Directory structure creation
- File categorization
- Batch file operations
- File system utilities

## Prerequisites

- Completed Level 1: Basics
- Comfortable with async/await
- Understanding of callbacks and promises
- Familiarity with path module basics

## Time Required

**Estimated**: 3 hours
- Reading and understanding: 45 minutes
- Working through examples: 1 hour
- Completing exercises: 1 hour 15 minutes

## Examples Overview

The `examples/` directory contains:

1. **01-directory-operations.js** - Creating and managing directories
2. **02-read-directory.js** - Reading and listing directory contents
3. **03-file-stats.js** - Working with file metadata
4. **04-recursive-operations.js** - Traversing directory trees
5. **05-file-watching.js** - Real-time file monitoring
6. **06-path-integration.js** - Advanced path and fs combination
7. **07-file-organization.js** - Sorting and organizing files
8. **08-batch-operations.js** - Processing multiple files

## Exercises Overview

Complete these exercises in order:

1. **Exercise 1**: Create a directory tree structure from a JSON schema
2. **Exercise 2**: Build a file search utility with filters
3. **Exercise 3**: Implement a file watcher that logs changes
4. **Exercise 4**: Create a file organizer by file type
5. **Exercise 5**: Build a directory size calculator

Each exercise includes:
- Detailed requirements
- Hints and tips
- Test cases
- Bonus challenges

## Getting Started

### Step 1: Review Level 1

Make sure you're comfortable with:
- Reading and writing files
- Error handling
- Basic file operations
- Async/await patterns

### Step 2: Study Examples

```bash
cd modules/01-fundamentals/01-fs/level-2-intermediate/examples
node 01-directory-operations.js
node 02-read-directory.js
# ... and so on
```

### Step 3: Complete Exercises

```bash
cd ../exercises
node exercise-1.js
# Work through each exercise
```

### Step 4: Review Solutions

```bash
cd ../solutions
node exercise-1-solution.js
# Compare with your solutions
```

## 💡 Key Insights

### What Intermediate Learners Often Miss

1. **Recursive operations can create infinite loops** - Always set depth limits and track visited directories
2. **File watchers need cleanup** - Unclosed watchers cause memory leaks
3. **Platform differences matter** - Recursive watching works differently on Linux vs macOS/Windows
4. **withFileTypes is much faster** - Avoid unnecessary stat() calls
5. **Path separators differ** - Always use path.join(), never string concatenation

### Common "Aha!" Moments

- "That's why my watcher keeps firing multiple times!" (need debouncing)
- "I can avoid race conditions by tracking visited directories!"
- "withFileTypes makes directory operations 10x faster!"
- "path.join() saves me from cross-platform bugs!"

## 🚨 Common Pitfalls to Avoid

### Pitfall 1: Not Closing File Watchers

```javascript
// ❌ BAD: Memory leak
function watchFiles() {
  fs.watch('file.txt', callback);
  // Watcher never closed!
}

// ✅ GOOD: Proper cleanup
const watcher = fs.watch('file.txt', callback);
process.on('SIGINT', () => {
  watcher.close();
  process.exit();
});
```

See [File Watching guide](guides/02-file-watching.md#common-mistakes) for more.

### Pitfall 2: Infinite Recursion

```javascript
// ❌ BAD: No depth limit
async function walk(dir) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    await walk(path.join(dir, entry)); // Can stack overflow!
  }
}

// ✅ GOOD: With safety checks
async function walkSafe(dir, depth = 0, maxDepth = 100) {
  if (depth >= maxDepth) return;
  // ... safe recursion
}
```

See [Recursive Operations guide](guides/03-recursive-operations.md#common-mistakes) for more.

### Pitfall 3: Path String Concatenation

```javascript
// ❌ BAD: Breaks on Windows
const filePath = baseDir + '/' + fileName;

// ✅ GOOD: Cross-platform
const filePath = path.join(baseDir, fileName);
```

See [Path Manipulation guide](guides/05-path-manipulation.md#common-mistakes) for more.

## ✅ Success Criteria

You've mastered Level 2 when you can:

- [ ] **Explain** the difference between sync and async directory operations
- [ ] **Create** nested directory structures safely
- [ ] **Implement** recursive directory traversal with proper error handling
- [ ] **Build** a file watcher with debouncing
- [ ] **Extract** and use file metadata (size, timestamps, permissions)
- [ ] **Construct** cross-platform file paths correctly
- [ ] **Identify** and avoid common pitfalls (infinite loops, memory leaks, path issues)
- [ ] **Complete** all exercises without looking at solutions
- [ ] **Explain** your code and design decisions to someone else

## Key Concepts

### Directory Operations

```javascript
// Create directory
await fs.mkdir('my-dir');

// Create nested directories
await fs.mkdir('parent/child/grandchild', { recursive: true });

// Read directory contents
const files = await fs.readdir('my-dir');

// Read with file types
const entries = await fs.readdir('my-dir', { withFileTypes: true });
entries.forEach(entry => {
  console.log(entry.name, entry.isFile() ? 'FILE' : 'DIR');
});

// Remove directory (must be empty)
await fs.rmdir('my-dir');

// Remove directory recursively
await fs.rm('my-dir', { recursive: true, force: true });
```

### File Stats

```javascript
// Get file statistics
const stats = await fs.stat('file.txt');

console.log('Size:', stats.size);
console.log('Created:', stats.birthtime);
console.log('Modified:', stats.mtime);
console.log('Is file:', stats.isFile());
console.log('Is directory:', stats.isDirectory());
console.log('Permissions:', stats.mode.toString(8));
```

### File Watching

```javascript
// Watch a file
const watcher = fs.watch('file.txt', (eventType, filename) => {
  console.log(`Event: ${eventType} on ${filename}`);
});

// Watch a directory
fs.watch('my-dir', { recursive: true }, (eventType, filename) => {
  console.log(`Directory change: ${eventType} - ${filename}`);
});

// Stop watching
watcher.close();
```

### Recursive Directory Traversal

```javascript
async function walkDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      console.log('DIR:', fullPath);
      await walkDirectory(fullPath); // Recurse
    } else {
      console.log('FILE:', fullPath);
    }
  }
}
```

## Common Patterns

### 1. Ensure Directory Exists

```javascript
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}
```

### 2. Get All Files Recursively

```javascript
async function getAllFiles(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      await getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }

  return fileList;
}
```

### 3. Calculate Directory Size

```javascript
async function getDirectorySize(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let totalSize = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}
```

## Best Practices

### ✅ DO:
- Use `{ recursive: true }` for mkdir to create parent directories
- Use `withFileTypes: true` for better performance with readdir
- Always handle ENOENT errors when checking directories
- Close file watchers when done to prevent memory leaks
- Use path.join() to build cross-platform paths
- Implement depth limits for recursive operations

### ❌ DON'T:
- Don't use sync methods (mkdirSync, readdirSync) in production
- Don't recursively delete without confirmation
- Don't watch too many files (performance impact)
- Don't forget to handle symbolic links in recursion
- Don't assume directory order from readdir()
- Don't create infinite recursion loops

## Performance Tips

1. **Use withFileTypes**: Faster than separate stat() calls
2. **Batch operations**: Use Promise.all() for parallel ops
3. **Limit recursion depth**: Prevent stack overflow
4. **Cache stat results**: Don't stat the same file twice
5. **Use generators**: For very large directory trees

## Common Pitfalls

### Issue: Infinite Recursion

```javascript
// ❌ BAD: Can follow symlinks infinitely
async function walk(dir) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    await walk(path.join(dir, file)); // Dangerous!
  }
}

// ✅ GOOD: Track visited directories
async function walkSafe(dir, visited = new Set()) {
  const realPath = await fs.realpath(dir);
  if (visited.has(realPath)) return;
  visited.add(realPath);

  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      await walkSafe(path.join(dir, file.name), visited);
    }
  }
}
```

### Issue: File Watcher Memory Leaks

```javascript
// ❌ BAD: Watcher never closed
function watchFiles() {
  fs.watch('file.txt', () => {});
  // Watcher keeps running forever
}

// ✅ GOOD: Proper cleanup
function watchFilesProper() {
  const watcher = fs.watch('file.txt', () => {});

  // Clean up after some time or on event
  setTimeout(() => watcher.close(), 60000);

  // Or cleanup on process exit
  process.on('SIGINT', () => {
    watcher.close();
    process.exit();
  });
}
```

## Real-World Use Cases

- **Build Tools**: Watch source files and rebuild on changes
- **File Organizers**: Sort downloads by file type
- **Backup Systems**: Recursively copy directory structures
- **Content Management**: Organize media files
- **Development Tools**: Auto-reload servers on file changes
- **File Sync**: Monitor and sync directory changes
- **Disk Usage Analyzers**: Calculate directory sizes
- **Search Tools**: Find files by name or content

## Testing Your Knowledge

Before moving to Level 3, you should be able to:

1. Create nested directory structures programmatically
2. Recursively traverse and search directory trees
3. Extract and use file metadata (size, dates, permissions)
4. Implement file watching for specific use cases
5. Build utilities that organize and manage files
6. Combine fs and path modules effectively

## Exercises Checklist

- [ ] Exercise 1: Directory tree from JSON schema
- [ ] Exercise 2: File search utility with filters
- [ ] Exercise 3: File watcher with logging
- [ ] Exercise 4: File organizer by type
- [ ] Exercise 5: Directory size calculator
- [ ] Reviewed all solutions
- [ ] Completed bonus challenges
- [ ] Built mini project

## Mini Project: File Manager CLI

After completing the exercises, build a command-line file manager that:

1. Lists directory contents with details
2. Creates and deletes directories
3. Searches for files by name/extension
4. Calculates directory sizes
5. Watches directories for changes
6. Organizes files into categories

Example:
```bash
node file-manager.js list /path/to/dir
node file-manager.js search /path *.js
node file-manager.js size /path/to/dir
node file-manager.js watch /path/to/dir
node file-manager.js organize /downloads
```

## Next Steps

Once you've completed all exercises and the mini project:

- [ ] Review any challenging concepts
- [ ] Practice the common patterns
- [ ] Build your own file utility
- [ ] Move to [Level 3: Advanced](../level-3-advanced/README.md)

## Need Help?

- Review the examples again
- Check the [official fs documentation](https://nodejs.org/api/fs.html)
- Look at the pattern examples above
- Review Level 1 if needed

---

**Ready to code?** Start with the [examples](./examples/) directory!
