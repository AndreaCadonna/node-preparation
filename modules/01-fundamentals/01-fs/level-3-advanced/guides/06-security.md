# File System Security

## Introduction

File system operations can introduce security vulnerabilities if not handled carefully. This guide covers common security risks and how to prevent them in production Node.js applications.

## Part 1: Path Traversal Attacks

### The Vulnerability

```javascript
// ❌ DANGEROUS: User can read any file!
app.get('/files/:filename', async (req, res) => {
  const filepath = path.join('/uploads', req.params.filename);
  const content = await fs.readFile(filepath);
  res.send(content);
});

// Attack: GET /files/../../../../etc/passwd
// Reads: /etc/passwd instead of /uploads/...
```

### Solution 1: Validate Path

```javascript
function validatePath(basePath, userPath) {
  const fullPath = path.join(basePath, userPath);
  const resolved = path.resolve(fullPath);
  const baseResolved = path.resolve(basePath);

  // Ensure resolved path starts with base path
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}

// Usage
app.get('/files/:filename', async (req, res) => {
  try {
    const filepath = validatePath('/uploads', req.params.filename);
    const content = await fs.readFile(filepath);
    res.send(content);
  } catch (err) {
    res.status(400).send('Invalid file path');
  }
});
```

### Solution 2: Whitelist Approach

```javascript
function isAllowedFile(basePath, userPath) {
  // Only allow alphanumeric, dash, underscore, and dot
  const filename = path.basename(userPath);

  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return false;
  }

  // No directory traversal
  if (userPath.includes('..') || userPath.includes(path.sep)) {
    return false;
  }

  return true;
}

app.get('/files/:filename', async (req, res) => {
  if (!isAllowedFile('/uploads', req.params.filename)) {
    return res.status(400).send('Invalid filename');
  }

  const filepath = path.join('/uploads', req.params.filename);
  const content = await fs.readFile(filepath);
  res.send(content);
});
```

## Part 2: File Upload Security

### Validate File Type

```javascript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

function validateUpload(file) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}`);
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file extension: ${ext}`);
  }

  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large');
  }

  return true;
}
```

### Safe File Upload Handler

```javascript
const crypto = require('crypto');

async function handleUpload(file, uploadDir = '/uploads') {
  // Validate
  validateUpload(file);

  // Generate safe filename (prevent overwriting)
  const hash = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(file.originalname);
  const safeFilename = `${hash}${ext}`;

  // Ensure upload directory exists
  await fs.mkdir(uploadDir, { recursive: true });

  // Validate destination path
  const destination = validatePath(uploadDir, safeFilename);

  // Write file
  await fs.writeFile(destination, file.buffer);

  return {
    filename: safeFilename,
    path: destination,
    size: file.size
  };
}
```

## Part 3: Permission Security

### Secure File Creation

```javascript
async function createSecureFile(filepath, data) {
  // Create with restricted permissions (owner read/write only)
  const fd = await fs.open(filepath, 'w', 0o600);

  try {
    await fd.writeFile(data);
  } finally {
    await fd.close();
  }
}

// For sensitive files like API keys, tokens, etc.
await createSecureFile('.env', 'API_KEY=secret123');
```

### Check File Permissions

```javascript
async function checkFilePermissions(filepath) {
  const stats = await fs.stat(filepath);
  const mode = stats.mode;

  return {
    ownerRead: (mode & 0o400) !== 0,
    ownerWrite: (mode & 0o200) !== 0,
    ownerExecute: (mode & 0o100) !== 0,
    groupRead: (mode & 0o040) !== 0,
    groupWrite: (mode & 0o020) !== 0,
    groupExecute: (mode & 0o010) !== 0,
    othersRead: (mode & 0o004) !== 0,
    othersWrite: (mode & 0o002) !== 0,
    othersExecute: (mode & 0o001) !== 0
  };
}

// Verify sensitive file has correct permissions
const perms = await checkFilePermissions('.env');
if (perms.othersRead || perms.othersWrite) {
  console.warn('WARNING: .env file has overly permissive access!');
}
```

### Secure Directory Creation

```javascript
async function createSecureDirectory(dirpath) {
  // Create with restricted permissions (owner only)
  await fs.mkdir(dirpath, { recursive: true, mode: 0o700 });
}

await createSecureDirectory('.secrets');
```

## Part 4: Preventing Information Disclosure

### Safe Error Messages

```javascript
// ❌ BAD: Leaks file system structure
app.get('/files/:id', async (req, res) => {
  try {
    const data = await fs.readFile(`/internal/data/${req.params.id}`);
    res.send(data);
  } catch (err) {
    res.status(500).send(err.message);
    // Error: "ENOENT: no such file or directory, open '/internal/data/123'"
    // Attacker learns internal directory structure!
  }
});

// ✅ GOOD: Generic error messages
app.get('/files/:id', async (req, res) => {
  try {
    const data = await fs.readFile(`/internal/data/${req.params.id}`);
    res.send(data);
  } catch (err) {
    console.error('File read error:', err); // Log internally

    if (err.code === 'ENOENT') {
      res.status(404).send('File not found');
    } else {
      res.status(500).send('Internal server error');
    }
  }
});
```

### Sanitize File Listings

```javascript
async function listUserFiles(userDir) {
  const entries = await fs.readdir(userDir, { withFileTypes: true });

  return entries
    .filter(entry => entry.isFile())
    .filter(entry => !entry.name.startsWith('.')) // Hide dotfiles
    .map(entry => ({
      name: entry.name,
      // Don't expose full path!
      // size, dates, etc can be added safely
    }));
}
```

## Part 5: Temporary File Security

### Secure Temp Files

```javascript
const os = require('os');
const crypto = require('crypto');

async function createSecureTempFile(prefix = 'tmp') {
  const tmpDir = os.tmpdir();
  const random = crypto.randomBytes(16).toString('hex');
  const filename = `${prefix}-${random}`;
  const filepath = path.join(tmpDir, filename);

  // Create with secure permissions
  const fd = await fs.open(filepath, 'w', 0o600);
  await fd.close();

  return filepath;
}

async function withTempFile(callback) {
  const tempPath = await createSecureTempFile();

  try {
    return await callback(tempPath);
  } finally {
    // Always clean up
    try {
      await fs.unlink(tempPath);
    } catch (err) {
      console.error('Failed to delete temp file:', err.message);
    }
  }
}

// Usage
await withTempFile(async (tmpPath) => {
  await fs.writeFile(tmpPath, sensitiveData);
  await processFile(tmpPath);
  // tmpPath automatically deleted
});
```

## Part 6: Input Validation

### Filename Validation

```javascript
function sanitizeFilename(filename) {
  // Remove path separators
  let safe = filename.replace(/[/\\]/g, '');

  // Remove null bytes
  safe = safe.replace(/\0/g, '');

  // Remove leading dots (hidden files)
  safe = safe.replace(/^\.+/, '');

  // Limit length
  safe = safe.substring(0, 255);

  // Only allow safe characters
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (!safe) {
    throw new Error('Invalid filename');
  }

  return safe;
}

// Usage
const userFilename = req.body.filename;
const safeFilename = sanitizeFilename(userFilename);
```

### Content Validation

```javascript
async function validateFileContent(filepath, expectedType) {
  const buffer = Buffer.alloc(512);
  const fd = await fs.open(filepath, 'r');

  try {
    await fd.read(buffer, 0, 512, 0);

    // Check magic numbers (file signatures)
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'application/pdf': [0x25, 0x50, 0x44, 0x46]
    };

    const signature = signatures[expectedType];
    if (!signature) return true; // Unknown type, can't validate

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        throw new Error(`File content doesn't match expected type ${expectedType}`);
      }
    }

    return true;
  } finally {
    await fd.close();
  }
}
```

## Part 7: Race Condition Prevention

### TOCTOU (Time-of-Check-Time-of-Use)

```javascript
// ❌ VULNERABLE: Race condition
async function safeDeleteBad(filepath) {
  // Check if file exists
  const exists = await fs.access(filepath).then(() => true).catch(() => false);

  if (exists) {
    // File could be swapped with symlink here!
    await fs.unlink(filepath);
  }
}

// ✅ SAFE: Just try the operation
async function safeDeleteGood(filepath) {
  try {
    await fs.unlink(filepath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}
```

## Part 8: Symlink Attacks

### Safe Symlink Handling

```javascript
async function safeRead(filepath, followSymlinks = false) {
  const statFn = followSymlinks ? fs.stat : fs.lstat;
  const stats = await statFn(filepath);

  // Don't follow symlinks unless explicitly allowed
  if (stats.isSymbolicLink() && !followSymlinks) {
    throw new Error('Symlinks not allowed');
  }

  return fs.readFile(filepath);
}
```

## Summary

### Security Checklist

- [ ] Validate all user-provided file paths
- [ ] Prevent path traversal attacks
- [ ] Validate file types and extensions
- [ ] Limit file upload sizes
- [ ] Use secure file permissions
- [ ] Sanitize filenames
- [ ] Use generic error messages
- [ ] Secure temporary files
- [ ] Validate file content (magic numbers)
- [ ] Prevent TOCTOU race conditions
- [ ] Handle symlinks carefully
- [ ] Clean up temporary files
- [ ] Log security-relevant events
- [ ] Use principle of least privilege

### Key Takeaways

1. **Never trust user input** - Validate and sanitize all paths and filenames
2. **Use path.resolve() and check boundaries** - Prevent path traversal
3. **Validate file content** - Don't trust MIME types or extensions alone
4. **Secure permissions** - Use restrictive permissions for sensitive files
5. **Clean up temp files** - Always delete temporary files
6. **Generic errors** - Don't leak internal paths or structure
7. **Avoid TOCTOU** - Don't check-then-act, just try the operation

## Completion

Congratulations! You've completed all Level 3 guides. You now have a comprehensive understanding of advanced file system operations, including streams, file descriptors, performance optimization, file locking, production patterns, and security.

Ready to move on? Practice these concepts with the [Level 3 exercises](../exercises/) or start applying them in real projects!
