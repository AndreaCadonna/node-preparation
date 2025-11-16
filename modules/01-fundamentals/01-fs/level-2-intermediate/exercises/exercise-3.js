/**
 * Exercise 3: Implement a File Watcher with Logging
 *
 * DIFFICULTY: ⭐⭐⭐ Medium-Hard
 * TIME: 25-30 minutes
 *
 * OBJECTIVE:
 * Create a file watcher that monitors a directory and logs all changes to a file.
 *
 * REQUIREMENTS:
 * 1. Accept a directory path to watch as command-line argument
 * 2. Watch the directory recursively for all changes
 * 3. Log all file/directory changes to a log file
 * 4. Include timestamp, event type, and file path in logs
 * 5. Debounce rapid changes (combine multiple events within 100ms)
 * 6. Gracefully handle SIGINT (Ctrl+C) and cleanup
 * 7. Display live updates to console as well
 *
 * LOG FORMAT:
 * [2024-01-15 10:30:45] CHANGE: src/app.js
 * [2024-01-15 10:31:12] RENAME: old.txt -> new.txt
 * [2024-01-15 10:32:00] DELETE: temp.txt
 *
 * BONUS CHALLENGES:
 * - Add log rotation (create new log file when size > 1MB)
 * - Filter which file types to watch
 * - Add statistics (total changes, most changed file)
 * - Support watching multiple directories
 * - Add option to exclude certain directories (e.g., node_modules)
 * - Implement different log levels (INFO, DEBUG, VERBOSE)
 *
 * HINTS:
 * - Use fs.watch() with recursive option
 * - Use setTimeout for debouncing
 * - Track the last event time for each file
 * - Use process.on('SIGINT') for cleanup
 * - Close watcher in cleanup to prevent memory leaks
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// TODO: Implement your solution here

class FileWatcher {
  constructor(watchDir, logFile) {
    this.watchDir = watchDir;
    this.logFile = logFile;
    this.watcher = null;
    this.debounceTimers = new Map();
    this.debounceDelay = 100; // ms
  }

  async start() {
    // Your code here
    // 1. Validate watch directory exists
    // 2. Create/open log file
    // 3. Start watching
    // 4. Setup cleanup handlers
  }

  handleChange(eventType, filename) {
    // Your code here
    // 1. Debounce the event
    // 2. Log to file
    // 3. Display to console
  }

  async log(message) {
    // Your code here
    // Format and write to log file
  }

  async stop() {
    // Your code here
    // 1. Close watcher
    // 2. Clear timers
    // 3. Close log file
  }
}

async function main() {
  // Your code here
  // 1. Parse arguments
  // 2. Create watcher
  // 3. Start watching
  // 4. Keep process running
}

// main();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Create test directory:
 *    mkdir -p test-watch
 *
 * 2. Start watching:
 *    node exercise-3.js test-watch
 *
 * 3. In another terminal, make changes:
 *    echo "test" > test-watch/file1.txt
 *    echo "more" >> test-watch/file1.txt
 *    mv test-watch/file1.txt test-watch/file2.txt
 *    rm test-watch/file2.txt
 *
 * 4. Expected console output:
 *    Watching: test-watch/
 *    Logging to: file-watcher.log
 *    Press Ctrl+C to stop...
 *
 *    [10:30:45] CHANGE: file1.txt
 *    [10:30:47] CHANGE: file1.txt
 *    [10:30:50] RENAME: file1.txt
 *    [10:30:52] CHANGE: file2.txt
 *    [10:30:55] RENAME: file2.txt
 *
 *    Stopping watcher...
 *    Total events logged: 5
 *
 * 5. Check log file:
 *    cat file-watcher.log
 */

/**
 * EXAMPLE OUTPUT (log file):
 *
 * ========================================
 * File Watcher Log
 * Started: 2024-01-15 10:30:00
 * Watching: /path/to/test-watch
 * ========================================
 *
 * [2024-01-15 10:30:45] CHANGE: file1.txt
 * [2024-01-15 10:30:47] CHANGE: file1.txt (debounced)
 * [2024-01-15 10:30:50] RENAME: file1.txt
 * [2024-01-15 10:30:52] CHANGE: file2.txt
 * [2024-01-15 10:30:55] RENAME: file2.txt
 *
 * ========================================
 * Session ended: 2024-01-15 10:35:00
 * Total events: 5
 * ========================================
 */

/**
 * DEBOUNCING IMPLEMENTATION:
 *
 * handleChange(eventType, filename) {
 *   // Clear existing timer for this file
 *   if (this.debounceTimers.has(filename)) {
 *     clearTimeout(this.debounceTimers.get(filename));
 *   }
 *
 *   // Set new timer
 *   const timer = setTimeout(() => {
 *     this.logEvent(eventType, filename);
 *     this.debounceTimers.delete(filename);
 *   }, this.debounceDelay);
 *
 *   this.debounceTimers.set(filename, timer);
 * }
 */

/**
 * CLEANUP HANDLER:
 *
 * setupCleanup() {
 *   process.on('SIGINT', async () => {
 *     console.log('\nStopping watcher...');
 *     await this.stop();
 *     process.exit(0);
 *   });
 * }
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - Why is debouncing important for file watchers?
 * - How do you handle process termination gracefully?
 * - What are the platform differences in fs.watch()?
 * - How do you prevent memory leaks in watchers?
 */
