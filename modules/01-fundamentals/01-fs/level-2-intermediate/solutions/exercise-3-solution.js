/**
 * Exercise 3 Solution: File Watcher with Logging
 *
 * Production-ready file watcher with debouncing and cleanup.
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class FileWatcher {
  constructor(watchDir, logFile) {
    this.watchDir = watchDir;
    this.logFile = logFile;
    this.watcher = null;
    this.debounceTimers = new Map();
    this.debounceDelay = 100;
    this.eventCount = 0;
    this.isRunning = false;
  }

  async start() {
    // Verify watch directory exists
    try {
      await fsPromises.access(this.watchDir);
    } catch {
      throw new Error(`Directory not found: ${this.watchDir}`);
    }

    // Initialize log file
    await this.initializeLog();

    // Start watching
    console.log(`Watching: ${this.watchDir}`);
    console.log(`Logging to: ${this.logFile}`);
    console.log('Press Ctrl+C to stop...\n');

    this.watcher = fs.watch(this.watchDir, { recursive: true }, (eventType, filename) => {
      if (filename) {
        this.handleChange(eventType, filename);
      }
    });

    this.watcher.on('error', (err) => {
      console.error('Watcher error:', err.message);
    });

    this.isRunning = true;

    // Setup cleanup
    this.setupCleanup();
  }

  async initializeLog() {
    const header = `${'='.repeat(50)}
File Watcher Log
Started: ${new Date().toLocaleString()}
Watching: ${this.watchDir}
${'='.repeat(50)}\n\n`;

    await fsPromises.writeFile(this.logFile, header);
  }

  handleChange(eventType, filename) {
    // Clear existing timer for this file
    if (this.debounceTimers.has(filename)) {
      clearTimeout(this.debounceTimers.get(filename));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.logEvent(eventType, filename);
      this.debounceTimers.delete(filename);
    }, this.debounceDelay);

    this.debounceTimers.set(filename, timer);
  }

  async logEvent(eventType, filename) {
    this.eventCount++;

    const timestamp = new Date().toLocaleString();
    const message = `[${timestamp}] ${eventType.toUpperCase()}: ${filename}`;

    // Log to file
    try {
      await fsPromises.appendFile(this.logFile, message + '\n');
    } catch (err) {
      console.error('Failed to write log:', err.message);
    }

    // Display to console
    console.log(message);
  }

  setupCleanup() {
    const cleanup = async () => {
      if (!this.isRunning) return;

      console.log('\n\nStopping watcher...');
      await this.stop();

      console.log(`Total events logged: ${this.eventCount}`);
      console.log('Goodbye!');

      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  async stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear all pending timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Write footer to log
    const footer = `\n${'='.repeat(50)}
Session ended: ${new Date().toLocaleString()}
Total events: ${this.eventCount}
${'='.repeat(50)}\n`;

    try {
      await fsPromises.appendFile(this.logFile, footer);
    } catch {
      // Ignore write errors during shutdown
    }

    this.isRunning = false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node exercise-3-solution.js <directory> [logfile]');
    console.log('\nExample:');
    console.log('  node exercise-3-solution.js ./src');
    console.log('  node exercise-3-solution.js ./src custom-log.txt');
    process.exit(0);
  }

  const watchDir = path.resolve(args[0]);
  const logFile = args[1] || 'file-watcher.log';

  try {
    const watcher = new FileWatcher(watchDir, logFile);
    await watcher.start();

    // Keep process running
    process.stdin.resume();

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();

/**
 * ENHANCED VERSION with filtering and stats
 */

class AdvancedFileWatcher extends FileWatcher {
  constructor(watchDir, logFile, options = {}) {
    super(watchDir, logFile);
    this.fileTypes = options.fileTypes || [];
    this.excludeDirs = options.excludeDirs || ['node_modules', '.git'];
    this.stats = {
      changes: 0,
      renames: 0,
      byFile: new Map()
    };
  }

  shouldWatch(filename) {
    // Check exclusions
    for (const exclude of this.excludeDirs) {
      if (filename.includes(exclude)) {
        return false;
      }
    }

    // Check file types
    if (this.fileTypes.length > 0) {
      const ext = path.extname(filename);
      if (!this.fileTypes.includes(ext)) {
        return false;
      }
    }

    return true;
  }

  async logEvent(eventType, filename) {
    if (!this.shouldWatch(filename)) {
      return;
    }

    // Update stats
    this.stats[eventType === 'change' ? 'changes' : 'renames']++;

    const count = this.stats.byFile.get(filename) || 0;
    this.stats.byFile.set(filename, count + 1);

    await super.logEvent(eventType, filename);
  }

  async stop() {
    // Log statistics
    const mostChanged = [...this.stats.byFile.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\nStatistics:');
    console.log(`  Changes: ${this.stats.changes}`);
    console.log(`  Renames: ${this.stats.renames}`);
    console.log('\nMost changed files:');
    mostChanged.forEach(([file, count], i) => {
      console.log(`  ${i + 1}. ${file} (${count} times)`);
    });

    await super.stop();
  }
}

/**
 * KEY POINTS:
 *
 * 1. Debouncing:
 *    - Prevents duplicate events
 *    - Uses Map to track timers per file
 *    - Clears old timer before setting new one
 *
 * 2. Cleanup:
 *    - Listen for SIGINT/SIGTERM
 *    - Close watcher to prevent leaks
 *    - Clear all timers
 *    - Write final log entry
 *
 * 3. Error Handling:
 *    - Try-catch for file operations
 *    - Handle watcher errors
 *    - Graceful degradation
 */
