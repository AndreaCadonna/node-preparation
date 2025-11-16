# Module 1: File System (fs)

## Overview

The File System module is one of the most fundamental and commonly used Node.js core modules. It provides an API for interacting with the file system in a manner modeled on standard POSIX functions.

## Why This Module Matters

- 🔥 **Most Used**: Essential for nearly every Node.js application
- 📁 **Data Persistence**: Read/write configuration files, logs, user data
- 🚀 **Practical**: Real-world applications require file operations
- 💼 **Interview Favorite**: Commonly tested in technical interviews

## What You'll Learn

By the end of this module, you will:

- ✅ Read and write files using both callback and promise-based APIs
- ✅ Work with directories (create, read, delete)
- ✅ Handle file metadata and permissions
- ✅ Implement file watching for real-time updates
- ✅ Process large files efficiently using streams
- ✅ Handle errors properly and avoid common pitfalls
- ✅ Build production-ready file utilities

## Module Structure

```
01-fs/
├── README.md (this file)
├── level-1-basics/
│   ├── README.md - Level introduction
│   ├── examples/ - Code examples
│   ├── exercises/ - Practice exercises
│   └── solutions/ - Exercise solutions
├── level-2-intermediate/
│   ├── README.md
│   ├── examples/
│   ├── exercises/
│   └── solutions/
└── level-3-advanced/
    ├── README.md
    ├── examples/
    ├── exercises/
    └── solutions/
```

## Prerequisites

- Basic JavaScript knowledge
- Understanding of callbacks, promises, and async/await
- Node.js installed (v18+ recommended)
- Text editor or IDE set up

## Learning Path

### Level 1: Basics (2 hours)
**Focus**: Core file operations and async patterns

**Topics**:
- Synchronous vs asynchronous operations
- Reading text files
- Writing to files
- Checking file existence
- Basic error handling
- `fs` vs `fs/promises`

**Exercises**: 5 basic exercises
**Project**: Simple file reader/writer utility

---

### Level 2: Intermediate (3 hours)
**Focus**: Directory operations and file watching

**Topics**:
- Creating and managing directories
- Reading directory contents
- File and directory metadata
- File watching with `fs.watch()`
- Recursive operations
- Working with the `path` module

**Exercises**: 5 intermediate exercises
**Project**: File organization tool

---

### Level 3: Advanced (4 hours)
**Focus**: Performance, streams, and production patterns

**Topics**:
- Streaming large files
- Low-level file operations (file descriptors)
- Atomic operations and race conditions
- Performance optimization
- Memory-efficient processing
- Production-ready error handling

**Exercises**: 5 advanced exercises
**Project**: File backup system with progress tracking

---

## Key Concepts

### Async vs Sync

```javascript
// ❌ Synchronous (blocks event loop)
const fs = require('fs');
const data = fs.readFileSync('file.txt', 'utf8');

// ✅ Asynchronous with callbacks
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// ✅ Asynchronous with promises (recommended)
const fs = require('fs').promises;
const data = await fs.readFile('file.txt', 'utf8');
```

### Common Methods

| Method | Purpose | Level |
|--------|---------|-------|
| `readFile()` | Read entire file | Basic |
| `writeFile()` | Write to file | Basic |
| `appendFile()` | Append to file | Basic |
| `unlink()` | Delete file | Basic |
| `mkdir()` | Create directory | Intermediate |
| `readdir()` | Read directory | Intermediate |
| `stat()` | Get file info | Intermediate |
| `watch()` | Watch for changes | Intermediate |
| `createReadStream()` | Stream file read | Advanced |
| `createWriteStream()` | Stream file write | Advanced |

## Getting Started

1. Read this overview
2. Start with [Level 1: Basics](level-1-basics/README.md)
3. Work through examples in order
4. Complete all exercises
5. Build the level project
6. Move to next level

## Time Commitment

- **Level 1**: 2 hours (basics)
- **Level 2**: 3 hours (intermediate)
- **Level 3**: 4 hours (advanced)
- **Total**: ~9 hours

## Success Criteria

You've mastered this module when you can:

- [ ] Confidently read and write files using promises
- [ ] Handle errors properly in file operations
- [ ] Create and manage directories recursively
- [ ] Implement file watching for changes
- [ ] Process large files without memory issues
- [ ] Explain when to use streams vs regular file operations
- [ ] Build a production-ready file utility

## Common Pitfalls to Avoid

1. ❌ Using synchronous methods in production
2. ❌ Not handling errors properly
3. ❌ Loading entire large files into memory
4. ❌ Forgetting to close file descriptors
5. ❌ Not validating file paths (security issue)
6. ❌ Ignoring file permissions

## Real-World Use Cases

- **Configuration Management**: Reading/writing config files
- **Logging**: Appending to log files
- **File Uploads**: Handling user file uploads
- **Build Tools**: Reading source files, writing outputs
- **Data Processing**: Processing CSV, JSON, or text files
- **Backup Systems**: Copying and archiving files
- **CMS**: Managing content files

## Additional Resources

- [Official fs Documentation](https://nodejs.org/api/fs.html)
- [fs/promises Documentation](https://nodejs.org/api/fs.html#promises-api)
- Working with Files in Node.js (see RESOURCES.md)
- Stream Handbook (for Level 3)

## Next Module

After completing this module, proceed to:
- **Module 2: Path** - Cross-platform path handling (complements fs operations)

Or if you prefer horizontal learning:
- Complete Level 1 of all modules first

## Need Help?

- Review the examples in each level
- Check the solutions (but try exercises first!)
- Refer to [RESOURCES.md](../../../docs/RESOURCES.md) for additional learning materials
- Consult the [official Node.js documentation](https://nodejs.org/api/fs.html)

---

**Ready to start?** → [Begin Level 1: Basics](level-1-basics/README.md)
