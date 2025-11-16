/**
 * Example 5: File Watching
 *
 * Demonstrates real-time file and directory monitoring.
 *
 * Key Concepts:
 * - Watching files with fs.watch()
 * - Watching directories
 * - Handling watch events
 * - Building auto-reload functionality
 * - Watch cleanup and memory management
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

async function demonstrateFileWatching() {
  console.log('File Watching Examples\n');
  console.log('═'.repeat(50));
  console.log('Note: This example will run for 15 seconds, then cleanup\n');

  const watchers = []; // Track all watchers for cleanup

  try {
    // Setup: Create test files
    const testFile = path.join(__dirname, 'watched-file.txt');
    const testDir = path.join(__dirname, 'watched-dir');

    await fsPromises.mkdir(testDir, { recursive: true });
    await fsPromises.writeFile(testFile, 'Initial content');

    // Example 1: Basic file watching
    console.log('1. Watching a Single File');
    console.log('─'.repeat(50));

    const fileWatcher = fs.watch(testFile, (eventType, filename) => {
      console.log(`  Event: ${eventType} | File: ${filename || testFile}`);
    });
    watchers.push(fileWatcher);

    console.log(`✓ Watching: ${path.basename(testFile)}`);

    // Trigger some changes
    setTimeout(async () => {
      await fsPromises.appendFile(testFile, '\nLine 2');
      console.log('  → Modified file (append)');
    }, 1000);

    setTimeout(async () => {
      await fsPromises.writeFile(testFile, 'Replaced content');
      console.log('  → Modified file (replace)');
    }, 2000);

    // Example 2: Watching a directory
    console.log('\n2. Watching a Directory');
    console.log('─'.repeat(50));

    const dirWatcher = fs.watch(testDir, (eventType, filename) => {
      console.log(`  Dir Event: ${eventType} | File: ${filename}`);
    });
    watchers.push(dirWatcher);

    console.log(`✓ Watching: ${path.basename(testDir)}/`);

    setTimeout(async () => {
      await fsPromises.writeFile(path.join(testDir, 'new-file.txt'), 'New');
      console.log('  → Created new file in directory');
    }, 3000);

    setTimeout(async () => {
      await fsPromises.unlink(path.join(testDir, 'new-file.txt'));
      console.log('  → Deleted file from directory');
    }, 4000);

    // Example 3: Recursive directory watching
    console.log('\n3. Recursive Directory Watching');
    console.log('─'.repeat(50));

    await fsPromises.mkdir(path.join(testDir, 'subdir'), { recursive: true });

    const recursiveWatcher = fs.watch(testDir, { recursive: true }, (eventType, filename) => {
      console.log(`  Recursive: ${eventType} | ${filename}`);
    });
    watchers.push(recursiveWatcher);

    console.log(`✓ Watching recursively: ${path.basename(testDir)}/`);

    setTimeout(async () => {
      await fsPromises.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'Nested');
      console.log('  → Created file in subdirectory');
    }, 5000);

    // Example 4: Watch with error handling
    console.log('\n4. Watch with Error Handling');
    console.log('─'.repeat(50));

    const safeWatcher = fs.watch(testFile);

    safeWatcher.on('change', (eventType, filename) => {
      console.log(`  Safe watcher: ${eventType}`);
    });

    safeWatcher.on('error', (error) => {
      console.error(`  Watch error: ${error.message}`);
    });

    watchers.push(safeWatcher);

    console.log('✓ Watcher with error handling setup');

    setTimeout(async () => {
      await fsPromises.writeFile(testFile, 'Another change');
      console.log('  → Modified file again');
    }, 6000);

    // Example 5: Debounced file watcher
    console.log('\n5. Debounced File Watcher');
    console.log('─'.repeat(50));

    function createDebouncedWatcher(filePath, delay = 100) {
      let timeout;

      const watcher = fs.watch(filePath, (eventType) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          console.log(`  Debounced event processed: ${eventType}`);
        }, delay);
      });

      return watcher;
    }

    const debouncedWatcher = createDebouncedWatcher(testFile, 200);
    watchers.push(debouncedWatcher);

    console.log('✓ Debounced watcher created (200ms delay)');

    // Trigger rapid changes
    setTimeout(async () => {
      console.log('  → Triggering rapid changes...');
      await fsPromises.appendFile(testFile, '\n1');
      await fsPromises.appendFile(testFile, '\n2');
      await fsPromises.appendFile(testFile, '\n3');
      console.log('  → 3 changes made rapidly (should see 1 debounced event)');
    }, 7000);

    // Example 6: Auto-reload pattern
    console.log('\n6. Auto-Reload Pattern');
    console.log('─'.repeat(50));

    let configData = { version: 1 };

    async function loadConfig() {
      const content = await fsPromises.readFile(testFile, 'utf8');
      configData = { content, loadedAt: new Date().toISOString() };
      console.log(`  Config reloaded: ${configData.content.substring(0, 30)}...`);
    }

    const reloadWatcher = fs.watch(testFile, async (eventType) => {
      if (eventType === 'change') {
        await loadConfig();
      }
    });
    watchers.push(reloadWatcher);

    console.log('✓ Auto-reload watcher active');

    setTimeout(async () => {
      await fsPromises.writeFile(testFile, 'Updated configuration');
      console.log('  → Config file updated');
    }, 8000);

    // Example 7: Watch multiple files
    console.log('\n7. Watching Multiple Files');
    console.log('─'.repeat(50));

    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    const multiWatchers = [];

    for (const file of files) {
      const filePath = path.join(testDir, file);
      await fsPromises.writeFile(filePath, `Content of ${file}`);

      const watcher = fs.watch(filePath, (eventType) => {
        console.log(`  ${file}: ${eventType}`);
      });

      multiWatchers.push(watcher);
      watchers.push(watcher);
    }

    console.log(`✓ Watching ${files.length} files`);

    setTimeout(async () => {
      await fsPromises.appendFile(path.join(testDir, 'file2.txt'), '\nUpdated');
      console.log('  → Modified file2.txt');
    }, 9000);

    // Example 8: Watch with file filter
    console.log('\n8. Filtered Directory Watching');
    console.log('─'.repeat(50));

    const filteredWatcher = fs.watch(testDir, (eventType, filename) => {
      if (filename && filename.endsWith('.txt')) {
        console.log(`  Filtered (txt only): ${eventType} | ${filename}`);
      }
    });
    watchers.push(filteredWatcher);

    console.log('✓ Watching directory for .txt files only');

    setTimeout(async () => {
      await fsPromises.writeFile(path.join(testDir, 'ignored.js'), 'JS file');
      await fsPromises.writeFile(path.join(testDir, 'included.txt'), 'TXT file');
      console.log('  → Created .js and .txt files (only .txt should trigger)');
    }, 10000);

    // Wait for events to process, then cleanup
    setTimeout(async () => {
      console.log('\n9. Cleanup');
      console.log('─'.repeat(50));

      // Close all watchers
      watchers.forEach(watcher => {
        try {
          watcher.close();
        } catch (err) {
          // Already closed
        }
      });
      console.log(`✓ Closed ${watchers.length} watchers`);

      // Clean up files
      await fsPromises.unlink(testFile).catch(() => {});
      await fsPromises.rm(testDir, { recursive: true, force: true }).catch(() => {});
      console.log('✓ Cleanup complete');

      console.log('\n═'.repeat(50));
      console.log('File watching demonstration completed');
    }, 12000);

  } catch (err) {
    console.error('Error:', err.message);

    // Cleanup watchers on error
    watchers.forEach(watcher => {
      try {
        watcher.close();
      } catch (e) {
        // Ignore
      }
    });
  }
}

demonstrateFileWatching();

/**
 * fs.watch() API:
 *
 * Syntax:
 *   fs.watch(filename, [options], [listener])
 *
 * Options:
 *   - persistent: Keep process running while watching (default: true)
 *   - recursive: Watch subdirectories (macOS and Windows only)
 *   - encoding: Character encoding (default: 'utf8')
 *
 * Events:
 *   - 'change': File was modified
 *   - 'rename': File was renamed or deleted
 *   - 'error': An error occurred
 *
 * Event types:
 *   - 'change': Content changed
 *   - 'rename': File renamed, created, or deleted
 */

/**
 * Important Notes:
 *
 * 1. Platform Differences:
 *    - Recursive watching only works on macOS and Windows
 *    - Linux requires watching each directory separately
 *    - Event details vary by platform
 *
 * 2. Event Duplication:
 *    - Same event may fire multiple times
 *    - Use debouncing to handle this
 *
 * 3. Performance:
 *    - Watching many files uses system resources
 *    - Consider using a library like chokidar for production
 *    - Always close watchers when done
 *
 * 4. Memory Leaks:
 *    - Always call watcher.close() to prevent leaks
 *    - Track active watchers
 *    - Clean up on process exit
 */

/**
 * Alternatives:
 *
 * 1. fs.watchFile() - Uses polling (slower, more compatible)
 * 2. chokidar - Popular library with better cross-platform support
 * 3. nodemon - For auto-reloading Node.js apps
 * 4. webpack watch mode - For build tools
 */

/**
 * Common Use Cases:
 *
 * - Auto-reload development servers
 * - File synchronization
 * - Build tools (compile on change)
 * - Log file monitoring
 * - Configuration hot-reloading
 * - Asset processing pipelines
 */
