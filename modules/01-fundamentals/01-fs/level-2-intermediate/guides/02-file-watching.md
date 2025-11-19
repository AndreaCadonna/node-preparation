# Understanding File Watching

## Introduction

File watching allows your Node.js application to monitor files and directories for changes in real-time. This is essential for features like auto-reload development servers, file synchronization tools, and build systems. This guide explains how file watching works and how to use it effectively.

## Part 1: The Basics

### What is File Watching?

File watching is the ability to detect when files or directories change on the file system. When a change occurs, your application is notified and can respond accordingly.

**Common Use Cases**:
- Development servers that auto-reload when code changes
- Build tools that recompile when source files change
- File synchronization services (like Dropbox)
- Log file monitoring
- Configuration file hot-reloading

### How It Works

Node.js provides file watching through the underlying operating system:

```
┌─────────────────────────────────┐
│   Your Node.js Application      │
│   (fs.watch callback)            │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Node.js fs.watch() API        │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   libuv (Node's C++ layer)      │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Operating System              │
│   - inotify (Linux)             │
│   - FSEvents (macOS)            │
│   - ReadDirectoryChangesW (Win) │
└─────────────────────────────────┘
```

## Part 2: fs.watch() - The Primary API

### Basic Usage

```javascript
const fs = require('fs');

// Watch a single file
const watcher = fs.watch('config.json', (eventType, filename) => {
  console.log(`Event: ${eventType}`);
  console.log(`File: ${filename}`);
});

// The watcher object can be used to stop watching
setTimeout(() => {
  watcher.close();
  console.log('Stopped watching');
}, 60000);
```

### Event Types

`fs.watch()` emits two types of events:

1. **`rename`**: File created, deleted, or renamed
2. **`change`**: File content modified

```javascript
fs.watch('watched-file.txt', (eventType, filename) => {
  if (eventType === 'rename') {
    console.log('File was created, deleted, or renamed');
  } else if (eventType === 'change') {
    console.log('File content was modified');
  }
});
```

**Important**: The event types are platform-dependent and may not always be reliable. Always verify what actually changed.

### Watching Directories

```javascript
const fs = require('fs');
const path = require('path');

fs.watch('my-directory', (eventType, filename) => {
  if (filename) {
    const fullPath = path.join('my-directory', filename);
    console.log(`${eventType}: ${fullPath}`);
  }
});
```

### Recursive Watching

```javascript
// Watch directory and all subdirectories (macOS and Windows)
fs.watch('my-directory', { recursive: true }, (eventType, filename) => {
  console.log(`${eventType}: ${filename}`);
});
```

**⚠️ Platform Limitation**:
- `recursive: true` works on macOS and Windows
- On Linux, it only watches the immediate directory (not subdirectories)
- You need to manually implement recursive watching on Linux

## Part 3: fs.watchFile() - The Polling Alternative

### Basic Usage

```javascript
const fs = require('fs');

// Poll file for changes (checks every 5 seconds by default)
fs.watchFile('config.json', (current, previous) => {
  console.log('Current modified time:', current.mtime);
  console.log('Previous modified time:', previous.mtime);

  if (current.mtime > previous.mtime) {
    console.log('File was modified!');
  }
});

// Stop watching
fs.unwatchFile('config.json');
```

### With Custom Interval

```javascript
// Check every 2 seconds
fs.watchFile('config.json', { interval: 2000 }, (current, previous) => {
  if (current.mtime !== previous.mtime) {
    console.log('File changed!');
  }
});
```

### fs.watch() vs fs.watchFile()

| Feature | fs.watch() | fs.watchFile() |
|---------|------------|----------------|
| **Method** | OS events | Polling (stat) |
| **Performance** | Fast, efficient | Slower, resource-intensive |
| **Reliability** | Platform-dependent | More reliable |
| **CPU Usage** | Low | Higher |
| **Latency** | Immediate | Delayed (poll interval) |
| **Best For** | Most use cases | Networked file systems |

**Recommendation**: Use `fs.watch()` unless you have a specific reason to use `fs.watchFile()`.

## Part 4: Common Patterns

### Pattern 1: Debounced File Watching

File saves often trigger multiple events. Debouncing prevents excessive callbacks:

```javascript
function watchWithDebounce(filepath, delay = 300, callback) {
  let timeout;

  const watcher = fs.watch(filepath, (eventType, filename) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      callback(eventType, filename);
    }, delay);
  });

  return watcher;
}

// Usage
const watcher = watchWithDebounce('config.json', 300, (eventType, filename) => {
  console.log('File changed:', filename);
  // Only called once, even if multiple events fire
});
```

**Why debounce?**
- Text editors save files multiple times
- One save operation can trigger 3-5 events
- Debouncing ensures your handler runs once per "batch" of changes

### Pattern 2: Safe File Reading on Change

```javascript
const fs = require('fs').promises;

async function watchAndRead(filepath) {
  let currentContent = await fs.readFile(filepath, 'utf8');

  fs.watch(filepath, async (eventType) => {
    if (eventType === 'change') {
      try {
        // Wait a bit for file to be fully written
        await new Promise(resolve => setTimeout(resolve, 100));

        const newContent = await fs.readFile(filepath, 'utf8');

        if (newContent !== currentContent) {
          console.log('Content changed!');
          currentContent = newContent;
          // Handle the new content
        }
      } catch (error) {
        console.error('Error reading file:', error.message);
      }
    }
  });
}

watchAndRead('config.json');
```

### Pattern 3: Recursive Directory Watching (Cross-Platform)

```javascript
const fs = require('fs');
const path = require('path');
const fsp = require('fs').promises;

class RecursiveWatcher {
  constructor() {
    this.watchers = new Map();
  }

  async watch(directory, callback) {
    const entries = await fsp.readdir(directory, { withFileTypes: true });

    // Watch the current directory
    const watcher = fs.watch(directory, (eventType, filename) => {
      if (filename) {
        const fullPath = path.join(directory, filename);
        callback(eventType, fullPath);
      }
    });

    this.watchers.set(directory, watcher);

    // Recursively watch subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdirPath = path.join(directory, entry.name);
        await this.watch(subdirPath, callback);
      }
    }
  }

  close() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

// Usage
const watcher = new RecursiveWatcher();
await watcher.watch('src', (eventType, filepath) => {
  console.log(`${eventType}: ${filepath}`);
});

// Later: stop watching
watcher.close();
```

### Pattern 4: Config File Hot Reload

```javascript
class ConfigWatcher {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
    this.listeners = [];
  }

  async start() {
    // Load initial config
    await this.reload();

    // Watch for changes
    let debounceTimer;

    fs.watch(this.configPath, async (eventType) => {
      if (eventType === 'change') {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          try {
            await this.reload();
            this.notifyListeners();
          } catch (error) {
            console.error('Failed to reload config:', error);
          }
        }, 300);
      }
    });
  }

  async reload() {
    const content = await fs.promises.readFile(this.configPath, 'utf8');
    this.config = JSON.parse(content);
    console.log('Config reloaded:', this.config);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.config));
  }
}

// Usage
const configWatcher = new ConfigWatcher('config.json');
await configWatcher.start();

configWatcher.onChange((newConfig) => {
  console.log('Config updated!', newConfig);
  // Apply new configuration
});
```

### Pattern 5: Build System Watcher

```javascript
class BuildWatcher {
  constructor(srcDir, buildFn) {
    this.srcDir = srcDir;
    this.buildFn = buildFn;
    this.isBuilding = false;
    this.pendingBuild = false;
  }

  async watch() {
    console.log(`Watching ${this.srcDir} for changes...`);

    // Initial build
    await this.build();

    // Watch for changes
    const watcher = new RecursiveWatcher();
    await watcher.watch(this.srcDir, async (eventType, filepath) => {
      // Filter out unwanted files
      if (filepath.includes('node_modules') || filepath.includes('.git')) {
        return;
      }

      console.log(`Change detected: ${filepath}`);
      await this.build();
    });

    return watcher;
  }

  async build() {
    if (this.isBuilding) {
      // Build in progress, mark as pending
      this.pendingBuild = true;
      return;
    }

    this.isBuilding = true;

    try {
      console.log('Building...');
      await this.buildFn();
      console.log('Build complete!');
    } catch (error) {
      console.error('Build failed:', error);
    } finally {
      this.isBuilding = false;

      // If changes occurred during build, rebuild
      if (this.pendingBuild) {
        this.pendingBuild = false;
        setImmediate(() => this.build());
      }
    }
  }
}

// Usage
const buildWatcher = new BuildWatcher('src', async () => {
  // Your build logic
  await compileTypeScript();
  await bundleJavaScript();
});

await buildWatcher.watch();
```

## Part 5: Platform Differences

### Linux (inotify)

```javascript
// Limited number of watchers (default: 8192)
// Check current limit:
// cat /proc/sys/fs/inotify/max_user_watches

// Increase limit if needed (in production):
// echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
// sudo sysctl -p
```

**Limitations**:
- `recursive: true` doesn't work
- Limited number of watches
- Must manually watch subdirectories

### macOS (FSEvents)

```javascript
// Very efficient, supports recursive watching natively
fs.watch('directory', { recursive: true }, (eventType, filename) => {
  // Works perfectly on macOS
});
```

**Benefits**:
- Native recursive watching
- Very efficient
- No watch limits

### Windows (ReadDirectoryChangesW)

```javascript
// Supports recursive watching
// May have case-sensitivity issues
```

**Considerations**:
- Path case-sensitivity differences
- Backslash vs forward slash in paths

## Part 6: Performance Considerations

### Limiting the Number of Watchers

```javascript
// ❌ BAD: Watch every file individually
for (const file of files) {
  fs.watch(file, callback);
}
// Creates 1000s of watchers!

// ✅ GOOD: Watch directories instead
fs.watch('directory', { recursive: true }, callback);
// One watcher for entire tree
```

### Filtering Events

```javascript
// Filter out unwanted changes
fs.watch('src', { recursive: true }, (eventType, filename) => {
  // Ignore temporary files
  if (filename.endsWith('.tmp') || filename.endsWith('~')) {
    return;
  }

  // Ignore hidden files
  if (filename.startsWith('.')) {
    return;
  }

  // Only process JavaScript files
  if (!filename.endsWith('.js')) {
    return;
  }

  console.log('Relevant change:', filename);
});
```

### Memory Leaks Prevention

```javascript
class ManagedWatcher {
  constructor() {
    this.watchers = [];
  }

  watch(path, callback) {
    const watcher = fs.watch(path, callback);
    this.watchers.push(watcher);
    return watcher;
  }

  closeAll() {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
  }
}

// Usage
const manager = new ManagedWatcher();
manager.watch('file1.txt', callback);
manager.watch('file2.txt', callback);

// Clean up all watchers
process.on('SIGINT', () => {
  manager.closeAll();
  process.exit();
});
```

## Part 7: Common Mistakes

### Mistake 1: Not Closing Watchers

```javascript
// ❌ BAD: Watcher runs forever
function setupWatcher() {
  fs.watch('file.txt', callback);
  // Watcher never closed - memory leak!
}

// ✅ GOOD: Proper cleanup
function setupWatcher() {
  const watcher = fs.watch('file.txt', callback);

  // Close on process exit
  process.on('SIGINT', () => {
    watcher.close();
    process.exit();
  });

  return watcher;
}
```

### Mistake 2: Not Debouncing Events

```javascript
// ❌ BAD: Processes every event
fs.watch('file.txt', async () => {
  await expensiveOperation(); // Called 5 times for one save!
});

// ✅ GOOD: Debounced
let timeout;
fs.watch('file.txt', async () => {
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    await expensiveOperation(); // Called once
  }, 300);
});
```

### Mistake 3: Not Handling Errors

```javascript
// ❌ BAD: No error handling
fs.watch('file.txt', (eventType, filename) => {
  const content = fs.readFileSync(filename); // May fail!
});

// ✅ GOOD: Proper error handling
fs.watch('file.txt', async (eventType, filename) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    const content = await fs.promises.readFile(filename, 'utf8');
    // Process content
  } catch (error) {
    console.error('Error reading file:', error.message);
  }
});
```

### Mistake 4: Watching node_modules

```javascript
// ❌ BAD: Watches too many files
fs.watch('project', { recursive: true }, callback);
// Watches node_modules (10,000+ files!)

// ✅ GOOD: Filter out node_modules
fs.watch('project', { recursive: true }, (eventType, filename) => {
  if (filename.includes('node_modules') ||
      filename.includes('.git') ||
      filename.includes('dist')) {
    return;
  }

  callback(eventType, filename);
});
```

## Part 8: Third-Party Solutions

For production use, consider these battle-tested libraries:

### chokidar (Most Popular)

```javascript
const chokidar = require('chokidar');

const watcher = chokidar.watch('src', {
  ignored: /(^|[\/\\])\../, // Ignore hidden files
  persistent: true,
  ignoreInitial: true
});

watcher
  .on('add', path => console.log(`File ${path} added`))
  .on('change', path => console.log(`File ${path} changed`))
  .on('unlink', path => console.log(`File ${path} removed`));
```

**Why use chokidar?**
- Handles platform differences
- Automatic debouncing
- Reliable across all platforms
- Better event detection

### nodemon (Development)

```bash
nodemon --watch src --exec "node app.js"
```

Auto-restarts your application when files change.

## Part 9: Testing Your Understanding

### Quick Quiz

1. **Q**: What are the two event types that `fs.watch()` emits?
   **A**: `'rename'` and `'change'`

2. **Q**: Why should you debounce file watch events?
   **A**: Because file saves often trigger multiple events, and debouncing prevents running expensive operations multiple times

3. **Q**: What's the difference between `fs.watch()` and `fs.watchFile()`?
   **A**: `fs.watch()` uses OS events (fast), `fs.watchFile()` uses polling (slower but more reliable)

4. **Q**: Does `recursive: true` work on all platforms?
   **A**: No, it doesn't work on Linux (only macOS and Windows)

### Mini Exercise

Create a development server that:
1. Watches a source directory for changes
2. Reloads the server when files change
3. Debounces the reload
4. Logs what file changed

```javascript
async function createDevServer(srcDir) {
  // Your code here
}

createDevServer('src');
```

## Summary

### Key Takeaways

1. **Use `fs.watch()`** for most use cases (faster, more efficient)
2. **Always debounce** file watch events to prevent excessive callbacks
3. **Close watchers** when done to prevent memory leaks
4. **Filter events** to ignore irrelevant changes
5. **Handle errors** when reading changed files
6. **Be aware of platform differences** (recursive watching on Linux)
7. **Consider third-party libraries** (chokidar) for production use

### Quick Reference

```javascript
// Basic watching
const watcher = fs.watch('file.txt', (eventType, filename) => {
  console.log(eventType, filename);
});

// Debounced watching
let timeout;
fs.watch('file.txt', (eventType) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    // Handle change
  }, 300);
});

// Clean up
watcher.close();
```

## Further Reading

- [Official fs.watch() documentation](https://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener)
- [chokidar library](https://github.com/paulmillr/chokidar)
- [nodemon](https://nodemon.io/)

## Next Guide

Continue to [Recursive Operations](./03-recursive-operations.md) to learn how to traverse and manipulate entire directory trees.
