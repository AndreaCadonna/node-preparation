# Understanding Path Manipulation

## Introduction

Working with file paths is fundamental to file system operations. The `path` module provides utilities for working with file and directory paths in a cross-platform way. This guide explains how to manipulate paths correctly, avoiding common pitfalls that lead to bugs on different operating systems.

## Part 1: Why Path Manipulation Matters

### The Cross-Platform Problem

Different operating systems use different path conventions:

```javascript
// Unix/Linux/macOS
'/home/user/documents/file.txt'

// Windows
'C:\\Users\\user\\Documents\\file.txt'

// Path separators
Unix:    /
Windows: \
```

**The Problem**:
```javascript
// ❌ BAD: Hardcoded separators don't work everywhere
const filePath = 'src/components/Button.js';  // Breaks on Windows
const filePath = 'src\\components\\Button.js'; // Breaks on Unix

// ✅ GOOD: Use path.join()
const filePath = path.join('src', 'components', 'Button.js');
// Works everywhere!
```

## Part 2: Essential Path Operations

### path.join() - Building Paths

```javascript
const path = require('path');

// Join path segments
const fullPath = path.join('src', 'components', 'Button.js');
console.log(fullPath);
// Unix: src/components/Button.js
// Windows: src\components\Button.js

// Handles current and parent directory references
path.join('src', '..', 'dist', 'bundle.js');
// Result: dist/bundle.js (normalized)

// Handles empty strings
path.join('src', '', 'index.js');
// Result: src/index.js
```

### path.resolve() - Absolute Paths

```javascript
// Convert to absolute path
const absolutePath = path.resolve('src', 'index.js');
console.log(absolutePath);
// /home/user/project/src/index.js (or equivalent on Windows)

// Multiple arguments
path.resolve('project', 'src', 'components', 'Button.js');
// /home/user/project/src/components/Button.js

// Starts from absolute path if one is provided
path.resolve('/usr', 'local', 'bin');
// /usr/local/bin (ignores current directory)

// Current directory
path.resolve('.');
// /home/user/project (absolute path to current directory)
```

**Key Difference**: `join()` just combines, `resolve()` makes it absolute.

```javascript
// join() - relative paths stay relative
path.join('src', 'index.js');
// src/index.js

// resolve() - always returns absolute path
path.resolve('src', 'index.js');
// /home/user/project/src/index.js
```

### path.dirname() - Get Directory Name

```javascript
// Get directory portion of a path
path.dirname('/home/user/docs/file.txt');
// /home/user/docs

path.dirname('src/components/Button.js');
// src/components

// Edge case: no directory
path.dirname('file.txt');
// . (current directory)
```

### path.basename() - Get File Name

```javascript
// Get file name from path
path.basename('/home/user/docs/report.pdf');
// report.pdf

path.basename('src/components/Button.js');
// Button.js

// Remove extension
path.basename('report.pdf', '.pdf');
// report

// Works with multiple extensions
path.basename('bundle.min.js', '.js');
// bundle.min
```

### path.extname() - Get File Extension

```javascript
// Get extension
path.extname('file.txt');
// .txt

path.extname('archive.tar.gz');
// .gz (only last extension)

path.extname('README');
// '' (empty string if no extension)

path.extname('.gitignore');
// '' (dotfiles have no extension by this definition)
```

### path.parse() - Break Down Path

```javascript
const parsed = path.parse('/home/user/docs/report.pdf');
console.log(parsed);
// {
//   root: '/',
//   dir: '/home/user/docs',
//   base: 'report.pdf',
//   ext: '.pdf',
//   name: 'report'
// }

// Windows example
const winParsed = path.parse('C:\\Users\\user\\file.txt');
// {
//   root: 'C:\\',
//   dir: 'C:\\Users\\user',
//   base: 'file.txt',
//   ext: '.txt',
//   name: 'file'
// }
```

### path.format() - Build Path from Parts

```javascript
// Create path from object
const pathObj = {
  root: '/',
  dir: '/home/user/docs',
  base: 'report.pdf'
};

const fullPath = path.format(pathObj);
console.log(fullPath);
// /home/user/docs/report.pdf

// You can also use name + ext instead of base
path.format({
  dir: '/home/user',
  name: 'file',
  ext: '.txt'
});
// /home/user/file.txt
```

## Part 3: Path Relationships

### path.relative() - Get Relative Path

```javascript
// Get relative path from one location to another
const from = '/home/user/project';
const to = '/home/user/project/src/index.js';

const rel = path.relative(from, to);
console.log(rel);
// src/index.js

// Going up directories
path.relative('/home/user/project/src', '/home/user/project/dist');
// ../dist

// Completely different paths
path.relative('/home/user/project', '/var/log');
// ../../var/log
```

### path.isAbsolute() - Check if Path is Absolute

```javascript
// Check if path is absolute
path.isAbsolute('/home/user/file.txt');
// true

path.isAbsolute('src/index.js');
// false

// Windows
path.isAbsolute('C:\\Users\\file.txt');
// true

path.isAbsolute('\\Users\\file.txt');
// false (no drive letter)
```

### path.normalize() - Clean Up Paths

```javascript
// Normalize path (resolve .. and .)
path.normalize('/home/user/../user/./docs');
// /home/user/docs

path.normalize('src/./components/../index.js');
// src/index.js

// Multiple slashes
path.normalize('src///components//Button.js');
// src/components/Button.js

// Trailing slashes
path.normalize('/home/user/docs/');
// /home/user/docs
```

## Part 4: Practical Patterns

### Pattern 1: Safe Path Construction

```javascript
const fs = require('fs').promises;
const path = require('path');

async function readProjectFile(projectDir, ...pathSegments) {
  // Build safe path
  const filePath = path.join(projectDir, ...pathSegments);

  // Verify it's within project directory (security!)
  const resolvedPath = path.resolve(filePath);
  const resolvedProject = path.resolve(projectDir);

  if (!resolvedPath.startsWith(resolvedProject)) {
    throw new Error('Path traversal attempt detected!');
  }

  return fs.readFile(resolvedPath, 'utf8');
}

// Usage
await readProjectFile('/home/user/project', 'src', 'index.js');
// ✅ Allowed

await readProjectFile('/home/user/project', '..', '..', 'etc', 'passwd');
// ❌ Throws error - path traversal blocked!
```

### Pattern 2: Find Project Root

```javascript
async function findProjectRoot(startDir) {
  let currentDir = path.resolve(startDir);

  while (true) {
    // Check for package.json
    const packagePath = path.join(currentDir, 'package.json');

    try {
      await fs.access(packagePath);
      return currentDir; // Found it!
    } catch {
      // Not found, go up one level
      const parentDir = path.dirname(currentDir);

      // Reached root of filesystem
      if (parentDir === currentDir) {
        throw new Error('Project root not found');
      }

      currentDir = parentDir;
    }
  }
}

// Usage
const projectRoot = await findProjectRoot(__dirname);
console.log('Project root:', projectRoot);
```

### Pattern 3: Change File Extension

```javascript
function changeExtension(filepath, newExt) {
  const parsed = path.parse(filepath);
  return path.format({
    ...parsed,
    base: undefined, // Remove base so name + ext are used
    ext: newExt.startsWith('.') ? newExt : `.${newExt}`
  });
}

// Usage
changeExtension('src/file.ts', '.js');
// src/file.js

changeExtension('bundle.min.js', '.map');
// bundle.min.map
```

### Pattern 4: Get All Files with Extension

```javascript
async function getFilesWithExtension(dir, ext) {
  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (path.extname(entry.name) === ext) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

// Find all TypeScript files
const tsFiles = await getFilesWithExtension('src', '.ts');
```

### Pattern 5: Create Mirror Directory Structure

```javascript
async function mirrorStructure(sourceDir, targetDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      // Create directory in target
      await fs.mkdir(targetPath, { recursive: true });

      // Recursively mirror subdirectories
      await mirrorStructure(sourcePath, targetPath);
    }
  }
}

// Create same folder structure in dist/
await mirrorStructure('src', 'dist');
```

### Pattern 6: Relative Path for Display

```javascript
function getDisplayPath(filepath, baseDir = process.cwd()) {
  const resolved = path.resolve(filepath);
  const base = path.resolve(baseDir);

  if (resolved.startsWith(base)) {
    // File is within base directory - show relative path
    return path.relative(base, resolved);
  } else {
    // File is outside - show absolute path
    return resolved;
  }
}

// Usage (assuming cwd is /home/user/project)
getDisplayPath('/home/user/project/src/index.js');
// src/index.js (relative)

getDisplayPath('/var/log/app.log');
// /var/log/app.log (absolute)
```

## Part 5: Special Path Variables

### __filename and __dirname

```javascript
// In a file: /home/user/project/src/index.js

console.log(__filename);
// /home/user/project/src/index.js

console.log(__dirname);
// /home/user/project/src

// Build path relative to current file
const configPath = path.join(__dirname, '..', 'config.json');
// /home/user/project/config.json
```

**Note**: In ES modules, use `import.meta.url`:

```javascript
// ES modules
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### process.cwd()

```javascript
// Current working directory (where Node was started)
console.log(process.cwd());
// /home/user/project

// Build path relative to cwd
const dataPath = path.join(process.cwd(), 'data', 'users.json');
```

**Important**: `process.cwd()` can change, `__dirname` cannot!

```javascript
// __dirname is always relative to the file
const configPath = path.join(__dirname, 'config.json');
// Always finds config.json next to this file

// process.cwd() depends on where Node was started
const configPath = path.join(process.cwd(), 'config.json');
// Might not find config.json if Node started from different directory
```

### os.homedir() and os.tmpdir()

```javascript
const os = require('os');

// User's home directory
console.log(os.homedir());
// /home/user (Unix) or C:\Users\user (Windows)

// System temporary directory
console.log(os.tmpdir());
// /tmp (Unix) or C:\Users\user\AppData\Local\Temp (Windows)

// Store user-specific config
const configPath = path.join(os.homedir(), '.myapp', 'config.json');
```

## Part 6: Platform-Specific Paths

### path.sep - Path Separator

```javascript
console.log(path.sep);
// Unix: /
// Windows: \

// Split path (use path.sep)
const parts = '/home/user/docs'.split(path.sep);
console.log(parts);
// ['', 'home', 'user', 'docs']
```

### path.delimiter - PATH Delimiter

```javascript
console.log(path.delimiter);
// Unix: :
// Windows: ;

// Split PATH environment variable
const paths = process.env.PATH.split(path.delimiter);
console.log(paths);
// ['/usr/bin', '/usr/local/bin', ...]
```

### Using Windows-Specific Paths on Unix

```javascript
// Force Windows path behavior
const pathWin = require('path').win32;
console.log(pathWin.join('C:\\', 'Users', 'file.txt'));
// C:\Users\file.txt (even on Unix!)

// Force POSIX (Unix) path behavior
const pathPosix = require('path').posix;
console.log(pathPosix.join('/home', 'user', 'file.txt'));
// /home/user/file.txt (even on Windows!)
```

## Part 7: Common Mistakes

### Mistake 1: String Concatenation

```javascript
// ❌ BAD
const filePath = baseDir + '/' + fileName;

// ✅ GOOD
const filePath = path.join(baseDir, fileName);
```

### Mistake 2: Wrong Method Choice

```javascript
// ❌ BAD: Using join for absolute paths
const configPath = path.join(process.cwd(), 'config.json');
// Problem: If cwd changes, this breaks

// ✅ GOOD: Using resolve for absolute paths
const configPath = path.resolve(__dirname, 'config.json');
// Always works relative to this file
```

### Mistake 3: Not Validating User Input

```javascript
// ❌ DANGEROUS: Path traversal vulnerability
async function readUserFile(fileName) {
  const filePath = path.join('uploads', fileName);
  return fs.readFile(filePath);
}
// User could pass: ../../../../etc/passwd

// ✅ SAFE: Validate path is within allowed directory
async function readUserFile(fileName) {
  const filePath = path.join('uploads', fileName);
  const resolved = path.resolve(filePath);
  const uploadsDir = path.resolve('uploads');

  if (!resolved.startsWith(uploadsDir + path.sep)) {
    throw new Error('Invalid file path');
  }

  return fs.readFile(filePath);
}
```

### Mistake 4: Assuming Case Sensitivity

```javascript
// macOS is case-insensitive by default
// File.txt and file.txt refer to the same file

// Linux is case-sensitive
// File.txt and file.txt are different files

// Always use consistent casing!
const filePath = path.join('src', 'Components', 'Button.js');
// Use exact casing as defined in your project
```

## Part 8: Testing Your Understanding

### Quick Quiz

1. **Q**: What's the difference between `path.join()` and `path.resolve()`?
   **A**: `join()` combines path segments, `resolve()` creates absolute paths

2. **Q**: How do you safely check if a file path is within a specific directory?
   **A**: Resolve both paths and check if the file path starts with the directory path

3. **Q**: What's the difference between `__dirname` and `process.cwd()`?
   **A**: `__dirname` is the directory of the current file, `process.cwd()` is where Node was started

4. **Q**: Why shouldn't you use string concatenation for paths?
   **A**: It doesn't handle path separators correctly across platforms

### Mini Exercise

Create a utility to organize files by extension:

```javascript
async function organizeByExtension(sourceDir, targetDir) {
  // Read files from sourceDir
  // Create subdirectories in targetDir for each extension
  // Move files to appropriate subdirectories
}

// Example: organizeByExtension('downloads', 'downloads/organized')
// Should create: organized/js/, organized/txt/, etc.
```

## Summary

### Key Takeaways

1. **Always use `path.join()` or `path.resolve()`** instead of string concatenation
2. **Use `__dirname`** for paths relative to your code files
3. **Validate user-provided paths** to prevent path traversal attacks
4. **Use `path.parse()` and `path.format()`** for complex path manipulations
5. **Remember platform differences** in path separators
6. **Choose the right method**: `join()` for relative, `resolve()` for absolute

### Quick Reference

```javascript
const path = require('path');

// Build paths
path.join('src', 'index.js');          // src/index.js
path.resolve('src', 'index.js');       // /abs/path/src/index.js

// Extract parts
path.dirname('/home/user/file.txt');   // /home/user
path.basename('/home/user/file.txt');  // file.txt
path.extname('file.txt');              // .txt

// Parse/format
const parts = path.parse('/home/user/file.txt');
const fullPath = path.format(parts);

// Relationships
path.relative(from, to);               // Get relative path
path.isAbsolute(somePath);             // Check if absolute
path.normalize(messyPath);             // Clean up path

// Special variables
__dirname                               // Directory of current file
__filename                              // Path of current file
process.cwd()                          // Where Node was started
```

## Further Reading

- [Official path module documentation](https://nodejs.org/api/path.html)
- [Path traversal vulnerabilities](https://owasp.org/www-community/attacks/Path_Traversal)
- [File system path formats](https://en.wikipedia.org/wiki/Path_(computing))

## Completion

You've completed all the Level 2 guides! You should now have a solid understanding of:
- Directory operations
- File watching
- Recursive operations
- File metadata and stats
- Path manipulation

Ready to level up? Move to [Level 3: Advanced](../../level-3-advanced/README.md) to learn about streams, file descriptors, performance optimization, and production patterns!
